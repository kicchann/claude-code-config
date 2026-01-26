# format-code hook

Write/Edit操作時に自動でファイルをフォーマットするPostToolUse hook。

> **Quick Setup**: Claude Codeに「このREADME.mdを読んでセットアップして」と伝えるだけで設定できます。

## ファイル構成

```text
.claude/hooks/format-code/
├── format-code.py         # メインスクリプト
├── settings.json.example  # フォーマッター設定テンプレート
├── hooks.json.example     # Claude Code hook設定例
├── README.md              # このファイル
└── test/
    └── test_format_code.py  # pytestテスト
```

## 機能

- **自動フォーマット**: Write/Edit操作時にファイルを自動フォーマット
- **拡張子ベース検出**: ファイル拡張子で適切なformatterを選択
- **フォールバック**: 複数コマンドを順番に試行
- **有効/無効切替**: `enabled`フラグで個別制御可能
- **バリデーション**: 設定ファイルの構造を検証

## 対応フォーマッター

| 拡張子 | ツール |
|--------|--------|
| `.py`, `.pyi` | ruff format → black |
| `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs` | prettier → eslint |
| `.json`, `.yaml`, `.yml` | prettier |
| `.sh`, `.bash` | shfmt |
| `.go` | gofmt → goimports |
| `.rs` | rustfmt |
| `.css`, `.scss`, `.less` | prettier |
| `.html`, `.htm` | prettier |
| `.md`, `.mdx` | 内蔵markdown formatter |

## セットアップ

`.claude/settings.json`に以下を追加:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "./.claude/hooks/format-code/format-code.py",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

## 設定

`settings.json.example`をコピーして`settings.json`を作成:

```bash
cp .claude/hooks/format-code/settings.json.example .claude/hooks/format-code/settings.json
```

`settings.json`でフォーマッターを設定:

```json
{
  "formatters": [
    {
      "extensions": [".py", ".pyi"],
      "commands": [
        ["ruff", "format", "{file}"],
        ["black", "{file}"]
      ],
      "install_hint": "pip install ruff  (or: pip install black)",
      "enabled": true
    }
  ]
}
```

- `extensions`: 対象の拡張子（複数指定可）
- `commands`: 実行するコマンド（`{file}`はファイルパスに置換）
- `install_hint`: フォーマッター未インストール時に表示するインストール方法（オプション）
- `enabled`: 有効/無効の切り替え（デフォルト: true）
- 複数コマンドは順番に試行し、最初に成功したものを使用
- 全コマンドが未インストールの場合、警告とインストール方法を表示

## テスト実行

```bash
# Claude Codeから
/test .claude/hooks/format-code/test/ -v

# 直接実行
pytest .claude/hooks/format-code/test/ -v
```
