# Business Flow Explorer Tauri版 — 開発引き継ぎ・残作業

最終更新：2026-11-24（日本時間）
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

## 9.18 複数選択ノードのキーボード削除E2E追加（2026-11-22）

- 作業開始時HEAD `e374577386df833bd89814bc37d6fe5de463c922` を確認し、仕様・開発ルール・Windows受け入れケースを照合。
- `64614c7`：`scripts/test-editor-e2e.mjs` に複数ノード選択時のBackspace削除キャンセル、Delete一括削除、Ctrl+Zでの一括復元を追加。既存の単一ノード削除検証を補完。
- ユーザー報告で `0303946` のE2EはPASS済み。ただし `2031009` のNode警告修正と今回追加した複数削除E2Eは**未実行**。
- Windows実機の残ケースWIN-04・08・14〜24とBackspace/Delete操作、最新HEADのTauriビルド、GitHub Actionsは未確認。次はWindows側で `npm run test:e2e` と `npm run build` を実行し、残ケースを確認する。

## 9.19 Windows実機受け入れケース拡充（2026-11-22）

- 作業開始時HEAD `5b3f4d4c35e27b0f20cbf04e609ca913e64379b3` を確認し、引き継ぎ・仕様・開発ルールと照合。
- `83719df`：`docs/WINDOWS_ACCEPTANCE_TESTS.md` にWIN-25（単一・複数ノードのBackspace/Delete削除、キャンセル、Undo、入力欄保護）とWIN-26（右側再生順一覧のドラッグ、Escape、上下ボタン、矢印キー、Undo/Redo、保存・再読込）を追加。
- 受け入れケースは26件。過去のユーザー報告に基づくPASSが11件、未検証が15件。今回の2件はテスト定義のみで**実機未実行**。
- `0303946` のPlaywright E2E PASSは確認済みだが、`2031009` と `64614c7` 以降の変更を含む最新HEADのE2E、Windowsビルド、実機操作、GitHub Actionsは未確認。
- 次はWindows側で `git pull origin develop_tauri`、`npm run test:e2e`、`npm run build`。実機ではWIN-04・08・14〜17・25・26を優先し、結果を記録する。

## 9.20 E2E成功ログの検証対象明確化（2026-11-22）

- 作業開始時HEAD `9b04a4dbffbbec6f87ec9fa1fd332e2763aac89e`。引き継ぎ資料とGitHub実装を照合。
- `e69fc79`：`scripts/test-editor-e2e.mjs` の成功ログに単一・複数ノードのBackspace/Delete削除、確認キャンセル、Undoを明記。これまで検証を実装していてもPASS表示から判別できなかった点を改善。
- **変更後のE2Eは未実行。** ユーザー報告で確認済みなのは旧HEAD `0303946` のPASSのみ。最新版のE2E・Windows Tauriビルド・受け入れ試験・手動CIは引き続き未検証。
- 次はWindows環境で `git pull origin develop_tauri`、`npm run test:e2e`、`npm run build` を実行し、ログに削除キー検証が出ることとPASSを確認。続いてWIN-04・08・14〜17・25・26を実機確認。

## 9.21 E2E開発サーバー起動失敗時の診断改善（2026-11-23）

- 作業開始時HEAD `a31ab7a879cc8ca0bf28f0277a8eeaa2a5de559b` を確認し、仕様・開発ルール・引き継ぎ資料と照合。
- `30973c2`：`scripts/test-editor-e2e.mjs` のVite起動監視にプロセスのerror/exitイベントとstdout/stderr末尾8KBの収集を追加。起動失敗・60秒タイムアウト時に診断ログを表示する。
- **変更後のE2E・ビルド・Windows実機・GitHub Actionsは未実行。** 最後に確認されたPlaywright PASSはユーザー実行の旧HEAD `0303946`。
- 次はWindowsで `git pull origin develop_tauri`、`npm run test:e2e`、`npm run build` を実行し、WIN-04・08・14〜17・25・26の実機結果を収集する。

## 9.22 E2Eサーバー起動失敗時の後片付け修正（2026-11-23）

- 作業開始時HEAD `f740da19fd3f7462b1dd42845bc0bece70c65ce5` を確認。引き継ぎ・仕様・開発ルールを照合。
- `5324beb`：`scripts/test-editor-e2e.mjs` でViteのspawnに失敗しPIDが存在しない場合はWindowsのtaskkillを実行しない。taskkillのerrorイベントを捕捉し、後片付けが停止しないようにした。診断エラー文字列の改行を修正。
- **修正後のE2E・ビルド・Windows実機・GitHub Actionsは未実行。** 最後に確認されたE2E PASSは旧HEAD `0303946`。
- 次はWindows側で `npm run test:e2e` と `npm run build` を実行。実機WIN-04・08・14〜17・25・26を優先し、結果に応じて修正する。

## 9.23 Windows実機検証とセキュリティ調査の着手（2026-11-23）

- 作業開始時HEAD `1fbd775191111b3693596b6d885e23d754f323a7` を確認し、`docs/HANDOVER.md`、`docs/SPECIFICATION.md`、`docs/DEVELOPMENT_RULES.md`、実装・依存定義・受け入れケースを照合。
- ユーザーより前回の `npm run test:e2e` と `npm run build` がともに**エラーなし**と報告された。対象SHAを明示したログは未提出のため、実行対象SHAの確定は保留。Windows実機操作・GitHub Actionsの成功とは区別する。
- `55ca93d`：`docs/SECURITY_RISK_REGISTER.md` を新規作成。CSP無効設定、Rustファイル操作の差し替え競合、YAML参照展開・ディレクトリ列挙の負荷、バックアップ、Tauri権限、依存監査・Actionタグ参照を初期リスクとして整理。
- `package-lock.json` は存在。GitHubから `src-tauri/Cargo.lock` を取得しようとしたところ404で、対象ブランチに存在することを確認できなかった。npm audit・RustSec監査は未実行であり、**CVE件数は未確定**。
- 未検証Windows実機15ケース（WIN-04、08、14〜26）の優先順をリスク台帳に記録。**実機15ケースは未実施**。Windows側でケース別結果を収集し、FAILを優先修正する。
- 次はnpm/Rustの監査結果を収集し、CSP設定とYAML/ファイル境界テストを検討。セキュリティの指摘は確定脆弱性と未検証リスクを混同しない。

