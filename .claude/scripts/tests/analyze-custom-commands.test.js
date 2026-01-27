#!/usr/bin/env node
/**
 * Tests for analyze-custom-commands.js
 * Run with: node .claude/scripts/tests/analyze-custom-commands.test.js
 */

const { describe, it, assert, run } = require('../test-runner');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Import functions we'll test (will be implemented in analyze-custom-commands.js)
let analyzeModule;
try {
  analyzeModule = require('../analyze-custom-commands');
} catch (e) {
  // Module doesn't exist yet - that's expected in TDD
  console.log('⚠️  analyze-custom-commands.js not found - tests will fail (expected in TDD)');
  analyzeModule = {};
}

const { getUsername, getCustomCommandDefinitions, extractCommandName, analyzeTranscript } = analyzeModule;

// Test Suite 1: Username Detection
describe('getUsername()', () => {
  it('should detect username from CLAUDE_CODE_USER env var', () => {
    const originalEnv = process.env.CLAUDE_CODE_USER;
    process.env.CLAUDE_CODE_USER = 'testuser';

    assert.strictEqual(getUsername(), 'testuser', 'Should return CLAUDE_CODE_USER value');

    // Cleanup
    if (originalEnv) {
      process.env.CLAUDE_CODE_USER = originalEnv;
    } else {
      delete process.env.CLAUDE_CODE_USER;
    }
  });

  it('should fallback to os.userInfo() when env var is missing', () => {
    const originalEnv = process.env.CLAUDE_CODE_USER;
    delete process.env.CLAUDE_CODE_USER;

    const username = getUsername();
    assert.ok(username, 'Should return a username');
    assert.strictEqual(typeof username, 'string', 'Should return a string');

    // Restore env
    if (originalEnv) {
      process.env.CLAUDE_CODE_USER = originalEnv;
    }
  });
});

// Test Suite 2: Custom Command Detection
describe('getCustomCommandDefinitions()', () => {
  it('should return empty set when settings.json has no customCommands', () => {
    const commands = getCustomCommandDefinitions();
    assert.ok(commands instanceof Set, 'Should return a Set');
  });

  it('should detect commands from .claude/commands/ directory', () => {
    const commands = getCustomCommandDefinitions();
    assert.ok(commands instanceof Set, 'Should return a Set');
    // Commands should include files from .claude/commands/
    // We'll test with actual files later
  });
});

// Test Suite 3: Command Name Extraction
describe('extractCommandName()', () => {
  it('should extract command name from .claude/commands/ pattern', () => {
    const bashCommand = 'node .claude/commands/git-push-pr.js';
    const cmdName = extractCommandName(bashCommand);
    assert.strictEqual(cmdName, 'git-push-pr', 'Should extract command name without extension');
  });

  it('should extract command name from .claude/commands/ with .sh extension', () => {
    const bashCommand = 'bash .claude/commands/deploy-staging.sh';
    const cmdName = extractCommandName(bashCommand);
    assert.strictEqual(cmdName, 'deploy-staging', 'Should extract command name from .sh file');
  });

  it('should extract command name from .claude/scripts/custom-*.js pattern', () => {
    const bashCommand = 'node .claude/scripts/custom-backup.js';
    const cmdName = extractCommandName(bashCommand);
    assert.strictEqual(cmdName, 'custom-backup', 'Should extract custom command name');
  });

  it('should return null for non-custom commands', () => {
    const bashCommand = 'npm test';
    const cmdName = extractCommandName(bashCommand);
    assert.strictEqual(cmdName, null, 'Should return null for non-custom commands');
  });

  it('should return null for empty string', () => {
    const cmdName = extractCommandName('');
    assert.strictEqual(cmdName, null, 'Should return null for empty string');
  });
});

// Test Suite 4: Transcript Analysis
describe('analyzeTranscript()', () => {
  it('should parse sample transcript and detect custom commands', async () => {
    const transcriptPath = path.join(__dirname, 'fixtures/sample-transcript.jsonl');
    const sessionId = 'test-session-123';

    const result = await analyzeTranscript(transcriptPath, sessionId);

    assert.ok(result, 'Should return analysis result');
    assert.strictEqual(result.sessionId, sessionId, 'Should include session ID');
    assert.ok(result.sessionStart, 'Should include session start time');
    assert.ok(result.sessionEnd, 'Should include session end time');
    assert.ok(Array.isArray(result.commands), 'Should return commands array');
  });

  it('should count command usage correctly', async () => {
    const transcriptPath = path.join(__dirname, 'fixtures/sample-transcript.jsonl');
    const sessionId = 'test-session-123';

    const result = await analyzeTranscript(transcriptPath, sessionId);

    // git-push-pr appears twice in sample transcript
    const gitPushPr = result.commands.find(c => c.name === 'git-push-pr');
    assert.ok(gitPushPr, 'Should find git-push-pr command');
    assert.strictEqual(gitPushPr.count, 2, 'Should count 2 uses');
  });

  it('should detect errors in command execution', async () => {
    const transcriptPath = path.join(__dirname, 'fixtures/sample-transcript.jsonl');
    const sessionId = 'test-session-123';

    const result = await analyzeTranscript(transcriptPath, sessionId);

    const gitPushPr = result.commands.find(c => c.name === 'git-push-pr');
    assert.ok(gitPushPr, 'Should find git-push-pr command');
    assert.strictEqual(gitPushPr.errors, 1, 'Should detect 1 error');
    assert.strictEqual(gitPushPr.error_details.length, 1, 'Should record error details');
    assert.ok(gitPushPr.error_details[0].error_message.includes('not a git repository'),
              'Should capture error message');
  });

  it('should handle malformed JSON lines gracefully', async () => {
    // Create a transcript with malformed JSON
    const tempPath = path.join(os.tmpdir(), 'malformed-transcript.jsonl');
    fs.writeFileSync(tempPath,
      '{"type":"session_start","timestamp":"2026-01-27T10:00:00Z"}\n' +
      'this is not valid JSON\n' +
      '{"type":"session_end","timestamp":"2026-01-27T10:30:00Z"}\n'
    );

    const result = await analyzeTranscript(tempPath, 'test-malformed');

    assert.ok(result, 'Should not crash on malformed JSON');
    assert.ok(result.sessionStart, 'Should still extract valid lines');

    // Cleanup
    fs.unlinkSync(tempPath);
  });

  it('should return empty commands array when no custom commands found', async () => {
    // Create a transcript with no custom commands
    const tempPath = path.join(os.tmpdir(), 'no-commands-transcript.jsonl');
    fs.writeFileSync(tempPath,
      '{"type":"session_start","timestamp":"2026-01-27T10:00:00Z"}\n' +
      '{"type":"tool_use","tool_name":"Read","timestamp":"2026-01-27T10:05:00Z"}\n' +
      '{"type":"session_end","timestamp":"2026-01-27T10:30:00Z"}\n'
    );

    const result = await analyzeTranscript(tempPath, 'test-no-commands');

    assert.strictEqual(result.commands.length, 0, 'Should return empty array');

    // Cleanup
    fs.unlinkSync(tempPath);
  });
});

// Run all tests
run();
