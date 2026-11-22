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

## 9.4 右側の再生順一覧ドラッグ修正（2026-11-21）

- ユーザー確認により、ドラッグできない対象はフロー図上マーカーではなく**右側「通信の再生順」一覧**と確定。
- `d993b1d`：`src/editor/PlaybackOrderPanel.tsx` のHTML Drag & DropをPointer Events + pointer capture + `elementFromPoint` に変更。移動先強調、移動後の`order`再採番、キーボード上下矢印操作を追加。
- ローカル検証を試みたが実行環境からgithub.comの名前解決に失敗しclone不可。**ビルド・Playwright・Windows実機・GitHub Actionsは未実行。**
- 次はユーザーのWindows環境で `npm run build:web`、再生順一覧のドラッグ操作（上→下、下→上、キャンセル）、保存・再読込、Undo/Redoを確認する。必要に応じてPlaywright回帰テストを追加する。

## 9.5 TOPフォルダ選択のTauri APIエラー（2026-11-21）

- ユーザーから `Cannot read properties of undefined (reading 'invoke')` を報告。`src/App.tsx` の `select_scenario_folder` 呼び出しでTauriブリッジが存在しない場合に起こり得る。通常ブラウザーで開いた可能性があるが、実際の実行環境は未確認。
- `4b9f48d`：`src/App.tsx` で `isTauri()` によるガードを追加し、ブラウザーではネイティブフォルダ選択ボタンを無効化。デスクトップ側の選択処理は維持。
- **修正後のビルド、実機動作、CIは未実行。** ユーザーに `npm run dev` で起動したTauriウィンドウかブラウザーかを確認し、Windows実機でフォルダ選択を再検証する。

## 9.6 開発時の同梱シナリオ読み込み失敗（2026-11-21）

- ユーザーよりChromeと`npm run dev`で起動するTauriウィンドウの両方で同梱シナリオが読み込めず、exeでは正常との報告。
- 原因：Vite開発プラグインは`/scenarios/0/manifest.json`および`/scenarios/0/<yaml>`を要求するが、`src/scenario.ts`は`/scenarios/manifest.json`と`/scenarios/<yaml>`をfetchしていた。開発サーバーが404を返す構成不一致。
- `deb07db`：開発時は番号付きURL、配布時は従来の静的URLへ切替。両環境のURL仕様を分離。
- **ビルド・E2E・Windows実機・GitHub Actions未実行。** Chrome/Tauri開発ウィンドウで一覧と再生が回復することを確認する。

## 9.7 開発時シナリオ一覧表示後のYAML fetch失敗（2026-11-21）

- ユーザーより、前回修正後はシナリオ一覧が読み込めるが選択画面が「読み込み中... TypeError: Failed to fetch」となると報告。
- `src/scenario.ts` のYAML取得処理を調査。失敗するURLやHTTPステータスが現状のUIに表示されないため、`67a7e5f`でURL・HTTP状態を含むエラー表示に改善。
- **根本原因は未特定、動作確認・ビルド・E2E・GitHub Actionsは未実行。** 次回は失敗URLとブラウザーNetwork/Console、Viteターミナルのログを確認し、再現原因に対応する。

## 9.8 Tauri版の再生順ドラッグ回帰テスト追加（2026-11-22）

- ユーザー方針：Web版は移植元の参照のみ。Chromeでの挙動はTauri版に影響する場合を除きリリース判定対象外。
- `5a4cc49`、`c12077c`：`scripts/test-editor-e2e.mjs` に右側「通信の再生順」一覧のPointer Eventsによる上→下、下→上ドラッグとCtrl+Zの回帰テストを追加。期待表示名を同梱YAMLに合わせた。
- `develop_tauri` の作業開始時HEADは `bb58c7222b03f087ea8e0ee99281c149e3ed9556`。引き継ぎの直近コミットと一致。
- ローカルGit cloneを試したが `Could not resolve host: github.com` で失敗。**新規E2E、ビルド、Windows実機、GitHub Actionsは未実行。**
- 次はTauri開発ウィンドウでの同梱シナリオ読込、再生順ドラッグの動作を確認し、`npm run test:e2e`を実行して結果に応じて修正する。GitHub Actionsは手動実行のみ。