## 9.24 シナリオフォルダ探索のリソース上限（2026-11-23）

- 作業開始時HEAD `ae8ba42e4eb0841ca5ef2b42676166990b54ef77`。引き継ぎ・仕様・開発ルール・セキュリティ台帳とGitHub実装を照合。
- `563f68a`：`src-tauri/src/lib.rs` のYAML列挙処理に深さ32階層、探索項目50,000件、YAML10,000件の上限を追加。超過時に日本語エラーを返す。上限境界を確認するRust単体テスト2件を追加。
- `1669773`：`docs/SECURITY_RISK_REGISTER.md` のAPP-03を「対策実装済み／テスト未実行」に更新。
- ユーザー報告では以前の `npm run test:e2e` と `npm run build` はエラーなし。**今回のRust変更後の `cargo test`、`cargo check`、Windows実機15ケース、GitHub Actionsは未実行**。
- 次は `npm run test:rust` と `npm run check` を実行し、Windows実機で巨大フォルダ・上限エラー表示と未検証15ケースを確認。引き続きCSPとYAML参照展開の負荷対策、npm/Rust依存監査を進める。

## 9.25 セキュリティ対応範囲の調整とnpmバージョン固定（2026-11-23）

- 開始時HEAD `fac0dec6625dcea2964f150765e60b8def2712c8`。引き継ぎ・仕様・開発ルール、`package.json` と `package-lock.json` の解決済みバージョンを照合。
- ユーザー判断により、CSPの設定追加は不要として今回の対象から除外（既存の `csp: null` を維持）。外部バックエンドAPIの有無だけでCSPの効果は決まらないため、将来の外部コンテンツ導入時には再評価。
- 「大量データ」の意味を、フォルダ内の大量ファイル、1ファイル内の大量ノード・通信、サブシナリオの大量参照の3種類として説明。後2者への上限追加は実測まで見送る。既存のフォルダ探索上限は維持。
- `26f8cc8`：`package.json` の直接・開発依存13件を `package-lock.json` の現在の解決済みバージョンに完全一致固定。
- `8c20b60`：`package-lock.json` のルート依存宣言を同期。`83ec02e`：`docs/SECURITY_RISK_REGISTER.md` を更新。
- **今回の変更後の `npm ci`、E2E、ビルド、Rustテスト、Windows実機、手動GitHub Actionsは未実行。** npm/Rustの既知CVE監査も未実施。
- 次は `npm ci`、`npm run test:e2e`、`npm run build:web` で依存整合とフロントエンドを確認。Windows実機の残15件を進める。

## 9.26 大量データ耐性は性能実測により判断（2026-11-23）

- 開始時HEAD `6b282982efd8c113112f1b02d79162b9ce0238f1`。引き継ぎ・仕様・開発ルールと `src/scenario.ts` の実装を確認。
- ユーザー方針：極端なデータ量のみで問題が起こる場合は対応不要。現実的な業務フロー規模で再現性ある性能問題が起こる場合に修正する。
- `7e08cec`：`scripts/benchmark-scenario-load.mjs` を追加。20/30、100/200、500/1,000（ノード/通信）をそれぞれ3回、実際の `loadScenario` で測定。5,000/10,000は `--extreme` 指定時のみ。
- `5ac09a6`：`npm run benchmark:scenario` を追加。`8740ae3`：セキュリティリスク台帳のAPP-04/05と性能判定基準を更新。
- **今回のベンチマークは未実行。** 測定対象はYAML読込・検証・配置であり、GUI描画・ズーム・移動・再生・保存・参照展開・Rustのフォルダ探索は別途計測が必要。
- 次はWindows開発環境で `npm ci`、`npm run benchmark:scenario`、`npm run test:e2e`、`npm run build:web` を実行して測定結果を記録。通常規模での異常があれば原因を調べて修正する。

## 9.27 性能ベンチマークの結果保存と実行環境の制約（2026-11-23）

- 開始時HEAD `7ea14f802ca411b5c74548af01b34aade07d631e`。引き継ぎ・仕様・開発ルールとベンチマークのソースを確認。
- `e093eab`：`scripts/benchmark-scenario-load.mjs` に `--output <file>` を追加し、JSON形式の測定結果をファイル保存できるようにした。
- 実行環境から `git clone` を試みたが `Could not resolve host: github.com` で失敗。**今回のベンチマーク・npm ci・E2E・Rustテスト・Windows実機・GitHub Actionsは未実行**。実測値やPASSを推測しない。
- Windowsで `npm run benchmark:scenario -- --output benchmark-result.json` を実行すると測定日時・OS・Node・各規模の中央値を記録できる。結果を比較し、通常規模で問題がある場合にのみ改善する。
- GUI描画・移動・再生・保存は当該ベンチマークの対象外。Windows実機の受け入れケースと併せて検証する。

## 9.28 シナリオ件数・YAML行数別メモリ測定（2026-11-23）

