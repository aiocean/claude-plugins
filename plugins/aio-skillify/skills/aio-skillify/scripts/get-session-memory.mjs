#!/usr/bin/env node

/**
 * Get session memory content for the current Claude Code session.
 *
 * Reconstructs the session memory path using the same logic as Claude Code:
 *   ~/.claude/projects/{sanitizedCwd}/{sessionId}/session-memory/summary.md
 *
 * Usage:
 *   node get-session-memory.mjs [--cwd <path>] [--session-id <id>] [--latest]
 *
 * Options:
 *   --cwd          Working directory (defaults to process.cwd())
 *   --session-id   Specific session ID to read
 *   --latest       Find the most recent session memory across all sessions
 *   --list         List all available session memory files
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, sep } from "path";
import { homedir } from "os";

const MAX_SANITIZED_LENGTH = 80;

function sanitizePath(name) {
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, "-");
  if (sanitized.length <= MAX_SANITIZED_LENGTH) {
    return sanitized;
  }
  // Simple hash fallback for long paths
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `${sanitized.slice(0, MAX_SANITIZED_LENGTH)}-${(hash >>> 0).toString(36)}`;
}

function getProjectsDir() {
  return join(homedir(), ".claude", "projects");
}

function getProjectDir(cwd) {
  return join(getProjectsDir(), sanitizePath(cwd));
}

function getSessionMemoryPath(cwd, sessionId) {
  return join(getProjectDir(cwd), sessionId, "session-memory", "summary.md");
}

function findAllSessionMemories(cwd) {
  const projectDir = getProjectDir(cwd);
  if (!existsSync(projectDir)) return [];

  const entries = [];
  try {
    for (const sessionDir of readdirSync(projectDir)) {
      const memoryPath = join(
        projectDir,
        sessionDir,
        "session-memory",
        "summary.md"
      );
      try {
        const stat = statSync(memoryPath);
        entries.push({
          sessionId: sessionDir,
          path: memoryPath,
          mtime: stat.mtimeMs,
          size: stat.size,
        });
      } catch {
        // No session memory for this session
      }
    }
  } catch {
    // Project dir not readable
  }

  return entries.sort((a, b) => b.mtime - a.mtime);
}

// Parse args
const args = process.argv.slice(2);
let cwd = process.cwd();
let sessionId = null;
let latest = false;
let list = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--cwd" && args[i + 1]) {
    cwd = args[++i];
  } else if (args[i] === "--session-id" && args[i + 1]) {
    sessionId = args[++i];
  } else if (args[i] === "--latest") {
    latest = true;
  } else if (args[i] === "--list") {
    list = true;
  }
}

if (list) {
  const memories = findAllSessionMemories(cwd);
  if (memories.length === 0) {
    console.error("No session memories found for:", cwd);
    process.exit(1);
  }
  for (const m of memories) {
    const date = new Date(m.mtime).toISOString();
    console.log(`${m.sessionId}\t${date}\t${m.size}B\t${m.path}`);
  }
  process.exit(0);
}

if (sessionId) {
  const memoryPath = getSessionMemoryPath(cwd, sessionId);
  try {
    console.log(readFileSync(memoryPath, "utf-8"));
  } catch {
    console.error("Session memory not found:", memoryPath);
    process.exit(1);
  }
} else if (latest) {
  const memories = findAllSessionMemories(cwd);
  if (memories.length === 0) {
    console.error("No session memories found for:", cwd);
    process.exit(1);
  }
  console.log(readFileSync(memories[0].path, "utf-8"));
} else {
  // Default: try CLAUDE_SESSION_ID env, fallback to latest
  const envSessionId = process.env.CLAUDE_SESSION_ID;
  if (envSessionId) {
    const memoryPath = getSessionMemoryPath(cwd, envSessionId);
    try {
      console.log(readFileSync(memoryPath, "utf-8"));
      process.exit(0);
    } catch {
      // Fall through to latest
    }
  }
  const memories = findAllSessionMemories(cwd);
  if (memories.length === 0) {
    console.error("No session memories found for:", cwd);
    process.exit(1);
  }
  console.log(readFileSync(memories[0].path, "utf-8"));
}
