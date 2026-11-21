#!/usr/bin/env bun
// git.ts: the git edge: the main checkout, the run's worktree, the exclude line, the worktree's state.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Refusal } from "./core.ts";

function git(args: string[]): string {
  const r = Bun.spawnSync(["git", ...args], { stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) throw new Refusal(`git ${args.join(" ")}: ${r.stderr.toString().trim()}`);
  return r.stdout.toString();
}

function commonDir(cwd: string): string {
  return git(["-C", cwd, "rev-parse", "--path-format=absolute", "--git-common-dir"]).trim();
}

/** The main checkout that holds `cwd`, even when `cwd` is a linked worktree. */
export function mainCheckout(cwd: string): string {
  return dirname(commonDir(cwd));
}

/** Branch `longrun/<run-id>` from `base`, checked out at `dir`. Re-running after a half-done init reuses what exists. */
export function createWorktree(repo: string, runId: string, base: string, dir: string): { branch: string } {
  const branch = `longrun/${runId}`;
  if (existsSync(join(dir, ".git"))) return { branch };
  const exists = Bun.spawnSync(["git", "-C", repo, "rev-parse", "--verify", "--quiet", `refs/heads/${branch}`]).exitCode === 0;
  git(exists ? ["-C", repo, "worktree", "add", dir, branch] : ["-C", repo, "worktree", "add", "-b", branch, dir, base]);
  return { branch };
}

/** Adds `pattern` to <common-dir>/info/exclude once, which every worktree of the repo reads; no tracked file changes. */
export function addExclude(repo: string, pattern: string): void {
  const file = join(commonDir(repo), "info", "exclude");
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (text.split("\n").some((l) => l.trim() === pattern)) return;
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, `${text === "" || text.endsWith("\n") ? "" : "\n"}${pattern}\n`);
}

export function worktreeState(worktree: string): { exists: boolean; dirty: string[]; headSha: string } {
  if (!existsSync(join(worktree, ".git"))) return { exists: false, dirty: [], headSha: "" };
  const headSha = git(["-C", worktree, "rev-parse", "HEAD"]).trim();
  const dirty = git(["-C", worktree, "status", "--porcelain"]).split("\n").filter((l) => l !== "").map((l) => l.slice(3));
  return { exists: true, dirty, headSha };
}
