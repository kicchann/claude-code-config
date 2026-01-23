---
description: セルフレビューチェックリスト実行
allowed-tools: Bash(git:*), Read, AskUserQuestion
model: sonnet
---

# セルフレビューチェックリスト

コミット・PR作成前のセルフレビューを支援します。変更内容を確認し、チェックリストに基づいて品質を検証します。

## 実行手順

### 1. 変更内容の確認

```bash
# 変更ファイル一覧
git diff --cached --name-status 2>/dev/null || git diff HEAD --name-status

# 変更統計
git diff --cached --stat 2>/dev/null || git diff HEAD --stat
```

### 2. チェックリストの表示と確認

以下のチェックリストをユーザーに提示し、AskUserQuestionで確認:

#### コード品質
- [ ] 不要なデバッグコード・console.log・print文を削除したか
- [ ] コメントアウトされた不要なコードを削除したか
- [ ] 変数名・関数名は意図が明確か
- [ ] 重複コードはないか

#### セキュリティ
- [ ] 認証情報・APIキー・シークレットがハードコードされていないか
- [ ] 入力値の検証は適切か
- [ ] SQLインジェクション・XSSなどの脆弱性はないか

#### テスト
- [ ] 新機能にテストを追加したか（該当する場合）
- [ ] 既存テストが通るか確認したか
- [ ] エッジケースを考慮したか

#### ドキュメント
- [ ] 必要なコメントを追加したか
- [ ] READMEの更新が必要か確認したか

### 3. 問題のある変更の特定

変更内容を分析し、以下をチェック:

```bash
# デバッグコードの検出
git diff --cached -U0 2>/dev/null | grep -E '^\+.*(console\.log|print\(|debugger|TODO|FIXME)' || true

# 認証情報らしき文字列の検出
git diff --cached -U0 2>/dev/null | grep -iE '^\+.*(password|secret|api_key|token)\s*=' || true
```

### 4. 結果サマリー

チェック結果をまとめて表示:
- 変更ファイル数
- 追加/削除行数
- 検出された潜在的問題
- 推奨アクション

## AskUserQuestion選択肢

チェック完了後:
- 「問題なし、コミットに進む」
- 「修正が必要な箇所がある」
- 「もう一度確認する」

## 使用例

```
/run-self-review
```

→ 現在の変更に対してセルフレビューチェックリストを実行
