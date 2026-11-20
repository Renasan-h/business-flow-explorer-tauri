# Business Flow Explorer Tauri版 — 開発引き継ぎ・残作業

最終更新：2026-11-21（日本時間）
Rustテスト修正時の基準HEAD：`393ebaab9ba19b23fb2fac9b5f26bb9ac217fa25`（本ファイル更新直前）
P1対応時に確認した基準HEAD：`49909a52725bf1aff129b842e79a90ac2aaf4c79`（本ファイル更新直前）
P0対応時に確認した基準HEAD：`8982f0f46a0733da07d6e3a3adc64ed3293e38fc`（本ファイル更新直前）
確認した基準コミット：`86e8991fecc4c948f60b9059f25cf46d3d023db2`（本ファイル追加前の `develop_tauri` HEAD）
**再開時は必ずGitHubの最新HEADを再取得すること。** このファイルの記載は自動更新されない。

## 1. 最初に確認すること

1. 対象：https://github.com/Renasan-h/business-flow-explorer-tauri 、開発ブランチ `develop_tauri`、リリースブランチ `main`。
2. `docs/SPECIFICATION.md`（仕様）、`docs/DEVELOPMENT_RULES.md`（作業ルール）、`docs/development.md`（検証・ビルド手順）を読む。
3. `git log` / Pull Request / Actionsで基準コミット以降の変更を確認する。
4. このファイルの「リリース前に改善したい点」から未完了項目を選び、作業と検証を進める。
5. 「完了」「未検証」「保留」を区別して報告する。

## 2. 現状（確認できた内容）

- Windowsデスクトップアプリ（Tauri 2 / Rust、React / TypeScript / Vite、PixiJS）。YAMLでフローを定義し、編集・再生する。
- 編集：ノード、通信線、領域、IF定義、再生順、複数選択、ズーム、Undo/Redo、経由点。再生：通信アニメーション、速度、分岐、ノード詳細など。
- ローカルフォルダのYAML読込・保存、保存競合の検出を実装。実機での完全な品質保証は未確認。
- `README.md` は利用者向け説明のみ。 `docs/images/` にWeb版からコピーしたTechnical / Illustration / Editor / Previewの画像4枚を配置し、READMEでWeb版参考画像と明記している。
- `.github/workflows/frontend-check.yml`、`full-check.yml`、`rust-check.yml`、`rust-test.yml`、`release.yml` はすべて手動実行（`workflow_dispatch`）。無料枠節約のため自動実行しない。
- GitHub Actionsは過去に請求・利用上限によりジョブ開始前に失敗した。**現行コミットでのCI成功は未確認**。課金制限が現在解消したかも未確認。
- `release.yml` は `main` で手動実行し、入力した `release_ref` がmain履歴に含まれることを検証する。Windows NSISとPortable ZIPをArtifactとして出力する。**GitHub Releasesへの自動公開は未実装**。
- バージョンは `package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` で `0.1.0`。タグと公開済みReleaseの有無はリリース作業前に確認する。

## 3. 直近の主な作業（確認用）

- `ffde90b60be8060e10dde52dd2794e35d29464e2`：READMEをツール紹介専用に整理。
- `bc125a5f5a62569fdaf07aedbfb6a5218961de84`：Web版の画面画像4枚を `docs/images/` に追加。
- `737c583f8d1be3bd677d3f05cedd16d586a85d3f`：READMEへ画面画像を掲載。
- `967d8aa1a11123d13faf27fb2f9b5cf4cf27f7a1`：`docs/SPECIFICATION.md` を追加。
- `86e8991fecc4c948f60b9059f25cf46d3d023db2`：`docs/DEVELOPMENT_RULES.md` を追加。
- 本ファイルの追加は次のコミットになる。最新コミットの特定は常にGitHubで行う。

## 4. リリース前に改善したい点（優先順位付き）

以下は**今後の作業候補であり、完了済みではない**。着手時に実装・CI・Issueを再確認し、対応の要否を判定する。

### P0-1 Windows実機の起動・保存・再起動テスト

**状態：24件の実機受け入れケースを整備済み／Windows実機での実行は未検証**

- [x] `docs/WINDOWS_ACCEPTANCE_TESTS.md` にNSIS・Portable ZIP・保存・競合・再生・編集・パス保護の24ケース、期待結果、記録様式を作成。

