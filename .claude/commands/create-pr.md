---
description: PR作成（シンプル版）
allowed-tools: Bash(git:*), Bash(gh:*)
model: haiku
---

# PR作成（シンプル版）

現在のブランチからPRを作成します。コミット・プッシュは事前に完了している前提。

## 実行手順

### 0. リポジトリ名を取得

```bash
# リポジトリ名を取得（プロキシ環境対応）
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

### 3. PR作成

```bash
# タイトル: 最新コミットメッセージを使用
gh pr create -R "$GH_REPO" --fill
```

### 4. 結果報告

作成されたPRのURLを表示。
