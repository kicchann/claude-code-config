# Custom Command Analytics - Sub-Issues

このドキュメントは、Custom Command Analytics機能を実装するためのsub-issueリストです。
各sub-issueは独立して実装可能で、段階的に機能を追加できます。

---

## Phase 1: 基本機能（1-2時間）

### Sub-Issue #1: ディレクトリ構造とGit管理設定

**タイトル**: [Analytics] Setup directory structure and Git ignore configuration

**説明**:
Custom Command Analyticsのためのディレクトリ構造を作成し、個人データをGit管理から除外する設定を行います。

**タスク**:
- [ ] `.claude/tool-usage/` ディレクトリを作成
- [ ] `.claude/tool-usage/personal/` ディレクトリを作成
- [ ] `.claude/tool-usage/shared/` ディレクトリを作成
- [ ] `.claude/tool-usage/.gitignore` を作成し、`personal/` を除外
- [ ] `.claude/scripts/` ディレクトリを作成（存在しない場合）

**受け入れ基準**:
- ディレクトリ構造が正しく作成されている
- `personal/` ディレクトリがGit管理から除外されている
- `shared/` ディレクトリはGit管理対象

**推定時間**: 15分

**優先度**: High

**ラベル**: `enhancement`, `phase-1`, `analytics`

---

### Sub-Issue #2: transcript解析スクリプトの実装

**タイトル**: [Analytics] Implement transcript analysis script

**説明**:
SessionEnd hookから渡されるtranscript.jsonlを解析し、カスタムコマンドの使用状況を検出するスクリプトを実装します。

**タスク**:
- [ ] `.claude/scripts/analyze-custom-commands.js` を作成
- [ ] ユーザー名取得機能を実装（`getUsername()`）
- [ ] カスタムコマンド定義取得機能を実装（`getCustomCommandDefinitions()`）
- [ ] コマンド名抽出ロジックを実装（`extractCommandName()`）
  - パターン1: `.claude/commands/` 配下のスクリプト
  - パターン2: `.claude/scripts/custom-*.js`
- [ ] transcript解析機能を実装（`analyzeTranscript()`）
  - tool_use検出
  - Bashコマンド解析
  - エラー検出
- [ ] セッション情報の収集（開始・終了時刻、コマンドリスト）

**受け入れ基準**:
- スクリプトがtranscript.jsonlを正しく解析できる
- カスタムコマンドを正確に検出できる
- エラー情報を適切に取得できる
- settings.jsonの`customCommands`と照合できる

**推定時間**: 1時間

**優先度**: High

**ラベル**: `enhancement`, `phase-1`, `analytics`, `core-feature`

**依存関係**: Sub-Issue #1

---

### Sub-Issue #3: 個人統計記録機能

**タイトル**: [Analytics] Implement personal statistics recording

**説明**:
解析したコマンド使用データを個人統計ファイルに記録し、累積的に更新する機能を実装します。

**タスク**:
- [ ] 統計データ構造を定義（`commands.json`）
  - コマンド使用回数
  - エラー率
  - セッションあたりの平均使用回数
  - 最終使用日時
- [ ] セッション履歴記録機能（`sessions.jsonl`）
  - JSONL形式（append-only）
  - セッションID、開始・終了時刻、使用コマンドリスト
- [ ] 統計更新ロジック（`updateStats()`）
  - 既存統計の読み込み
  - 新規データのマージ
  - エラー情報の記録（最新5件を保持）
- [ ] Insights自動生成
  - 未使用コマンドの検出
  - 高エラー率コマンドの抽出
  - 人気コマンドランキング
- [ ] データ保持期間管理（90日）
  - 古いセッションデータの自動削除

**受け入れ基準**:
- `personal/{username}/commands.json` が正しく生成される
- `personal/{username}/sessions.jsonl` にセッション履歴が追記される
- 統計が累積的に更新される
- 90日以前のデータが自動削除される

**推定時間**: 1.5時間

**優先度**: High

