---
description: カバレッジレポートを表示する
argument-hint: [test path]
allowed-tools: Bash(pytest:*), Bash(coverage:*)
model: haiku
---

# カバレッジレポート

テストカバレッジを測定し、詳細レポートを表示します。

## 実行

```bash
# pytest-covを使用
pytest --cov --cov-report=term-missing

# または coverage.py を使用
coverage run -m pytest
coverage report -m
```

## 出力

- 全体カバレッジ率
- ファイルごとのカバレッジ
- カバーされていない行番号（Missing lines）

## 分析

カバレッジが低い箇所について:
- 重要度の評価
- テスト追加の提案

## 注意事項

- pytest-cov または coverage がない場合は報告
- `--cov-report=term-missing` で未カバー行を表示
- HTMLレポートが必要な場合は `--cov-report=html` を追加
