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
    let path = Path::new(relative);
    if path.as_os_str().is_empty()
        || path.is_absolute()
        || path.components().any(|part| !matches!(part, Component::Normal(_)))
    {
        return Err("相対パスを指定してください".into());
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

fn list_yaml(root: &Path) -> Result<Vec<String>, String> {
    fn visit(root: &Path, current: &Path, found: &mut Vec<String>) -> Result<(), String> {
        for entry in fs::read_dir(current).map_err(|error| error.to_string())? {
            let entry = entry.map_err(|error| error.to_string())?;
            let kind = entry.file_type().map_err(|error| error.to_string())?;
            // シンボリックリンク経由のディレクトリ外アクセスを禁止する。
            if kind.is_symlink() {
                continue;
            }
            let path = entry.path();
            if kind.is_dir() {
                visit(root, &path, found)?;
            } else if kind.is_file()
                && matches!(
                    path.extension().and_then(|value| value.to_str())
                        .unwrap_or("").to_ascii_lowercase().as_str(),
                    "yaml" | "yml"
                )
            {
                let relative = path.strip_prefix(root).map_err(|error| error.to_string())?;
                found.push(relative.to_string_lossy().replace('\\', "/"));
            }
        }
        Ok(())
    }
    let mut found = Vec::new();
    visit(root, root, &mut found)?;
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
) -> Result<(), String> {
    // 既存ファイルのみ更新する。書き込み失敗時に元ファイルを破損させない。
    let target = resolve_existing(&current_root(&state)?, &relative_path)?;
    replace_yaml(&target, &content)
}

// 同じディレクトリの一時ファイルへ書き込み、同期後に置き換える。
// Windowsではrenameによる既存ファイルの置き換えが失敗する環境もあるため、
// 元ファイルを退避してから切り替え、失敗した場合は復元する。
fn replace_yaml(target: &Path, content: &str) -> Result<(), String> {
    let _guard = YAML_SAVE_LOCK.lock().map_err(|_| "保存処理のロックを取得できません".to_string())?;
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
    if let Err(error) = file.write_all(content.as_bytes()).and_then(|_| file.sync_all()) {
        drop(file);
        let _ = fs::remove_file(&temp);
        return Err(format!("一時ファイルへの書き込みに失敗しました: {error}"));
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
