# Business Flow Explorer Tauri版 — 開発ルール

環境構築・コマンドは `docs/development.md`、機能仕様は `docs/SPECIFICATION.md` を参照してください。

## リポジトリとブランチ

- Tauri版：https://github.com/Renasan-h/business-flow-explorer-tauri
- Web版（参考）：https://github.com/Renasan-h/business-flow-explorer
- 通常開発：`develop_tauri`。正式リリース：`main`。
- リリース時は原則として リリース準備ブランチから `main` にPull Requestを作り、確認後にマージする。既存の作業を無断で巻き戻し・上書きしない。
- READMEは利用者向けの製品説明と画面画像に限定し、開発方針、進捗、CI、内部構造は `docs/` に置く。

## 実装・コミット

- 1コミット1責務を原則とする。関連変更は必要に応じてまとめる。
- コミットメッセージは既存履歴に合わせて `[BusinessFlowExplorerTauri]変更概要` を先頭とし、本文に変更内容と対象ファイルを日本語で記載する。
- 不必要なリファクタや無関係なファイル変更を混ぜない。ユーザーが明示していない危険な強制push、履歴改変、削除は避ける。
- 既存のデータ保護、YAML互換性、ネイティブパス検証を維持する。

## 検証とCI

- 変更箇所に応じてTypeScriptビルド、Playwright E2E、Rustテスト、Rust compile check、Windows実機確認を行う。
- 基本コマンドは `docs/development.md` に記載。
- GitHub Actionsのワークフローは現在すべて `workflow_dispatch` のみ。push/PRでの自動実行は行わない。
- 無料枠・請求上限によりジョブが開始しない場合、コードのテスト失敗と区別し「CI未検証」と報告する。
- テスト成功と報告する際は対象コミット、実行コマンドまたはActions run、結果を明記する。過去の成功を新しいコミットの成功として扱わない。
- CIを手動実行する場合は実行コストを考慮し、必要なワークフローを選ぶ。実行不可の場合はローカル検証と未検証項目を明記する。
- 画面画像・GIFは実アプリのキャプチャを優先。Web版から流用した画像はTauri版の実画面と誤認させず、参考画像と明記する。
