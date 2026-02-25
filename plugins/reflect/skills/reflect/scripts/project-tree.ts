#!/usr/bin/env bun
/**
 * Generate a tree of managed projects from Claude Code sessions
 *
 * Usage: bun run project-tree.ts [--json] [--stats]
 */

import { readdirSync, statSync, existsSync } from "fs";
import { join } from "path";

const PROJECTS_DIR = join(process.env.HOME || "", ".claude", "projects");

interface ProjectInfo {
  path: string;
  folderName: string;
  sessionCount: number;
  lastModified: Date;
  exists: boolean;
}

function folderToPath(folderName: string): string {
  // Convert folder name back to path
  // Pattern: double dash = /. (hidden dir), single dash = /
  // e.g., -Users-username--claude → /Users/username/.claude

  let path = folderName
    // Double dash means hidden directory: /.
    .replace(/--/g, "/.")
    // Single dash = /
    .replace(/-/g, "/");

  return path;
}

function getSessionCount(projectFolder: string): number {
  const fullPath = join(PROJECTS_DIR, projectFolder);
  try {
    const entries = readdirSync(fullPath);
    // Count .jsonl files (sessions)
    return entries.filter((e) => e.endsWith(".jsonl")).length;
  } catch {
    return 0;
  }
}

function getLastModified(projectFolder: string): Date {
  const fullPath = join(PROJECTS_DIR, projectFolder);
  try {
    return statSync(fullPath).mtime;
  } catch {
    return new Date(0);
  }
}

function getProjects(): ProjectInfo[] {
  const folders = readdirSync(PROJECTS_DIR);

  return folders
    .map((folderName) => {
      const path = folderToPath(folderName);
      return {
        path,
        folderName,
        sessionCount: getSessionCount(folderName),
        lastModified: getLastModified(folderName),
        exists: existsSync(path),
      };
    })
    .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}

function buildTree(projects: ProjectInfo[]): Map<string, ProjectInfo[]> {
  // Group projects by their root directory
  const tree = new Map<string, ProjectInfo[]>();

  for (const project of projects) {
    const parts = project.path.split("/").filter(Boolean);
    const root = parts.length > 2 ? `/${parts[0]}/${parts[1]}/${parts[2]}` : project.path;

    if (!tree.has(root)) {
      tree.set(root, []);
    }
    tree.get(root)!.push(project);
  }

  return tree;
}

function printTree(projects: ProjectInfo[], showStats: boolean) {
  const tree = buildTree(projects);
  const sortedRoots = [...tree.keys()].sort();

  console.log("\n📁 Claude Code Managed Projects\n");
  console.log(
    `Total: ${projects.length} projects, ${projects.reduce((sum, p) => sum + p.sessionCount, 0)} sessions\n`,
  );

  for (const root of sortedRoots) {
    const rootProjects = tree.get(root)!;

    // Print root group
    console.log(`📂 ${root}`);

    for (let i = 0; i < rootProjects.length; i++) {
      const p = rootProjects[i];
      const isLast = i === rootProjects.length - 1;
      const prefix = isLast ? "└── " : "├── ";
      const subPath = p.path.replace(root, "").replace(/^\//, "") || ".";

      const status = p.exists ? "✓" : "✗";
      const stats = showStats
        ? ` (${p.sessionCount} sessions, ${p.lastModified.toLocaleDateString()})`
        : "";

      console.log(`   ${prefix}${status} ${subPath || "(root)"}${stats}`);
    }
    console.log("");
  }
}

function printJson(projects: ProjectInfo[]) {
  console.log(JSON.stringify(projects, null, 2));
}

// Main
const args = process.argv.slice(2);
const showJson = args.includes("--json");
const showStats = args.includes("--stats");

if (!existsSync(PROJECTS_DIR)) {
  console.error("Projects directory not found:", PROJECTS_DIR);
  process.exit(1);
}

const projects = getProjects();

if (showJson) {
  printJson(projects);
} else {
  printTree(projects, showStats);
}