- 開始時HEAD `a9b93709caaedf57fddafddfc526f3f787e046ee`。引き継ぎ・仕様・開発ルールと `src/scenario.ts` を照合。
- `ef64c3c`：`scripts/benchmark-memory.mjs` にシナリオ数1/5/10/20件×YAML約50/200/500/1000行の16条件を追加。実際の `loadScenario` で読み込み、シナリオオブジェクトを保持した状態のChromiumレンダラーJSHeapUsedSizeを測定。ケースごとに新規ブラウザコンテキストを使い、GC後の測定値・差分・時間・実際の行数を記録する。
- `b68a9bd`：`npm run benchmark:memory` を追加。実行時に `benchmark-memory/memory-results.json` と `benchmark-memory/memory-chart.svg` を生成する。
- **実測未実行**。SVGは測定実行後に生成される。測定はブラウザのJSヒープのみで、Tauri/WebView2の総メモリ、GPUメモリ、画面描画は含まれない。
- 次はWindowsで `npm ci`、`npm run benchmark:memory` を実行し、結果を確認。必要ならTauri実機のプロセス使用量測定を別途実装する。現実的な規模で問題が発生した場合のみ改善する。

## 9.29 Windows実アプリのプロセスメモリ測定（2026-11-23）

- 開始時HEAD `dd8b94b7c961906c48a81d80871238083804debd`。引き継ぎ・仕様・開発ルール、旧ヒープ測定コードを確認。
- ユーザー指定：シナリオ数は100件まで。JSヒープではなくプログラム自体のメモリ消費量を測る。
- `0022c69`：`scripts/benchmark-tauri-memory.ps1` を追加。Windowsで指定したTauriアプリPIDと子孫プロセス（WebView2等）のWorking Setを5回サンプリングし、中央値・最小・最大をCSVとSVGに出力。シナリオ数1/5/10/20/50/75/100×YAML約50/200/500/1000行の28条件。
- **測定の準備のみで実測未実行。** 現行スクリプトは各条件のアプリ操作を手動で行う必要があり、読み込まれた件数の自動検証もできない。アプリが100件を同時保持できることは未確認であり、正確な負荷条件の自動生成は次の課題。既存の `npm run benchmark:memory` は旧Chromiumヒープ計測として残存しているため、実アプリのメモリ値と混同しない。
- 次はWindows実機でアプリのPIDを指定して試行し、プロセス計測ができることを確認。シナリオ同時保持の意味・動作を確認した上で負荷条件の自動化を進める。GitHub Actionsは手動実行のみ。

## 9.30 元のWindows受け入れ試験・データ保護検証を再開（2026-11-23）

- 開始時HEAD `634018baae9e24851369ab09423d6d24548971f3`。引き継ぎ・仕様・開発ルール・Windows受け入れ26ケース・Rust保存処理を確認。
- ユーザーの指示によりメモリ測定機能は完了扱いとして区切り、元のWindows未検証15ケースとデータ保護検証に復帰。メモリ測定の実測成功を意味しない。
- `2a04463`、`d2bf504`：`src-tauri/src/lib.rs` にWIN-08（既存YAML保存）とWIN-09（外部更新競合）のネイティブ回帰テストを追加。保存・再読込後の内容、他ファイル不変、古いexpected_contentでの上書き拒否、余分な一時ファイルがないことを確認する。
- この環境から `git ls-remote` を試したが `Could not resolve host: github.com` でローカルclone不可。GitHubコネクタでソース変更・pushは完了したが、**Rustテスト・Windows実機・GitHub Actionsは未実行**。既存のWindows実機未検証15ケースは引き続きNOT RUN。
- 次は `npm run test:rust` と `npm run check` を実行し、WIN-08・WIN-22・WIN-23などのWindows実機試験に進む。Actionsは手動実行のみ。

## 9.31 WIN-22のパス保護回帰テストを追加（2026-11-23）

- 開始時HEAD `604c2fb6b2dfdcf71a130a89e0ed9b45471fdc62`。引き継ぎ・仕様・開発ルール・Rust実装を確認。
- `7d29284`：`src-tauri/src/lib.rs` に選択ルート外への読込・新規保存を拒否するWIN-22相当の回帰テストを追加。親ディレクトリ遡り、絶対パス、Windowsドライブ・ストリーム形式を検証し、拒否後の既存ファイル不変も確認する。
- 既存テストにもパス逸脱検証があるため、今回の追加は読込・保存の一括回帰確認を目的とする。WIN-22実機ケースをPASSに変更しない。
- `git ls-remote` はDNS名前解決失敗でリポジトリ取得不可。環境に `cargo` がなく、**Rustテスト・cargo check・Windows実機・手動GitHub Actionsは未実行**。
- 次はRust実行可能な環境で `npm run test:rust` と `npm run check`、その後Windows実機でWIN-08・22・23・16のP0ケースを確認する。

## 9.32 WIN-23 YAML数値検証の強化（2026-11-24）

- 開始時HEAD `febb229be83a01c2ff3d30b4d474774a89643cb1`。引き継ぎ・仕様・開発ルール・`src/scenario.ts`・既存参照テストを確認。
- `57c42d2`：`src/scenario.ts` のZod検証でノード位置（x/y）、通信時間（durationMs）、領域サイズ（width/height）に `.finite()` を追加。Infinity / -Infinity / NaN 等の非有限値を読込時に拒否する。既存のwaypointsは既に有限値検証あり。
- これはWIN-23の一部の内部処理対策であり、Windows実機のWIN-23をPASSにはしない。既存の正常YAMLに対する回帰テスト・E2E・Rustテスト・GitHub Actionsは未実行。
- 次は `npm run test:unit`、`npm run test:e2e`、`npm run test:rust`、`npm run check` を実行し、WIN-23とWIN-16を実機で確認する。

