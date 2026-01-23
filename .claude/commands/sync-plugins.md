---
description: 未ステージの変更をコミットし、okappy-claude-code-pluginsマーケットプレイスを更新する
argument-hint: Optional commit message
model: sonnet
---

# Sync Plugins

未ステージの変更をステージングしてコミットした後、okappy-claude-code-plugins マーケットプレイスを更新します。

## 実行手順

1. **Git状態確認**
   - `git status` で未ステージの変更を確認
   - 変更がない場合はスキップしてマーケットプレイス更新へ進む

2. **ステージング＆コミット**
   - `git add -A` で全ての変更をステージング
   - コミットメッセージ:
     - 引数が指定されている場合: `$ARGUMENTS` を使用
     - 指定がない場合: `git diff --staged` の内容から適切なメッセージを生成
   - `git commit` を実行

3. **マーケットプレイス更新**
   - `claude plugin marketplace update okappy-claude-code-plugins` を実行

4. **結果報告**
   - コミットハッシュとメッセージを表示
   - マーケットプレイス更新の成功/失敗を報告

## 注意事項

- コミット前に `git diff` で変更内容を確認すること
- センシティブなファイル（.env等）がステージされていないか確認すること
- プッシュは行わない（手動で実行すること）
