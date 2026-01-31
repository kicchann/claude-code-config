# CLIツール使用ガイドライン

高速代替ツールと構造化抽出ツールを活用し、効率的なデータ処理を行う。

## 高速代替ツールの優先使用

標準ツールより高速な代替ツールを優先すること：

| 用途 | 使う | 使わない |
|------|------|----------|
| テキスト検索 | `rg "pattern"` | `grep -r "pattern"` |
| ファイル検索 | `fd "\.ts$"` | `find . -name "*.ts"` |
| テキスト置換 | `sd "old" "new" file` | `sed -i 's/old/new/g' file` |
| ファイルコピー | `fcp -r src/ dst/` | `cp -r src/ dst/` |
| フィールド抽出 | `choose 0 2` | `cut -f1,3` / `awk '{print $1,$3}'` |
| Python実行 | `uvx ruff check .` | `pip install ruff && ruff check .` |

## 構造化出力と効率的な抽出

生データではなく、構造化ツールで必要な情報のみ抽出すること：

| データ形式 | ツール | 例 |
|-----------|--------|-----|
| JSON | `jq` | `curl api \| jq '.items[].name'` |
| Markdown | `mdq` | `mdq '# 見出し' < README.md` |
| YAML/インデント | `ogrep` | `ogrep "key" config.yaml` |
| CSV/TSV | `choose` | `cat data.csv \| choose 0 2` |
| PDF/Office | `rga` | `rga "keyword" docs/` |

## パイプ処理パターン

### 検索結果の構造化

```bash
# rg --json で検索結果をJSON化し、jqで抽出
rg --json "TODO" src/ | jq -s '[.[] | select(.type=="match") | {
  file: .data.path.text,
  line: .data.line_number,
  text: .data.lines.text
}]'
```

### ファイル一覧の構造化

```bash
# fd + jq でファイル一覧をJSON配列に
fd -e md | jq -R -s 'split("\n") | map(select(. != ""))'

# カテゴリ別に集計
fd -e md .claude/commands/ | jq -R -s '
  split("\n") | map(select(. != "")) |
  map(split("/") | {dir: .[-2], file: .[-1]}) |
  group_by(.dir) | map({dir: .[0].dir, count: length})
'
```

### Markdown抽出

```bash
# 特定セクションを抽出
mdq '# API' < README.md

# コードブロックのみ抽出
mdq '```bash' < README.md
```

### インデント構造を保持した検索

```bash
# YAML/Pythonの階層構造を維持して表示
ogrep "database" config.yaml
ogrep "def main" script.py
```

### 設定ファイル分析

```bash
# jqで設定を分析
jq '{
  hooks: (.hooks | keys),
  allowed_count: (.permissions.allow | length),
  denied_count: (.permissions.deny | length)
}' .claude/settings.json
```

## ツール組み合わせのチートシート

| パターン | 用途 |
|---------|------|
| `fd \| jq -R -s` | ファイルリスト → JSON配列 |
| `rg --json \| jq` | 検索結果 → 構造化データ |
| `mdq \| jq -R -s` | Markdown → JSON |
| `fd \| xargs sd` | 複数ファイル一括置換 |
| `jq 'group_by(.x)'` | データのグループ化・集計 |

## jq クイックリファレンス

```bash
# 配列操作
jq '.[] | select(.x > 10)'     # フィルタ
jq 'group_by(.category)'       # グループ化
jq 'map(.name)'                # マップ
jq 'sort_by(-.count)'          # ソート（降順）

# 文字列操作
jq -R -s 'split("\n")'         # 行 → 配列
jq 'gsub("old"; "new")'        # 置換
jq 'capture("(?<x>\\d+)")'     # 正規表現キャプチャ

# オブジェクト操作
jq 'to_entries'                # {k:v} → [{key,value}]
jq '{a,b}'                     # フィールド選択
```

## インストール

リモートClaude Code環境では `.claude/hooks/structured-cli-tools-setup.sh` により自動インストールされる。

ローカル環境では各ツールを個別にインストール：

- uv: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- jq, rg, fd, sd: 各OSのパッケージマネージャで導入

## 参考

- インストールスクリプト: `.claude/hooks/structured-cli-tools-setup.sh`
- [バイブコーディングするならこれ入れとけ！なCLI](https://dev.sin5d.com/バイブコーディングするならこれ入れとけ！なcli/)