## 9.33 WIN-23 領域・IF定義の整合性検証（2026-11-24）

- 開始時HEAD `7cd2fe17d1de9cc1325c8f981f0d10d71cfe4d70`。引き継ぎ・仕様・開発ルール・`src/scenario.ts` と既存の断片テストを確認。
- `a7eaa50`：`loadScenario` にルートYAMLの領域ID重複、IF定義ID重複、領域の存在しない所属Actor参照の検証を追加。WIN-23のデータ整合性を強化。
- 注意：現行の`readFragments`は参照先のgroups/interfacesを統合しない。今回の検証は親YAMLの定義のみが対象。サブシナリオ参照（WIN-16）の実機確認は別途必要。
- **TypeScriptビルド・E2E・Rustテスト・Windows実機・GitHub Actionsは未実行。** 既存のWindows未検証15ケースは変わらない。
- 次は実行可能な環境で`npm run test:unit`・`npm run test:e2e`、Rustテストを行い、WIN-16の参照展開・順序・循環・ルート境界を確認する。

## 9.34 WIN-16 サブシナリオ参照深さの制限（2026-11-24）

- 開始時HEAD `c0a1eb272f0c69f87afca14cfefe5d6b8d37894a`。引き継ぎ・仕様・開発ルール・開発ガイド・`src/scenario.ts` を確認。
- `b646040`：`readFragments` の再帰参照を最大32階層に制限。既存の循環参照検出とルート境界検証は維持。無限再帰ではない過度なネストを拒否する。
- **未検証**：TypeScriptビルド・参照展開E2E・Rustテスト・Windows実機・GitHub Actions。WIN-16の受け入れ結果はNOT RUNのまま。
- 次は参照展開の順序・循環・ルート境界・深さ上限の自動回帰テストを整備し、実行可能な環境で検証する。

## 9.35 WIN-16 参照境界の自動回帰テスト（2026-11-24）

- 開始時HEAD `0d7e3d977aad7f221dd95cb952987d7b89f08cdc`。引き継ぎ・仕様・開発ルール・開発ガイド・参照検証スクリプトを確認。
- `e6ba952`：`scripts/test-scenario-fragments.mjs` に一時YAMLを使う32階層許可・33階層拒否・循環参照拒否・ルート外参照拒否の回帰テストを追加。既存の同梱YAML参照検証は維持。
- 注意：これは独立したNode参照検証スクリプトのテストであり、`src/scenario.ts` のブラウザ/Tauri実装を直接呼ぶテストではない。実アプリの参照展開順序・共通Actor統合・Windows実機は別途検証が必要。
- **テストは未実行**。TypeScriptビルド・E2E・Rustテスト・GitHub Actionsも未実行。WIN-16の実機受け入れはNOT RUNのまま。
- 次はNodeが使える環境で `npm run test:unit` を実行し、Playwrightで参照展開順序と実装側の境界動作を検証する。

## 9.36 WIN-16 実装経由のPlaywright回帰テスト（2026-11-24）

- 開始時HEAD `e39adc1494773362b4078814a3e8846360f829dc`。引き継ぎ・仕様・開発ルール・開発ガイド・既存Playwrightテスト・シナリオ読込実装を確認。
- `a2f5e0b`、`657f085`：`scripts/test-editor-e2e.mjs` にブラウザ内で実際の`src/scenario.ts`をimportするWIN-16回帰テストを追加。Tauriの`read_scenario_file`のみモックし、親YAMLと断片のステップ展開順、重複Actor統合、循環参照、ルート外参照、32階層制限を検証。Actor種別は`src/nodeCatalog.ts`に存在する`server`を使用。
- **未実行**：Playwright、TypeScriptビルド、Rust、Windows実機、GitHub Actions。WIN-16のWindows受け入れはNOT RUNのまま。Playwrightのモックは実機Rust APIの動作を保証しない。
- 次は`npm run test:e2e`、`npm run test:unit`、`npm run test:rust`、`npm run check`を実行し、失敗時に修正する。CIは手動実行のみ。

## 9.37 WIN-16 共通Actor定義矛盾の回帰ケース（2026-11-24）

- 開始時HEAD `b433a8b044e15625d3eada9855b2c845f7a4dc47`。引き継ぎ・仕様・開発ルール・シナリオ読込実装・Playwrightコードを確認。
- `d3325a8`：`scripts/test-editor-e2e.mjs` の実装経由WIN-16テストに、複数参照ファイルで同一Actor IDの`name`が矛盾した場合の拒否検証を追加。
- この環境ではNode.js 22とnpmは利用可能だが、GitHubリポジトリのローカル作業ツリーはなく、従来の直接取得はDNSエラー。Rustの`cargo`も未導入。したがって**Playwright・単体テスト・Rustテスト・Windows実機・GitHub Actionsは未実行**。テストのPASSは未確認。
- 次はソース一式を取得できる実行環境で`npm ci`、`npx playwright install chromium`、`npm run test:e2e`、`npm run test:unit`を実行して失敗を修正する。WIN-16実機受け入れはNOT RUNのまま。

## 9.38 ユーザー環境での自動テスト成功（2026-11-24）

