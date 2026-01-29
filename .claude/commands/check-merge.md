---
description: マージ前最終チェック（CI、Approve、コンフリクト）
argument-hint: [PR番号]
allowed-tools: Bash(gh:*), Bash(git:*), AskUserQuestion
model: haiku
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

```text
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

### 6. 関連issue検出

PRの説明文から `Closes #N`, `Fixes #N`, `Resolves #N` パターンを検出し、関連issueを特定する。

```bash
gh pr view -R "$GH_REPO" <PR番号> --json body -q '.body' | grep -oE '(Closes|Fixes|Resolves) #[0-9]+' | grep -oE '#[0-9]+'
```

### 7. 次のアクション選択

マージ可能な状態（✅ マージ可能）の場合のみ、AskUserQuestionで次のアクションを確認:

```yaml
AskUserQuestion (multiSelect: false):
  question: "次のアクションを選択してください"
  header: "アクション"
  options:
    - label: "マージを実行する"
      description: "チェック完了、マージオプションを選択"
    - label: "レビューを依頼する"
      description: "コントリビュータからレビュアーを選択"
    - label: "マージしない（後で確認）"
      description: "チェック結果のみ表示して終了"
```

**「マージしない」選択時**: チェック結果のみ報告して終了。

**「レビューを依頼する」選択時**: ステップ7.1へ進む。

**「マージを実行する」選択時**: ステップ8へ進む。

### 7.1 レビュアー選択

プロジェクトのコラボレーターを取得し、レビュアー候補リストを作成:

```bash
# PR作成者を取得
PR_AUTHOR=$(gh pr view -R "$GH_REPO" <PR番号> --json author -q '.author.login')

# コラボレーター一覧を取得（PR作成者を除外）
REVIEWERS=$(gh api "repos/$GH_REPO/collaborators" 2>/dev/null | jq -r '.[].login' | grep -v "$PR_AUTHOR")

# フォールバック: コラボレーター取得失敗時はコミット履歴から取得
if [ -z "$REVIEWERS" ]; then
  REVIEWERS=$(git log --format='%aN' -100 | sort -u | grep -v "$PR_AUTHOR" | head -5)
fi
```

**注意**: `contributors` や `assignees` APIは404エラーを返す場合があるため、`collaborators` APIを使用。失敗時はコミット履歴からフォールバック。

```yaml
AskUserQuestion (multiSelect: true):
  question: "レビュアーを選択してください"
  header: "レビュアー"
  options:
    # AIレビュアー（常に表示）
    - label: "@copilot"
      description: "GitHub Copilot レビュー"
    - label: "@claude"
      description: "Claude AI レビュー"
    # コントリビュータ一覧から動的に生成
    - label: "@contributor1"
      description: "コントリビュータ"
    - label: "@contributor2"
      description: "コントリビュータ"
    # ...
```

選択後、レビュアーをPRに追加:

```bash
# 人間のレビュアーを追加
gh pr edit -R "$GH_REPO" <PR番号> --add-reviewer <human_reviewers>

# AIレビュアーはコメントでメンション
if "@claude" selected:
  gh pr comment -R "$GH_REPO" <PR番号> --body "@claude please review this PR"
if "@copilot" selected:
  gh pr comment -R "$GH_REPO" <PR番号> --body "@copilot please review this PR"
```

レビュー依頼完了のメッセージを表示して終了。

### 8. マージオプション選択（multiSelect方式）

マージを実行する場合、AskUserQuestionで**1回の確認**で全オプションを選択:

```yaml
AskUserQuestion (multiSelect: true):
  question: "マージオプションを選択してください"
  header: "オプション"
  options:
    - label: "リモートブランチを削除する"
      description: "マージ後にリモートブランチを削除"
    - label: "ローカルブランチを削除する"
      description: "マージ後にローカルブランチを削除"
    - label: "関連issueをクローズする (#N)"
      description: "関連issueを自動クローズ（検出時のみ表示）"
```

### 9. 選択に応じた実行

ユーザーの選択に応じて順次実行:

```bash
# 1. マージ実行
if "リモートブランチを削除する" 選択:
  gh pr merge -R "$GH_REPO" <PR番号> --merge --delete-branch
else:
  gh pr merge -R "$GH_REPO" <PR番号> --merge

# 2. mainブランチに切り替えて最新を取得
git checkout main && git pull origin main

# 3. ローカルブランチ削除（選択時）
if "ローカルブランチを削除する" 選択:
  git branch -d <branch-name>

# 4. 関連issueクローズ（選択時）
if "関連issueをクローズする" 選択:
  # PRマージで自動クローズされない場合のフォールバック
  gh issue close -R "$GH_REPO" <issue番号> --comment "Closed via PR #<PR番号>"
```

### 10. 結果サマリー

実行した全アクションのサマリーを表示:

```text
✅ 完了サマリー
- PR #41: マージ完了
- リモートブランチ: 削除済み
- ローカルブランチ: 削除済み
- Issue #40: クローズ済み
```

マージ不可の場合は、ステップ6-10をスキップしてチェック結果のみ報告する。

## 使用例

```text
/check-merge          # 現在のブランチのPR
/check-merge 123      # PR #123
```
