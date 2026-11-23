# セキュリティ・依存ライブラリリスク台帳（初回調査）

更新日：2026-11-23／調査基準：`develop_tauri` の `1fbd775`（着手時）  
**これはソースコードの静的レビューによる初期リスク一覧であり、脆弱性診断やCVE照合が完了したことを意味しません。**

## 評価基準

- **確認済み**：対象ブランチの実ファイルで設定・実装を確認。
- **要検証**：成立条件や悪用可能性が未検証の懸念。脆弱性の確定ではない。
- **未監査**：外部アドバイザリDBや実際の依存解決結果との突き合わせが未完了。
- 優先度は影響・攻撃条件・対策コストの暫定評価。CVEのCVSSとは異なる。

## アプリ固有のリスク

| ID | 優先度 | 対象・根拠 | 状態 | リスクと対応案 |
| --- | --- | --- | --- | --- |
| APP-01 | 対応保留 | `src-tauri/tauri.conf.json` の `app.security.csp: null` | **ユーザー方針で設定維持** | ローカル専用・外部バックエンドAPIなしという利用形態を踏まえ、現時点ではCSPを追加しない。CSPはバックエンドの有無と無関係にXSSの被害軽減に役立つため、外部コンテンツ導入・信頼境界変更時に再評価する。 |
| APP-02 | 高 | `src-tauri/src/lib.rs` の `resolve_existing`、`replace_yaml_checked` | 要検証 | 読込時のcanonicalize・保存時のsymlink_metadata・保存競合チェックは実装済み。ただしファイル検査から実操作までの外部プロセスによる差し替え競合（TOCTOU）の安全性は未検証。リンク・ディレクトリ差し替えの並行試験とWindowsでの権限検証を追加する。 |
| APP-03 | 中 | `src-tauri/src/lib.rs` の `list_yaml` | **対策実装済み／テスト未実行** | `563f68a` で深さ32階層、探索項目50,000件、YAML10,000件の上限と境界テストを追加。大量フォルダでの実機負荷、上限時のUI通知、シンボリックリンク差し替え競合は引き続き要検証。 |
| APP-04 | 中 | `src/scenario.ts` の `readFragments` | 要検証 | 循環参照・ルート逸脱を防止している一方、YAMLの総サイズ・参照展開総数・深さの上限はコード上未確認。多数の異なるサブシナリオでCPU/メモリ負荷が増える懸念。サイズ・深さ・総参照数の制限と回帰テストを追加する。 |
| APP-05 | 中 | `src/scenario.ts` のYAMLパース・Zod検証 | 部分的に対策済み／要検証 | 一部のフィールドには長さ・座標・経由点数の制約があるが、すべての配列・文字列・ファイルサイズに一律の上限があるわけではない。大容量・異常入力での負荷試験が必要。 |
| APP-06 | 中 | `src-tauri/src/lib.rs` の `replace_yaml_checked` | 部分的に対策済み／要検証 | 同一プロセス内ロック・外部変更比較・一時ファイル・バックアップ・失敗時復元は実装済み。電源断、ウイルス対策ソフトによるファイルロック、バックアップ削除失敗の復旧手順をWindows実機で検証する。 |
| APP-07 | 中 | `src-tauri/capabilities/default.json` | 設定確認済み／要検証 | `core:default` のみ許可。独自invokeコマンドはシナリオフォルダ選択・列挙・読書き・作成を提供する。コマンド入力は信頼せずRust側で制限する方針を継続し、Tauri権限・公開コマンドの棚卸しを行う。 |
| APP-08 | 低 | 配布形態・Windows WebView2 | 要検証 | Portable ZIPは完全なデータ隔離を保証しない。WebView2ランタイム更新、配布物のハッシュ・署名・出所検証を運用に追加する。 |

## 依存ライブラリ・サプライチェーン

`package.json` の直接依存：`react`、`react-dom`、`pixi.js`、`yaml`、`zod`、`@tauri-apps/api`。開発依存：`vite`、`@vitejs/plugin-react`、`typescript`、`playwright`、`@tauri-apps/cli`、`@types/react`、`@types/react-dom`。  
`src-tauri/Cargo.toml`：`tauri`、`tauri-plugin-dialog`、`tauri-build`。いずれもバージョン範囲指定であり、**インストール時に解決される正確なバージョンはロックファイルで確認する**。