## 9.9 再生順ドラッグのキャンセル・キーボード回帰テスト（2026-11-22）

- 作業開始時HEAD：`8e686d44c169f98660b4cb4665b2b5c6a05dacee`。直近引き継ぎコミットと一致。
- `32601e9`：`scripts/test-editor-e2e.mjs` にPointer Eventsのドラッグキャンセル時の順序維持、およびハンドルの上下矢印キーによる並べ替えとCtrl+Z復元の検証を追加。
- Git cloneを再試行したが `Could not resolve host: github.com` のため取得不可。**追加テスト・ビルド・Windows実機・GitHub Actionsは未実行。** コード追加をPASSとはみなさない。
- 次は `npm run test:e2e` の実行結果を取得し、Tauri開発ウィンドウとexeで再生順ドラッグと同梱シナリオ読込を確認する。CIは手動実行のみ。

## 9.10 上下ボタンの再生順order再採番修正（2026-11-22）

- 作業開始時HEAD `7a87b4b5e27f2d46633d252da3e9c123801a8436` と引き継ぎを照合。
- `cd4e16b`：`src/editor/PlaybackOrderPanel.tsx` の共通 `setSteps` で並べ替え後の `order` を1から再採番。ドラッグでは再採番されていたが、上下ボタンは配列だけ入れ替えていたため挙動を統一。
- ローカル `git ls-remote` は `Could not resolve host: github.com`。**ビルド・E2E・Windows実機・GitHub Actions未実行。** テストPASSや保存不具合解消は未確認。
- 次回は `npm run test:e2e` とTauri実機でドラッグ、上下ボタン、保存・再読込の順序を検証。CIは手動実行。

## 9.11 再生順ドラッグのEscape中断（2026-11-22）

- 作業開始時HEAD `c51409f1d27154c4a001caf721dc889d9569a116` と引き継ぎ資料を照合。
- `a89dbf8`：`PlaybackOrderPanel.tsx` のドラッグ中にEscapeでキャンセルできるようにし、再採番の二重処理を共通関数へ集約。
- `3575b21`：PlaywrightでEscape中断後の順序維持を検証するケースを追加。
- 一度保存YAMLにorder連番を必須とするテストを追加したが、同梱YAMLはorder省略仕様だったため、`fe360f0`で不適切な期待値を撤回。既存のID順検証は維持。
- ユーザー方針によりテストはWindows側で実行。**本変更のビルド・E2E・Tauri実機・GitHub Actionsは未実行。** 結果を受けて修正する。ローカルGit接続エラーを理由にGitHub連携での開発は止めない。

## 9.12 Escapeキャンセルのフォーカス修正（2026-11-22）

- 作業開始時HEAD `ae706c931a6fc9854ade1f55edcb8a4a6e7daaf2` を確認し、引き継ぎ資料と一致。
- `ff01062`：ドラッグ開始時の `preventDefault()` でフォーカスが移らずEscキーがハンドルへ届かない可能性があったため、`onPointerDown` で `event.currentTarget.focus()` を明示。
- ユーザー方針によりテストはユーザーのWindows環境で実施。**ビルド・E2E・Tauri実機・GitHub Actionsは未実行。** テスト結果で動作を確定する。

## 9.13 Windowsビルド時のVite ImportMeta型エラー修正（2026-11-22）

- ユーザーがWindows UCRT64で `npm run build` を実行し、`src/scenario.ts:140,260` の `import.meta.env.DEV` に対して `TS2339: Property 'env' does not exist on type 'ImportMeta'` が発生したと報告。
- 作業開始時HEAD `816c7ccf00cf2ba87b648597a27575f5fb3f2631` を確認。`tsconfig.json` にViteの型参照が存在しなかった。
- `6a2aee0`：`tsconfig.json` の `compilerOptions.types` に `vite/client` を追加し、Viteの `ImportMetaEnv` 型をTypeScriptへ読み込ませる。
- **修正後のビルド・E2E・Rust・Windows実機・GitHub Actionsは未実行。** ユーザーのWindows側で `git pull origin develop_tauri` 後、`npm run build` を再実行して確認する。追加エラーがあればログに基づき修正。

## 9.14 Backspace/Deleteによるノード削除（2026-11-22）