- [ ] Windows 11でNSISインストーラーとPortable ZIPをそれぞれ起動できる。
- [ ] 新規シナリオ作成、既存YAML読込、編集、保存、再読込、アプリ再起動後の再表示を確認する。
- [ ] 保存競合、読み取り専用ファイル、保存失敗、未保存状態での画面遷移を確認する。
- [ ] 双方向通信、分岐、サブシナリオ、IF定義、Undo/Redo、負座標・縮尺30%の編集操作を確認する。
- [ ] 実行したビルドのSHA、Windows環境、検証結果、未検証ケースを記録する。

**完了条件：** 重要シナリオの実機検証結果を残し、致命的な不具合がないこと。ブラウザE2Eだけで代替しない。

### P0-2 CI実行環境の復旧とリリース対象の検証

**状態：直近Actionsの履歴を確認済み／CI未検証・ジョブ開始制限の解消は未確認**

- [x] Actions実行履歴を確認。最新の確認対象はrun `44578013972`（2026-11-19 UTC、`bc42b5a`、failure）。現在のHEADに対する成功実行は確認できない。
- [x] 既存の手動実行設定を確認。利用可能なGitHub連携操作に新規workflow_dispatch実行機能がないため、この作業では手動CIを起動していない。

- [ ] GitHub Actionsの請求・利用上限によるジョブ開始制限が解消したか確認する。
- [ ] `Full development checks` を `develop_tauri` で手動実行し、対象SHAと実行番号を記録する。
- [ ] TypeScript、Playwright E2E、Rustテスト・チェック、Windowsビルド、配布Artifactの成功を確認する。
- [ ] 失敗時はジョブが開始したかを切り分け、コード・環境起因なら修正後に再実行する。

**完了条件：** 対象コミットで必要なジョブが実際に成功。請求制限でジョブ未開始なら「未検証」を維持。

### P1-1 バージョン管理の統一

**状態：整合性検証スクリプトを実装済み／配布exeの表示バージョンは未検証**

- [x] `scripts/check-version.mjs` でpackage.json・Tauri・Cargoの一致、指定タグの一致を検証する仕組みを追加。
- [x] `npm run check:version` と `npm run check:version -- v0.1.0` を追加。
- [x] `docs/development.md` に更新手順を記載。

- [ ] `package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` のバージョン整合性を確認する。
- [ ] バージョン更新手順または検証スクリプトを整備し、タグ（例：`v0.1.0`）との対応を明確にする。
- [ ] ビルド後のアプリ表示バージョンと配布物の名前・タグの整合性を確認する。

**完了条件：** バージョン不一致を検出でき、リリース手順が再現可能。

### P1-2 リリースノートの整備

**状態：初回リリースノートのドラフト作成済み／実機結果・公開日未確定**

- [x] `docs/RELEASE_NOTES_v0.1.0.md` に機能、Windows 11 x64、WebView2、NSIS・Portable ZIPの違い、署名・実機未検証の注意点を記載。

- [ ] 初回リリースの主要機能、変更点、既知の制限、動作環境、ZIPとインストーラーの違いをまとめる。
- [ ] READMEには開発状況を戻さず、GitHub Releases本文または `docs/` で管理する。
- [ ] リリース候補の実機検証状況と既知の問題を正確に記載する。

**完了条件：** 初めて使う利用者が入手・起動・制限事項を把握できる。

### P2-1 GitHub Releasesへの自動アップロード

**状態：未着手**

- [ ] `release.yml` で生成したNSISとPortable ZIPを、指定タグのGitHub Releaseに添付できるようにする。
- [ ] タグと `main` の整合、権限、二重公開防止、失敗時の再実行を設計する。
- [ ] 手動起動の方針を維持し、意図しない公開が起きないようにする。

**完了条件：** 手動実行から指定リリースへ、検証済みArtifactを安全に掲載できる。

### P2-2 Windowsコード署名

**状態：未着手／公開方針と費用を踏まえ判断**

- [ ] コード署名証明書の調達方法、費用、秘密鍵保管方法を比較する。
- [ ] CIシークレットと署名手順を検討し、署名の検証を実装するか判断する。
- [ ] 署名未対応で公開する場合は、利用者への説明とWindowsの警告について適切に記載する。

**完了条件：** 署名実装または未実装での公開判断が記録されている。

## 5. リリース手順（現在の想定）

