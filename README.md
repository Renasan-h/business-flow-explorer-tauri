# Business Flow Explorer — Tauri版

[Web版](https://github.com/Renasan-h/business-flow-explorer)をTauri 2でWindowsデスクトップアプリとして起動するための独立したリポジトリです。

## 構成

- `src/`：Web版から取り込んだReactソース（Tauri版で独立管理）
- `src-tauri/`：Tauri 2 / Rustアプリ
- `.github/workflows/frontend-check.yml`：TypeScriptとWebビルドの検証
- `.github/workflows/rust-test.yml`：Rustユニットテスト
- `.github/workflows/rust-check.yml`：Rustコンパイル検証
- `.github/workflows/release.yml`：リリース時のみ実行するWindowsインストーラー・Portable ZIP生成

Web版のソースはTauri版に取り込み、別リポジトリとして独立管理します。

## 開発環境

Windows 11、Node.js 22、Rust stable、Microsoft C++ Build Tools（Desktop development with C++）、WebView2を使用します。

```powershell
git clone https://github.com/Renasan-h/business-flow-explorer-tauri.git
cd business-flow-explorer-tauri
npm install
npm run dev
```

## Windowsインストーラー作成

```powershell
npm run build
```

成果物は`src-tauri/target/release/bundle/nsis/`に生成されます。GitHub Actionsの`Tauri Windows release build`でも、インストーラーとPortable ZIPを生成できます。

## CI運用

- 開発用の `Frontend checks`、`Rust unit tests`、`Rust compile check` は、変更されたファイルに応じて `main` 向けPull Request時に実行されます。ブランチへのpushだけでは起動しません。
- 開発中に手動でテストしたい場合は、Actionsから目的のワークフローを選び、`Run workflow` で `develop_tauri` または作業ブランチを指定して実行します。
- 目的別CIではフロントエンド検証、`cargo test`、`cargo check` を個別に実行します。Rust側の検証でもTauriのビルドスクリプト用にWebの `dist` を事前生成しますが、インストーラーやZIPは生成しません。
- リリース時は変更をPull Requestで `main` に取り込み、`main` に `.github/workflows/release.yml` が反映された後、Actionsの `Tauri Windows release build` で `main` を選択して実行します。
- リリースワークフローの `release_ref` には `main` に含まれるコミットSHAまたはタグを指定します。開発ブランチ上のコミットを直接リリースすることはできません。
- リリース生成物のArtifactは `business-flow-explorer-windows`（NSIS）と `business-flow-explorer-portable-windows-x64`（Portable ZIP）です。Portable ZIPはインストール不要ですが、設定やデータを実行フォルダー内に保存する完全ポータブル仕様は保証していません。

## 開発方針と現状

初期段階ではWeb版の既存画面をTauriウィンドウ内で起動することを優先しています。ローカルフォルダ操作のRustコマンドは実装中ですが、React画面との接続・動作確認は未完了です。Web版のブラウザ制約がそのまま残る操作もあります。

今後はTauriのファイルダイアログ・ファイルシステム権限を最小限に設定し、Web版とデスクトップ版の保存処理を分離します。Web版のリポジトリは変更しません。

## ブランチ運用

- `main`：リリース用。開発コミットを直接反映しない。
- `develop_tauri`：Tauri版の機能開発・テストを行う。
- 機能完成後は `develop_tauri` から `main` にPull Requestを作成し、全CI成功とレビュー確認後に **Squash and merge** する。
- 開発中は作業単位のコミット履歴を保持し、`main` への統合時に1コミットにまとめる。
