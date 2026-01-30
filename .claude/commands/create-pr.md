---
description: PR作成（シンプル版）
allowed-tools: Bash(git:*), Bash(gh:*), Read
model: haiku
---

# PR作成（シンプル版）

現在のブランチからPRを作成します。コミット・プッシュは事前に完了している前提。

## 実行手順

### 0. リポジトリ情報を取得

```bash
# リポジトリルートとリポジトリ名を取得
REPO_ROOT=$(git rev-parse --show-toplevel)
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')
```

### 1. 事前チェック

```bash
# 現在のブランチ
git branch --show-current

# リモートとの差分確認
git log origin/main..HEAD --oneline 2>/dev/null || git log origin/master..HEAD --oneline
```

mainブランチの場合は警告して終了。

### 2. 未プッシュコミットの確認

```bash
git status -sb
```

未プッシュのコミットがあれば自動でプッシュ:

```bash
git push -u origin $(git branch --show-current)
```

### 3. PULL_REQUEST_TEMPLATE確認

```bash
# テンプレートの存在確認
ls "$REPO_ROOT/.github/PULL_REQUEST_TEMPLATE.md" 2>/dev/null || \
ls "$REPO_ROOT/.github/PULL_REQUEST_TEMPLATE"/*.md 2>/dev/null || \
ls "$REPO_ROOT/.github/pull_request_template.md" 2>/dev/null || \
echo "No template found"
```

### 4. PR作成

**テンプレートが存在する場合:**

```bash
gh pr create -R "$GH_REPO" --fill
```

**テンプレートが存在しない場合:**

`/generate-pr-template` と同様のロジックでPR説明文を生成:

1. 変更内容を収集:
```bash
# コミット一覧
git log origin/main..HEAD --oneline 2>/dev/null || git log origin/master..HEAD --oneline

# 変更ファイル
git diff origin/main..HEAD --name-status 2>/dev/null || git diff origin/master..HEAD --name-status
```

2. PR説明文を生成:
```markdown
## Summary

- [変更内容の要約を2-3文で記述]

## Changes

### Added
- [新規ファイル]

### Modified
- [変更ファイル]

### Deleted
- [削除ファイル]

## Test plan

- [ ] [テスト項目]

---
🤖 Generated with Claude Code
```

3. PRを作成:
```bash
gh pr create -R "$GH_REPO" --title "$(git log -1 --pretty=format:%s)" --body "$GENERATED_BODY"
```

### 5. 結果報告

作成されたPRのURLを表示。
