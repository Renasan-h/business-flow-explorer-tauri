# 開発・保守ガイド

## 技術構成

- UI：React 19 / TypeScript / Vite 7
- シナリオ：YAML、Zodによる構造検証
- 描画：エディターはSVG、再生側はPixiJS
- デスクトップ：Tauri 2 / Rust
- E2E：Playwright（Chromium）

## 開発ブランチ

通常の開発は `develop_tauri`、リリースは `main` で管理します。Web版は別リポジトリであり、このリポジトリから自動同期されません。変更のたびにWeb版との互換性を保証するものではありません。

## 初回セットアップ

Windows 11、Node.js 22、Rust stable、C++ Build Tools、WebView2を準備します。

```powershell
npm install
npm run dev
```

## ローカル検証

```powershell
npm run build:web
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node scripts/test-editor-e2e.mjs
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```

`npm run build:web` は事前に同梱シナリオのマニフェストを生成します。生成後の `public/scenarios/manifest.json` が意図せず変わっていないか確認してください。

## Windows配布物

```powershell
npm run build
```

NSISインストーラー：`src-tauri/target/release/bundle/nsis/`。

`Full development checks` は `develop_tauri` のpush時に、フロントエンドビルド、マニフェスト検証、Chromium E2E、アイコン検証、Rustテスト・チェック、Windowsビルド、配布物の存在確認、開発用Artifactアップロードを行います。 `main` ではWebラッパーの準備・ビルド経路が使用されます。

正式配布は `Tauri Windows release build` を `main` で手動実行します。 `release_ref` には `main` に含まれるSHAまたはタグを指定します。Artifact名：

- `business-flow-explorer-windows`：NSIS
- `business-flow-explorer-portable-windows-x64`：ZIP

開発用Artifact：`business-flow-explorer-dev-windows`。ZIPは実行ファイルを圧縮したもので、設定・データの完全な持ち運びを保証しません。

## CIの判定ルール

1. 対象コミットのSHAとワークフロー実行番号を記録します。
2. ジョブが**実際に開始されたか**確認します。
3. 開始後に失敗した場合のみ、失敗ステップとログを確認してコードや環境の原因を切り分けます。
4. **GitHubの請求・支払い・利用上限によりジョブが開始されない場合は「未検証」** と扱います。コード不具合とは断定しません。
5. ジョブの `success` を確認してから次の変更へ進みます。過去の別コミットの成功を流用しません。

CIで成功してもWindows実機でのGUI操作・保存・再起動・Portable ZIP起動をすべて保証するわけではありません。

## 保存処理とセキュリティ

Tauriコマンドは `src-tauri/src/lib.rs` に実装されています。選択したフォルダ内だけを操作し、相対パスを検証します。既存ファイルは期待する原文との一致を確認してから一時ファイルへ書き込み、置換します。保存の前後で外部ファイルが変化する場合やOS障害時の復旧には限界があるため、実機試験とバックアップが必要です。

Web版とTauri版の保存経路の分岐は `src/editor/scenarioPersistence.ts` にあります。

## 保守時の確認観点

- ノード、通信線、領域、IF定義の作成・編集・削除
- Undo/Redo、ズーム、負座標、表示リセット、複数選択
- 往路・復路、分岐、サブシナリオ参照、再生順
- 新規・既存YAML保存、競合、読み取り専用、未保存のまま画面遷移
- Windowsインストーラー、Portable ZIP、起動・再起動、画面サイズ変更

## スクリーンショットとGIFの更新方針

- サンプルYAMLを使用し、Windows実機で動くアプリの画面を撮影します。
- 画像は `docs/assets/` に保存し、READMEまたは操作ガイドから相対参照します。
- GIFは「ノード追加→接続→保存」など1つの操作に限定し、長時間・巨大サイズを避けます。
- 画面上のローカルパス、ユーザー名、IPアドレス、認証情報を公開しません。
- 画面と一致しない生成画像を製品スクリーンショットとして扱いません。
