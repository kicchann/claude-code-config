---
paths: /never/match/folder/**
---

# GitHub CLI Usage

## Proxy Environment Support

All gh commands must include repository detection:

```bash
# Get repository name (proxy environment compatible)
GH_REPO=$(git remote get-url origin | sed 's/\.git$//' | grep -oE '[^/]+/[^/]+$')

# Use -R option for all gh commands
gh issue list -R "$GH_REPO"
gh pr view -R "$GH_REPO" <number>
```

**Reason**: Local proxy URLs (127.0.0.1:48480) prevent gh from auto-detecting the repository.

## Multi-User Environment

複数ユーザーで共有する環境では、`GITHUB_TOKEN` が別ユーザーのトークンで設定されている場合がある。
gh CLI 実行前に `unset GITHUB_TOKEN` で環境変数をクリアし、`gh auth` の認証情報を使用すること。

```bash
unset GITHUB_TOKEN && gh pr list -R "$GH_REPO"
```
