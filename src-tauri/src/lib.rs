use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;

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
    // 既存ファイルの上書きのみ許可する。新規作成は別コマンドで設計する。
    let target = resolve_existing(&current_root(&state)?, &relative_path)?;
    fs::write(target, content).map_err(|error| format!("YAMLを保存できません: {error}"))
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