**ラベル**: `enhancement`, `phase-1`, `analytics`, `core-feature`

**依存関係**: Sub-Issue #2

---

### Sub-Issue #4: SessionEnd hook設定

**タイトル**: [Analytics] Configure SessionEnd hook

**説明**:
settings.jsonにSessionEnd hookを追加し、セッション終了時に自動的に統計解析スクリプトを実行するよう設定します。

**タスク**:
- [ ] `.claude/settings.json` にSessionEnd hookを追加
- [ ] hookの設定を確認
  - `type: "command"`
  - `command: "node .claude/scripts/analyze-custom-commands.js"`
  - タイムアウト設定（30秒程度）
- [ ] エラーハンドリングの確認
  - スクリプトエラーがClaude Codeの動作をブロックしないこと
  - exit code 0で正常終了すること
- [ ] 動作テスト
  - ダミーのtranscriptで動作確認

**受け入れ基準**:
- SessionEnd hookが正しく設定されている
- セッション終了時にスクリプトが自動実行される
- スクリプトエラーがClaude Codeをブロックしない

**推定時間**: 30分

**優先度**: High

**ラベル**: `enhancement`, `phase-1`, `analytics`, `integration`

**依存関係**: Sub-Issue #3

---

## Phase 2: レポート生成（2-3時間）

### Sub-Issue #5: レポート生成スクリプト

**タイトル**: [Analytics] Implement command usage report generator

**説明**:
記録された統計データを読み込み、人間が読みやすいレポート形式で表示するスクリプトを実装します。

**タスク**:
- [ ] `.claude/scripts/generate-command-report.js` を作成
- [ ] ユーザー統計の読み込み機能
- [ ] レポートフォーマット機能（`generateReport()`）
  - ヘッダー情報（ユーザー、期間、セッション数）
  - TOP 5使用コマンド
  - 高エラー率コマンド（> 5%）
  - 使用頻度の低いコマンド（< 3回）
  - 未使用コマンド
  - 統計サマリー
- [ ] 日時フォーマット関数（`formatDate()`）
- [ ] 経過日数計算（`daysSince()`）
- [ ] エラー率の視覚化（絵文字・パーセント表示）

**受け入れ基準**:
- 統計データから見やすいレポートが生成される
- 日本語と英語の混在フォーマットで表示される
- エラー率が視覚的に分かりやすい
- 未使用コマンドが明確に表示される

**推定時間**: 1.5時間

**優先度**: High

**ラベル**: `enhancement`, `phase-2`, `analytics`, `reporting`

**依存関係**: Sub-Issue #3

---

### Sub-Issue #6: カスタムコマンド定義

**タイトル**: [Analytics] Create command-report custom command

**説明**:
レポート生成スクリプトを呼び出すカスタムコマンドを定義し、Claude Codeから簡単にレポートを確認できるようにします。

**タスク**:
- [ ] `.claude/commands/command-report.md` を作成
- [ ] コマンド説明文を記述
- [ ] 使用方法の説明
  - 基本的な使い方: `/command-report`
  - オプション: `--team`（チーム統計比較）
- [ ] スクリプト実行コマンド
  - `node .claude/scripts/generate-command-report.js`
- [ ] 出力例の記載

**受け入れ基準**:
- `/command-report` でレポートが表示される
- コマンドヘルプが適切に記述されている
- オプションが機能する（Phase 3で実装）

**推定時間**: 30分

**優先度**: High

**ラベル**: `enhancement`, `phase-2`, `analytics`, `documentation`

**依存関係**: Sub-Issue #5

---

### Sub-Issue #7: Insights生成機能強化

**タイトル**: [Analytics] Enhance insights generation

**説明**:
統計データからより詳細なinsightsを生成し、改善提案の基礎データを構築します。

**タスク**:
- [ ] エラーパターン分析
  - 共通エラーメッセージの抽出
  - エラー頻度のカウント
- [ ] 使用トレンド分析
  - セッションあたりの平均使用回数
  - 使用セッション数
