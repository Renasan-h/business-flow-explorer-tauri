# Business Flow Explorer — Tauri版

[Web版](https://github.com/Renasan-h/business-flow-explorer)をTauri 2でWindowsデスクトップアプリとして起動するための独立したリポジトリです。

## 構成

- `src/`：Web版から取り込んだReactソース（Tauri版で独立管理）
- `src-tauri/`：Tauri 2 / Rustアプリ
- `.github/workflows/ci.yml`：Windowsインストーラーのビルド検証

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

成果物は`src-tauri/target/release/bundle/nsis/`に生成されます。GitHub Actionsの`Tauri Windows CI`からもArtifactを取得できます。

## 開発方針と現状

初期段階ではWeb版の既存画面をTauriウィンドウ内で起動することを優先しています。ローカルフォルダ操作のRustコマンドは実装中ですが、React画面との接続・動作確認は未完了です。Web版のブラウザ制約がそのまま残る操作もあります。

今後はTauriのファイルダイアログ・ファイルシステム権限を最小限に設定し、Web版とデスクトップ版の保存処理を分離します。Web版のリポジトリは変更しません。

## ブランチ運用

- `main`：リリース用。開発コミットを直接反映しない。
- `develop_tauri`：Tauri版の機能開発・テストを行う。
- 機能完成後は `develop_tauri` から `main` にPull Requestを作成し、全CI成功とレビュー確認後に **Squash and merge** する。
- 開発中は作業単位のコミット履歴を保持し、`main` への統合時に1コミットにまとめる。
