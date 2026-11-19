# Business Flow Explorer — Windowsデスクトップ版（Tauri）

業務システムのノード・通信・処理順序を **YAMLで管理し、編集・可視化・再生する** Windowsデスクトップアプリです。React / TypeScript / ViteとTauri 2 / Rustで構成します。

- [操作ガイド](docs/user-guide.md)
- [開発・保守ガイド](docs/development.md)
- [Web版リポジトリ](https://github.com/Renasan-h/business-flow-explorer)（別管理）

> **検証状況**：ブラウザ上の編集E2EとRustテストを含むCIの成功実績がありますが、Windows実機のGUI操作全体やWeb版との完全な機能互換性は保証していません。GitHub Actionsが請求・利用上限の問題でジョブ開始前に失敗する場合、コードのテスト失敗とは区別してください。

## 主な機能

- ノード・領域の配置、複数選択と移動、通信線の追加、折れ線の経由点編集
- 片方向・双方向の通信、往路・復路の設定、通信順序の編集
- 再生・一時停止・速度変更・分岐選択、ノード詳細とIF定義の参照
- YAMLシナリオの読み込み、サブシナリオ・Actorファイルの参照、テンプレート取り込み
- 無限座標の編集キャンバス、ズーム、表示リセット、Undo / Redo
- 選択したローカルフォルダ内のYAMLの新規作成・競合検知付き保存

## 画面と操作

初めて使用する場合は[操作ガイド](docs/user-guide.md)を参照してください。画面キャプチャは実際のWindowsビルドで取得・検証できるまで掲載しません。実画面と異なるモック画像を操作説明として掲載しないためです。

## 開発環境

Windows 11、Node.js 22、Rust stable、Microsoft C++ Build Tools（Desktop development with C++）、WebView2。

```powershell
git clone https://github.com/Renasan-h/business-flow-explorer-tauri.git
cd business-flow-explorer-tauri
git switch develop_tauri
npm install
npm run dev
```

ブラウザでフロントエンドだけを確認する場合：

```powershell
npm run dev:web
```

**注意**：ブラウザでの実行はTauriのネイティブファイル操作を再現しません。ローカルフォルダ操作はデスクトップ版で確認してください。

## ビルド・検証

```powershell
npm run build:web
node scripts/test-editor-e2e.mjs
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
npm run build
```

E2EにはPlaywrightとChromiumが必要です。セットアップ方法とCIの確認方法は[開発・保守ガイド](docs/development.md)に記載しています。

`npm run build` のNSISインストーラーは `src-tauri/target/release/bundle/nsis/` に生成されます。Portable ZIPはWindows向けGitHub Actionsの配布工程で作成します。**ZIP内の実行ファイルはインストール不要ですが、設定・データをZIP展開先だけに保存する「完全ポータブル」仕様ではありません。**

## データ保護上の注意

ローカルのYAMLはユーザーが選択したフォルダ内で読み書きします。既存ファイルの保存時は編集開始時の内容と比較し、外部変更があれば競合として拒否します。保存失敗時は編集内容を失わないように扱いますが、OS障害・強制終了を含むあらゆる状況からの復旧は保証しません。重要なYAMLは別途バックアップしてください。

## リポジトリ構成

| パス | 用途 |
|---|---|
| `src/` | React画面、シナリオ解析、エディター、再生 |
| `src/editor/` | エディターUI、座標・選択・保存処理 |
| `src/playback/` | 再生UI |
| `src-tauri/` | Rustコマンド、Tauri設定 |
| `public/scenarios/` | 同梱サンプルシナリオ |
| `scripts/` | マニフェスト・アイコン生成、E2E |
| `.github/workflows/` | CI・リリースビルド |
| `docs/` | 操作・開発保守ドキュメント |

## ブランチ・リリース

- `develop_tauri`：開発・検証用
- `main`：リリース用。原則Pull Requestで取り込む
- `Full development checks`：両ブランチへのpushで実行。開発ブランチではWindowsインストーラーとPortable ZIPもビルドし、開発用Artifactとしてアップロードします
- `Tauri Windows release build`：`main` 上で手動実行。入力した `release_ref` が `main` の履歴に含まれる必要があります

開発用Artifactと正式リリース用Artifactは別です。詳細は[開発・保守ガイド](docs/development.md)を参照してください。
