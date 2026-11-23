use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;

// 同一プロセス内の保存操作を直列化し、バックアップ名の競合を防止する。
static YAML_SAVE_LOCK: Mutex<()> = Mutex::new(());

use tauri::State;
use tauri_plugin_dialog::DialogExt;

// ユーザーがダイアログで明示的に選択したディレクトリだけを操作対象にする。
#[derive(Default)]
struct ScenarioRoot(Mutex<Option<PathBuf>>);

fn validate_relative_path(relative: &str) -> Result<&Path, String> {
    // フロントエンドの相対パスは常に '/' 区切り。OSによる解釈差をなくす。
    // Windowsでドライブ/ストリーム指定になる ':' と、別の区切り文字 '\\' を拒否する。
    if relative.contains(['\\', ':']) {
        return Err("相対パスには '/' 区切りを使用してください".into());
    }
    let path = Path::new(relative);
    if path.as_os_str().is_empty()
        || path.is_absolute()
        || path.components().any(|part| !matches!(part, Component::Normal(_)))
    {
        return Err("相対パスを指定してください".into());
    }
    // Windowsでは末尾の空白・ピリオドが正規化され、別名のファイルを指す可能性がある。
    // CON / NUL / COM1 などの予約デバイス名は拡張子付きでも禁止する。
    for component in path.components() {
        let Component::Normal(name) = component else { continue };
        let name = name.to_string_lossy();
        if name.ends_with([' ', '.']) || name.chars().any(|ch| ch.is_control()) {
            return Err("Windowsで不正なファイル名です".into());
        }
        let stem = name.split('.').next().unwrap_or("").trim_end_matches(' ').to_ascii_uppercase();
        let reserved = matches!(stem.as_str(), "CON" | "PRN" | "AUX" | "NUL")
            || (stem.len() == 4
                && (stem.starts_with("COM") || stem.starts_with("LPT"))
                && matches!(stem.as_bytes()[3], b'1'..=b'9'));
        if reserved {
            return Err("Windowsの予約デバイス名は使用できません".into());
        }
    }
    let extension = path.extension().and_then(|value| value.to_str()).unwrap_or("");
    if !matches!(extension.to_ascii_lowercase().as_str(), "yaml" | "yml") {
        return Err("YAMLファイルのみ操作できます".into());
    }
    Ok(path)
}

fn resolve_existing(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let path = validate_relative_path(relative)?;
    let actual = fs::canonicalize(root.join(path))
        .map_err(|error| format!("ファイルを参照できません: {error}"))?;
    if !actual.starts_with(root) || !actual.is_file() {
        return Err("選択したディレクトリ外のファイルは操作できません".into());
    }
    Ok(actual)
}

// 悪意ある/巨大なフォルダ選択で再帰探索が無制限にならないよう上限を設ける。
const MAX_SCENARIO_DEPTH: usize = 32;
const MAX_SCENARIO_ENTRIES: usize = 50_000;
const MAX_SCENARIO_FILES: usize = 10_000;

fn list_yaml(root: &Path) -> Result<Vec<String>, String> {
    list_yaml_with_limits(root, MAX_SCENARIO_DEPTH, MAX_SCENARIO_ENTRIES, MAX_SCENARIO_FILES)
}

fn list_yaml_with_limits(root: &Path, max_depth: usize, max_entries: usize, max_files: usize) -> Result<Vec<String>, String> {
    fn visit(
        root: &Path,
        current: &Path,
        depth: usize,
        max_depth: usize,
        max_entries: usize,
        max_files: usize,
        entries: &mut usize,
        found: &mut Vec<String>,
    ) -> Result<(), String> {
        for entry in fs::read_dir(current).map_err(|error| error.to_string())? {
            let entry = entry.map_err(|error| error.to_string())?;
            *entries += 1;
            if *entries > max_entries {
                return Err(format!("シナリオフォルダの項目数が上限（{max_entries}件）を超えました"));
            }
            let kind = entry.file_type().map_err(|error| error.to_string())?;
            // シンボリックリンク経由のディレクトリ外アクセスを禁止する。
            if kind.is_symlink() {
                continue;
            }
            let path = entry.path();
            if kind.is_dir() {
                if depth >= max_depth {
                    return Err(format!("シナリオフォルダの階層が上限（{max_depth}階層）を超えました"));
                }
                visit(root, &path, depth + 1, max_depth, max_entries, max_files, entries, found)?;
            } else if kind.is_file()
                && matches!(
                    path.extension().and_then(|value| value.to_str())
                        .unwrap_or("").to_ascii_lowercase().as_str(),
                    "yaml" | "yml"
                )
            {
                if found.len() >= max_files {
                    return Err(format!("シナリオファイル数が上限（{max_files}件）を超えました"));
                }
                let relative = path.strip_prefix(root).map_err(|error| error.to_string())?;
                found.push(relative.to_string_lossy().replace('\\', "/"));
            }
        }
        Ok(())
    }
    let mut found = Vec::new();
    let mut entries = 0;
    visit(root, root, 0, max_depth, max_entries, max_files, &mut entries, &mut found)?;
    found.sort();
    Ok(found)
}

