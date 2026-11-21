# Business Flow Explorer Tauri版 — 開発引き継ぎ・残作業

最終更新：2026-11-21（日本時間）
統合CI追加検証時の基準HEAD：`2484a1ddf20cac49c7fe5b40c2da321083833584`（本ファイル更新直前）
CI全ワークフロー固定時の基準HEAD：`ac3e94d04f3b0736a6af63f6ed3d583b350dc510`（本ファイル更新直前）
CI依存固定対応時の基準HEAD：`3019af270abda1d3c2cfd5c594dace5a14d3eb7f`（本ファイル更新直前）
P2対応時の基準HEAD：`6b8e9338dc4e7be26a247521fb32f858f84ea402`（本ファイル更新直前）
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

**状態：手動起動・Draft限定の自動添付を実装／CI未実行**

- [x] `release.yml` に `publish_draft` 入力（既定false）を追加。
- [x] 指定タグとチェックアウトコミット・main祖先・アプリバージョンの一致を検証。
- [x] ビルド成功後のArtifactをDraft Releaseに添付し、公開済みReleaseの変更を拒否。再実行時はDraftに限り既存ファイルを置換。
- [ ] Actionsでの実動作と公開結果を検証する。**自動で公開済み状態にはしない。**

- [ ] `release.yml` で生成したNSISとPortable ZIPを、指定タグのGitHub Releaseに添付できるようにする。
- [ ] タグと `main` の整合、権限、二重公開防止、失敗時の再実行を設計する。
- [ ] 手動起動の方針を維持し、意図しない公開が起きないようにする。

**完了条件：** 手動実行から指定リリースへ、検証済みArtifactを安全に掲載できる。

### P2-2 Windowsコード署名

**状態：署名方式と未署名プレリリース方針案を文書化／取得・署名は未実施**

- [x] `docs/WINDOWS_CODE_SIGNING.md` に証明書方式、鍵保護、署名検証、未署名時の利用者向け説明を記載。
- [ ] 実際の費用・取得資格を確認し、正式版の署名方針を確定する。

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

## 9. P2作業結果

- `c257dc9`：Windowsコード署名方針を文書化。
- `c9342b4`〜`6b8e933`：手動リリースワークフローにDraft作成・Artifact添付・タグ照合を追加。
- **ワークフローは実行しておらず、CI成功・Draft作成成功を確認していない。**
- **解消：** ユーザーのpush後、`develop_tauri` の `8b895e5` で `package-lock.json` が存在することをGitHubツリーから確認。
- `3019af2`：`full-check.yml` の依存インストールを `npm ci` に固定し、Playwrightの二重インストールを削除。
- `ebe6e5f`、`4a3ba08`、`ac3e94d`：Frontend checks / Rust unit tests / Rust compile check の各手動CIも `npm ci` に統一。
- `2484a1d`：統合CIにバージョン整合とYAML断片参照検証を追加。
- **変更後のワークフローは未実行。** 2026-11-21確認時点でActionsの最新runは2026-11-19の `44578013972`（failure、旧SHA）。現行HEADに対する成功実行はない。
- ユーザーからRustの再テストは「問題ありませんでした」と報告あり。実行ログ・SHAは未取得のため、GitHub Actionsでの成功とは区別する。

## 9.1 Windowsローカルビルド結果（2026-11-21 ユーザー報告）

- ユーザー提供の `cargo-build.log` に `Finished dev profile [unoptimized + debuginfo] target(s) in 0.34s` を確認。`cargo check --manifest-path src-tauri/Cargo.toml -vv` は成功。依存ライブラリのwarningはあるが、当該ログにエラーはない。
- ユーザーより `npm run build` が問題なく終了したとの報告あり。**ローカルのWindows向け配布ビルド成功（報告ベース）**として扱う。生成物の起動・ZIP展開・NSISインストールは未確認。
- 実行時のローカルSHAは未取得のため、`develop_tauri` 現行HEAD `542c225` での検証成功と同一視しない。
- WIN-01〜24は実行証跡未取得のためすべて未判定。次にWIN-01〜03、WIN-05〜13の起動・保存・競合・未保存遷移を優先し、実行結果を `docs/WINDOWS_ACCEPTANCE_TESTS.md` の様式で記録する。
- 2026-11-21のGitHub Actions確認では最新runは旧SHAの `44578013972`（failure）。現行HEADのCIは未実行。

## 9.2 Windows実機受け入れ試験（2026-11-21 ユーザー報告）

- `bcdd40c`：`docs/WINDOWS_ACCEPTANCE_TESTS.md` に結果を記録。WIN-01、02、03、05、06、07、09、10、11、12、13 の11件がユーザー報告ベースでPASS。FAIL報告なし。
- WIN-04、08、14〜24の13件は未検証。テスト実行時のSHA、配布物、ログは未取得。現行HEADの完全検証とみなさない。
- **次の実機優先ケースはWIN-04・08・14〜17、その後WIN-18〜24。** 現行HEADのGitHub Actionsは未実行。

## 9.3 再生順マーカードラッグ不具合（2026-11-21）

- ユーザーより「ドラッグによる再生順序の変更ができない」と報告。フロー図の番号マーカーと右側一覧のドラッグのどちらかは未特定。
- `8925013`：`src/FlowEditor.tsx` のマーカーのドロップ先判定を、固定32ワールド座標からマーカー半径・表示倍率に応じた距離判定へ変更し、最短候補を選択。
- **コード修正済み、ローカルテスト・Windows実機再確認・GitHub Actionsは未実行。** 再現原因がこれで解消するか未確認。右側の通信再生順リストのHTML Drag & Dropは変更していない。
- 次回、フロー図上の番号ドラッグと右側リストのドラッグの両方を確認し、失敗する操作を特定する。

## 10. 次の作業

**第一候補：P0-1（Windows実機テストの実行）とP0-2（CI制限の状況確認・手動実行）。その後P1の実機確認とP2を進める。** ユーザーから「続けて」と指示されたら、GitHub最新状態を確認して優先順に着手する。Windows実機を操作できない環境では、テスト手順・自動化可能な部分を整備し、実機未検証を明記する。

## 11. ドキュメント運用

- `README.md`：利用者向けの製品紹介と画面画像のみ。
- `docs/user-guide.md`：操作方法。
- `docs/development.md`：技術構成、ローカル検証、CI・配布手順。
- `docs/SPECIFICATION.md`：機能仕様・設計の決定事項。
- `docs/DEVELOPMENT_RULES.md`：継続開発のルール。
- `docs/HANDOVER.md`：最新の進捗、検証状況、残作業、次の一手。
- `docs/WINDOWS_ACCEPTANCE_TESTS.md`：Windows実機の受け入れ試験と結果記録様式。
- `docs/RELEASE_NOTES_v0.1.0.md`：初回リリースノート案。
- `docs/WINDOWS_CODE_SIGNING.md`：コード署名の判断・保護・検証方針。

**注意：** 本ファイルの作成はドキュメント変更であり、アプリのテスト成功やリリース完了を意味しない。
