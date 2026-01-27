#!/usr/bin/env node
/**
 * Simple test runner using Node.js built-in assert module
 * No external dependencies required
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.currentSuite = '';
  }

  describe(suiteName, fn) {
    this.currentSuite = suiteName;
    console.log(`\n${suiteName}`);
    fn();
  }

  it(testName, fn) {
    this.tests.push({ suite: this.currentSuite, name: testName, fn });
  }

  async run() {
    for (const test of this.tests) {
      try {
        await test.fn();
        this.passed++;
        console.log(`  ✓ ${test.name}`);
      } catch (error) {
        this.failed++;
        console.log(`  ✗ ${test.name}`);
        console.log(`    ${error.message}`);
        if (error.stack) {
          console.log(`    ${error.stack.split('\n').slice(1, 3).join('\n    ')}`);
        }
      }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`Total: ${this.tests.length} | Passed: ${this.passed} | Failed: ${this.failed}`);

    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// Export test utilities
const runner = new TestRunner();

module.exports = {
  describe: runner.describe.bind(runner),
  it: runner.it.bind(runner),
  assert,
  run: runner.run.bind(runner)
};