fn current_root(state: &State<'_, ScenarioRoot>) -> Result<PathBuf, String> {
    state.0.lock().map_err(|_| "ディレクトリ状態を取得できません".to_string())?
        .clone().ok_or_else(|| "先にシナリオフォルダを選択してください".to_string())
}

#[tauri::command]
fn select_scenario_folder(
    app: tauri::AppHandle,
    state: State<'_, ScenarioRoot>,
) -> Result<Option<String>, String> {
    let selection = app.dialog().file().blocking_pick_folder();
    let Some(selection) = selection else { return Ok(None); };
    let folder = selection.into_path().map_err(|error| error.to_string())?;
    let canonical = fs::canonicalize(&folder).map_err(|error| error.to_string())?;
    if !canonical.is_dir() { return Err("ディレクトリを選択してください".into()); }
    *state.0.lock().map_err(|_| "ディレクトリ状態を更新できません".to_string())? =
        Some(canonical.clone());
    Ok(Some(canonical.to_string_lossy().into_owned()))
}

#[tauri::command]
fn list_scenario_files(state: State<'_, ScenarioRoot>) -> Result<Vec<String>, String> {
    list_yaml(&current_root(&state)?)
}

#[tauri::command]
fn read_scenario_file(state: State<'_, ScenarioRoot>, relative_path: String) -> Result<String, String> {
    fs::read_to_string(resolve_existing(&current_root(&state)?, &relative_path)?)
        .map_err(|error| format!("YAMLを読み込めません: {error}"))
}

#[tauri::command]
fn write_scenario_file(
    state: State<'_, ScenarioRoot>,
    relative_path: String,
    content: String,
    expected_content: String,
) -> Result<(), String> {
    // 既存ファイルのみ更新する。書き込み失敗時に元ファイルを破損させない。
    let target = resolve_existing(&current_root(&state)?, &relative_path)?;
    replace_yaml_checked(&target, &content, Some(&expected_content))
}

// 同じディレクトリの一時ファイルへ書き込み、同期後に置き換える。
// Windowsではrenameによる既存ファイルの置き換えが失敗する環境もあるため、
// 元ファイルを退避してから切り替え、失敗した場合は復元する。
#[cfg(test)]
fn replace_yaml(target: &Path, content: &str) -> Result<(), String> {
    replace_yaml_checked(target, content, None)
}