- 検証対象HEAD `4da325edd69a5b07dff6254d1c27dc7c9d169cb4`。ユーザーがWindows上で `git pull origin develop_tauri && npm run test && npm run check` を実行し、実行ログを共有。
- `npm run test:unit`：`tsc --noEmit`、Viteビルド、バージョン一致、同梱YAML親6件・断片31件、WIN-16参照境界（32/33階層・循環・ルート逸脱）すべて成功。
- `npm run test:e2e`：PlaywrightがPASSで終了。WIN-16実装経由テスト（参照順・Actor統合と矛盾拒否・循環・ルート逸脱・深さ制限）を含む。
- `npm run test:rust`：Rustユニットテスト26件成功・失敗0件。main.rsの0件、doc-testの0件も正常終了。
- `npm run check`：`cargo check` 正常終了。
- ViteのZodコメント注釈警告および500KB超チャンク警告は残るが、ビルドは成功。
- **GitHub Actionsは未実行**。Windows上の自動テスト成功は確認したが、`docs/WINDOWS_ACCEPTANCE_TESTS.md`の手動受け入れ15ケースは実施報告がないためNOT RUNのまま。
- 次はWindows手動受け入れ（P0優先）を進める。性能ベンチマークはユーザー指示で区切り済み、CSPは保留。

## 9.39 残15件のWindows受け入れ自動化（2026-11-24）

- 開始時HEAD `e60225e0fef4865effa8270ae7b88e2767804b62`。前回の検証対象 `4da325e` からの差分は引き継ぎ追記のみ。仕様・開発ルール・Windows受け入れ表・既存Playwright/Rustテストを確認。
- `scripts/test-editor-e2e.mjs` に再生操作、分岐の経路とノード除外、IF定義の作成と再読込、不正YAML読込拒否、最小サイズ相当の操作、再生順変更後の保存・再読込を追加。往復設定の再読込時にフィクスチャが値を補完しないよう修正。
- Linux x86_64で `npm ci`、`npm run test:unit`、E2Eスクリプトの構文チェックが成功。WIN-15の2経路とWIN-23の4拒否条件はVite SSR経由で同じアサーションを実行し成功。
- Playwrightはブラウザ取得がHTTP 403、代替のシステムChromiumも起動時のソケット作成拒否で、画面テストは開始できなかった。Cargo未導入のため今回のRustテストとcargo checkは未実行。§9.38はユーザー環境の別実行記録。
- Windows受け入れ15件はNOT RUN。ケース別の検証範囲と残りは [WINDOWS_ACCEPTANCE_TESTS.md](WINDOWS_ACCEPTANCE_TESTS.md) を参照。GitHub Actionsは起動していない。

## 9.40 WIN-21 複数選択の追加自動化（2026-11-25）

- 開始時HEAD `a36ae1951e0d63e9a9cd1bdc78275c1d0b86916e`。仕様・開発ルール・開発ガイド・既存E2E・複数選択実装を確認。
- `c39097e`：`scripts/test-editor-e2e.mjs` にShift選択解除、選択ノードのみの移動と非選択ノード不変、Undo、矩形範囲選択、Shift追加選択を追加。
- GitHub直接取得はDNSエラー、cargo未導入。今回のE2E・Rust・ビルドは未実行。ユーザーの「解決」は最新HEADの全テスト成功を明示していないためPASS記録には使用しない。Windows受け入れ15件はNOT RUN、CI未起動。
- 次は `npm run test:all` で追加ケースを確認し、WIN-23保存拒否など残る自動化を進める。

## 9.41 WIN-23 保存前検証の追加自動化（2026-11-25）

- 開始時HEAD `c749511e4fff0dd90a6fec1f0723837381e4aa9e`。引き継ぎ・仕様・開発ルール・開発ガイド・保存処理・既存E2Eを確認。
- `c348457`：既存YAML編集のPlaywrightケースに空シナリオとノード2件・通信0件の保存拒否、エラー表示、元YAML不変、編集ノード保持を追加。後続の既存正常保存テストで復旧を検証する構成。Tauri IPCはモック。
- 今回の `git ls-remote` はDNS解決失敗、cargo未導入。E2E・ビルド・Rustは未実行。Windows受け入れ15件はNOT RUN、CI未起動。ID重複・参照・経由点の保存側検証は引き続き残る。
- 次は最新HEADで `npm run test:all` を実行し、WIN-23の残りとWIN-15の画面分岐検証を進める。

## 9.42 WIN-23 保存時の経由点検証（2026-11-25）

- 開始時HEAD `b65e91d`。仕様・開発ルール・開発ガイド・保存前検証と読込スキーマを照合。
- `66e504d`：保存前に往復経由点の100件上限・有限座標、通信時間の有限値を検証する。既存のID重複・Actor参照検証は維持。
- GitHub APIによる更新は成功。直接Git取得は Could not resolve host: github.com、Cargo未導入。今回の自動テスト・Windows実機・CIは未実行。
- 次は保存前検証関数の回帰テスト追加と実行、WIN-15画面分岐検証。Windows未検証15件はNOT RUNのまま。

## 9.43 WIN-23 保存前検証の単体テスト（2026-11-25）

- 開始時HEAD `4959842`。仕様・開発ルール・開発ガイドと保存前検証を照合。
- `2b559c1`：保存前検証関数を直接importするNode単体テスト26件を追加。`5dc6d29`：test:unitに組み込み。
- Node 22.16.0でGitHub取得内容と同じ関数本体を一時ディレクトリに再現し、新規テストを実行。26件成功、0件失敗。型検査ではなく実行時検証。
- git ls-remoteは Could not resolve host: github.com、cargoは未導入。リポジトリ全体のビルド・E2E・Rust・Windows実機・CIは未実行。Windows未検証15件はNOT RUN。
- 次は最新HEADでnpm run test:all、WIN-15の画面分岐検証。

## 9.44 WIN-15 分岐選択画面の回帰テスト（2026-11-25）

