import { invoke } from '@tauri-apps/api/core';

// WebブラウザとTauriの保存経路を分離する。Tauriの保存先は選択済みフォルダ内に限定する。
type FilePicker = { showSaveFilePicker?: (options: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<{ createWritable: () => Promise<{ write: (content: string) => Promise<void>; close: () => Promise<void> }> }> };
type SaveOptions = { scenarioPath?: string; isNew: boolean; filename: string; yaml: string; nativeCreatedPath: string | null };
type SaveResult = { message: string; nativeCreatedPath?: string };

export async function saveScenarioYaml(options: SaveOptions): Promise<SaveResult> {
 const { scenarioPath, isNew, filename, yaml, nativeCreatedPath } = options;
 if (scenarioPath?.startsWith('/scenarios/native/')) {
  // 初回作成後は同じファイルへ更新し、再保存時の重複作成を避ける。
  const creating = isNew && nativeCreatedPath === null;
  const relativePath = nativeCreatedPath ?? (isNew
   ? filename
   : decodeURIComponent(scenarioPath.slice('/scenarios/native/'.length)));
  await invoke(creating ? 'create_scenario_file' : 'write_scenario_file', { relativePath, content: yaml });
  return {
   nativeCreatedPath: creating ? relativePath : undefined,
   message: creating ? '選択したフォルダに新しいYAMLを作成しました。' : '選択したフォルダのYAMLを上書き保存しました。',
  };
 }
 // 同梱シナリオは読み取り専用。ブラウザでは保存先選択またはダウンロードを使う。
 const picker = (window as Window & FilePicker).showSaveFilePicker;
 if (picker) {
  const handle = await picker({ suggestedName: filename, types: [{ description: 'YAML scenario', accept: { 'application/x-yaml': ['.yaml', '.yml'] } }] });
  const writable = await handle.createWritable();
  await writable.write(yaml);
  await writable.close();
  return { message: 'YAMLを保存しました。Web上の元シナリオは自動更新されません。' };
 }
 const url = URL.createObjectURL(new Blob([yaml], { type: 'application/x-yaml' }));
 try {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
 } finally {
  URL.revokeObjectURL(url);
 }
 return { message: 'YAMLをダウンロードしました。元シナリオの更新にはファイルの差し替えが必要です。' };
}
