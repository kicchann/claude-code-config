#!/usr/bin/env node

const path = require("path");

/**
 * Detect OS platform and return appropriate emoji
 * @returns {string}
 */
const getPlatformEmoji = () => {
  try {
    const platform = process.platform;

    if (platform === 'win32') {
      return '🪟';
    }

    if (platform === 'darwin') {
      return '🍎';
    }

    if (platform === 'linux') {
      return '🐧';  // WSLもLinuxもペンギン
    }

    return '💻';  // フォールバック
  } catch (err) {
    return '💻';
  }
};

/**
 * @param {number} tokens
 * @returns {string}
 */
const formatTokenCount = (tokens) =>
  tokens >= 1000000
    ? `${(tokens / 1000000).toFixed(1)}M`
    : tokens >= 1000
      ? `${(tokens / 1000).toFixed(1)}K`
      : tokens.toString();

/**
 * @param {string} input
 * @returns {string}
 */
const buildStatusLine = (input) => {
  const data = JSON.parse(input);
  const model = data.model?.display_name || "Unknown";
  const currentDir = path.basename(
    data.workspace?.current_dir || data.cwd || ".",
  );

  const contextWindow = data.context_window || {};
  const contextSize = contextWindow.context_window_size;
  const currentUsage = contextWindow.current_usage;

  const currentTokens =
    (currentUsage.input_tokens || 0) +
    (currentUsage.cache_creation_input_tokens || 0) +
    (currentUsage.cache_read_input_tokens || 0);

  const percentage = Math.min(
    100,
    Math.round((currentTokens / contextSize) * 100),
  );
  const tokenDisplay = formatTokenCount(currentTokens);

  const percentageColor =
    percentage >= 90
      ? "\x1b[31m" // Red
      : percentage >= 70
        ? "\x1b[33m" // Yellow
        : "\x1b[32m"; // Green

  const osEmoji = getPlatformEmoji();
  return `${osEmoji} [${model}] 📁 ${currentDir} | 🪙 ${tokenDisplay} | ${percentageColor}${percentage}%\x1b[0m`;
};

const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => console.log(buildStatusLine(chunks.join(""))));
