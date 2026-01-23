---
description: "[非推奨] /clean-branches を使用してください"
allowed-tools: Bash(git:*)
model: haiku
---

> [!WARNING]
> このコマンドは非推奨です。代わりに `/clean-branches` を使用してください。

# マージ済みブランチの削除

マージ済みのブランチをローカルとリモートから削除します。

## 実行手順

### 1. 現在のブランチ確認

```bash
git branch --show-current
```

### 2. マージ済みブランチの一覧表示

```bash
# ローカルのマージ済みブランチ（main/masterを除く）
git branch --merged | grep -v -E '^\*|main|master'
```

### 3. 削除対象の確認

マージ済みブランチを一覧表示し、ユーザーに削除対象を確認。

**保護対象**: `main`, `master`, 現在のブランチは削除しない。

### 4. ブランチ削除

ユーザー確認後:

```bash
# ローカルブランチ削除
git branch -d <branch-name>

# リモートブランチ削除（オプション）
git push origin --delete <branch-name>
```

## 安全チェック

- `main`/`master` ブランチは削除しない
- 現在チェックアウト中のブランチは削除しない
- 削除前に必ずユーザー確認を行う
- リモート削除は明示的な確認後のみ実行

## 注意

- `--merged` は現在のブランチにマージ済みのブランチを表示
- 強制削除 (`-D`) は使用しない