- [ ] コマンドステータス判定
  - `active`: 定期的に使用
  - `rarely_used`: 使用頻度が低い
  - `unused`: 一度も使用されていない
- [ ] 最終使用からの経過日数計算
- [ ] 改善提案の優先順位付け

**受け入れ基準**:
- エラーパターンが適切に抽出される
- コマンドステータスが正しく判定される
- insightsデータがcommands.jsonに含まれる

**推定時間**: 1時間

**優先度**: Medium

**ラベル**: `enhancement`, `phase-2`, `analytics`, `insights`

**依存関係**: Sub-Issue #3

---

## Phase 3: 改善提案（3-4時間）

### Sub-Issue #8: 改善提案スクリプト

**タイトル**: [Analytics] Implement improvement suggestions generator

**説明**:
統計データとinsightsを基に、具体的な改善提案を自動生成するスクリプトを実装します。

**タスク**:
- [ ] `.claude/scripts/suggest-improvements.js` を作成
- [ ] エラーパターンDB構築
  - よくあるエラーと解決策のマッピング
  - 例: "fatal: not a git repository" → "コマンド実行前にgitリポジトリの確認を追加"
- [ ] config.json最適化提案
  - 未使用コマンドの削除提案（具体的なコマンド名）
  - よく使うコマンドの順序最適化
- [ ] エラー率改善提案
  - バリデーション追加の提案
  - エラーハンドリング改善の提案
- [ ] 提案の優先順位付け
  - High: エラー率 > 10%
  - Medium: 未使用コマンドが5個以上
  - Low: その他の最適化

**受け入れ基準**:
- 統計データから具体的な改善提案が生成される
- 提案が優先順位付けされている
- 実行可能なアクションが明確に示される

**推定時間**: 2時間

**優先度**: Medium

**ラベル**: `enhancement`, `phase-3`, `analytics`, `automation`

**依存関係**: Sub-Issue #7

---

### Sub-Issue #9: チーム統計機能（オプション）

**タイトル**: [Analytics] Implement team statistics aggregation (Optional)

**説明**:
個人データを匿名化してチーム統計として集計する機能を実装します（オプトイン）。

**タスク**:
- [ ] 個人設定ファイル（`personal/{user}/config.json`）の実装
  - `shareAnonymousStats`: デフォルトfalse
  - `analysisEnabled`: 分析機能の有効/無効
  - `retentionDays`: データ保持期間
- [ ] 匿名化集計ロジック
  - ユーザー名を除外
  - 統計値のみを集計
- [ ] チーム統計ファイル（`shared/commands-aggregated.json`）生成
  - 総ユーザー数
  - コマンドごとの集計
  - 平均使用回数
  - 平均エラー率
- [ ] オプトイン/アウト機能

**受け入れ基準**:
- 個人設定が正しく管理される
- デフォルトでデータ共有しない（プライバシー保護）
- オプトインした場合のみ匿名化データが集計される
- ユーザー名が共有統計に含まれない

**推定時間**: 2時間

**優先度**: Low

**ラベル**: `enhancement`, `phase-3`, `analytics`, `team-feature`, `optional`

**依存関係**: Sub-Issue #3

---

### Sub-Issue #10: カスタムコマンド設定管理

**タイトル**: [Analytics] Create command-config custom command

**説明**:
Analytics機能の設定を管理するカスタムコマンドを実装します。

**タスク**:
- [ ] `.claude/commands/command-config.md` を作成
- [ ] 設定表示機能
  - 現在の設定を表示
  - データ共有設定
  - 保持期間
- [ ] 設定変更機能
  - データ共有のオン/オフ
  - 保持期間の変更
- [ ] インタラクティブな設定変更UI
  - Yes/No形式の質問
  - 設定変更の確認

**受け入れ基準**:
- `/command-config` で現在の設定が表示される
- インタラクティブに設定を変更できる
- 変更が正しく保存される

**推定時間**: 1時間