fn replace_yaml_checked(target: &Path, content: &str, expected: Option<&str>) -> Result<(), String> {
    let _guard = YAML_SAVE_LOCK.lock().map_err(|_| "保存処理のロックを取得できません".to_string())?;
    // フォルダをYAMLファイルとして置換すると元フォルダが退避されるため、必ず通常ファイルに限定する。
    // 読み込み後にファイルがシンボリックリンクへ差し替えられても、リンク先を更新しない。
    // metadata/is_file はリンクを辿るため、symlink_metadata で実体の種類を確認する。
    let target_kind = fs::symlink_metadata(target)
        .map_err(|error| format!("保存先の属性を取得できません: {error}"))?
        .file_type();
    if !target_kind.is_file() || target_kind.is_symlink() {
        return Err("保存先のYAMLファイルが存在しないか、通常ファイルではありません".into());
    }
    // 一時ファイルのrenameは読み取り専用属性を回避できるため、明示的に更新を拒否する。
    let original_permissions = fs::metadata(target)
        .map_err(|error| format!("保存先の属性を取得できません: {error}"))?
        .permissions();
    if original_permissions.readonly() {
        return Err("読み取り専用のYAMLファイルは上書きできません".into());
    }
    // 直列化ロック内で比較し、外部変更を黙って上書きしない。
    if let Some(expected) = expected {
        let current = fs::read_to_string(target)
            .map_err(|error| format!("保存先を再確認できません: {error}"))?;
        if current != expected {
            return Err("保存競合: 外部でYAMLが変更されています。再読み込みしてください".into());
        }
    }
    let parent = target.parent().ok_or("保存先が不正です")?;
    let name = target.file_name().ok_or("ファイル名が不正です")?.to_string_lossy();
    let mut index = 0u32;
    let (temp, mut file) = loop {
        let candidate = parent.join(format!(".{name}.{}.{}.tmp", std::process::id(), index));
        match OpenOptions::new().write(true).create_new(true).open(&candidate) {
            Ok(file) => break (candidate, file),
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
                index = index.checked_add(1).ok_or("一時ファイル名を確保できません")?;
            }
            Err(error) => return Err(format!("一時ファイルを作成できません: {error}")),
        }
    };
    // 一時ファイルを置き換えた後も、元のYAMLのアクセス権を維持する。
    // 新規作成時の既定権限のまま置換すると、共有設定やUnixのモードが変化する。
    if let Err(error) = file.write_all(content.as_bytes())
        .and_then(|_| file.set_permissions(original_permissions))
        .and_then(|_| file.sync_all())
    {
        drop(file);
        let _ = fs::remove_file(&temp);
        return Err(format!("一時ファイルへの書き込みまたは権限設定に失敗しました: {error}"));
    }
    drop(file);
    // 元ファイルのパスを直接変更せず、同一ボリューム内で切り替える。
    let backup = parent.join(format!(".{name}.{}.backup", std::process::id()));
    if backup.exists() {
        let _ = fs::remove_file(&temp);
        return Err("保存用バックアップが既に存在します".into());
    }
    if let Err(error) = fs::rename(target, &backup) {
        let _ = fs::remove_file(&temp);
        return Err(format!("元ファイルを退避できません: {error}"));
    }
    if let Err(error) = fs::rename(&temp, target) {
        let restored = fs::rename(&backup, target);
        let _ = fs::remove_file(&temp);
        return Err(match restored {
            Ok(()) => format!("YAMLを置き換えられません: {error}"),
            Err(restore_error) => format!("置き換え失敗: {error}; 復元にも失敗しました: {restore_error}; バックアップ: {}", backup.display()),
        });
    }
    let _ = fs::remove_file(backup);
    Ok(())
}

// 新規作成は既存ファイルを上書きせず、選択フォルダ外へのアクセスを防ぐ。
fn create_yaml(root: &Path, relative: &str, content: &str) -> Result<(), String> {
    // 新規作成も更新と同じロックで直列化し、同時保存による競合を防ぐ。
    let _guard = YAML_SAVE_LOCK.lock().map_err(|_| "保存処理のロックを取得できません".to_string())?;
    let path = validate_relative_path(relative)?;
    let parent = root.join(path).parent().ok_or("保存先が不正です")?.canonicalize()
        .map_err(|error| format!("保存先フォルダを参照できません: {error}"))?;
    let canonical_root = root.canonicalize()
        .map_err(|error| format!("保存先ルートを参照できません: {error}"))?;
    if !parent.starts_with(&canonical_root) { return Err("選択したディレクトリ外には保存できません".into()); }
    let name = path.file_name().ok_or("ファイル名が不正です")?;
    let target = parent.join(name);
    let mut file = OpenOptions::new().write(true).create_new(true).open(&target)
        .map_err(|error| format!("新規YAMLを作成できません: {error}"))?;
    if let Err(error) = file.write_all(content.as_bytes()).and_then(|_| file.sync_all()) {
        drop(file);
        let _ = fs::remove_file(&target);
        return Err(format!("YAMLを書き込めません: {error}"));
    }
    Ok(())
}