- 開始時HEAD `768dec1`。仕様・開発ルール・開発ガイド・App.tsx・PlaybackControls・既存E2Eを確認。
- `ca42337`：Tauri IPCをモックした専用YAMLでA/B/A選択、非選択側ステップの除外、次へ操作、分岐切替時の先頭復帰を検証するPlaywrightケースを追加。PixiJS描画自体の非表示は直接検証していない。
- 今回のgit ls-remoteは Could not resolve host: github.com、cargoは未導入。E2E・ビルド・Rust・Windows実機・CIは未実行。Windows未検証15件はNOT RUN。
- 次は最新HEADでnpm run test:allを実行し、WIN-15の描画確認と残ケースを進める。

## 9.45 WIN-15 再生リセットと最終停止（2026-11-25）

- 開始時HEAD `e2857f9`。仕様・開発ルール・開発ガイド・App.tsx・PlaybackScene.tsx・分岐処理・既存E2Eを確認。
- `e8c6a55`、`41b8d2f`：分岐変更・再開始時にリセット世代を更新し、同一ステップでもPixiJSの経過時間を初期化する。分岐変更時にノード・IF詳細選択も解除。
- `12a2c80`：分岐再生の最終停止、再再生、分岐変更後の先頭復帰のE2Eを追加。
- 実際のgit ls-remoteは Could not resolve host: github.com、Node 22.16.0、cargo未導入。ビルド・E2E・Rust・Windows実機・CIは未実行。非選択ノードの実描画確認も残る。Windows未検証15件はNOT RUN。
- 次は最新HEADでnpm run test:allを実行し、描画確認を進める。

## 9.46 WIN-15 分岐ノード操作検証（2026-11-25）

- 開始時HEAD `25d78f7`。仕様・開発ルール・開発ガイド・レイアウト・詳細パネル・既存E2Eを確認。
- `613e3d4`：固定座標の分岐シナリオで選択側と合流先の詳細表示、非選択側座標のクリックで詳細が開かないことを検証するE2Eを追加。画像ピクセルによる描画確認とは区別する。
- git ls-remoteを実行したが Could not resolve host: github.com。Node 22.16.0、cargo: command not found。今回のE2E・ビルド・Rust・CI・Windows実機は未実行。未検証15件はNOT RUN。
- 次は最新HEADで全テスト実行、WIN-15描画確認とWIN-14双方向通信検証。

## 9.47 WIN-15 分岐ノード描画検証（2026-11-25）

- 開始時HEAD `e9da095`。仕様・開発ルール・開発ガイド・App.tsx・既存E2Eを確認。
- `ba9f88d`：CanvasのPNGをブラウザ内で復号し、選択側ノード内部と非選択側の背景色を比較するE2Eを追加。固定座標と初期倍率1・パン0を前提とし、描画反映を最大5秒待つ。追加依存なし。
- 今回のgit ls-remoteは実行したが Could not resolve host: github.com。Node v22.16.0、cargoはPATH上に存在しない。E2E・ビルド・Rust・CI・Windows実機は未実行。座標・画面サイズの前提も未検証。Windows未検証15件はNOT RUN。
- 次は最新HEADで全テスト実行とWIN-14双方向通信検証。

## 9.48 WIN-14 双方向再生の回帰テスト（2026-11-25）

- 開始時HEAD `c587eb2`。仕様・開発ルール・開発ガイド・Windows受け入れ条件・PlaybackScene・PlaybackControls・App・scenarioを確認。
- `2d2c8fa`：往復、片方向、復路欠落の3ケースをPlaywrightに追加。往復1ステップ、再生継続時間、最終停止、復路内容表示、欠落時のエラーと再生拒否を検証する。Tauri IPCはモック。実際の玉の移動方向や経由点の描画は未検証。
- git ls-remoteは Could not resolve host: github.com、Node v22.16.0、cargoはPATH上にない。E2E・ビルド・Rust・CI・Windows実機は未実行。時間ベースの判定は実行環境の負荷に依存するため要確認。Windows未検証15件はNOT RUN。
- 次は最新HEADで全テスト実行、往復の描画経路と経由点の確認。

## 9.49 WIN-14 経由点の再生反映（2026-11-25）

- 開始時HEAD `2b00e31`。仕様・開発ルール・開発ガイド・PlaybackScene・scenario・package.jsonを確認。
- `dc397b9`、`435bb21`：往路・復路の手動経由点を描画線とマーカー移動で共有し、折れ線の距離に応じて補間。現在の復路の重複直線描画を除去。
- `49885ee`、`0530bd3`：座標計算の10ケースを追加しtest:unitに組み込み。同一内容をローカルに再現しNode v22.16.0で10 PASS、0 FAIL。
- git ls-remoteは Could not resolve host: github.com。cargoはPATH上にない。全体ビルド・E2E・Rust・CI・Windows実機は未実行。非アクティブ経路の経由点、orthogonal自動経路、端点の境界計算と実描画の整合は残る。Windows未検証15件はNOT RUN。

## 9.50 WIN-14 非アクティブ通信の経由点（2026-11-25）

- 開始時HEAD `376e584`。ユーザー指示によりGitHub API経由の開発を継続する。
- `7b0f084`：PlaybackScene.tsxで往路・復路の経由点を保持した経路一覧を構築。同じ送受信先でも経由点が異なる通信を区別し、同一経路の重複描画を抑制。非アクティブ経路にも手動経由点を反映する。
- git ls-remoteは Could not resolve host: github.com。Node v22.16.0、cargoはPATH上にない。既存のローカル再現版経路計算テストを node --experimental-strip-types --test test.mjs で再実行し10 PASS、0 FAIL。今回の描画変更自体のビルド・E2E・Rust・CI・Windows実機は未実行。
- 次はorthogonal自動経路とノード境界計算の整合、描画回帰テスト。Windows未検証15件はNOT RUN。

