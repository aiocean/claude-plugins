#!/usr/bin/env bun
// checks.ts: runs one typed wait check: no shell, an argv, a timeout. What a check prints is data; it only decides
// resolved, pending or failed. Only ci, review, merged and named can fail. A check that could not read anything
// (gh missing or logged out, a timeout, a network error) stays pending, and its outcome says why.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type Check, type CheckOutcome, type CheckResult, type Contract, type State, type Wait, DEFAULT_CHECK_TIMEOUT_SECONDS, isRecord } from "./core.ts";
import { type Paths, inboxNotes } from "./record.ts";

/** `gh` is the program ci, review and merged checks run: GH_BIN from env.sh, else `gh` on the PATH. */
export interface CheckContext { c: Contract; s: State; p: Paths; wait: Wait; now: Date; gh: string }

const HTTP_TIMEOUT_MS = 10_000;
/** A named check exits 10 for "not yet", the same code longrun itself uses for sleep. */
const NOT_YET = 10;
const ERROR_MAX_CHARS = 300;

interface Ran { exitCode: number | null; stdout: string; error?: string }

/** Runs argv with no shell. `error` says why it gave no answer: it could not start, it timed out, or it exited non-zero. */
async function run(argv: string[], cwd: string, timeoutMs: number): Promise<Ran> {
  const program = argv[0] ?? "";
  if (!existsSync(cwd)) return { exitCode: null, stdout: "", error: `the worktree ${cwd} is missing` };
  let proc;
  try {
    proc = Bun.spawn(argv, { cwd, stdin: "ignore", stdout: "pipe", stderr: "pipe", timeout: timeoutMs, killSignal: "SIGKILL" });
  } catch (e) {
    return { exitCode: null, stdout: "", error: `cannot start ${program}: ${e instanceof Error ? e.message : String(e)}` };
  }
  const [stdout, stderr, exitCode] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  if (proc.signalCode !== null) return { exitCode: null, stdout, error: `${program} timed out after ${timeoutMs / 1000} s` };
  if (exitCode === 0) return { exitCode, stdout };
  const last = stderr.split("\n").map((l) => l.trim()).filter((l) => l !== "").at(-1);
  return { exitCode, stdout, error: `${program} exited ${exitCode}${last === undefined ? "" : `: ${last}`}` };
}

function json(text: string): unknown {
  try {
    const v: unknown = JSON.parse(text);
    return v;
  } catch {
    return undefined;
  }
}

const pending = (error: string | undefined): CheckOutcome =>
  error === undefined ? { result: "pending" } : { result: "pending", error: error.slice(0, ERROR_MAX_CHARS) };

/**
 * `<gh> pr <sub> <pr> [-R repo] --json <fields>`, run in the worktree so gh finds the repo when the check names none.
 * gh exits non-zero for pending or failing checks too, so only output that is not JSON counts as an error.
 */
async function gh(sub: "checks" | "view", check: { pr: number; repo?: string }, fields: string, ctx: CheckContext): Promise<{ value: unknown; error?: string }> {
  const repo = check.repo === undefined ? [] : ["-R", check.repo];
  const out = await run([ctx.gh, "pr", sub, String(check.pr), ...repo, "--json", fields], ctx.s.worktree, DEFAULT_CHECK_TIMEOUT_SECONDS * 1000);
  const value = json(out.stdout);
  return value === undefined ? { value, error: out.error ?? `${ctx.gh} printed no JSON` } : { value };
}

function field(v: unknown, path: string): unknown {
  let cur = v;
  for (const key of path.split(".")) {
    if (!isRecord(cur)) return undefined;
    cur = cur[key];
  }
  return cur;
}

async function http(check: { url: string; status: number; jsonField?: string; equals?: string }): Promise<CheckOutcome> {
  try {
    const res = await fetch(check.url, { signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
    if (res.status !== check.status) return pending(undefined);
    if (check.jsonField === undefined) return { result: "resolved" };
    const v = field(json(await res.text()), check.jsonField);
    if (v === undefined || v === null) return pending(undefined);
    if (check.equals === undefined) return { result: "resolved" };
    return (typeof v === "string" ? v : JSON.stringify(v)) === check.equals ? { result: "resolved" } : pending(undefined);
  } catch (e) {
    return pending(`${check.url}: ${e instanceof Error ? e.message : String(e)}`); // network error, timeout, unreadable body
  }
}

const decided = (result: CheckResult): CheckOutcome => ({ result });

export async function runCheck(check: Check, ctx: CheckContext): Promise<CheckOutcome> {
  switch (check.type) {
    case "ci": {
      const { value: v, error } = await gh("checks", check, "name,bucket", ctx);
      if (error !== undefined) return pending(error);
      if (!Array.isArray(v) || v.length === 0) return pending(undefined);
      const buckets = v.map((x: unknown) => (isRecord(x) ? x["bucket"] : undefined));
      if (buckets.some((b) => b === "fail" || b === "cancel")) return decided("failed");
      return decided(buckets.every((b) => b === "pass" || b === "skipping") ? "resolved" : "pending");
    }
    case "review": {
      const { value, error } = await gh("view", check, "reviewDecision", ctx);
      if (error !== undefined) return pending(error);
      const d = field(value, "reviewDecision");
      return decided(d === "APPROVED" ? "resolved" : d === "CHANGES_REQUESTED" ? "failed" : "pending");
    }
    case "merged": {
      const { value, error } = await gh("view", check, "state", ctx);
      if (error !== undefined) return pending(error);
      const st = field(value, "state");
      return decided(st === "MERGED" ? "resolved" : st === "CLOSED" ? "failed" : "pending");
    }
    case "file": {
      const f = join(ctx.s.worktree, check.path);
      if (!existsSync(f)) return pending(undefined);
      if (check.contains === undefined) return decided("resolved");
      try {
        return decided(readFileSync(f, "utf8").includes(check.contains) ? "resolved" : "pending");
      } catch (e) {
        return pending(`cannot read ${check.path}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    case "http":
      return http(check);
    case "time":
      return decided(ctx.now.getTime() >= Date.parse(check.at) ? "resolved" : "pending");
    case "inbox":
      return decided(inboxNotes(ctx.p).length > 0 ? "resolved" : "pending");
    case "approval":
      return decided(ctx.wait.approval?.exitCode === 0 ? "resolved" : "pending");
    case "named": {
      const named = ctx.c.checks[check.name];
      if (named === undefined) return pending(`the contract has no check named ${check.name}`);
      const { exitCode, error } = await run(named.argv, ctx.s.worktree, named.timeoutSeconds * 1000);
      if (exitCode === null) return pending(error);
      return decided(exitCode === 0 ? "resolved" : exitCode === NOT_YET ? "pending" : "failed");
    }
  }
}
