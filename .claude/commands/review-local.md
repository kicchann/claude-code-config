---
description: push前のローカル変更をレビュー
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git rev-parse:*), Bash(git merge-base:*)
model: opus
---

**CRITICAL INSTRUCTION: すべてのレビュー結果は日本語で記述してください。**

push前のローカル変更に対してコードレビューを実行します。mainブランチとの差分を対象とします。

**Agent assumptions (applies to all agents and subagents):**
- All tools are functional and will work without error. Do not test tools or make exploratory calls.
- Only call a tool if it is required to complete the task. Every tool call should have a clear purpose.

## 実行手順

1. mainブランチとの差分を取得:
   ```text
   git diff $(git merge-base main HEAD)...HEAD
   ```

   変更がない場合は「レビュー対象の変更がありません」と報告して終了。

2. Launch a haiku agent to return a list of file paths (not their contents) for all relevant CLAUDE.md files including:
   - The root CLAUDE.md file, if it exists
   - Any CLAUDE.md files in directories containing modified files

3. Launch a sonnet agent to view the diff and return a summary of the changes

4. Launch 4 agents in parallel to independently review the changes. Each agent should return the list of issues, where each issue includes a description and the reason it was flagged (e.g. "CLAUDE.md adherence", "bug"). The agents should do the following:

   Agents 1 + 2: CLAUDE.md compliance sonnet agents
   Audit changes for CLAUDE.md compliance in parallel. Note: When evaluating CLAUDE.md compliance for a file, you should only consider CLAUDE.md files that share a file path with the file or parents.

   Agent 3: Opus bug agent (parallel subagent with agent 4)
   Scan for obvious bugs. Focus only on the diff itself without reading extra context. Flag only significant bugs; ignore nitpicks and likely false positives. Do not flag issues that you cannot validate without looking at context outside of the git diff.

   Agent 4: Opus bug agent (parallel subagent with agent 3)
   Look for problems that exist in the introduced code. This could be security issues, incorrect logic, etc. Only look for issues that fall within the changed code.

   **CRITICAL: We only want HIGH SIGNAL issues.** Flag issues where:
   - The code will fail to compile or parse (syntax errors, type errors, missing imports, unresolved references)
   - The code will definitely produce wrong results regardless of inputs (clear logic errors)
   - Clear, unambiguous CLAUDE.md violations where you can quote the exact rule being broken

   Do NOT flag:
   - Code style or quality concerns
   - Potential issues that depend on specific inputs or state
   - Subjective suggestions or improvements

   If you are not certain an issue is real, do not flag it. False positives erode trust and waste reviewer time.

5. For each issue found in the previous step by agents 3 and 4, launch parallel subagents to validate the issue. The agent's job is to review the issue to validate that the stated issue is truly an issue with high confidence. Use Opus subagents for bugs and logic issues, and sonnet agents for CLAUDE.md violations.

6. Filter out any issues that were not validated in step 5. This step will give us our list of high signal issues for our review.

7. Output the review results to the terminal in the following format:

---

## ローカルコードレビュー結果

**対象:** mainブランチとの差分
**変更ファイル数:** X件

### 変更サマリー

[Step 3で作成したサマリー]

### 検出された問題 (X件)

#### 1. [カテゴリ] ファイルパス:行番号

問題の説明

```言語
# 修正案（該当する場合）
コード例
```

---

If NO issues were found, output:

---

## ローカルコードレビュー結果

**対象:** mainブランチとの差分
**変更ファイル数:** X件

### 変更サマリー

[サマリー]

### 検出された問題

問題は見つかりませんでした。バグとCLAUDE.mdへの準拠をチェックしました。

✓ 構文エラー
✓ 型エラー
✓ ロジックエラー
✓ CLAUDE.md準拠

---

## False Positive リスト

Use this list when evaluating issues in Steps 4 and 5 (these are false positives, do NOT flag):

- Pre-existing issues (not introduced by this change)
- Something that appears to be a bug but is actually correct
- Pedantic nitpicks that a senior engineer would not flag
- Issues that a linter will catch (do not run the linter to verify)
- General code quality concerns (e.g., lack of test coverage, general security issues) unless explicitly required in CLAUDE.md
- Issues mentioned in CLAUDE.md but explicitly silenced in the code (e.g., via a lint ignore comment)

## Notes

- Create a todo list before starting.
- You must cite and link each CLAUDE.md violation to the specific rule being violated.
- This command does NOT post anything to GitHub. All output is local terminal only.
