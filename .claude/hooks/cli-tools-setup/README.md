# CLI Tools Setup Hook

リモートClaude Code環境でAIコーディングに役立つCLIツールを自動インストールするSessionStartフックです。

## インストールされるツール

| ツール | 用途 | リポジトリ |
|--------|------|-----------|
| **uv/uvx** | Python パッケージ管理（npm感覚でPython環境を構築） | [astral-sh/uv](https://github.com/astral-sh/uv) |
| **jq** | JSON解析・加工（APIレスポンスの処理に必須） | [jqlang/jq](https://github.com/jqlang/jq) |
| **rg (ripgrep)** | 高速テキスト検索（grepの10倍以上高速） | [BurntSushi/ripgrep](https://github.com/BurntSushi/ripgrep) |
| **fd** | 高速ファイル検索（findの代替） | [sharkdp/fd](https://github.com/sharkdp/fd) |
| **sd** | 高速テキスト置換（sedの代替、直感的な構文） | [chmln/sd](https://github.com/chmln/sd) |
| **mdq** | Markdownクエリ（見出し・リスト・コードブロック抽出） | [yshavit/mdq](https://github.com/yshavit/mdq) |
| **fcp** | 高速ファイルコピー（cpの代替、並列処理） | [Svetlitski/fcp](https://github.com/Svetlitski/fcp) |
| **choose** | フィールド選択（cut/awkの代替、直感的な構文） | [theryangeary/choose](https://github.com/theryangeary/choose) |
| **rga** | PDF/Office/アーカイブも検索可能なripgrep拡張 | [phiresky/ripgrep-all](https://github.com/phiresky/ripgrep-all) |
| **ogrep** | インデント構造テキスト検索（YAML/Python等に最適） | [kriomant/ogrep-rs](https://github.com/kriomant/ogrep-rs) |

## 特徴

- **冪等性**: 既にインストール済みのツールはスキップ
- **fail-safe**: インストール失敗しても他のツールの処理を継続
- **リトライ**: ダウンロード失敗時は最大3回リトライ（指数バックオフ）
- **マルチアーキテクチャ**: x86_64/aarch64(arm64) 対応

## 設定

`settings.json` のSessionStartフックに登録済み:

```json
{
  "type": "command",
  "command": "cd \"$CLAUDE_PROJECT_DIR\" && ./.claude/hooks/cli-tools-setup.sh",
  "timeout": 300
}
```

## 使用例

インストール後、Claude Codeで以下のように活用できます:

```bash
# jq: JSONの整形・抽出
curl -s https://api.example.com/data | jq '.items[] | {id, name}'

# rg: 高速コード検索
rg "TODO|FIXME" --type py

# fd: ファイル検索
fd "\.test\.ts$"

# sd: テキスト置換
sd 'oldFunction' 'newFunction' src/**/*.ts

# uv: Pythonパッケージ管理
uvx ruff check .

# mdq: Markdownからデータ抽出
mdq '# *' README.md              # 全見出しを抽出
mdq '```bash' README.md          # bashコードブロックを抽出

# fcp: 高速ファイルコピー
fcp -r src/ backup/              # 並列処理で高速コピー

# choose: フィールド選択（0-indexed）
cat file.csv | choose 0 2        # 1列目と3列目を抽出
cat file.csv | choose 1:3        # 2〜4列目を抽出

# rga: PDF/Officeファイルも検索
rga "keyword" docs/              # PDFやdocxも検索可能
rga --type pdf "error" logs/     # PDFのみ検索

# ogrep: インデント構造を考慮した検索
ogrep "pattern" config.yaml      # YAMLの階層構造を保持して表示
ogrep "def main" script.py       # Python関数の親階層も表示
```

## 参考

- [バイブコーディングするならこれ入れとけ！なCLI](https://dev.sin5d.com/バイブコーディングするならこれ入れとけ！なcli/)
