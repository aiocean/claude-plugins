#!/usr/bin/env bun
/**
 * Convert a real filesystem path to Claude Code project folder path
 *
 * Usage:
 *   bun run get-project-path.ts /Users/name/projects/myapp
 *   bun run get-project-path.ts .                          # Current directory
 *   bun run get-project-path.ts /Users/name/projects/myapp --check
 */

import { existsSync, readdirSync } from "fs";
import { join, resolve } from "path";

const PROJECTS_DIR = join(process.env.HOME || "", ".claude", "projects");

function pathToFolder(realPath: string): string {
  // Convert real path to folder name
  // Pattern: / → -, /. → --
  // e.g., /Users/username/.claude → -Users-username--claude

  const absolutePath = resolve(realPath);

  return (
    absolutePath
      // Handle hidden directories first: /. → --
      .replace(/\/\./g, "--")
      // Then handle regular slashes: / → -
      .replace(/\//g, "-")
  );
}

function findProjectFolder(realPath: string): string | null {
  const expectedFolder = pathToFolder(realPath);
  const fullPath = join(PROJECTS_DIR, expectedFolder);

  if (existsSync(fullPath)) {
    return fullPath;
  }

  // Try to find partial match (for subdirectories)
  if (existsSync(PROJECTS_DIR)) {
    const folders = readdirSync(PROJECTS_DIR);
    const match = folders.find((f) => expectedFolder.startsWith(f) || f.startsWith(expectedFolder));
    if (match) {
      return join(PROJECTS_DIR, match);
    }
  }

  return null;
}

function getSessionCount(projectFolder: string): number {
  try {
    const entries = readdirSync(projectFolder);
    return entries.filter((e) => e.endsWith(".jsonl") && !e.startsWith("agent-")).length;
  } catch {
    return 0;
  }
}

// Main
const args = process.argv.slice(2);
const inputPath = args[0];
const checkOnly = args.includes("--check");

if (!inputPath) {
  console.log(`Usage:
  bun run get-project-path.ts <path>
  bun run get-project-path.ts .
  bun run get-project-path.ts <path> --check

Converts a real filesystem path to the Claude Code project folder path.
`);
  process.exit(1);
}

const realPath = resolve(inputPath);
const projectFolder = findProjectFolder(realPath);

if (checkOnly) {
  if (projectFolder) {
    const sessions = getSessionCount(projectFolder);
    console.log(`✓ Found: ${projectFolder}`);
    console.log(`  Sessions: ${sessions}`);
    process.exit(0);
  } else {
    console.log(`✗ No sessions found for: ${realPath}`);
    process.exit(1);
  }
} else {
  if (projectFolder) {
    console.log(projectFolder);
  } else {
    // Output expected path even if it doesn't exist
    console.log(join(PROJECTS_DIR, pathToFolder(realPath)));
  }
}
