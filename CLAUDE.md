# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

## プロジェクト概要（何を）

10PRは、開発ワークフローの自動化（issue → 実装 → PR）のためのスラッシュコマンド、スキル、エージェントを提供するClaude Codeシステムです。繰り返し作業を自動化しつつ、重要な意思決定ポイントでは人間が制御を維持します。

## 設計理念（なぜ）

- **Human-in-the-loop**: AI生成コードには品質・セキュリティリスクがあります。実装とPRマージ時には人間によるレビューが必須です。
- **段階的な自動化**: 低リスクなタスクは自動化し、セキュリティ関連のコードは人間によるレビューを必要とします。
- 詳細なリスク分析は `.claude/rules/ai-auto-pr-workflow-concerns.md` を参照してください。

## アーキテクチャ（どのように）

### ディレクトリ構造

```
<project-root>/
├── .claude/
│   ├── commands/    # スラッシュコマンド (*.md)
│   ├── skills/      # ドメイン固有の知識（プロジェクト固有のDB schema、API specs等。現在未使用）
│   ├── agents/      # サブエージェント設定
│   └── rules/       # モジュール化されたルール・ドキュメント (paths指定で条件付き読み込み可能)
├── plans/           # ワークスペース横断的な実装計画（apps/配下以外）
└── apps/
    ├── backend/docs/plans/      # バックエンド固有の実装計画（独立リポジトリ）
    ├── frontend/docs/plans/     # フロントエンド固有の実装計画（独立リポジトリ）
    └── backend-billing/docs/plans/  # 課金サービス固有の実装計画（独立リポジトリ）
```

### ワークフロー

ワークフローフェーズと複合コマンドについては `.claude/rules/implementation.md` を参照してください。

**クイックリファレンス:**

- Phase 1: `/check-branch` → `/feature-dev` → `/test` → `/lint` → `/update-claude-md` → `/commit-push-pr`
- Phase 2: `/review-pr` → `/run-self-review` → `/check-merge` → Human Review → Merge
- Phase 3: `/close-issue` → `/create-retrospective`

## 開発

### コマンドの追加

1. `<project-root>/.claude/commands/<name>.md` を作成
2. YAMLフロントマターを追加:
   - `description`: コマンド説明（必須）
   - `argument-hint`: 引数ヒント（オプション）
   - `allowed-tools`: 許可するツール（オプション）
   - `model`: `haiku` / `sonnet` / `opus`
3. 例は `.claude/commands/list-issues.md` を参照

### 計画ファイルの管理

**ルートレベル (`plans/`)**:

- ワークスペース横断的な実装計画（.claude/ の改善、横断的な機能等）
- 実装履歴として保持

**アプリレベル (`apps/*/docs/plans/`)**:

- 各アプリ固有の実装計画
- 各リポジトリで独立して管理
- 個別アプリ作業時は、そのアプリのplansディレクトリを使用

### GitHub CLI の使用

プロキシ環境のサポートについては `.claude/rules/github-cli.md` を参照してください。

## 実装ワークフロー

詳細なワークフロー手順は `.claude/rules/implementation.md` を参照してください。

**すべてのケースで必須:** `/update-claude-md` と `/commit-push-pr`

## 重要な制約

- **セキュリティ関連のコード**（認証、決済、個人情報）: 常に人間によるレビューが必要
- **PRマージ**: 人間による判断が必要（自動マージ禁止）
- **Issue作成時**: `.github/ISSUE_TEMPLATE/` にテンプレートがあれば、タイトル形式・ラベル・本文構造に従う
- **GitHub操作前のリポジトリ確認**: `gh issue`/`gh pr` 実行前に `git remote -v` で対象リポジトリを確認すること（プロジェクト内に独立した複数のリポジトリを持つ場合を想定）

## About This Workspace

このモノレポワークスペースには3つの独立したアプリケーションがあります。

### Important

- 各アプリは独自のGitリポジトリを持つ
- 横断的な作業時はルートから実行
- 個別アプリ作業時は各ディレクトリへ移動してから`claude`を起動
- 既存コードの設計や命名規則を尊重すること
- 変更は常に最小差分で行うこと
- 勝手にアーキテクチャを変更しないこと

### ワークスペース構成

- `apps/frontend/` - React + TypeScript UI（独立リポジトリ）
- `apps/backend/` - FastAPI + SQLAlchemy（独立リポジトリ）
- `apps/backend-billing/` - 課金サービス（独立リポジトリ）

### 横断的なコマンド

- Docker Compose全体起動: `docker compose -f apps/backend/docker-compose.yml up`
- 全アプリのテスト: 各ディレクトリで個別実行が必要

### ドキュメント

- アーキテクチャ全体: `docs/`
- 各アプリの詳細: 各`apps/*/CLAUDE.md`を参照

**作業開始前に適切なディレクトリへ移動してください。**