| ID | 優先度 | 対象 | 状態 | 対応 |
| --- | --- | --- | --- | --- |
| DEP-01 | 高 | npmの直接・推移依存（ランタイムと開発ツール） | **未監査** | `npm ci` 後に `npm audit --json` と `npm ls --all` を保存し、CVE/GHSA・影響範囲・修正版を台帳へ転記する。開発依存の脆弱性と配布物に入る依存を区別する。 |
| DEP-02 | 高 | Rust crates（Tauriと推移依存） | **未監査** | `cargo install cargo-audit --locked`、`cargo audit --manifest-path src-tauri/Cargo.toml`（利用バージョンの対応可否を確認）でRustSecを照合。検出したadvisoryを記録する。 |
| DEP-03 | 高 | `src-tauri/Cargo.lock` | **ファイル未確認** | GitHubの対象ブランチではファイル取得時404。Rustの依存再現性を確認し、生成・コミット方針を検討する。ロックファイル不在が即CVEを意味するわけではない。 |
| DEP-04 | 中 | GitHub ActionsのサードパーティAction | **設定確認済み／未監査** | `actions/checkout@v4`、`actions/setup-node@v4`、`dtolnay/rust-toolchain@stable`、`swatinem/rust-cache@v2`、`actions/upload-artifact@v4` を使用。タグ参照の改変リスクを評価し、可能ならコミットSHA固定・更新手順を導入する。 |
| DEP-05 | 低 | npmのバージョン範囲・レジストリ取得 | **直接依存13件を固定済み／インストール未検証** | `26f8cc8`・`8c20b60` で `package.json` の `^`・`~` を解消済みのlockfileバージョンに置き換え、lockfileルート定義を同期。`npm ci` で整合性確認する。推移依存はlockfileで固定される。 |
| DEP-06 | 中 | Tauri・WebView2・Windows配布 | **未監査** | Tauri/RustSec/GHSAの更新通知、Windows WebView2の更新、署名と配布ZIPのSHA-256を定期確認する。 |

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

## 未検証Windows実機15ケースの優先順

過去のユーザー報告ではWIN-01〜03、05〜07、09〜13の11件がPASS。**現行HEADでの実機PASSではない。** 未検証は以下。

| 優先 | ケース | 検証内容 |
| --- | --- | --- |
| P0 | WIN-08 | 既存YAML保存、意図しないファイル変更がないこと |
| P0 | WIN-22 | 選択フォルダ外の参照・保存拒否 |
| P0 | WIN-23 | 不正なYAML・存在しないActor・異常な経由点を拒否 |
| P0 | WIN-16 | サブシナリオ参照・共通Actor・ルート外拒否 |
| P1 | WIN-04 | 再生・一時停止・速度・前後ステップ |
| P1 | WIN-14 | 双方向通信の往路・復路・再保存 |
| P1 | WIN-15 | 分岐A/Bの切替 |
| P1 | WIN-17 | IF定義の参照と永続化 |
| P1 | WIN-25 | 削除キー、キャンセル、一括Undo、入力欄保護 |
| P1 | WIN-26 | 再生順ドラッグ・Escape・Undo/Redo・再保存 |
| P2 | WIN-18 | Ctrl+Z/Ctrl+Y |
| P2 | WIN-19 | 30%縮尺・負座標・無限領域 |
| P2 | WIN-20 | 初期表示中心 |
| P2 | WIN-21 | 複数選択・一括移動 |
| P2 | WIN-24 | 最小化・最大化・リサイズ |

**結果の記録**：`docs/WINDOWS_ACCEPTANCE_TESTS.md` の記録テンプレートを使用し、SHA、Windowsバージョン、配布形式、ケース別PASS/FAIL/BLOCKED、再現手順を記録する。Windows実機を操作していない場合はPASSにしない。

## 次の対応順

1. Windows実機15件を実施し、FAILを優先修正。
2. npm・Rustの監査結果を収集し、GHSA/CVEごとに実際の解決済みバージョン、影響条件、修正版を確定する。
3. APP-01のCSP導入はユーザー判断により保留。外部コンテンツや権限が増えた場合に再検討。
4. APP-02〜06の境界・大容量・競合テストを追加。
5. 監査結果と残リスクをリリース判定に反映する。

**監査実施状況：この文書作成時点でnpm audit・cargo audit・Windows実機15件・GitHub Actionsは未実行。既知CVEが0件と判断してはいけない。**

## 2026-11-23 対策実装の追記

- `563f68a`：APP-03のリソース上限をRust側に実装し、階層と項目・ファイル数の単体テストを追加。
- **Rustテスト・Windows実機・手動GitHub Actionsは未実行。** 対策が完全であることやCVE解消を意味しない。

## 2026-11-23 運用方針の変更と依存固定

- CSPはユーザーの明示的な方針により現状維持。外部バックエンドAPIがないことはCSPが無意味である根拠ではないが、今回の実装対象から除外する。
- 「大量データ」は、①ディレクトリ配下のファイル・フォルダ数、②1つのYAML内のノード・通信・テキスト量、③サブシナリオ参照数・展開深度を指す。いずれも具体的な障害・攻撃の発生は未確認。②③への新規上限は実測・利用規模の確認まで見送る。
- `package.json` の直接・開発依存13件を既存 `package-lock.json` の解決済みバージョンに固定。lockfileルート定義も同期。**バージョン固定は既知CVEの解消を意味しない**。監査は未実施。