- 作業開始時HEAD `2901001efd1da1581806b0273e0962c3910dcaed` を確認し、仕様・開発ルールを参照。
- `3e5bb7d`：`src/FlowEditor.tsx` でBackspace/Deleteによる単一・複数選択ノード削除を追加。確認ダイアログ1回、関連通信削除、選択解除、入力欄・ダイアログ・プレビュー中の無効化を実装。
- `3bf4f3f`：`scripts/test-editor-e2e.mjs` にBackspaceの確認キャンセル、Deleteの削除確定、Ctrl+Z復元の回帰ケースを追加。
- `4855cb2`：`docs/SPECIFICATION.md` に操作仕様を反映。
- **ビルド・E2E・Windows Tauri実機・GitHub Actionsは未実行。** ユーザーのWindows環境で `npm run build` と `npm run test:e2e` を実行して結果を確認する。複数選択の実機削除も確認対象。

## 9.15 Windows E2Eのフォルダ選択ボタンdisabled修正（2026-11-22）

- 作業開始時HEAD `54d615f8724d59351fbe3e6cff9ca69f3d7fa589` と引き継ぎ資料を照合。
- ユーザー実行 `npm run test:e2e` が `scripts/test-editor-e2e.mjs:99` の「ローカルのシナリオフォルダを開く」ボタンのdisabled状態で30秒タイムアウト。
- `@tauri-apps/api/core` の `isTauri()` は `globalThis.isTauri` を参照するが、テストの `addInitScript` は `__TAURI_INTERNALS__` のinvokeのみモックしていた。
- `cb12d73`：2つのネイティブ保存テスト画面で `window.isTauri = true` を設定。フォルダ選択ボタンの無効化を回避する。
- Node.js v24の `DEP0190` はshell=trueで子プロセス起動時の警告で、今回のクリックタイムアウトとは別件。必要に応じてspawn方法を後日改善。
- **修正後E2E・ビルド・Windows実機・GitHub Actionsは未実行。** Windows側で `git pull origin develop_tauri` 後に `npm run test:e2e` を再実行して結果を確認する。

## 9.16 Windows E2Eの既存シナリオ読み込み待機修正（2026-11-22）

- 作業開始時HEAD `509fdd30d65d7c765dc5e3bafc7641f9319a560d` と引き継ぎ資料を確認。
- ユーザー実行 `npm run test:e2e` が `scripts/test-editor-e2e.mjs:441` の「ECサイトの注文処理」見出し待機で30秒タイムアウト。
- `scenario.ts` は開発時に `/scenarios/0/manifest.json` と `/scenarios/0/order-processing.yaml` を参照し、`vite.config.ts` のプラグインもこのURLを処理する。一方E2Eは旧URL `/scenarios/manifest.json` と `/scenarios/order-processing.yaml` をモックしていたため、想定シナリオを差し込めなかった。
- `96fc7e1`：E2Eのmanifest/YAMLモックURLを `/scenarios/0/` に修正し、manifestの返却値も同じURLに統一。
- Node.js `DEP0190` 警告は引き続き別件。**修正後E2E・ビルド・Windows実機・GitHub Actionsは未実行。** Windows側の再実行ログを待つ。

## 9.17 Windows E2E PASSとNode.js警告対策（2026-11-22）

- 作業開始時HEAD `0303946642e1cdbbb390624c0bb3cbdc13732da9` と引き継ぎ資料を確認。
- ユーザーのWindows UCRT64環境で `git pull origin develop_tauri` 後、`npm run test:e2e` が `PASS: undo/redo, ... discard navigation` で完了。対象SHAはpullログにより `0303946`。これはPlaywright E2Eの成功であり、Windows Tauri実機やGitHub Actionsの成功ではない。
- 実行時にNode.js v24の `DEP0190` 警告（`spawn(..., {shell:true})`）が残存。
- `2031009`：`scripts/test-editor-e2e.mjs` で `npm_execpath` がある場合、`process.execPath` からnpm CLIを直接起動し、`shell:true` を除去。未設定時はOS別の起動経路を用意。
- **警告対策後のE2E・ビルド・Windows実機・GitHub Actionsは未実行。** 次はWindows側で `npm run test:e2e` を再実行し、警告の消失とPASSを確認する。別途 `npm run build` と実機受け入れ試験の残ケースを進める。

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
