# サブエージェント再設計案

## 背景と目的

### 達成したいこと（目的）

1. **高品質なコード生成**: 専門化されたエージェントによる品質向上
2. **Human-in-the-loopの維持**: 重要な意思決定ポイントでの人間の関与
3. **効率的な開発フロー**: 繰り返し作業の自動化と並列処理

### メインコンテキスト保護（手段）

上記目的を達成するための手段として、サブエージェントを活用してメインコンテキストを保護する。

> 「複雑なタスクにはX tokens入力＋Y tokens作業＋Z tokens回答が必要。サブエージェントは(X+Y)の作業を委譲し、最終的なZ tokensの回答のみ返すことでメインコンテキストをクリーンに保つ」
> — [PubNub Best Practices](https://www.pubnub.com/blog/best-practices-for-claude-code-sub-agents/)（参考例として引用）

### Boris Cherny（Claude Code創設者）の見解

- サブエージェントは「スラッシュコマンドのように」使うべき
- 「会話やタスクの初期段階で、詳細確認や疑問調査にサブエージェントを活用するとコンテキスト可用性が保持される」
- 5つのClaude並列実行で作業効率化
- `code-simplifier`、`verify-app`などの専門エージェントを活用

参考: [Anthropic Engineering - Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)

---

## 現状分析

### 現在の構成

| エージェント | 役割 | ツール | 使用箇所 |
|-------------|------|--------|----------|
| code-explorer | 実行パスのトレース、アーキテクチャマッピング | Read系 + Web | `/feature-dev` Phase 2 |
| code-architect | 新機能の設計、実装ブループリント | Read系 + Web | `/feature-dev` Phase 4 |
| code-reviewer | バグ検出、品質チェック | Read系 | `/feature-dev` Phase 6 |

### 現在のワークフロー (`/feature-dev`)

```
Phase 1: Discovery（メインエージェント）
Phase 2: Codebase Exploration（code-explorer 2-3並列）
Phase 3: Clarifying Questions（メインエージェント）
Phase 4: Architecture Design（code-architect 2-3並列）
Phase 5: Implementation（メインエージェント）← ここが課題
Phase 6: Quality Review（code-reviewer 3並列）
Phase 7: Summary（メインエージェント）
```

### 課題

1. **実装フェーズがメインコンテキストに依存**: 最もトークンを消費する実装作業がメインエージェントで行われる
2. **テスト作成が分離されていない**: TDDワークフローのサポートが不足
3. **仕様策定フェーズがない**: 要件の明確化がメインコンテキストを消費
4. **リファクタリングフェーズがない**: 実装後の品質向上が体系化されていない

---

## 設計方針

### Claude Codeの制約

サブエージェントは**メインエージェントから呼び出される**構造であり、サブエージェント間の直接連携はできない。

```
┌─────────────────────────────────────┐
│      Main Agent (Orchestrator)      │
└─────────────────────────────────────┘
    ↓           ↓           ↓
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Agent A │ │ Agent B │ │ Agent C │
└─────────┘ └─────────┘ └─────────┘
```

したがって、パイプライン型もチーム型も**実装上は同じ**（メインエージェントがオーケストレーション）。
違いは**論理的なフェーズ分割**と**エージェントの専門化**にある。

### Human-in-the-loopの維持

`.claude/rules/ai-auto-pr-workflow-concerns.md` の知見を踏まえ:

- **コード変更を伴うエージェント（implementer, simplifier）は、変更案を提示し、メインエージェントまたは人間が適用を承認**
- 直接ファイルを書き換えるのではなく、差分または変更計画を返す
- セキュリティ関連コードは人間レビューを必須とする

---

## 再設計案

### エージェント構成

| エージェント | 役割 | ツール | モデル | 出力形式 |
|-------------|------|--------|--------|----------|
| **pm-spec** | 要件分析、仕様書作成、質問記録 | Read, Glob, Grep, WebFetch, WebSearch | sonnet | 構造化仕様書 |
| **code-explorer** | 既存コードの調査、パス追跡 | Read, Glob, Grep, WebFetch, WebSearch | sonnet | 分析レポート |
| **code-architect** | 設計検証、実装ブループリント | Read, Glob, Grep, WebFetch, WebSearch | sonnet | 設計ドキュメント |
| **implementer** | コード実装案の作成 | Read, Glob, Grep | sonnet | 変更計画（差分） |
| **code-reviewer** | コードレビュー、バグ検出 | Read, Glob, Grep | sonnet | レビューレポート |
| **simplifier** | コード簡素化案の作成 | Read, Glob, Grep | sonnet | リファクタリング案 |

### ツールアクセス制御

| エージェント | Read系 | Write系 | Bash | Web |
|-------------|--------|---------|------|-----|
| pm-spec | ✓ | ✗ | ✗ | ✓ |
| code-explorer | ✓ | ✗ | ✗ | ✓ |
| code-architect | ✓ | ✗ | ✗ | ✓ |
| implementer | ✓ | ✗ | ✗ | ✗ |
| code-reviewer | ✓ | ✗ | ✗ | ✗ |
| simplifier | ✓ | ✗ | ✗ | ✗ |

**重要な変更**: implementerとsimplifierには**Write/Edit/Bash権限を与えない**。
変更案を返し、メインエージェントが適用を判断する。

### モデル選択の判断基準

| モデル | 使用条件 |
|--------|----------|
| opus | 複雑な判断、創造的な設計が必要な場合 |
| sonnet | 標準的な分析・設計・実装作業（デフォルト） |
| haiku | 単純なパターンマッチング、定型処理 |

当初simplifierにhaikuを検討したが、リファクタリングには文脈理解が必要なためsonnetを採用。

---

## エージェント詳細設計

### 1. pm-spec（要件分析）

**役割**:
- issueやドキュメントから要件を抽出
- 仕様書（What/Why/How）を作成
- 不明点を質問リストとして記録
- 受け入れ基準の定義

**入力**:
- issue番号またはURL
- 追加のコンテキスト（ユーザーからの説明）

**出力スキーマ**:
```yaml
specification:
  summary: "機能の概要（1-2文）"
  what:
    - "実現すべきこと1"
    - "実現すべきこと2"
  why: "なぜこの機能が必要か"
  how:
    approach: "推奨アプローチ"
    alternatives: ["代替案1", "代替案2"]
  acceptance_criteria:
    - "受け入れ基準1"
    - "受け入れ基準2"
  questions:
    - question: "不明点1"
      context: "なぜこの質問が重要か"
    - question: "不明点2"
      context: "なぜこの質問が重要か"
  scope:
    in_scope: ["含まれるもの"]
    out_of_scope: ["含まれないもの"]
  risks:
    - "潜在的リスク1"
```

**`/feature-dev` との関係**: Phase 1: Discovery を置き換え

### 2. implementer（実装）

**役割**:
- code-architectの設計に基づき実装案を作成
- テストコード案の作成（TDD対応）
- 既存パターンに従った実装

**重要**: Write/Edit権限を持たない。変更計画を返すのみ。

**入力**:
- 設計ドキュメント（code-architectの出力）
- 対象ファイルリスト
- 実装の優先順位

**出力スキーマ**:
```yaml
implementation_plan:
  summary: "実装概要"
  files:
    - path: "src/example.py"
      action: "create" | "modify"
      changes:
        - description: "変更内容の説明"
          before: |
            # 変更前のコード（modifyの場合）
          after: |
            # 変更後のコード
      tests:
        - path: "tests/test_example.py"
          description: "対応するテスト"
  execution_order:
    - "step1: ファイルAを作成"
    - "step2: ファイルBを修正"
  dependencies:
    - "必要なパッケージ"
  warnings:
    - "注意すべき点"
```

**メインエージェントの責務**:
1. 実装案をレビュー
2. 人間に確認を求める（必要に応じて）
3. 承認後、Write/Editツールで適用

### 3. simplifier（簡素化）

**役割**:
- 冗長なコードの簡素化案作成
- 命名・スタイルの統一案
- 不要なコードの削除提案
- 可読性向上の提案

**重要**: Write/Edit権限を持たない。リファクタリング案を返すのみ。

**入力**:
- 対象ファイルまたは変更差分
- 適用すべきコーディング規約

**出力スキーマ**:
```yaml
simplification_plan:
  summary: "リファクタリング概要"
  changes:
    - file: "src/example.py"
      type: "naming" | "structure" | "removal" | "style"
      description: "変更理由"
      before: |
        # 変更前
      after: |
        # 変更後
      impact: "low" | "medium" | "high"
  skipped:
    - file: "src/other.py"
      reason: "変更不要な理由"
```

**既存 `/simplify` コマンドとの関係**:
- `/simplify` は `code-simplifier:code-simplifier` スキルを呼び出す
- 新しいsimplifierエージェントは `/feature-dev` のワークフロー内で使用
- 将来的に統合を検討

### 4. 既存エージェントの調整

#### code-explorer

変更なし。現在の役割と設計を維持。

#### code-architect

**追加事項**:
- pm-specからの仕様を入力として受け取る形を想定
- 実装順序をより詳細に（implementerへの引き継ぎ用）
- TDD対応のタスク分解を含める

#### code-reviewer

変更なし。現在の役割と設計を維持。

---

## ワークフロー統合

### `/feature-dev` 改訂版

```
Phase 1: Requirements Analysis
  └─ pm-spec（1並列）
  └─ 人間への質問リスト提示 → 回答待ち

Phase 2: Codebase Exploration
  └─ code-explorer（2-3並列）
  └─ 重要ファイルの読み込み

Phase 3: Clarifying Questions（メインエージェント）
  └─ Phase 1-2の結果を踏まえた追加質問

Phase 4: Architecture Design
  └─ code-architect（2-3並列）
  └─ 人間への設計確認 → 承認待ち

Phase 5: Implementation Planning
  └─ implementer（1-2並列）
  └─ 実装案のレビュー
  └─ 人間への確認 → 承認待ち
  └─ メインエージェントが変更を適用

Phase 6: Testing
  └─ メインエージェントがテスト実行
  └─ 失敗時は implementer を再呼び出し

Phase 7: Quality Review
  └─ code-reviewer（3並列）
  └─ 問題があれば Phase 5 へフィードバック

Phase 8: Simplification（オプション）
  └─ simplifier（1並列）
  └─ リファクタリング案のレビュー
  └─ 人間への確認 → 承認待ち
  └─ メインエージェントが変更を適用

Phase 9: Summary（メインエージェント）
```

### フィードバックループ

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Phase 5 ←── 失敗 ←── Phase 6 (Testing)                │
│     ↓                                                   │
│  Phase 7 ──→ 問題発見 ──→ Phase 5 へ戻る               │
│     ↓                                                   │
│  Phase 8 ──→ 拒否 ──→ Phase 9 へ（リファクタリングなし）│
│                                                         │
└─────────────────────────────────────────────────────────┘

終了条件:
- テストがすべてパス
- code-reviewerの指摘がすべて解決（または人間が許容）
- simplifierの提案を適用または人間がスキップを選択
```

### バグ修正ワークフロー

```
1. [code-explorer] バグの原因調査
2. [メインエージェント] 再現テストの作成・実行
3. [implementer] 修正案の作成
4. [メインエージェント] 修正の適用
5. [メインエージェント] テスト実行（再現テスト + リグレッション）
6. [code-reviewer] 修正レビュー
7. [Human] 確認 → PR作成
```

---

## リスク対策

### セキュリティ考慮

`.claude/rules/ai-auto-pr-workflow-concerns.md` との整合性:

| リスク | 対策 |
|--------|------|
| AI生成コードの脆弱性 | implementerに書き込み権限を与えない。メインエージェント経由で人間が確認 |
| 任意コマンド実行 | Bash権限をどのエージェントにも付与しない |
| セキュリティ関連コード | 認証・決済・個人情報を扱うコードは必ず人間レビューを挟む |

### 失敗時のリカバリー

| 失敗パターン | 対処 |
|-------------|------|
| エージェントタイムアウト | メインエージェントがリトライまたは人間に報告 |
| 不適切な出力 | メインエージェントが検証し、再実行または手動対応 |
| 無限ループ | フィードバックループに最大回数（3回）を設定 |

### 並列実行の制約

| 制約 | 対策 |
|------|------|
| API rate limit | 同時実行数を5以下に制限 |
| コンテキスト競合 | 同じファイルを複数エージェントが変更しないよう分離 |
| コスト増加 | モデル選択の最適化、不要な呼び出しの削減 |

---

## コスト分析

### 見積もり（1機能開発あたり）

| フェーズ | エージェント数 | 推定トークン（入力） | 推定トークン（出力） |
|----------|---------------|---------------------|---------------------|
| Phase 1 | 1 | 10,000 | 2,000 |
| Phase 2 | 3 | 30,000 | 6,000 |
| Phase 4 | 3 | 30,000 | 9,000 |
| Phase 5 | 2 | 20,000 | 8,000 |
| Phase 7 | 3 | 30,000 | 6,000 |
| Phase 8 | 1 | 10,000 | 3,000 |
| **合計** | 13呼び出し | 130,000 | 34,000 |

**比較**: 現行（メインエージェント集中型）
- 推定: 入力 200,000+ トークン（コンテキスト蓄積）
- 新設計はサブエージェントで分散するため、メインコンテキストの蓄積を抑制

**トレードオフ**:
- API呼び出し回数は増加
- 総トークン数は同程度または減少（コンテキスト再利用の減少）
- レイテンシは並列実行で相殺

---

## 移行計画

### Phase 1: implementer追加（最優先）

**目標**: 実装フェーズをメインエージェントから分離

**作業内容**:
1. `.claude/agents/implementer.md` を作成
2. `/feature-dev` の Phase 5 を改訂
3. 出力スキーマの検証

**成功指標**:
- 3つの機能開発でimplementerが正常動作
- メインエージェントのトークン消費が20%以上減少
- 人間によるレビューフローが機能

**ロールバック基準**:
- implementerの出力が50%以上の確率で使用不可
- レイテンシが2倍以上増加

### Phase 2: pm-spec追加

**目標**: 要件分析フェーズを分離

**作業内容**:
1. `.claude/agents/pm-spec.md` を作成
2. `/feature-dev` の Phase 1 を改訂
3. 出力スキーマの検証

**成功指標**:
- 仕様書の品質が向上（人間の追加質問が減少）
- Phase 3の質問数が30%以上減少

**ロールバック基準**:
- pm-specの出力がcode-architectに適切に引き継がれない
- 開発フロー全体の時間が1.5倍以上増加

### Phase 3: simplifier追加

**目標**: リファクタリングフェーズを体系化

**作業内容**:
1. `.claude/agents/simplifier.md` を作成
2. `/feature-dev` の Phase 8 を追加
3. 既存 `/simplify` コマンドとの関係整理

**成功指標**:
- code-reviewerの指摘事項が20%以上減少
- リファクタリング提案の採用率が70%以上

**ロールバック基準**:
- simplifierの提案が頻繁に拒否される（採用率30%未満）
- 既存コードを破壊する変更を提案

### Phase 4: 統合と最適化

**目標**: 全体フローの最適化

**作業内容**:
1. フィードバックループの調整
2. 並列実行の最適化
3. ドキュメント整備

**成功指標**:
- 機能開発の総時間が現行比で同等以下
- 品質指標（テストカバレッジ、レビュー指摘数）が改善

---

## 反対意見と対処

### 「サブエージェントがコンテキストをゲートキープするリスク」

**対処**: メインエージェントは常にサブエージェントの出力全体を受け取る。要約や省略はしない設計とする。重要な情報の欠落を防ぐため、出力スキーマに必須フィールドを定義。

### 「人間のワークフローを強制するリスク」

**対処**: フェーズのスキップを許容する設計。緊急時や小規模修正では `--quick` フラグなどで簡略化可能とする。

### 「CLAUDE.mdに全コンテキストを置く代替案」

**対処**: CLAUDE.mdは静的なルールに適しているが、動的な分析結果には不向き。両者を併用する。

---

## 参考資料

### 主要ソース

1. **[Best practices for Claude Code subagents - PubNub](https://www.pubnub.com/blog/best-practices-for-claude-code-sub-agents/)**
   - 3段階パイプラインの一例
   - ツールアクセス制御の考え方
   - **注**: Anthropic公式ではなく、一企業の実践例として参考

2. **[Claude Code Best Practices - Anthropic Engineering](https://www.anthropic.com/engineering/claude-code-best-practices)**（公式）
   - 初期段階でのサブエージェント活用
   - `/clear`コマンドによるコンテキスト管理
   - Git worktreeとの併用

3. **[How to Use Claude Code Subagents to Parallelize Development - Zach Wills](https://zachwills.net/how-to-use-claude-code-subagents-to-parallelize-development/)**
   - 各専門家が独自の200kコンテキストウィンドウを持つ利点

4. **[awesome-claude-code-subagents - VoltAgent](https://github.com/VoltAgent/awesome-claude-code-subagents)**
   - カテゴリ別構成の参考

### 内部参考資料

- `.claude/rules/ai-auto-pr-workflow-concerns.md` - AI生成コードのリスク分析
- `.claude/rules/implementation.md` - 現行ワークフロー定義
- `.claude/commands/feature-dev.md` - 現行の機能開発コマンド

---

## 決定事項

### 決定済み

- [x] **設計方針**: implementer/simplifierにWrite権限を与えず、変更案を返す形式
- [x] **Human-in-the-loop維持**: 各フェーズで人間の承認ポイントを設ける
- [x] **既存エージェントのリネームは行わない**: 破壊的変更を避ける

### 承認待ち

- [ ] 移行計画の開始（Phase 1から着手）
- [ ] `/feature-dev` コマンドの改訂
- [ ] 各エージェントの出力スキーマの最終確認

### 今後の検討事項

- [ ] 並列実行数の最適値（3-5の間で調整）
- [ ] コスト監視の仕組み
- [ ] 品質メトリクスの自動収集

---

*作成日: 2026-01-27*
*最終更新: 2026-01-27*
*ステータス: レビュー完了・実装準備中*
