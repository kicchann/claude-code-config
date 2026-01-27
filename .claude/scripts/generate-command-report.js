#!/usr/bin/env node
/**
 * Custom Command Analytics - Report Generation Script
 *
 * Generates human-readable reports from command usage statistics.
 * Usage: node .claude/scripts/generate-command-report.js [--team]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

/**
 * Get username (same logic as analyze-custom-commands.js)
 * @returns {string} Username
 */
function getUsername() {
  try {
    if (process.env.CLAUDE_CODE_USER) {
      return process.env.CLAUDE_CODE_USER;
    }

    try {
      const gitName = execSync('git config user.name', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      if (gitName) return gitName;
    } catch (e) {}

    try {
      const gitEmail = execSync('git config user.email', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      if (gitEmail) {
        const username = gitEmail.split('@')[0];
        if (username) return username;
      }
    } catch (e) {}

    return os.userInfo().username;
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Format ISO date string to readable format
 * @param {string} isoString - ISO 8601 date string
 * @returns {string} Formatted date
 */
function formatDate(isoString) {
  if (!isoString) return 'N/A';

  const date = new Date(isoString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calculate days since a given date
 * @param {string} isoString - ISO 8601 date string
 * @returns {number} Days elapsed
 */
function daysSince(isoString) {
  if (!isoString) return 0;

  const then = new Date(isoString);
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

/**
 * Generate formatted report from statistics
 * @param {Object} stats - Statistics object from commands.json
 * @param {Object} options - Report options
 * @returns {string} Formatted report
 */
function generateReport(stats, options = {}) {
  const { compareTeam = false } = options;

  let report = '';

  // Header
  report += '📊 Custom Command Analytics Report\n';
  report += '━'.repeat(70) + '\n\n';
  report += `👤 User: ${stats.user}\n`;

  if (stats.analysis_period.start && stats.analysis_period.end) {
    const start = formatDate(stats.analysis_period.start);
    const end = formatDate(stats.analysis_period.end);
    const days = daysSince(stats.analysis_period.start);
    report += `📅 Period: ${start} to ${end} (${days} days)\n`;
  }

  report += `📈 Sessions analyzed: ${stats.analysis_period.total_sessions}\n\n`;
  report += '━'.repeat(70) + '\n\n';

  // TOP 5 Most Used Commands
  if (Object.keys(stats.custom_commands).length > 0) {
    report += '🔥 TOP 5 MOST USED COMMANDS\n\n';
    const sortedCommands = Object.entries(stats.custom_commands)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    sortedCommands.forEach(([name, cmd], index) => {
      const errorIcon = cmd.error_rate > 0.05 ? '⚠️ ' : '✅';
      const errorMsg = cmd.error_rate > 0
        ? ` ${errorIcon} ${(cmd.error_rate * 100).toFixed(1)}% error rate`
        : ` ${errorIcon} 0% error rate`;

      report += `${index + 1}. ${name.padEnd(25)} ${cmd.count} uses  (${cmd.avg_uses_per_session.toFixed(1)}/session)${errorMsg}\n`;
    });

    report += '\n' + '━'.repeat(70) + '\n\n';
  }

  // High Error Rate Commands
  if (stats.insights && stats.insights.high_error_commands && stats.insights.high_error_commands.length > 0) {
    report += '⚠️  COMMANDS NEEDING ATTENTION\n\n';

    stats.insights.high_error_commands.forEach(cmd => {
      const details = stats.custom_commands[cmd.name];
      report += `${cmd.name} (${(cmd.error_rate * 100).toFixed(1)}% error rate)\n`;

      if (details && details.recent_errors && details.recent_errors.length > 0) {
        const lastError = details.recent_errors[details.recent_errors.length - 1];
        report += `  Last error: ${formatDate(lastError.timestamp)}\n`;
        if (lastError.error_message) {
          const truncatedMsg = lastError.error_message.length > 60
            ? lastError.error_message.substring(0, 60) + '...'
            : lastError.error_message;
          report += `  Message: ${truncatedMsg}\n`;
        }
      }

      report += '  → Consider improving error handling or adding validation\n\n';
    });

    report += '━'.repeat(70) + '\n\n';
  }

  // Rarely Used or Unused Commands
  const rarelyUsed = Object.entries(stats.custom_commands)
    .filter(([_, cmd]) => cmd.count < 3)
    .map(([name, cmd]) => ({ name, ...cmd }));

  const unusedCommands = stats.insights?.unused_commands || [];

  if (rarelyUsed.length > 0 || unusedCommands.length > 0) {
    report += '💤 RARELY USED COMMANDS (< 3 uses)\n\n';

    rarelyUsed.forEach(cmd => {
      const days = daysSince(cmd.last_used);
      report += `• ${cmd.name.padEnd(25)} Last used: ${days} days ago\n`;
    });

    unusedCommands.forEach(name => {
      report += `• ${name.padEnd(25)} Never used\n`;
    });

    report += '\n💡 Suggestion: Consider removing unused commands to reduce clutter\n\n';
    report += '━'.repeat(70) + '\n\n';
  }

  // Overall Statistics
  report += '📊 OVERALL STATISTICS\n\n';
  report += `Total commands defined:     ${stats.insights?.total_commands_defined || 0}\n`;
  report += `Active commands (>0 uses):  ${stats.insights?.active_commands || 0}\n`;
  report += `Unused commands:            ${unusedCommands.length}\n`;

  const totalUses = Object.values(stats.custom_commands).reduce((sum, cmd) => sum + cmd.count, 0);
  const avgPerSession = stats.analysis_period.total_sessions > 0
    ? totalUses / stats.analysis_period.total_sessions
    : 0;
  report += `Average uses per session:   ${avgPerSession.toFixed(1)} commands\n`;

  return report;
}

/**
 * Main entry point
 */
function main() {
  const args = process.argv.slice(2);
  const compareTeam = args.includes('--team');

  const username = getUsername();
  const statsPath = path.join(
    process.cwd(),
    '.claude/tool-usage/personal',
    username,
    'commands.json'
  );

  if (!fs.existsSync(statsPath)) {
    console.log('No statistics available yet. Use Claude Code to generate data.');
    console.log(`Expected file: ${statsPath}`);
    return;
  }

  try {
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    const report = generateReport(stats, { compareTeam });

    console.log(report);
  } catch (error) {
    console.error('Error generating report:', error.message);
    process.exit(1);
  }
}

// Export for testing
module.exports = {
  formatDate,
  daysSince,
  generateReport,
  getUsername
};

// Run main if called directly
if (require.main === module) {
  main();
}
