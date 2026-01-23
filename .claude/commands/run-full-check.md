---
description: 品質チェック一括実行（lint、test、coverage）
allowed-tools: Bash(git:*), Bash(pytest:*), Bash(ruff:*), Bash(coverage:*)
model: sonnet
---

# Full Check

Lint、テスト、カバレッジを一括で実行し、コード品質をチェックします。

## 実行フロー

```
/lint → /test → /show-coverage
```

## 実行手順

### 1. Lint チェック

```bash
# ruff check（自動修正なし、チェックのみ）
ruff check .

# ruff format check
ruff format --check .
```

結果:
- `pass`: 問題なし
- `fail`: 問題あり（詳細を表示）

### 2. テスト実行

```bash
# pytest with coverage
pytest -v --tb=short --cov=. --cov-report=term-missing
```

結果:
- テスト数: passed / failed / skipped
- 失敗テストの詳細

### 3. カバレッジ確認

```bash
# カバレッジレポート
coverage report --show-missing
```

結果:
- 全体カバレッジ率
- カバレッジが低いファイル一覧

### 4. 結果サマリー

```
=== Full Check 結果 ===

## Lint
| Check | Status |
|-------|--------|
| ruff check | ✅ pass / ❌ N issues |
| ruff format | ✅ pass / ❌ N files |

## Test
| Metric | Value |
|--------|-------|
| Total | N tests |
| Passed | N |
| Failed | N |
| Skipped | N |

## Coverage
| Metric | Value |
|--------|-------|
| Overall | XX% |
| Target | 80% |
| Status | ✅ OK / ⚠️ Below target |

## 総合判定
✅ すべてのチェックをパス
⚠️ 一部警告あり（詳細は上記）
❌ 修正が必要（詳細は上記）
```

### 5. 推奨アクション

問題がある場合:
- Lint問題 → `ruff check . --fix` を提案
- テスト失敗 → 失敗テストの詳細を表示
- カバレッジ不足 → カバレッジが低いファイルを表示

## 使用例

```
/run-full-check
```

→ lint、test、coverageを一括実行
