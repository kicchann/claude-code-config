# format-code hook

Write/Edit操作時に自動でファイルをフォーマットするPostToolUse hook。

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
      "enabled": true
    }
  ]
}
```

- `extensions`: 対象の拡張子（複数指定可）
- `commands`: 実行するコマンド（`{file}`はファイルパスに置換）
- `enabled`: 有効/無効の切り替え（デフォルト: true）
- 複数コマンドは順番に試行し、最初に成功したものを使用
