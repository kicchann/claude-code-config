# claude-code-config

Claude Code (claude.ai/code) 用のスラッシュコマンド、スキル、エージェント設定集です。

## 概要

開発ワークフロー（issue → 実装 → PR）を自動化するための設定ファイル群を提供します。

## 構成

```text
.claude/
├── commands/    # スラッシュコマンド (*.md)
├── skills/      # ドメイン知識 (TDD原則, Clean Architecture等)
├── agents/      # サブエージェント設定
├── rules/       # モジュール化されたルール・ドキュメント
├── hooks/       # フック設定
├── scripts/     # フックから実行されるスクリプト
└── tool-usage/  # ツール使用ガイドライン
```

## 主なコマンド

| カテゴリ | コマンド例 |
|---------|-----------|
| ブランチ管理 | `/check-branch`, `/create-branch`, `/switch-branch` |
| 開発 | `/feature-dev`, `/implement`, `/load-context` |
| 品質チェック | `/test`, `/lint`, `/check-ci`, `/run-full-check` |
| コミット・PR | `/commit-push-pr`, `/create-pr`, `/quick-pr` |
| レビュー | `/review-local`, `/review-pr`, `/show-reviews` |
| Issue管理 | `/list-issues`, `/show-issue`, `/create-issue` |

詳細は `CLAUDE.md` を参照してください。

## 使い方

1. `.claude/` ディレクトリをプロジェクトルートにコピー
2. `CLAUDE.md` をプロジェクトに合わせて編集
3. Claude Code で各コマンドを実行

## ライセンス

MIT
