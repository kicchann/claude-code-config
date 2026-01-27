# Custom Command Analytics - Tool Usage Data

このディレクトリは、Claude Codeのカスタムコマンド使用統計を保存します。

## ディレクトリ構造

```
tool-usage/
├── .gitignore              # 個人データをGit管理から除外
├── README.md               # このファイル
├── personal/               # 個人データ（Git管理外）
│   └── {username}/
│       ├── config.json     # 個人設定
│       ├── commands.json   # カスタムコマンド統計
│       └── sessions.jsonl  # セッション履歴
└── shared/                 # チーム統計（Git管理・オプション）
    └── commands-aggregated.json  # 匿名化された集計データ
```

## データ管理方針

### Git管理対象
- `shared/` - チーム統計（匿名化されたデータのみ）
- `.gitignore`, `README.md` - 設定とドキュメント

### Git管理対象外
- `personal/` - 個人の使用統計（プライバシー保護）
- `*.log` - ログファイル

## プライバシー

個人データ（`personal/` 配下）はGit管理されません。チーム統計（`shared/`）には：
- ユーザー名は含まれません
- 匿名化された集計データのみが保存されます
- オプトイン（明示的な同意）がある場合のみ共有されます

## 自動分析

SessionEnd hookにより、Claude Codeセッション終了時に自動的に統計が記録されます。
詳細は `.claude/settings.json` の `hooks.SessionEnd` を参照してください。
