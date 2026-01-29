---
paths: /never/match/folder/**
---

# Claude Rules Development

`.claude/rules/` ディレクトリ内のルールファイルを作成・編集する際のガイドライン。

公式ドキュメント: https://code.claude.com/docs/en/memory#modular-rules-with-claude%2Frules%2F

## YAML Frontmatter

### Path-specific rules（条件付きルール）

特定のファイルパターンにマッチした時だけ適用されるルール:

```markdown
---
paths:
  - "src/api/**/*.ts"
---
```

または1行で:

```markdown
---
paths: src/**/*.ts, lib/**/*.ts
---
```

### Glob patterns

| Pattern                | Matches                                  |
| ---------------------- | ---------------------------------------- |
| `**/*.ts`              | 任意のディレクトリ内の全TypeScriptファイル |
| `src/**/*`             | `src/` 配下の全ファイル                   |
| `*.md`                 | プロジェクトルートのMarkdownファイル       |
| `src/components/*.tsx` | 特定ディレクトリのReactコンポーネント      |

### Brace expansion

複数の拡張子やディレクトリをマッチ:

```markdown
---
paths:
  - "src/**/*.{ts,tsx}"
  - "{src,lib}/**/*.ts"
---
```

## ベストプラクティス

- **ルールは焦点を絞る**: 各ファイルは1つのトピックをカバー（例: `testing.md`, `api-design.md`）
- **説明的なファイル名**: ファイル名でルールの内容が分かるように
- **条件付きルールは控えめに**: 本当に特定のファイルタイプにのみ適用される場合のみ `paths` を使用
- **サブディレクトリで整理**: 関連するルールをグループ化（例: `frontend/`, `backend/`）

## ディレクトリ構造例

```text
.claude/rules/
├── frontend/
│   ├── react.md
│   └── styles.md
├── backend/
│   ├── api.md
│   └── database.md
└── general.md
```

## 注意点

- `paths` フィールドがないルールは無条件で読み込まれ、全ファイルに適用される
- サブディレクトリ内の `.md` ファイルは再帰的に検出される
- シンボリックリンクもサポート（循環参照は検出・処理される）
- ユーザーレベルのルール (`~/.claude/rules/`) はプロジェクトルールより先に読み込まれる