#[tauri::command]
fn create_scenario_file(
    state: State<'_, ScenarioRoot>,
    relative_path: String,
    content: String,
) -> Result<(), String> {
    create_yaml(&current_root(&state)?, &relative_path, &content)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(ScenarioRoot::default())
        .invoke_handler(tauri::generate_handler![
            select_scenario_folder,
            list_scenario_files,
            read_scenario_file,
            write_scenario_file,
            create_scenario_file
        ])
        .run(tauri::generate_context!())
        .expect("Tauriアプリケーションの起動に失敗しました");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_unsafe_paths() {
        for path in ["", "../secret.yaml", "/tmp/secret.yaml", "dir/../secret.yml", "data.json"] {
            assert!(validate_relative_path(path).is_err(), "{path}");
        }
        for path in [r"nested\\..\\escape.yaml", r"C:\\temp\\scenario.yaml", "file.yaml:stream"] {
            assert!(validate_relative_path(path).is_err(), "{path}");
        }
        for path in ["CON.yaml", "nested/nul.yml", "COM1.yaml", "LPT9.yml",
                     "folder./scenario.yaml", "folder /scenario.yaml", "file.yaml.",
                     "scenario.yaml ", "folder/aux.yaml"] {
            assert!(validate_relative_path(path).is_err(), "{path}");
        }
        assert!(validate_relative_path("computer.yaml").is_ok());
        assert!(validate_relative_path("nested/com10.yaml").is_ok());
        assert!(validate_relative_path("nested/scenario.yaml").is_ok());
    }

    #[test]
    fn creates_yaml_without_overwriting_existing_file() {
        let root = std::env::temp_dir().join(format!("bfe-create-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("nested")).unwrap();
        create_yaml(&root, "nested/new.yaml", "metadata: first").unwrap();
        assert_eq!(fs::read_to_string(root.join("nested/new.yaml")).unwrap(), "metadata: first");
        assert!(create_yaml(&root, "nested/new.yaml", "metadata: second").is_err());
        assert_eq!(fs::read_to_string(root.join("nested/new.yaml")).unwrap(), "metadata: first");
        assert!(create_yaml(&root, "../escape.yaml", "invalid").is_err());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn replaces_existing_yaml_without_creating_new_target() {
        let root = std::env::temp_dir().join(format!("bfe-replace-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let target = root.join("scenario.yaml");
        fs::write(&target, "before").unwrap();
        replace_yaml(&target, "after").unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), "after");
        assert!(replace_yaml(&root.join("missing.yaml"), "invalid").is_err());
        assert!(!root.join("missing.yaml").exists());
        fs::remove_dir_all(root).unwrap();
    }

    // WIN-08 / WIN-09: 既存YAMLの保存・再読込と外部更新競合をネイティブ層で検証する。
    #[test]
    fn existing_yaml_save_preserves_content_and_rejects_stale_update() {
        let root = std::env::temp_dir().join(format!(
            "bfe-existing-save-regression-{}", std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let canonical_root = root.canonicalize().unwrap();
        let target = root.join("scenario.yaml");
        let unrelated = root.join("unrelated.yaml");
        let initial = "schemaVersion: '1.0'\\nmetadata:\\n  title: before\\n";
        let updated = "schemaVersion: '1.0'\\nmetadata:\\n  title: after\\n";
        fs::write(&target, initial).unwrap();
        fs::write(&unrelated, "keep").unwrap();

        let resolved = resolve_existing(&canonical_root, "scenario.yaml").unwrap();
        replace_yaml_checked(&resolved, updated, Some(initial)).unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), updated);
        assert_eq!(fs::read_to_string(&unrelated).unwrap(), "keep");

        let error = replace_yaml_checked(&resolved, "stale overwrite", Some(initial)).unwrap_err();
        assert!(error.contains("保存競合"), "{error}");
        assert_eq!(fs::read_to_string(&target).unwrap(), updated);
        assert_eq!(fs::read_to_string(&unrelated).unwrap(), "keep");
        let mut files: Vec<_> = fs::read_dir(&root).unwrap()
            .map(|entry| entry.unwrap().file_name().to_string_lossy().into_owned())
            .collect();
        files.sort();
        assert_eq!(files, vec!["scenario.yaml", "unrelated.yaml"]);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn readonly_yaml_is_not_overwritten_or_left_with_temporary_files() {
        let root = std::env::temp_dir().join(format!("bfe-readonly-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let target = root.join("scenario.yaml");
        fs::write(&target, "metadata: original").unwrap();
        let mut permissions = fs::metadata(&target).unwrap().permissions();
        permissions.set_readonly(true);
        fs::set_permissions(&target, permissions).unwrap();

        assert!(replace_yaml(&target, "metadata: overwritten").is_err());
        assert_eq!(fs::read_to_string(&target).unwrap(), "metadata: original");
        assert_eq!(fs::read_dir(&root).unwrap().count(), 1, "一時ファイルを残さない");

        // 後片付けでは元の権限を復元する。
        let mut permissions = fs::metadata(&target).unwrap().permissions();
        permissions.set_readonly(false);
        fs::set_permissions(&target, permissions).unwrap();
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn failed_update_does_not_replace_directory_or_create_missing_file() {
        let root = std::env::temp_dir().join(format!("bfe-save-target-type-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("directory.yaml")).unwrap();
        fs::write(root.join("directory.yaml/important.txt"), "keep").unwrap();
        let directory = root.join("directory.yaml");
        let missing = root.join("missing.yaml");

        assert!(replace_yaml(&directory, "metadata: overwritten").is_err());
        assert!(directory.is_dir(), "保存失敗時も元フォルダを残す");
        assert_eq!(fs::read_to_string(directory.join("important.txt")).unwrap(), "keep");
        assert!(replace_yaml(&missing, "metadata: new").is_err());
        assert!(!missing.exists(), "更新処理では新規ファイルを作らない");
        let leftovers = fs::read_dir(&root).unwrap().filter_map(Result::ok)
            .filter(|entry| entry.file_name().to_string_lossy().ends_with(".tmp")).count();
        assert_eq!(leftovers, 0);
        fs::remove_dir_all(root).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn replacement_preserves_existing_file_permissions() {
        use std::os::unix::fs::PermissionsExt;
        let root = std::env::temp_dir().join(format!("bfe-permissions-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let target = root.join("scenario.yaml");
        fs::write(&target, "before").unwrap();
        fs::set_permissions(&target, fs::Permissions::from_mode(0o640)).unwrap();
        replace_yaml(&target, "after").unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), "after");
        assert_eq!(fs::metadata(&target).unwrap().permissions().mode() & 0o777, 0o640);
        fs::remove_dir_all(root).unwrap();
    }

    // 読み込み後のファイル差し替えによるリンク先への誤保存を防ぐ。
    #[cfg(unix)]
    #[test]
    fn rejects_symlink_target_during_save() {
        let root = std::env::temp_dir().join(format!("bfe-save-link-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let outside = root.join("original.yaml");
        let link = root.join("linked.yaml");
        fs::write(&outside, "original").unwrap();
        std::os::unix::fs::symlink(&outside, &link).unwrap();
        assert!(replace_yaml(&link, "changed").is_err());
        assert_eq!(fs::read_to_string(&outside).unwrap(), "original");
        assert!(fs::symlink_metadata(&link).unwrap().file_type().is_symlink());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_invalid_extensions_and_parent_paths() {
        for path in ["scenario.txt", "nested/../../escape.yaml", ".", "nested/."] {
            assert!(validate_relative_path(path).is_err(), "{path}");
        }
        assert!(validate_relative_path("nested/valid.YML").is_ok());
    }

    #[test]
    fn preserves_existing_yaml_when_backup_conflicts() {
        let root = std::env::temp_dir().join(format!("bfe-backup-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let target = root.join("scenario.yaml");
        let backup = root.join(format!(".scenario.yaml.{}.backup", std::process::id()));
        fs::write(&target, "original").unwrap();
        fs::write(&backup, "reserved").unwrap();
        assert!(replace_yaml(&target, "new content").is_err());
        assert_eq!(fs::read_to_string(&target).unwrap(), "original");
        assert_eq!(fs::read_to_string(&backup).unwrap(), "reserved");
        let leftovers = fs::read_dir(&root).unwrap().filter_map(Result::ok)
            .filter(|entry| entry.file_name().to_string_lossy().ends_with(".tmp")).count();
        assert_eq!(leftovers, 0);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_creating_yaml_in_missing_parent_directory() {
        let root = std::env::temp_dir().join(format!("bfe-missing-parent-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        assert!(create_yaml(&root, "missing/new.yaml", "data").is_err());
        assert!(!root.join("missing/new.yaml").exists());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn concurrent_saves_keep_complete_yaml_and_remove_temporary_files() {
        let root = std::env::temp_dir().join(format!("bfe-concurrent-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let target = root.join("scenario.yaml");
        fs::write(&target, "initial").unwrap();
        let gate = std::sync::Arc::new(std::sync::Barrier::new(4));
        let mut threads = Vec::new();
        for index in 0..4 {
            let target = target.clone();
            let gate = gate.clone();
            threads.push(std::thread::spawn(move || {
                let content = format!("metadata: writer-{index}\\n{}", "a".repeat(4096));
                gate.wait();
                replace_yaml(&target, &content).unwrap();
                content
            }));
        }
        let expected: Vec<String> = threads.into_iter().map(|thread| thread.join().unwrap()).collect();
        let actual = fs::read_to_string(&target).unwrap();
        assert!(expected.contains(&actual), "保存内容が途中で破損しています");
        let files: Vec<_> = fs::read_dir(&root).unwrap().map(|entry| entry.unwrap().file_name()).collect();
        assert_eq!(files.len(), 1, "一時ファイルまたはバックアップが残っています");
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_existing_yaml_outside_selected_root() {
        let base = std::env::temp_dir().join(format!("bfe-boundary-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&base);
        let root = base.join("selected");
        fs::create_dir_all(&root).unwrap();
        fs::write(base.join("outside.yaml"), "private").unwrap();
        let canonical_root = root.canonicalize().unwrap();
        assert!(resolve_existing(&canonical_root, "../outside.yaml").is_err());
        assert!(resolve_existing(&canonical_root, "outside.txt").is_err());
        fs::remove_dir_all(base).unwrap();
    }

    #[test]
    fn ignores_symlinked_directories_and_rejects_external_yaml() {
        let base = std::env::temp_dir().join(format!("bfe-symlink-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&base);
        let root = base.join("selected");
        let external = base.join("external");
        fs::create_dir_all(&root).unwrap();
        fs::create_dir_all(&external).unwrap();
        fs::write(external.join("secret.yaml"), "private").unwrap();
        let linked = root.join("linked");
        #[cfg(unix)]
        let link_result = std::os::unix::fs::symlink(&external, &linked);
        #[cfg(windows)]
        let link_result = std::os::windows::fs::symlink_dir(&external, &linked);
        if let Err(error) = link_result {
            #[cfg(windows)]
            if error.kind() == std::io::ErrorKind::PermissionDenied || error.raw_os_error() == Some(1314) {
                fs::remove_dir_all(base).unwrap();
                return;
            }
            panic!("ディレクトリのシンボリックリンクを作成できません: {error}");
        }
        let canonical_root = root.canonicalize().unwrap();
        assert!(list_yaml(&canonical_root).unwrap().is_empty());
        assert!(resolve_existing(&canonical_root, "linked/secret.yaml").is_err());
        assert!(create_yaml(&canonical_root, "linked/new.yaml", "private").is_err());
        assert!(!external.join("new.yaml").exists());
        assert_eq!(fs::read_to_string(external.join("secret.yaml")).unwrap(), "private");
        fs::remove_dir_all(base).unwrap();
    }

    #[test]
    fn rejects_symlinked_yaml_file_outside_selected_root() {
        let base = std::env::temp_dir().join(format!("bfe-file-link-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&base);
        let root = base.join("selected");
        fs::create_dir_all(&root).unwrap();
        let external = base.join("private.yaml");
        fs::write(&external, "private").unwrap();
        let linked = root.join("linked.yaml");
        // Windowsでは開発者モードまたはシンボリックリンク権限が必要な場合がある。
        #[cfg(unix)]
        let link_result = std::os::unix::fs::symlink(&external, &linked);
        #[cfg(windows)]
        let link_result = std::os::windows::fs::symlink_file(&external, &linked);
        if let Err(error) = link_result {
            #[cfg(windows)]
            if error.kind() == std::io::ErrorKind::PermissionDenied || error.raw_os_error() == Some(1314) {
                fs::remove_dir_all(base).unwrap();
                return;
            }
            panic!("シンボリックリンクを作成できません: {error}");
        }
        let canonical_root = root.canonicalize().unwrap();
        assert!(list_yaml(&canonical_root).unwrap().is_empty());
        assert!(resolve_existing(&canonical_root, "linked.yaml").is_err());
        assert_eq!(fs::read_to_string(&external).unwrap(), "private");
        fs::remove_dir_all(base).unwrap();
    }

    #[test]
    fn rejects_directory_and_non_yaml_file_as_existing_scenario() {
        let root = std::env::temp_dir().join(format!("bfe-existing-type-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("nested.yaml")).unwrap();
        fs::write(root.join("notes.txt"), "private").unwrap();
        fs::write(root.join("valid.YML"), "metadata: {}").unwrap();
        let canonical_root = root.canonicalize().unwrap();

        assert!(resolve_existing(&canonical_root, "nested.yaml").is_err());
        assert!(resolve_existing(&canonical_root, "notes.txt").is_err());
        assert_eq!(
            resolve_existing(&canonical_root, "valid.YML").unwrap(),
            canonical_root.join("valid.YML")
        );
        assert_eq!(list_yaml(&canonical_root).unwrap(), vec!["valid.YML"]);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_absolute_and_parent_traversal_paths_for_creation() {
        let root = std::env::temp_dir().join(format!("bfe-create-boundary-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let canonical_root = root.canonicalize().unwrap();

        for relative in ["../outside.yaml", "nested/../outside.yml", "/outside.yaml", "notes.txt"] {
            assert!(create_yaml(&canonical_root, relative, "private").is_err(), "{relative}");
        }
        assert!(list_yaml(&canonical_root).unwrap().is_empty());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_overwriting_existing_yaml_during_creation() {
        let root = std::env::temp_dir().join(format!("bfe-create-existing-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let target = root.join("scenario.yaml");
        fs::write(&target, "metadata: original").unwrap();

        assert!(create_yaml(&root, "scenario.yaml", "metadata: replaced").is_err());
        assert_eq!(fs::read_to_string(&target).unwrap(), "metadata: original");
        assert_eq!(list_yaml(&root).unwrap(), vec!["scenario.yaml"]);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn concurrent_creation_does_not_overwrite_existing_yaml() {
        let root = std::env::temp_dir().join(format!("bfe-create-concurrent-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let canonical_root = root.canonicalize().unwrap();

        // 同じ保存先への同時作成は1件のみ成功し、後続の内容で上書きされない。
        let results: Vec<_> = std::thread::scope(|scope| {
            let handles: Vec<_> = (0..8).map(|index| {
                let root = &canonical_root;
                scope.spawn(move || create_yaml(root, "scenario.yaml", &format!("writer-{index}")))
            }).collect();
            handles.into_iter().map(|handle| handle.join().unwrap()).collect()
        });
        assert_eq!(results.iter().filter(|result| result.is_ok()).count(), 1);
        let saved = fs::read_to_string(canonical_root.join("scenario.yaml")).unwrap();
        assert!(saved.starts_with("writer-"));
        assert_eq!(list_yaml(&canonical_root).unwrap(), vec!["scenario.yaml"]);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn native_yaml_round_trip_create_list_read_update() {
        let base = std::env::temp_dir().join(format!("bfe-roundtrip-{}", std::process::id()));
        let _ = fs::remove_dir_all(&base);
        let root = base.join("scenarios");
        fs::create_dir_all(root.join("nested")).unwrap();
        let canonical_root = root.canonicalize().unwrap();
        let relative = "nested/registration.yaml";
        let initial = "metadata:\n  title: 会員登録\nactors: []\nsteps: []\n";
        let edited = "metadata:\n  title: 会員登録（更新）\nactors: []\nsteps: []\n";

        create_yaml(&canonical_root, relative, initial).unwrap();
        assert_eq!(list_yaml(&canonical_root).unwrap(), vec![relative]);
        let target = resolve_existing(&canonical_root, relative).unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), initial);

        replace_yaml(&target, edited).unwrap();
        assert_eq!(fs::read_to_string(resolve_existing(&canonical_root, relative).unwrap()).unwrap(), edited);
        assert_eq!(list_yaml(&canonical_root).unwrap(), vec![relative]);
        assert!(create_yaml(&canonical_root, relative, initial).is_err());
        assert_eq!(fs::read_to_string(&target).unwrap(), edited);
        fs::remove_dir_all(base).unwrap();
    }

    #[test]
    fn unchanged_yaml_saves_with_expected_content() {
        let root = std::env::temp_dir().join(format!("bfe-save-expected-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let target = root.join("scenario.yaml");
        let original = "metadata: original\n";
        let edited = "metadata: updated\n";
        fs::write(&target, original).unwrap();

        replace_yaml_checked(&target, edited, Some(original)).unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), edited);
        // 保存成功後は新しい内容を比較基準にして再保存できる。
        replace_yaml_checked(&target, "metadata: final\n", Some(edited)).unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), "metadata: final\n");
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn externally_modified_yaml_is_not_overwritten() {
        let root = std::env::temp_dir().join(format!("bfe-save-conflict-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let target = root.join("scenario.yaml");
        let original = "metadata: original\n";
        let external = "metadata: external edit\n";
        fs::write(&target, original).unwrap();
        // エディターが開かれている間に別のアプリが内容を変更したケース。
        fs::write(&target, external).unwrap();

        let error = replace_yaml_checked(&target, "metadata: editor edit\n", Some(original)).unwrap_err();
        assert!(error.contains("保存競合"), "{error}");
        assert_eq!(fs::read_to_string(&target).unwrap(), external);
        assert_eq!(list_yaml(&root).unwrap(), vec!["scenario.yaml"]);
        let temporary_count = fs::read_dir(&root).unwrap().filter_map(Result::ok)
            .filter(|entry| entry.file_name().to_string_lossy().ends_with(".tmp")).count();
        assert_eq!(temporary_count, 0);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn concurrent_editors_cannot_overwrite_first_successful_save() {
        let root = std::env::temp_dir().join(format!("bfe-concurrent-editors-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let target = root.join("scenario.yaml");
        let original = "metadata: original\n";
        let first_edit = "metadata: editor A\n";
        let second_edit = "metadata: editor B\n";
        fs::write(&target, original).unwrap();

        // 両方のエディターが同じ原文を読み込んだ状態で保存を開始する。
        let first_target = target.clone();
        let second_target = target.clone();
        let first = std::thread::spawn(move || {
            replace_yaml_checked(&first_target, first_edit, Some(original))
        });
        let second = std::thread::spawn(move || {
            replace_yaml_checked(&second_target, second_edit, Some(original))
        });
        let first_result = first.join().unwrap();
        let second_result = second.join().unwrap();

        // 保存は必ず一方のみ成功し、もう一方は競合として拒否される。
        assert_ne!(first_result.is_ok(), second_result.is_ok());
        let winner = if first_result.is_ok() { first_edit } else { second_edit };
        let loser_error = if first_result.is_err() {
            first_result.unwrap_err()
        } else {
            second_result.unwrap_err()
        };
        assert!(loser_error.contains("保存競合"), "{loser_error}");
        assert_eq!(fs::read_to_string(&target).unwrap(), winner);
        assert_eq!(fs::read_dir(&root).unwrap().count(), 1);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn failed_update_preserves_original_and_cleans_temp_files() {
        let root = std::env::temp_dir().join(format!("bfe-save-failure-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let target = root.join("scenario.yaml");
        let backup = root.join(format!(".scenario.yaml.{}.backup", std::process::id()));
        fs::write(&target, "metadata: original").unwrap();
        fs::write(&backup, "conflict").unwrap();

        assert!(replace_yaml(&target, "metadata: overwritten").is_err());
        assert_eq!(fs::read_to_string(&target).unwrap(), "metadata: original");
        assert_eq!(fs::read_to_string(&backup).unwrap(), "conflict");
        assert_eq!(list_yaml(&root).unwrap(), vec!["scenario.yaml"]);
        let temporary_count = fs::read_dir(&root).unwrap().filter_map(Result::ok)
            .filter(|entry| entry.file_name().to_string_lossy().ends_with(".tmp")).count();
        assert_eq!(temporary_count, 0);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_excessive_scenario_directory_depth() {
        let root = std::env::temp_dir().join(format!("bfe-depth-limit-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("a/b")).unwrap();
        fs::write(root.join("a/b/scenario.yaml"), "metadata: {}").unwrap();
        assert!(list_yaml_with_limits(&root, 1, 100, 100).unwrap_err().contains("階層"));
        assert_eq!(list_yaml_with_limits(&root, 2, 100, 100).unwrap(), vec!["a/b/scenario.yaml"]);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_excessive_scenario_entry_and_file_counts() {
        let root = std::env::temp_dir().join(format!("bfe-entry-limit-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("first.yaml"), "metadata: {}").unwrap();
        fs::write(root.join("second.yml"), "metadata: {}").unwrap();
        assert!(list_yaml_with_limits(&root, 32, 1, 100).unwrap_err().contains("項目数"));
        assert!(list_yaml_with_limits(&root, 32, 100, 1).unwrap_err().contains("ファイル数"));
        assert_eq!(list_yaml_with_limits(&root, 32, 100, 2).unwrap().len(), 2);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn lists_yaml_recursively() {
        let root = std::env::temp_dir().join(format!("bfe-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("nested")).unwrap();
        fs::write(root.join("nested/test.yaml"), "metadata: {}").unwrap();
        fs::write(root.join("ignored.txt"), "ignored").unwrap();
        let found = list_yaml(&root).unwrap();
        assert_eq!(found, vec!["nested/test.yaml"]);
        fs::remove_dir_all(root).unwrap();
    }
}
