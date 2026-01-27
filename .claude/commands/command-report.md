---
description: Generate custom command usage statistics report
argument-hint: "[--team]"
model: haiku
---

# Custom Command Analytics Report

Generate a detailed report of your custom command usage statistics.

## Usage

```bash
/command-report [--team]
```

## Options

- `--team`: Include team comparison (if anonymous sharing is enabled)

## What This Command Does

This command analyzes your custom command usage and provides:
- **Top 5 most used commands** with usage frequency and error rates
- **Commands with high error rates (>5%)** that need attention
- **Rarely used or unused commands** that could be removed
- **Overall statistics** including average usage per session

## Example Output

```
📊 Custom Command Analytics Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 User: kicchann
📅 Period: 2026-01-20 10:00 to 2026-01-27 10:31 (7 days)
📈 Sessions analyzed: 14

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 TOP 5 MOST USED COMMANDS

1. git-push-pr              45 uses  (3.2/session)  ⚠️  4.4% error rate
2. code-review              23 uses  (1.5/session)  ✅  0% error rate
3. run-tests                18 uses  (1.3/session)  ✅  0% error rate
...
```

## Run the report

Use the Bash tool to execute the report generation script:

```bash
node .claude/scripts/generate-command-report.js
```

## Data Collection

Statistics are automatically collected via SessionEnd hook. Your personal data is stored locally in:
- `.claude/tool-usage/personal/{username}/commands.json`
- `.claude/tool-usage/personal/{username}/sessions.jsonl`

Personal data is excluded from Git (see `.claude/tool-usage/.gitignore`).

## Privacy

- Personal statistics are never committed to Git
- Command arguments and file contents are NOT recorded
- Only command names, counts, and error information are tracked
- Data retention: 90 days by default
