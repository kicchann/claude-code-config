# CLI構造化パイプ処理の例

`jq`, `rg`, `fd`, `sd`, `mdq` を組み合わせた実践的なパイプ処理例です。

## 1. fd + jq: コマンドファイルをカテゴリ別に分類

```bash
fd -e md . .claude/commands/ | \
  jq -R -s '
    split("\n") | map(select(length > 0)) |
    map({
      path: .,
      name: (. | split("/") | last | gsub("\\.md$"; "")),
      category: (. | split("/")[-1] |
        if test("^(check|lint|test)") then "quality"
        elif test("^(commit|create|push)") then "git"
        elif test("^(review|show)") then "review"
        else "other" end)
    }) |
    group_by(.category) |
    map({category: .[0].category, count: length, commands: map(.name)}) |
    sort_by(-.count)
  '
```

**出力例:**
```json
[
  {"category": "other", "count": 19, "commands": ["clean-branches", "feature-dev", ...]},
  {"category": "git", "count": 7, "commands": ["commit-push-pr", "create-branch", ...]},
  {"category": "quality", "count": 7, "commands": ["check-branch", "lint", "test", ...]}
]
```

## 2. fd + rg + sd + jq: コマンドをモデル別に集計

```bash
fd -e md . .claude/commands/ | \
  while read -r file; do
    name=$(basename "$file" .md)
    desc=$(rg -m1 "^description:" "$file" | sd "^description: " "")
    model=$(rg -m1 "^model:" "$file" | sd "^model: " "")
    printf '{"name":"%s","description":"%s","model":"%s"}\n' "$name" "$desc" "$model"
  done | jq -s '
    group_by(.model) |
    map({
      model: (.[0].model | if . == "" then "default" else . end),
      count: length,
      commands: map(.name)
    }) |
    sort_by(-.count)
  '
```

**出力例:**
```json
[
  {"model": "haiku", "count": 22, "commands": ["check-branch", "lint", ...]},
  {"model": "sonnet", "count": 11, "commands": ["commit-push-pr", ...]},
  {"model": "opus", "count": 9, "commands": ["review-pr", "feature-dev", ...]}
]
```

## 3. mdq + jq: Markdownセクションを抽出してJSON化

```bash
mdq '# 主要コマンド' < CLAUDE.md | \
  jq -R -s '{
    section: "主要コマンド",
    content: .,
    line_count: (. | split("\n") | length)
  }'
```

## 4. mdq: コードブロックの抽出

```bash
# 全てのコードブロックを抽出
mdq '```' < README.md

# 特定言語のコードブロック
mdq '```bash' < README.md
```

## 5. jq: 設定ファイルの詳細分析

```bash
jq '{
  summary: {
    total_hooks: (.hooks | to_entries | map(.value | length) | add),
    total_allowed: (.permissions.allow | length),
    total_denied: (.permissions.deny | length)
  },
  hooks_by_event: (.hooks | to_entries | map({
    event: .key,
    scripts: [.value[].hooks[].command | split("/") | last]
  })),
  permissions: {
    git_allowed: [.permissions.allow[] | select(startswith("Bash(git"))],
    git_denied: [.permissions.deny[] | select(startswith("Bash(git"))]
  }
}' .claude/settings.json
```

## 6. rg --json + jq: 検索結果の構造化

```bash
rg --json "TODO|FIXME" src/ | \
  jq -s '[.[] | select(.type == "match") | {
    file: .data.path.text,
    line: .data.line_number,
    text: (.data.lines.text | gsub("\\n"; ""))
  }]'
```

## 7. sd: 一括置換

```bash
# 関数名の一括リネーム
fd -e ts | xargs sd 'oldFunction' 'newFunction'

# 正規表現での置換
sd 'v(\d+)\.(\d+)' 'version $1.$2' CHANGELOG.md
```

## ツール組み合わせのパターン

| パターン | 用途 |
|---------|------|
| `fd \| jq -R -s` | ファイルリスト → JSON配列 |
| `rg --json \| jq` | 検索結果 → 構造化データ |
| `mdq \| jq -R -s` | Markdown → JSON |
| `fd \| xargs sd` | 複数ファイル一括置換 |
| `jq 'group_by(.x)'` | データのグループ化・集計 |

## jq チートシート

```bash
# 配列操作
jq '.[] | select(.x > 10)'     # フィルタ
jq 'group_by(.category)'       # グループ化
jq 'map(.name)'                # マップ
jq 'sort_by(-.count)'          # ソート

# 文字列操作
jq -R -s 'split("\n")'         # 行 → 配列
jq 'gsub("old"; "new")'        # 置換
jq 'capture("(?<x>\\d+)")'     # 正規表現キャプチャ

# オブジェクト操作
jq 'to_entries'                # {k:v} → [{key,value}]
jq 'from_entries'              # 逆変換
jq '{a,b}'                     # フィールド選択
```