## 9.51 WIN-14 直角配線の共通化（2026-11-25）

- 開始時HEAD `0593132`。仕様・開発ルール・開発ガイド・EditorEdges・connectionRouting・PlaybackSceneを確認。
- `31033f1`：再生側の独自直線計算を既存routeConnection、routeViaWaypoints、offsetRouteに置換。往復・非アクティブ経路にroutingを適用し、経路識別に配線方式とレーンを含める。編集側と同様にorthogonal時のみ手動経由点を利用する。現時点では再生ノードの固定150×90に合わせて計算し、個別サイズ対応は残る。従来のマーカー半径分の端点余白はなくなるため実描画確認が必要。
- git ls-remoteは Could not resolve host: github.com。Node v22.16.0、cargoなし。既存ローカル再現版の経路補間テストを node --experimental-strip-types --test test.mjs で実行し10 PASS、0 FAIL。新しい配線統合のビルド・E2E・Rust・CI・Windows実機は未実行。
- 次は個別ノードサイズと端点・レーンの整合、直角配線の回帰テスト。Windows未検証15件はNOT RUN。

## 9.52 WIN-14 再生ノード個別サイズ（2026-11-25）

- 開始時HEAD `4ef1968`。仕様・開発ルール・開発ガイド・PlaybackScene・Appを確認。
- `bcee21a`：nodeSizeとcontainsNodePointを再利用し、描画・クリック・配線を個別サイズに対応。小さいノードのアイコンと文字を縮小。
- `0512f15`：初期表示範囲の標準高さを編集側と同じ76に統一（従来90）。
- git ls-remoteは Could not resolve host: github.com。Node v22.16.0、cargoなし。既存ローカル再現版の経路補間テストを実行し10 PASS、0 FAIL。今回のサイズ変更自体のビルド・E2E・Rust・CI・Windows実機は未実行。既存WIN-15の固定座標画像テストも再確認が必要。
- 次はマーカー端点余白と直角配線・個別サイズの回帰テスト。Windows未検証15件はNOT RUN。

## 9.53 WIN-14 マーカー端点余白（2026-11-25）

- 開始時HEAD `9d354a3`。仕様・開発ルール・開発ガイド・PlaybackScene・playbackRoute・既存テストを確認。
- `60d1961`、`c5ded1c`：描画線は維持し、マーカーのみ経路長の両端12pxを除いた範囲で移動。短い経路は中央に留め、初期位置とTickerに適用。斜め・折返し・重複ノードでの矩形との厳密な非接触は保証しない。
- `5de145f`：端点余白8ケース追加。ローカル再現コードで node --experimental-strip-types --test /tmp/bfe-route/test.mjs を実行し18 PASS、0 FAIL、0 SKIP（Node v22.16.0）。
- 今回もgit ls-remoteは Could not resolve host: github.com、cargoはPATH上にない。全体ビルド・E2E・Rust・CI・Windows実機は未実行。Windows未検証15件はNOT RUN。
- 次は直角配線・個別サイズの回帰テストと実描画検証。

## 9.54 WIN-14 経路・個別サイズ回帰テスト（2026-11-25）

- 開始時HEAD `af647de`。仕様・開発ルール・開発ガイド・connectionRouting・nodeGeometry・既存E2Eを確認。
- `044ece8`：既存test-playback-route.mjsに個別サイズ端点、直角障害物回避、往復手動経由点、往復直線レーン、標準サイズとクリック境界の5ケースを追加。既存test:unit経由で実行対象となる。
- git ls-remoteは Could not resolve host: github.com。Node v22.16.0、cargoなし。既存ローカル再現版18ケースを再実行し18 PASS、0 FAIL、0 SKIP。新規5ケースはローカルに対象モジュールがないため未実行。全体ビルド・E2E・Rust・CI・Windows実機も未実行。
- 次は新規5ケースの実行、往復実描画E2E、個別サイズの実画面クリック検証。Windows未検証15件はNOT RUN。

## 9.55 WIN-14 画面回帰ケース（2026-11-26）

- 開始時HEAD `23adf2a`。仕様・開発ルール・開発ガイド・PlaybackScene・既存E2Eを確認。
- `ec350e4`：WIN-14のYAMLを240×120の対称配置に変更し、旧固定幅の外側で詳細表示、新サイズ外で非選択を確認するケースを追加。往復シナリオに直角配線と上下別の経由点を設定。実際のマーカー座標の画像検証はまだない。固定座標は初期倍率1・パン0を前提とし実行確認が必要。
- git ls-remoteは Could not resolve host: github.com。Node v22.16.0、cargoなし。ローカル再現版を node --experimental-strip-types --test test.mjs で実行し18 PASS、0 FAIL、0 SKIP。新規5単体ケース、全体ビルド・E2E・Rust・CI・Windows実機は未実行。
- 次は往復マーカーの実描画検証と新規単体ケース実行。Windows未検証15件はNOT RUN。

## 9.56 WIN-14 往復マーカー画像検証（2026-11-26）

- 開始時HEAD `f396b44`。仕様・開発ルール・開発ガイド・PlaybackScene・既存E2Eを確認。
- `615139c`：往復テストの片道時間を3000msに変更し、Canvas PNGをブラウザで復号して往路上部・復路下部のマーカー色と面積を検出するケースを追加。全経路の厳密な追従や順序は保証しない。固定座標・テーマ色・撮影頻度に依存し実行確認が必要。
- git ls-remoteは実行して Could not resolve host: github.com。Node v22.16.0、cargoなし。node --experimental-strip-types --test /tmp/bfe-route/test.mjs はローカル再現版18 PASS、0 FAIL、0 SKIP。新規5単体ケース・全体ビルド・E2E・Rust・CI・Windows実機は未実行。
- 次は新規5単体ケースとE2Eの実行環境確保、直角レーンの角の検証。Windows未検証15件はNOT RUN。

