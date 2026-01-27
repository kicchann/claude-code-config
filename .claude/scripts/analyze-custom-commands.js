#!/usr/bin/env node
/**
 * Custom Command Analytics - Transcript Analysis Script
 *
 * This script analyzes Claude Code session transcripts to extract
 * custom command usage statistics.
 *
 * Called automatically by SessionEnd hook with transcript_path and session_id.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { execSync } = require('child_process');

/**
 * Get username for statistics tracking
 * Priority: CLAUDE_CODE_USER > git config user.name > git config user.email > os.userInfo()
 *
 * @returns {string} Username
 */
function getUsername() {
  try {
    // Priority 1: Environment variable
    if (process.env.CLAUDE_CODE_USER) {
      return process.env.CLAUDE_CODE_USER;
    }

    // Priority 2: Git config user.name
    try {
      const gitName = execSync('git config user.name', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      if (gitName) return gitName;
    } catch (e) {
      // Git command failed, continue to next fallback
    }

    // Priority 3: Git config user.email (extract username part)
    try {
      const gitEmail = execSync('git config user.email', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      if (gitEmail) {
        const username = gitEmail.split('@')[0];
        if (username) return username;
      }
    } catch (e) {
      // Git command failed, continue to next fallback
    }

    // Priority 4: OS username
    return os.userInfo().username;
  } catch (error) {
    // Last resort fallback
    return 'unknown';
  }
}

/**
 * Get custom command definitions from .claude/commands/ directory
 * Scans for .md files which represent custom commands
 *
 * @returns {Set<string>} Set of custom command names
 */
function getCustomCommandDefinitions() {
  const commandsDir = path.join(process.cwd(), '.claude/commands');
  const commands = new Set();

  try {
    if (fs.existsSync(commandsDir)) {
      const files = fs.readdirSync(commandsDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          // Remove .md extension to get command name
          const commandName = file.replace(/\.md$/, '');
          commands.add(commandName);
        }
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
    console.error('Warning: Could not read commands directory:', error.message);
  }

  return commands;
}

/**
 * Extract custom command name from Bash command string
 * Patterns:
 *  1. .claude/commands/name.{js,sh,py,md}
 *  2. .claude/scripts/custom-name.js
 *
 * @param {string} bashCommand - The Bash command string
 * @returns {string|null} Command name or null if not a custom command
 */
function extractCommandName(bashCommand) {
  if (!bashCommand || typeof bashCommand !== 'string') {
    return null;
  }

  // Pattern 1: .claude/commands/ directory
  const commandsMatch = bashCommand.match(/\.claude\/commands\/([^/\s]+)/);
  if (commandsMatch) {
    const filename = commandsMatch[1];
    // Remove file extension
    return filename.replace(/\.(sh|js|py|md)$/, '');
  }

  // Pattern 2: .claude/scripts/custom-*.js
  const customMatch = bashCommand.match(/\.claude\/scripts\/custom-([^/\s]+)\.js/);
  if (customMatch) {
    return `custom-${customMatch[1]}`;
  }

  return null;
}

/**
 * Analyze transcript.jsonl file to extract custom command usage
 *
 * @param {string} transcriptPath - Path to transcript.jsonl file
 * @param {string} sessionId - Session identifier
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeTranscript(transcriptPath, sessionId) {
  const commandStats = new Map();
  const definedCommands = getCustomCommandDefinitions();

  let sessionStart = null;
  let sessionEnd = null;
  let lastToolUse = null; // Track last tool_use to match with tool_result errors

  const rl = readline.createInterface({
    input: fs.createReadStream(transcriptPath),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const entry = JSON.parse(line);

      // Track session start/end times
      if (!sessionStart && entry.timestamp) {
        sessionStart = entry.timestamp;
      }
      if (entry.timestamp) {
        sessionEnd = entry.timestamp;
      }

      // Detect Bash tool usage
      if (entry.type === 'tool_use' && entry.tool_name === 'Bash') {
        const command = entry.tool_input?.command || '';
        const cmdName = extractCommandName(command);

        // Check if it's a custom command
        if (cmdName && definedCommands.has(cmdName)) {
          if (!commandStats.has(cmdName)) {
            commandStats.set(cmdName, {
              name: cmdName,
              count: 0,
              errors: 0,
              timestamps: [],
              error_details: []
            });
          }

          const stats = commandStats.get(cmdName);
          stats.count++;
          stats.timestamps.push(entry.timestamp);

          // Store tool_use entry for potential error matching
          lastToolUse = { cmdName, entry };
        }
      }

      // Detect tool errors (tool_result with error)
      if (entry.type === 'tool_result' && entry.error) {
        // Match error to last tool_use if it was a custom command
        if (lastToolUse && lastToolUse.entry.tool_name === 'Bash') {
          const stats = commandStats.get(lastToolUse.cmdName);
          if (stats) {
            stats.errors++;
            stats.error_details.push({
              timestamp: entry.timestamp || lastToolUse.entry.timestamp,
              session_id: sessionId,
              error_message: entry.error
            });
          }
        }
        lastToolUse = null;
      }

    } catch (e) {
      // Skip malformed JSON lines
      continue;
    }
  }

  return {
    sessionId,
    sessionStart,
    sessionEnd,
    commands: Array.from(commandStats.values())
  };
}

/**
 * Update personal statistics file with new session data
 *
 * @param {Object} sessionData - Analysis results from analyzeTranscript
 */
async function updateStats(sessionData) {
  const username = getUsername();
  const statsDir = path.join(process.cwd(), '.claude/tool-usage/personal', username);
  const statsPath = path.join(statsDir, 'commands.json');
  const sessionsPath = path.join(statsDir, 'sessions.jsonl');

  // Create directories
  fs.mkdirSync(statsDir, { recursive: true });

  // Load existing statistics
  let stats = {
    user: username,
    last_updated: new Date().toISOString(),
    analysis_period: {
      start: sessionData.sessionStart,
      end: sessionData.sessionEnd,
      total_sessions: 0
    },
    custom_commands: {},
    insights: {}
  };

  if (fs.existsSync(statsPath)) {
    try {
      stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    } catch (e) {
      console.error('Warning: Could not parse existing stats, starting fresh');
    }
  }

  // Update session count
  stats.analysis_period.total_sessions++;
  stats.analysis_period.end = sessionData.sessionEnd;

  // Update command statistics
  for (const cmd of sessionData.commands) {
    if (!stats.custom_commands[cmd.name]) {
      stats.custom_commands[cmd.name] = {
        count: 0,
        errors: 0,
        error_rate: 0,
        first_used: cmd.timestamps[0],
        last_used: cmd.timestamps[0],
        avg_uses_per_session: 0,
        sessions_used: 0,
        recent_errors: []
      };
    }

    const cmdStats = stats.custom_commands[cmd.name];
    cmdStats.count += cmd.count;
    cmdStats.errors += cmd.errors;
    cmdStats.error_rate = cmdStats.errors / cmdStats.count;
    cmdStats.last_used = cmd.timestamps[cmd.timestamps.length - 1];
    cmdStats.sessions_used++;
    cmdStats.avg_uses_per_session = cmdStats.count / cmdStats.sessions_used;

    // Keep only last 5 errors
    if (cmd.error_details.length > 0) {
      cmdStats.recent_errors = [
        ...cmdStats.recent_errors,
        ...cmd.error_details
      ].slice(-5);
    }
  }

  // Generate insights
  const definedCommands = getCustomCommandDefinitions();
  const usedCommands = new Set(Object.keys(stats.custom_commands));

  stats.insights = {
    total_commands_defined: definedCommands.size,
    active_commands: usedCommands.size,
    unused_commands: Array.from(definedCommands).filter(cmd => !usedCommands.has(cmd)),
    high_error_commands: Object.entries(stats.custom_commands)
      .filter(([_, s]) => s.error_rate > 0.05)
      .map(([name, s]) => ({ name, error_rate: s.error_rate }))
      .sort((a, b) => b.error_rate - a.error_rate),
    popular_commands: Object.entries(stats.custom_commands)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name]) => name)
  };

  stats.last_updated = new Date().toISOString();

  // Save statistics
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));

  // Append session log
  const sessionLog = {
    session_id: sessionData.sessionId,
    start: sessionData.sessionStart,
    end: sessionData.sessionEnd,
    commands: sessionData.commands.map(c => c.name)
  };
  fs.appendFileSync(sessionsPath, JSON.stringify(sessionLog) + '\n');
}

/**
 * Main entry point when called as SessionEnd hook
 */
async function main() {
  try {
    // Hook input is passed via stdin
    const hookInput = JSON.parse(fs.readFileSync(0, 'utf-8'));
    const transcriptPath = hookInput.transcript_path;
    const sessionId = hookInput.session_id;

    if (!fs.existsSync(transcriptPath)) {
      console.error('Transcript not found:', transcriptPath);
      process.exit(0); // Non-blocking exit
    }

    // Analyze transcript
    const sessionData = await analyzeTranscript(transcriptPath, sessionId);

    // Update statistics
    await updateStats(sessionData);

  } catch (error) {
    // Never block Claude Code - always exit cleanly
    console.error('Error analyzing custom commands:', error.message);
    process.exit(0);
  }
}

// Export for testing
module.exports = {
  getUsername,
  getCustomCommandDefinitions,
  extractCommandName,
  analyzeTranscript,
  updateStats
};

// Run main if called directly
if (require.main === module) {
  main();
}