1. `develop_tauri` でP0検証を実施し、必要な修正をコミット。
2. リリース対象バージョンを確定し、関連ファイルを更新。
3. `develop_tauri` から `main` へPull Requestを作り、確認後にマージ。
4. `main` の対象コミットにバージョンタグを作成（例：`v0.1.0`）。
5. Actions → `Tauri Windows release build` → `main` を選択し、`release_ref` にタグまたはSHAを入力して手動実行。
6. 成功したArtifact（`business-flow-explorer-windows`、`business-flow-explorer-portable-windows-x64`）を確認。
7. 現在はGitHub Releasesに手動でファイルを添付して公開。P2-1完了後はその手順に従う。
8. 実機確認が不足する場合は正式版ではなくプレリリース扱いを検討する。

## 6. 今回のP0作業結果

- `8982f0f46a0733da07d6e3a3adc64ed3293e38fc`：`docs/WINDOWS_ACCEPTANCE_TESTS.md` にWindows実機受け入れ試験24ケースを追加。
- GitHub Actionsの過去のrunを確認したが、現行HEADでの成功は確認できなかった。過去runのログ取得も失敗したため、請求制限が現在も続いているかは断定しない。
- **Windows実機操作・インストーラー起動・保存再起動の実行はできていない。P0完了とは判定しない。**
- 次はWindows 11実機で受け入れケースを実行し、GitHub Actionsの手動実行が可能な環境で`Full development checks`を起動・確認する。実行結果を本書へ記録する。

## 7. P1対応結果とローカルテストコマンド

- `c7cf336`：`scripts/check-version.mjs` を追加。
- `d828858`：`package.json` に `npm test`、`test:unit`、`test:e2e`、`test:rust`、`test:all`、`check:version` を追加しPlaywrightをdevDependenciesに登録。
- `59d4220`：`docs/RELEASE_NOTES_v0.1.0.md` を追加。
- `91d9853`：`docs/development.md` にローカル検証手順を追記。
- `49909a5`：Cargo.tomlのバージョン抽出処理を修正。
- 初回は `npm install`、`npx playwright install chromium` を実行し、以降 `npm test` でフロントエンド・Playwright・Rustテストをまとめて実行する。
- **現行HEADのローカルテスト、GitHub Actions、Windows実機テストは未実行。** スクリプトを追加したこととテスト成功は別扱い。
- P1-1は実機での表示バージョン・配布物確認が残る。P1-2は公開前のP0結果反映が残る。いずれも完全完了とは判定しない。

## 8. ローカルRustテストのWindows権限エラー対応

- ユーザー実行の `npm test` ではTypeScript/Viteビルド、バージョン整合、シナリオ参照検証が成功。
- Rust 22件中20件が成功、2件はWindowsでシンボリックリンクを作成する際の `os error 1314`（必要な特権なし）により失敗。
- `393ebaab9ba19b23fb2fac9b5f26bb9ac217fa25`：`src-tauri/src/lib.rs` の該当テストで、WindowsのPermissionDeniedまたはos error 1314に限り作成不能時に終了するよう変更。権限がある環境では従来のパス保護アサーションを実行。
- **修正後のRustテストは未実行。** Windowsで `npm run test:rust` または `npm test` を再実行し、22件の結果を確認する。権限不足でスキップした2件はセキュリティ挙動を実証していないため、開発者モード等での再検証も必要。

## 9. 次の作業

**第一候補：P0-1（Windows実機テストの実行）とP0-2（CI制限の状況確認・手動実行）。その後P1の実機確認とP2を進める。** ユーザーから「続けて」と指示されたら、GitHub最新状態を確認して優先順に着手する。Windows実機を操作できない環境では、テスト手順・自動化可能な部分を整備し、実機未検証を明記する。

## 10. ドキュメント運用

- `README.md`：利用者向けの製品紹介と画面画像のみ。
- `docs/user-guide.md`：操作方法。
- `docs/development.md`：技術構成、ローカル検証、CI・配布手順。
- `docs/SPECIFICATION.md`：機能仕様・設計の決定事項。
- `docs/DEVELOPMENT_RULES.md`：継続開発のルール。
- `docs/HANDOVER.md`：最新の進捗、検証状況、残作業、次の一手。
- `docs/WINDOWS_ACCEPTANCE_TESTS.md`：Windows実機の受け入れ試験と結果記録様式。
- `docs/RELEASE_NOTES_v0.1.0.md`：初回リリースノート案。

**注意：** 本ファイルの作成はドキュメント変更であり、アプリのテスト成功やリリース完了を意味しない。