## 9.57 WIN-14 経路回帰テスト実行（2026-11-26）

- 開始時HEAD `b5e0c80`。仕様・開発ルール・開発ガイド・connectionRouting・nodeGeometry・playbackRoute・単体テストをAPIで確認。
- API取得内容から対象関数とテストをローカルに転記（コメント・未使用関数等は省略）。Node v22.16.0で `cd /tmp/bfe-actual && node --experimental-strip-types --test scripts/test-playback-route.mjs` を実行し23 PASS、0 FAIL、0 SKIP。新規5件を含む。完全なチェックアウトや型検査ではない。
- git ls-remoteは Could not resolve host: github.com、cargoなし。全体ビルド・E2E・Rust・CI・Windows実機は未実行。Windows未検証15件はNOT RUN。
- offsetRouteの角で法線平均により直角が斜めになる問題をコード上確認。次は角の回帰テストと修正、E2E実行環境確保。

## 9.58 WIN-14 直角レーン角補正（2026-11-26）

- 開始時HEAD `35af366`。仕様・開発ルール・開発ガイド・経路計算・単体テストを確認。
- `3ac84d5`：offsetRouteの直角部分は法線の平均でなく合計（移動後の直線の交点）を使用。連続重複点を除外、ゼロ距離は原経路を返す。180度折返し・短い区間の逆転・非直角の補正は残課題。
- `8e41274`：正負の直角オフセット、復路、重複点、ゼロ距離の5ケース追加。ローカル転記版 /tmp/bfe-actual で node --experimental-strip-types --test scripts/test-playback-route.mjs を実行。修正前24 PASS/4 FAIL、修正後28 PASS/0 FAIL/0 SKIP。
- git ls-remoteは実際に exit 128 / Could not resolve host: github.com。Node v22.16.0、cargoなし。全体ビルド・E2E・Rust・CI・Windows実機は未実行。Windows未検証15件はNOT RUN。
- 次は折返し・短区間の角補正と実画面E2E実行環境確保。

## 9.59 WIN-14 折返し・短区間補正（2026-11-26）

- 開始時HEAD `6ff7d6f`。仕様・開発ルール・開発ガイド・経路計算・テストを確認。
- `8446633`：offsetRouteの反転箇所に2点を生成し、短区間を含む折れ線のオフセット幅を最短区間長/2.01以下に制限。全経路のレーン間隔が狭まるトレードオフあり。任意角度・障害物との干渉は未保証。
- `d59b1fd`：折返しと短区間の2ケース追加。ローカル転記版 /tmp/bfe-actual で node --experimental-strip-types --test scripts/test-playback-route.mjs を実行。修正前28 PASS/2 FAIL、修正後30 PASS/0 FAIL/0 SKIP（短区間の期待値は修正後に厳密な座標から不等式へ変更）。
- GitHub API更新の初回内部エラーは再試行で解消。git ls-remoteは Could not resolve host: github.com。Node v22.16.0、cargoなし。全体ビルド・E2E・Rust・CI・Windows実機は未実行。
- 次は経路の追加修正より既存E2E実行環境確保とP0受け入れ検証を優先。Windows未検証15件はNOT RUN。

## 9.60 CI実行状況確認（2026-11-26）

- HEAD `a791b6a` のActions実行件数はAPIで0件。直近run 44578013972は別SHAでfailure、stepsなし。原因は未確定。
- 現接続には新規workflow_dispatch操作がなく、CI未実行。直接Gitはexit 128 / Could not resolve host: github.com。Cargoなし。
- ローカル転記版の経路30件・保存前検証26件を再実行し56 PASS、0 FAIL、0 SKIP。完全チェックアウトではない。Windows残15件はNOT RUN。
- 次はFrontend checksをGitHub画面で手動起動し、結果を確認する。

## 10. 次の作業

**第一候補：新規Playwrightケースの実行とWindows実機未検証15ケース（P0: WIN-08・22・23・16）の受け入れ検証。性能測定機能はユーザー指示で区切り済み。CSP追加は保留。CIは手動実行のみ。** ユーザーから「続けて」と指示されたら、GitHub最新状態を確認して優先順に着手する。Windows実機を操作できない環境では、テスト手順・自動化可能な部分を整備し、実機未検証を明記する。

## 11. ドキュメント運用

- `README.md`：利用者向けの製品紹介と画面画像のみ。
- `docs/user-guide.md`：操作方法。
- `docs/development.md`：技術構成、ローカル検証、CI・配布手順。
- `docs/SPECIFICATION.md`：機能仕様・設計の決定事項。
- `docs/DEVELOPMENT_RULES.md`：継続開発のルール。
- `docs/HANDOVER.md`：最新の進捗、検証状況、残作業、次の一手。
- `docs/WINDOWS_ACCEPTANCE_TESTS.md`：Windows実機の受け入れ試験と結果記録様式。
- `docs/SECURITY_RISK_REGISTER.md`：アプリ固有・依存ライブラリのリスク台帳と監査計画。
- `docs/RELEASE_NOTES_v0.1.0.md`：初回リリースノート案。
- `docs/WINDOWS_CODE_SIGNING.md`：コード署名の判断・保護・検証方針。

**注意：** 本ファイルの作成はドキュメント変更であり、アプリのテスト成功やリリース完了を意味しない。