**優先度**: Low

**ラベル**: `enhancement`, `phase-3`, `analytics`, `configuration`

**依存関係**: Sub-Issue #9

---

## テスト・ドキュメント

### Sub-Issue #11: 統合テストと動作確認

**タイトル**: [Analytics] Integration testing and validation

**説明**:
全機能の統合テストを実施し、エンドツーエンドで正常に動作することを確認します。

**タスク**:
- [ ] Phase 1機能のテスト
  - ダミーtranscriptでの統計記録
  - SessionEnd hookの動作確認
- [ ] Phase 2機能のテスト
  - レポート生成の確認
  - 各種統計値の正確性検証
- [ ] Phase 3機能のテスト
  - 改善提案の妥当性確認
  - チーム統計の匿名性確認
- [ ] エラーケースのテスト
  - transcript不正データの処理
  - 統計ファイル破損時の挙動
  - ディスク容量不足の処理
- [ ] パフォーマンステスト
  - 大量セッションデータでの処理時間
  - メモリ使用量の確認

**受け入れ基準**:
- すべての主要機能が正常に動作する
- エラーケースで適切にハンドリングされる
- パフォーマンスが許容範囲内

**推定時間**: 2時間

**優先度**: High

**ラベル**: `testing`, `validation`, `analytics`

**依存関係**: Sub-Issue #4, #6, #8

---

### Sub-Issue #12: ドキュメント整備

**タイトル**: [Analytics] Documentation and usage guide

**説明**:
Custom Command Analytics機能の完全なドキュメントを作成します。

**タスク**:
- [ ] README更新
  - 機能概要の追加
  - インストール手順
  - 基本的な使い方
- [ ] 使用例の追加
  - レポート確認の例
  - 設定変更の例
  - 改善提案の活用例
- [ ] トラブルシューティングガイド
  - よくある問題と解決方法
  - デバッグ方法
- [ ] アーキテクチャドキュメント
  - ディレクトリ構造の説明
  - データフォーマットの詳細
  - 拡張方法
- [ ] プライバシーポリシー
  - 記録される情報
  - 記録されない情報
  - データ保持期間

**受け入れ基準**:
- ドキュメントが完全で分かりやすい
- 新規ユーザーが機能を理解できる
- プライバシー懸念が明確に説明されている

**推定時間**: 1.5時間

**優先度**: Medium

**ラベル**: `documentation`, `analytics`

**依存関係**: Sub-Issue #11

---

## 実装順序の推奨

1. **Phase 1を順番に実装**（必須）
   - Sub-Issue #1 → #2 → #3 → #4

2. **Phase 2を順番に実装**（推奨）
   - Sub-Issue #5 → #6 → #7

3. **Phase 3は優先度に応じて**（オプション）
   - Sub-Issue #8（改善提案）を優先
   - Sub-Issue #9, #10は必要に応じて実装

4. **最後にテスト・ドキュメント**
   - Sub-Issue #11（テスト）
   - Sub-Issue #12（ドキュメント）

## 見積もり合計

- **Phase 1**: 3時間15分
- **Phase 2**: 3時間
- **Phase 3**: 5時間
- **テスト・ドキュメント**: 3時間30分

**合計**: 約14時間45分

ただし、Phase 3のオプション機能を除外する場合：
**最小実装**: 約10時間15分

---

## 注意事項

1. **各sub-issueは独立して実装可能**
   - ただし、依存関係に注意

2. **最小限の実装でも価値提供**
   - Phase 1完了時点で基本的な統計記録が可能
   - Phase 2完了時点でレポート確認が可能

3. **段階的なリリース推奨**
   - Phase 1完了後にリリース可能
   - フィードバックを得ながら次のPhaseへ

4. **プライバシー最優先**
   - デフォルトで個人データは共有しない
   - 明示的なオプトインのみ

5. **エラーハンドリング重要**
   - Analytics機能の失敗がClaude Codeをブロックしない
   - 常にexit code 0で終了
