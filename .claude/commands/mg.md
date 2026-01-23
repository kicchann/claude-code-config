---
description: "[非推奨] /check-merge を使用してください"
argument-hint: [PR番号]
allowed-tools: Bash(gh:*), Bash(git:*), AskUserQuestion
model: haiku
---

# ⚠️ このコマンドは非推奨です

**新しいコマンド**: `/check-merge` を使用してください。

このコマンドは後方互換性のために残されていますが、将来のバージョンで削除される予定です。

## 移行ガイド

- 旧: `/mg`
- 新: `/check-merge`

詳細は `.claude/docs/command-migration-guide.md` を参照してください。

---

# マージ前最終チェック

PRをマージする前に、必要な条件がすべて満たされているか確認します。

## 引数

- `$ARGUMENTS`: PR番号（オプション。省略時は現在のブランチのPR）

## 実行手順

### 0. リポジトリ名を取得

```bash
# リポジトリ名を取得（プロキシ環境対応）
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')
```

### 1. PR情報の取得

```bash
# PR情報を取得
gh pr view -R "$GH_REPO" <PR番号> --json number,title,state,mergeable,mergeStateStatus,reviews,statusCheckRollup,headRefName,baseRefName
```

### 2. チェック項目

以下の項目をチェックしてレポート:

#### CI/CDステータス
```bash
gh pr checks -R "$GH_REPO" <PR番号>
```

| ステータス | 意味 |
|-----------|------|
| pass | すべてのチェックが成功 |
| fail | 失敗したチェックあり |
| pending | 実行中のチェックあり |

#### レビュー状態
- Approved: 承認済みレビューの数
- Changes Requested: 変更要求の有無
- Pending: 未レビューの有無

#### マージ可能性
- `mergeable`: マージ可能か
- `mergeStateStatus`: マージ状態
  - `CLEAN`: マージ可能
  - `DIRTY`: コンフリクトあり
  - `BLOCKED`: ブランチ保護ルールでブロック
  - `BEHIND`: ベースブランチより遅れている

### 3. コンフリクトチェック

```bash
# ベースブランチとの差分確認
git fetch origin
git diff --stat origin/main...HEAD 2>/dev/null || git diff --stat origin/master...HEAD
```

### 4. 結果レポート

```
=== マージ前チェック: PR #123 ===

## CI/CD
[ ] テスト: pass/fail/pending
[ ] ビルド: pass/fail/pending
[ ] Lint: pass/fail/pending

## レビュー
[x] Approved: 2
[ ] Changes Requested: なし

## マージ状態
[x] コンフリクト: なし
[x] ベースブランチ: 最新

## 結果
✅ マージ可能 / ⚠️ 要対応項目あり / ❌ マージ不可
```

### 5. 推奨アクション

問題がある場合、解決方法を提案:
- CI失敗 → ログ確認コマンドを案内
- コンフリクト → リベース手順を案内
- レビュー不足 → レビュー依頼を案内

### 6. マージ実行（オプション）

マージ可能な状態（✅ マージ可能）の場合のみ、AskUserQuestionでユーザーに確認:

**質問1**: マージを実行するか
- 選択肢: 「マージする」「マージしない」

**質問2**（マージする場合）: ブランチを削除するか
- 選択肢: 「削除する」「削除しない」

**質問3**（削除する場合）: 本当に削除してよいか再確認
- ブランチ名を明示して確認: 「⚠️ ブランチ '<branch-name>' を削除します。よろしいですか？」
- 選択肢: 「はい、削除する」「いいえ、残す」

ユーザーの選択に応じて実行:
```bash
# マージ実行（ブランチ削除あり）
gh pr merge -R "$GH_REPO" <PR番号> --merge --delete-branch

# マージ実行（ブランチ削除なし）
gh pr merge -R "$GH_REPO" <PR番号> --merge

# masterブランチに切り替えて最新を取得
git checkout master && git pull origin master
```

マージ不可の場合は、この手順をスキップしてチェック結果のみ報告する。

## 使用例

```
/mg          # 現在のブランチのPR
/mg 123      # PR #123
```
