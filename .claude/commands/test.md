---
description: pytestでテストを実行する
argument-hint: [test path or options]
model: haiku
allowed-tools: Bash(pytest:*), Bash(python3 -m pytest:*)
---

# テスト実行

pytestでテストを実行し、結果を表示します。

## 引数

- `$ARGUMENTS`: テストパスまたはpytestオプション（オプション）
  - 例: `tests/`, `-v`, `tests/test_foo.py::test_bar`

## 実行

```bash
# 基本実行（カバレッジ付き）
pytest $ARGUMENTS --tb=short

# または
python3 -m pytest $ARGUMENTS --tb=short
```

## 出力

- テスト結果サマリー
- 失敗したテストの詳細
- 失敗時は原因分析と対処提案

## 失敗時の対処

テストが失敗した場合:
1. エラーメッセージを分析
2. 原因を特定
3. 修正方法を提案

## 注意事項

- pytestが見つからない場合は `uv run pytest` を試す
- テストディレクトリが存在しない場合はその旨を報告
