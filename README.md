# Business Flow Explorer — Tauri版

[Web版](https://github.com/Renasan-h/business-flow-explorer)をTauri 2でWindowsデスクトップアプリとして起動するための独立したリポジトリです。

## 構成

- `web/`：Web版の作業コピー（`npm run setup:web` で初回取得、Git管理対象外）
- `src-tauri/`：Tauri 2 / Rustアプリ
- `.github/workflows/ci.yml`：Windowsインストーラー・Portable ZIPのビルド検証

Web版のソースはこのリポジトリへ複製して管理せず、セットアップ時にGitHubから取得します。既存の`web/`は自動更新しません。Web版を更新する場合は、変更を退避したうえで`web/`内で明示的に`git pull`してください。

## 開発環境

Windows 11、Node.js 22、Rust stable、Microsoft C++ Build Tools（Desktop development with C++）、WebView2を使用します。

```powershell
git clone https://github.com/Renasan-h/business-flow-explorer-tauri.git
cd business-flow-explorer-tauri
npm install
npm run setup:web
npm run dev
```

## Windowsインストーラー作成

```powershell
npm run build
```

成果物は`src-tauri/target/release/bundle/nsis/`に生成されます。GitHub Actionsの`Tauri Windows CI`からもArtifactを取得できます。

## Portable ZIP（インストール不要版）

GitHub Actions の `Tauri Windows CI` では、インストーラーに加えて `business-flow-explorer-portable-windows-x64` のArtifactが生成されます。Artifactをダウンロードして解凍すると `BusinessFlowExplorer-portable-windows-x64.zip` があり、そのZIP内に `Business Flow Explorer.exe` が格納されています。

1. GitHub Actionsの成功した実行のArtifactsから `business-flow-explorer-portable-windows-x64` を取得します。
2. ダウンロードしたArtifact ZIPを解凍します。
3. 内側の `BusinessFlowExplorer-portable-windows-x64.zip` を解凍します。
4. `Business Flow Explorer.exe` を実行します。

Portable ZIPはインストーラーを必要としませんが、Windows側のWebView2 RuntimeなどTauriに必要な実行環境が必要です。USB等のフォルダーに展開して実行する用途を想定しています。アプリ設定・ユーザーデータを実行ファイルと同じディレクトリに保存する「完全ポータブル」仕様は、現時点では保証していません。

## CI成功時の生成物

| Artifact名 | 内容 |
| --- | --- |
| `business-flow-explorer-windows` | NSIS形式のWindowsインストーラー |
| `business-flow-explorer-portable-windows-x64` | 実行ファイルを含むPortable ZIP |

GitHub ActionsのArtifactは配布用Releaseの添付ファイルとは異なります。正式リリース時は必要に応じて個別にアップロードしてください。

## 開発方針と現状

初期段階ではWeb版の既存画面をTauriウィンドウ内で起動することを優先しています。ローカルの任意フォルダ参照、ファイルの直接上書き保存、設定永続化などのデスクトップ専用機能は**未実装**です。Web版のブラウザ制約がそのまま残る操作もあります。

今後はTauriのファイルダイアログ・ファイルシステム権限を最小限に設定し、Web版とデスクトップ版の保存処理を分離します。Web版のリポジトリは変更しません。
