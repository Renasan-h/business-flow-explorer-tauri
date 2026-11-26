# セキュリティ・依存ライブラリリスク台帳

本資料は設計上のリスクと保守時の対策を整理したものです。脆弱性診断結果や安全性の保証ではありません。

## 評価基準

優先度は影響・攻撃条件・対策コストを基準とし、CVSSとは区別します。

## アプリ固有のリスク

| ID | 優先度 | 対象・根拠  | リスクと対応案 |
| --- | --- | --- | --- |
| APP-01 | 中 | `src-tauri/tauri.conf.json` の `app.security.csp: null` | ローカル専用・外部バックエンドAPIなしという利用形態を踏まえ、CSPは設定されていない。CSPはバックエンドの有無と無関係にXSSの被害軽減に役立つため、外部コンテンツ導入・信頼境界変更時に再評価する。 |
| APP-02 | 高 | `src-tauri/src/lib.rs` の `resolve_existing`、`replace_yaml_checked` | 読込時のcanonicalize・保存時のsymlink_metadata・保存競合チェックはを備える。ただしファイル検査から実操作までの外部プロセスによる差し替え競合（TOCTOU）のリスクが残る。リンク・ディレクトリ差し替えの並行試験とWindowsでの権限検証を追加する。 |
| APP-03 | 中 | `src-tauri/src/lib.rs` の `list_yaml` | 深さ32階層、探索項目50,000件、YAML10,000件の上限を設ける。大量フォルダでの実機負荷、上限時のUI通知、シンボリックリンク差し替え競合に注意する。 |
| APP-04 | 中 | `src/scenario.ts` の `readFragments` | 循環参照・ルート逸脱防止あり。参照展開の負荷は実用規模で評価する。 |
| APP-05 | 中 | `src/scenario.ts` のYAMLパース・Zod検証 | 実際の読込・描画・操作・保存性能を現実的なノード・通信数で測定し、通常利用で問題が起こる場合に修正。 |
| APP-06 | 中 | `src-tauri/src/lib.rs` の `replace_yaml_checked` | 同一プロセス内ロック・外部変更比較・一時ファイル・バックアップ・失敗時復元は実装済み。電源断、ウイルス対策ソフトによるファイルロック、バックアップ削除失敗の復旧手順をWindows実機で検証する。 |
| APP-07 | 中 | `src-tauri/capabilities/default.json` | `core:default` のみ許可。独自invokeコマンドはシナリオフォルダ選択・列挙・読書き・作成を提供する。コマンド入力は信頼せずRust側で制限する方針とし、Tauri権限・公開コマンドの棚卸しを行う。 |
| APP-08 | 低 | 配布形態・Windows WebView2 | Portable ZIPは完全なデータ隔離を保証しない。WebView2ランタイム更新、配布物のハッシュ・署名・出所検証を運用に追加する。 |

## 依存ライブラリ・サプライチェーン

`package.json` の直接依存：`react`、`react-dom`、`pixi.js`、`yaml`、`zod`、`@tauri-apps/api`。開発依存：`vite`、`@vitejs/plugin-react`、`typescript`、`playwright`、`@tauri-apps/cli`、`@types/react`、`@types/react-dom`。  
`src-tauri/Cargo.toml`：`tauri`、`tauri-plugin-dialog`、`tauri-build`。**インストール時に解決される正確なバージョンはロックファイルで確認する**。

| ID | 優先度 | 対象  | 対応 |
| --- | --- | --- | --- |
| DEP-01 | 高 | npmの直接・推移依存（ランタイムと開発ツール） | `npm ci` 後に `npm audit --json` と `npm ls --all` を保存し、CVE/GHSA・影響範囲・修正版を台帳へ転記する。開発依存の脆弱性と配布物に入る依存を区別する。 |
| DEP-02 | 高 | Rust crates（Tauriと推移依存） | `cargo install cargo-audit --locked`、`cargo audit --manifest-path src-tauri/Cargo.toml`（利用バージョンの対応可否を確認）でRustSecを照合。検出したadvisoryを記録する。 |
| DEP-03 | 高 | `src-tauri/Cargo.lock` | Rustの依存再現性を確認し、生成・コミット方針を検討する。ロックファイル不在が即CVEを意味するわけではない。 |
| DEP-04 | 中 | GitHub ActionsのサードパーティAction | `actions/checkout@v4`、`actions/setup-node@v4`、`dtolnay/rust-toolchain@stable`、`swatinem/rust-cache@v2`、`actions/upload-artifact@v4` を使用。タグ参照の改変リスクを評価し、可能ならコミットSHA固定・更新手順を導入する。 |
| DEP-05 | 低 | npmのバージョン範囲・レジストリ取得 |  直接依存のバージョンとlockfileルート定義を同期する。`npm ci` で整合性確認する。推移依存はlockfileで固定される。 |
| DEP-06 | 中 | Tauri・WebView2・Windows配布 | Tauri/RustSec/GHSAの更新通知、Windows WebView2の更新、署名と配布ZIPのSHA-256を定期確認する。 |

### 監査コマンド（開発者のWindows端末で実行）

```powershell
git rev-parse HEAD
npm ci
npm audit --json > npm-audit.json
npm ls --all > npm-dependency-tree.txt
cargo install cargo-audit --locked
cargo audit
```

`npm audit` や `npm ls` は問題があると非0で終了する場合がある。監査出力は削除せず、結果の判定とセットで保存する。生成されたレポートにトークン・ローカルパスなどが含まれないか確認してから共有する。Rust側は `src-tauri/Cargo.toml` と対応するロックファイルを基準に監査する。
