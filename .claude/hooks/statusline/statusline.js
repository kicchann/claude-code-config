#!/usr/bin/env node

const path = require("path");
const fs = require("fs");

/**
 * Get session summary (title) from sessions-index.json
 * @param {string} transcriptPath - Path to the transcript file
 * @returns {string} - Session summary or empty string
 */
const getSessionSummary = (transcriptPath) => {
  try {
    if (!transcriptPath) return "";

    const projectDir = path.dirname(transcriptPath);
    const sessionId = path.basename(transcriptPath, ".jsonl");
    const indexPath = path.join(projectDir, "sessions-index.json");

    // まずsessions-index.jsonから検索
    if (fs.existsSync(indexPath)) {
      const indexData = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
      const entries = indexData.entries || {};

      for (const entry of Object.values(entries)) {
        if (entry.sessionId === sessionId && entry.summary) {
          const summary = entry.summary;
          return summary.length > 23
            ? summary.substring(0, 20) + "..."
            : summary;
        }
      }
    }

    // indexに無い場合、transcriptファイルの先頭部分から最初のユーザープロンプトを取得
    if (fs.existsSync(transcriptPath)) {
      const fd = fs.openSync(transcriptPath, "r");
      const buf = Buffer.alloc(8192); // 先頭8KBのみ読む
      const bytesRead = fs.readSync(fd, buf, 0, 8192, 0);
      fs.closeSync(fd);
      const content = buf.toString("utf-8", 0, bytesRead);
      const lines = content.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.type === "user" && entry.message?.content) {
            let text = "";
            const msgContent = entry.message.content;

            // contentが配列の場合
            if (Array.isArray(msgContent)) {
              const textContent = msgContent.find((c) => c.type === "text");
              if (textContent?.text) {
                text = textContent.text;
              }
            } else if (typeof msgContent === "string") {
              // contentが文字列の場合
              text = msgContent;
            }

            // システムタグを除外してテキストを抽出
            // <tag>...</tag> 形式のタグを繰り返し除去
            let prevText;
            do {
              prevText = text;
              text = text.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, "");
            } while (text !== prevText);
            // 自己閉じタグも除去
            text = text.replace(/<[^>]+\/>/g, "").trim();

            if (text && text.length > 0) {
              return text.length > 23 ? text.substring(0, 20) + "..." : text;
            }
          }
        } catch (e) {
          continue;
        }
      }
    }

    return "";
  } catch (err) {
    return "";
  }
};

/**
 * Detect OS platform and return appropriate emoji
 * @returns {string}
 */
const getPlatformEmoji = () => {
  try {
    const platform = process.platform;

    if (platform === "win32") {
      return "🪟";
    }

    if (platform === "darwin") {
      return "🍎";
    }

    if (platform === "linux") {
      return "🐧"; // WSLもLinuxもペンギン
    }

    return "💻"; // フォールバック
  } catch (err) {
    return "💻";
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
 * モデル名に基づいて色コードを返す
 * @param {string} modelName
 * @returns {string} ANSIカラーコード
 */
const getModelColor = (modelName) => {
  const name = modelName.toLowerCase();

  if (name.includes("opus")) {
    return "\x1b[93m"; // ゴールド（明るい黄色）- 賢い
  }
  if (name.includes("sonnet")) {
    return "\x1b[92m"; // 優しい緑（明るい緑）- 親切
  }
  if (name.includes("haiku")) {
    return "\x1b[34m"; // 青 - 速い
  }

  return "\x1b[37m"; // デフォルト：白
};

/**
 * Git branch cache - invalidates when .git/HEAD mtime changes
 */
const gitBranchCache = { branch: "", headPath: "", mtime: 0 };

/**
 * Resolve the path to .git/HEAD, handling worktrees
 * @param {string} cwd
 * @returns {string} - Path to HEAD file, or empty string
 */
const resolveGitHeadPath = (cwd) => {
  try {
    let dir = path.resolve(cwd);
    while (dir !== path.dirname(dir)) {
      const gitPath = path.join(dir, ".git");
      if (fs.existsSync(gitPath)) {
        const stat = fs.statSync(gitPath);
        if (stat.isDirectory()) {
          return path.join(gitPath, "HEAD");
        }
        // Worktree: .git is a file containing "gitdir: <path>"
        const content = fs.readFileSync(gitPath, "utf-8").trim();
        const match = content.match(/^gitdir:\s*(.+)$/);
        if (match) {
          const gitDir = path.isAbsolute(match[1])
            ? match[1]
            : path.resolve(dir, match[1]);
          return path.join(gitDir, "HEAD");
        }
        return "";
      }
      dir = path.dirname(dir);
    }
    return "";
  } catch (err) {
    return "";
  }
};

/**
 * Read branch name directly from HEAD file
 * @param {string} headPath
 * @returns {string}
 */
const readBranchFromHead = (headPath) => {
  try {
    const content = fs.readFileSync(headPath, "utf-8").trim();
    const match = content.match(/^ref:\s*refs\/heads\/(.+)$/);
    return match ? match[1] : content.substring(0, 8); // detached HEAD: short hash
  } catch (err) {
    return "";
  }
};

/**
 * Get current git branch with caching
 * @param {string} cwd - Current working directory
 * @returns {string} - Git branch name or empty string
 */
const getGitBranch = (cwd) => {
  try {
    // Resolve HEAD path (cached after first call for same cwd)
    const headPath = gitBranchCache.headPath || resolveGitHeadPath(cwd);
    if (!headPath) return "";

    // Check mtime - if unchanged, return cached branch
    const mtime = fs.statSync(headPath).mtimeMs;
    if (
      headPath === gitBranchCache.headPath &&
      mtime === gitBranchCache.mtime &&
      gitBranchCache.branch
    ) {
      return gitBranchCache.branch;
    }

    // Cache miss - read branch from HEAD file
    const branch = readBranchFromHead(headPath);
    gitBranchCache.headPath = headPath;
    gitBranchCache.mtime = mtime;
    gitBranchCache.branch = branch;
    return branch;
  } catch (err) {
    return "";
  }
};

/**
 * Strip version numbers from model name
 * e.g., "Claude 3.5 Sonnet" -> "Sonnet", "Opus 4.6" -> "Opus"
 * @param {string} modelName
 * @returns {string}
 */
const getModelNameWithoutVersion = (modelName) => {
  // Remove "Claude" prefix
  let name = modelName.replace(/^Claude\s+/i, "");
  // Remove version numbers (e.g., "3.5", "4.6", "4.5")
  name = name.replace(/\s*\d+\.\d+\s*/g, " ").trim();
  return name || "Unknown";
};

/**
 * @param {string} input
 * @returns {string}
 */
const buildStatusLine = (input) => {
  const data = JSON.parse(input);
  const rawModel = data.model?.display_name || "Unknown";
  const model = getModelNameWithoutVersion(rawModel);
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
  const summary = getSessionSummary(data.transcript_path);
  const summaryPart = summary ? ` 📝 \x1b[36m${summary}\x1b[0m` : "";
  const modelColor = getModelColor(model);
  const gitBranch = getGitBranch(
    data.workspace?.current_dir || data.cwd || ".",
  );
  const locationPart = gitBranch
    ? ` 🔀 \x1b[96m${gitBranch}\x1b[0m`
    : ` 📁 \x1b[37m${currentDir}\x1b[0m`;
  return `${osEmoji} ${modelColor}[${model}]\x1b[0m${locationPart}${summaryPart} 🪙 ${percentageColor}${percentage}%\x1b[0m`;
};

const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => console.log(buildStatusLine(chunks.join(""))));
