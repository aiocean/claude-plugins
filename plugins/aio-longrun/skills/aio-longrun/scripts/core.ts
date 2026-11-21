#!/usr/bin/env bun
// core.ts: the pure part of aio-longrun. Types, record parsing and every rule.
// Nothing here touches files, processes or the clock: callers pass `now` in.

import { createHash } from "node:crypto";

export const FORMAT = 1;
export const RUN_ID = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]{1,40}$/;
export const HANDOFF_MAX_LINES = 60;
export const LESSONS_MAX_ACTIVE = 20;
export const LESSON_MAX_CHARS = 300;
export const JOURNAL_TAIL = 30;
export const DEFAULT_CADENCE_MINUTES = 30;
export const DEFAULT_DEADLINE_MS = 7 * 24 * 3_600_000;
export const DEFAULT_CHECK_TIMEOUT_SECONDS = 30;

// ---------------------------------------------------------------- types

export type Who = "human" | "ci" | "review" | "deploy" | "time" | "provider";
export type Check =
  | { type: "ci" | "review" | "merged"; pr: number; repo?: string }
  | { type: "file"; path: string; contains?: string } // relative to the worktree
  | { type: "http"; url: string; status: number; jsonField?: string; equals?: string }
  | { type: "time"; at: string }
  | { type: "inbox" } // inbox.md has a non-blank line
  | { type: "approval" } // this wait's own approval exited 0
  | { type: "named"; name: string }; // a key of contract.checks
export type CheckResult = "resolved" | "pending" | "failed";
/** One run of a wait's check. `error` says why a pending check could not read anything: gh logged out, a timeout. */
export interface CheckOutcome { result: CheckResult; error?: string }
export interface Criterion { id: string; text: string; check: string; pass: string; userVisible: boolean }
export interface NamedCheck { argv: string[]; timeoutSeconds: number }
export interface Limits { stallTicks: number; maxNudges: number; deadTicks: number; leaseMinutes: number; tickBudgetUsd?: number }
export interface Effects { pushRunBranch: boolean; draftPr: boolean } // rung 2; draftPr needs pushRunBranch
export type Waker = "launchd" | "cron" | "paseo" | "temporal" | "cloud";
export interface Contract {
  format: 1; goal: string; base: string; criteria: Criterion[]; effects: Effects;
  allowedTools: string[]; denied: string[]; checks: Record<string, NamedCheck>;
  waker: Waker; cadenceMinutes: number;
  deadline: string; notify: string[]; limits: Limits; approvedAt: string; workflowScripts: boolean;
}
export interface Wait {
  id: string; who: Who; what: string; check: Check; blocks: string[]; // criterion ids
  deadline: string; onExpiry: "not_done" | "notify"; createdAt: string; createdTick: number;
  command?: string[]; sha?: string; // a rung-3 action the human runs
  approval?: { at: string; exitCode: number };
  checkError?: string; // why the last run of the check read nothing
  outcome?: CheckResult | "expired"; settledAt?: string; why?: string;
}
export interface VerdictRef { id: string; result: "met" | "not_met" | "untried"; at: string; sha: string; dirty: boolean }
export interface Counters { sinceProgress: number; nudges: number; deadInARow: number; lastFailureKeys: string[]; backoffStep: number }
export type TickAnswer = "continue" | "nudge" | "stalled" | "limit" | "finished";
export interface Tick { n: number; holder: string; startedAt: string; endedAt?: string; answer?: TickAnswer }
export interface CriterionState { status: "unmet" | "met"; verdict?: VerdictRef }
export interface State {
  format: 1; runId: string; contractSha: string; status: "active" | "done" | "not_done"; reason?: string;
  criteria: Record<string, CriterionState>;
  waits: Wait[]; counters: Counters; tick?: Tick; backoffUntil?: string;
  worktree: string; branch: string; remote: boolean;
}
export interface Lesson { id: string; kind: "pitfall" | "preference" | "fact"; text: string; source: string; at: string; supersededBy?: string }
export const EVENT_KINDS = ["init", "tick_start", "tick_end", "dead_tick", "dispatch", "effect", "verdict", "progress",
  "wait_add", "wait_settle", "nudge", "lesson", "inbox", "approval", "backoff", "finish", "reopen", "handoff", "wake"] as const satisfies readonly string[];
export type EventKind = (typeof EVENT_KINDS)[number];
export interface JournalEvent { at: string; tick: number; kind: EventKind; data: Record<string, unknown> }
export type Draft = Omit<JournalEvent, "at" | "tick">;
export interface Step<A> { answer: A; next: State; events: Draft[] }

/** A record file that cannot be read: printed as `<file>:<line>: <message>`, exit 2. */
export class RecordError extends Error {
  constructor(public readonly file: string, public readonly line: number | null, message: string) {
    super(message);
    this.name = "RecordError";
  }
}

/** A command that refuses: the message goes to stderr, exit 2. */
export class Refusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Refusal";
  }
}

// ---------------------------------------------------------------- JSON with line numbers

interface Parsed { value: unknown; lines: Map<string, number> }

/** JSON.parse that remembers the line of every value, so errors can name the line at fault. */
export function parseJson(text: string, file: string, firstLine: number): Parsed {
  const lines = new Map<string, number>();
  let pos = 0;
  let line = firstLine;
  const fail: (msg: string) => never = (msg) => {
    throw new RecordError(file, line, `invalid JSON: ${msg}`);
  };
  const ws = (): void => {
    for (;;) {
      const ch = text[pos];
      if (ch === "\n") line++;
      else if (ch !== " " && ch !== "\t" && ch !== "\r") return;
      pos++;
    }
  };
  const unescape = (esc: string | undefined): string | null => {
    switch (esc) {
      case "\"": return "\"";
      case "\\": return "\\";
      case "/": return "/";
      case "b": return "\b";
      case "f": return "\f";
      case "n": return "\n";
      case "r": return "\r";
      case "t": return "\t";
      default: return null;
    }
  };
  const string = (): string => {
    pos++;
    let out = "";
    for (;;) {
      const ch = text[pos];
      if (ch === undefined) fail("unterminated string");
      if (ch === "\"") {
        pos++;
        return out;
      }
      if (ch === "\\") {
        const esc = text[pos + 1];
        if (esc === "u") {
          const hex = text.slice(pos + 2, pos + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail("bad \\u escape");
          out += String.fromCharCode(parseInt(hex, 16));
          pos += 6;
          continue;
        }
        const plain = unescape(esc);
        if (plain === null) fail("bad escape in a string");
        out += plain;
        pos += 2;
        continue;
      }
      if (ch < " ") fail(ch === "\n" ? "line break inside a string" : "control character inside a string");
      out += ch;
      pos++;
    }
  };
  const literal = <T>(word: string, v: T): T => {
    if (!text.startsWith(word, pos)) fail(`unexpected ${JSON.stringify(text.slice(pos, pos + 8))}`);
    pos += word.length;
    return v;
  };
  const number = (): number => {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(pos));
    if (m === null) fail("bad number");
    pos += m[0].length;
    return Number(m[0]);
  };
  const array = (path: string): unknown[] => {
    pos++;
    const out: unknown[] = [];
    ws();
    if (text[pos] === "]") {
      pos++;
      return out;
    }
    for (;;) {
      out.push(value(`${path}[${out.length}]`));
      ws();
      const ch = text[pos];
      pos++;
      if (ch === "]") return out;
      if (ch !== ",") fail("expected ',' or ']'");
    }
  };
  const object = (path: string): Record<string, unknown> => {
    pos++;
    const out: Record<string, unknown> = {};
    ws();
    if (text[pos] === "}") {
      pos++;
      return out;
    }
    for (;;) {
      ws();
      if (text[pos] !== "\"") fail("expected a key in double quotes");
      const key = string();
      if (key === "__proto__") fail("the key __proto__ is not allowed");
      if (Object.hasOwn(out, key)) fail(`duplicate key ${JSON.stringify(key)}`);
      ws();
      if (text[pos] !== ":") fail("expected ':'");
      pos++;
      out[key] = value(path === "" ? key : `${path}.${key}`);
      ws();
      const ch = text[pos];
      pos++;
      if (ch === "}") return out;
      if (ch !== ",") fail("expected ',' or '}'");
    }
  };
  const value = (path: string): unknown => {
    ws();
    lines.set(path, line);
    const ch = text[pos];
    if (ch === "{") return object(path);
    if (ch === "[") return array(path);
    if (ch === "\"") return string();
    if (ch === "t") return literal("true", true);
    if (ch === "f") return literal("false", false);
    if (ch === "n") return literal("null", null);
    if (ch === "-" || (ch !== undefined && ch >= "0" && ch <= "9")) return number();
    return fail(ch === undefined ? "unexpected end of input" : `unexpected ${JSON.stringify(ch)}`);
  };
  const result = value("");
  ws();
  if (pos < text.length) fail("unexpected text after the end");
  return { value: result, lines };
}

// ---------------------------------------------------------------- decoding

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function oneOf<T extends string>(allowed: readonly T[], v: unknown): v is T {
  return typeof v === "string" && allowed.some((a) => a === v);
}

const join = (path: string, key: string): string => (path === "" ? key : `${path}.${key}`);

/** Reads typed fields out of parsed JSON, failing with the file and line of the field at fault. */
export class Decoder {
  constructor(private readonly file: string, private readonly lines: Map<string, number>) {}

  lineOf(path: string): number | null {
    let p = path;
    for (;;) {
      const l = this.lines.get(p);
      if (l !== undefined) return l;
      if (p === "") return null;
      const cut = Math.max(p.lastIndexOf("."), p.lastIndexOf("["));
      p = cut < 0 ? "" : p.slice(0, cut);
    }
  }

  fail(path: string, msg: string): never {
    throw new RecordError(this.file, this.lineOf(path), `${path === "" ? "top level" : path}: ${msg}`);
  }

  obj(v: unknown, path: string): Record<string, unknown> {
    if (!isRecord(v)) this.fail(path, "expected an object");
    return v;
  }

  only(o: Record<string, unknown>, path: string, keys: readonly string[]): void {
    for (const k of Object.keys(o)) if (!keys.includes(k)) this.fail(join(path, k), `unknown field (allowed: ${keys.join(", ")})`);
  }

  has(o: Record<string, unknown>, key: string): boolean {
    return o[key] !== undefined;
  }

  str(o: Record<string, unknown>, key: string, path: string): string {
    const v = o[key];
    if (v === undefined) this.fail(join(path, key), "missing");
    if (typeof v !== "string" || v.trim() === "") this.fail(join(path, key), "expected a non-empty string");
    return v;
  }

  optStr(o: Record<string, unknown>, key: string, path: string): string | undefined {
    return this.has(o, key) ? this.str(o, key, path) : undefined;
  }

  text(o: Record<string, unknown>, key: string, path: string): string {
    const v = o[key];
    if (typeof v !== "string") this.fail(join(path, key), "expected a string");
    return v;
  }

  num(o: Record<string, unknown>, key: string, path: string, rule: { int?: boolean; min?: number; above?: number } = {}): number {
    const v = o[key];
    if (v === undefined) this.fail(join(path, key), "missing");
    if (typeof v !== "number" || !Number.isFinite(v)) this.fail(join(path, key), "expected a number");
    if (rule.int === true && !Number.isInteger(v)) this.fail(join(path, key), "expected a whole number");
    if (rule.min !== undefined && v < rule.min) this.fail(join(path, key), `expected at least ${rule.min}`);
    if (rule.above !== undefined && v <= rule.above) this.fail(join(path, key), `expected more than ${rule.above}`);
    return v;
  }

  bool(o: Record<string, unknown>, key: string, path: string): boolean {
    const v = o[key];
    if (typeof v !== "boolean") this.fail(join(path, key), v === undefined ? "missing" : "expected true or false");
    return v;
  }

  strs(o: Record<string, unknown>, key: string, path: string): string[] {
    const v = o[key];
    if (!Array.isArray(v)) this.fail(join(path, key), v === undefined ? "missing" : "expected a list of strings");
    return v.map((x: unknown, i) => {
      if (typeof x !== "string" || x === "") this.fail(`${join(path, key)}[${i}]`, "expected a non-empty string");
      return x;
    });
  }

  time(o: Record<string, unknown>, key: string, path: string): string {
    const v = this.str(o, key, path);
    if (Number.isNaN(Date.parse(v))) this.fail(join(path, key), "expected an ISO time");
    return v;
  }

  optTime(o: Record<string, unknown>, key: string, path: string): string | undefined {
    return this.has(o, key) ? this.time(o, key, path) : undefined;
  }

  pick<T extends string>(o: Record<string, unknown>, key: string, path: string, allowed: readonly T[]): T {
    const v = o[key];
    if (!oneOf(allowed, v)) this.fail(join(path, key), `expected one of ${allowed.join(", ")}`);
    return v;
  }
}

export const WHO = ["human", "ci", "review", "deploy", "time", "provider"] as const satisfies readonly Who[];
const WAKERS = ["launchd", "cron", "paseo", "temporal", "cloud"] as const satisfies readonly Waker[];
const CHECK_TYPES = ["ci", "review", "merged", "file", "http", "time", "inbox", "approval", "named"] as const satisfies readonly Check["type"][];
const ID = /^[A-Za-z0-9_-]{1,40}$/;

export function decodeCheck(d: Decoder, v: unknown, path: string): Check {
  const o = d.obj(v, path);
  const type = d.pick(o, "type", path, CHECK_TYPES);
  switch (type) {
    case "ci":
    case "review":
    case "merged": {
      d.only(o, path, ["type", "pr", "repo"]);
      const repo = d.optStr(o, "repo", path);
      if (repo !== undefined && !/^[\w.-]+\/[\w.-]+$/.test(repo)) d.fail(join(path, "repo"), "expected owner/name");
      const pr = d.num(o, "pr", path, { int: true, min: 1 });
      return repo === undefined ? { type, pr } : { type, pr, repo };
    }
    case "file": {
      d.only(o, path, ["type", "path", "contains"]);
      const rel = d.str(o, "path", path);
      if (rel.startsWith("/") || rel.split("/").includes("..")) d.fail(join(path, "path"), "expected a path inside the worktree");
      const contains = d.has(o, "contains") ? d.text(o, "contains", path) : undefined;
      return contains === undefined ? { type, path: rel } : { type, path: rel, contains };
    }
    case "http": {
      d.only(o, path, ["type", "url", "status", "jsonField", "equals"]);
      const url = d.str(o, "url", path);
      if (!/^https?:\/\//.test(url) || !URL.canParse(url)) d.fail(join(path, "url"), "expected an http(s) URL");
      const check: Check = { type, url, status: d.num(o, "status", path, { int: true, min: 100 }) };
      const jsonField = d.optStr(o, "jsonField", path);
      const equals = d.has(o, "equals") ? d.text(o, "equals", path) : undefined;
      if (equals !== undefined && jsonField === undefined) d.fail(join(path, "equals"), "needs jsonField");
      return { ...check, ...(jsonField === undefined ? {} : { jsonField }), ...(equals === undefined ? {} : { equals }) };
    }
    case "time":
      d.only(o, path, ["type", "at"]);
      return { type, at: d.time(o, "at", path) };
    case "inbox":
    case "approval":
      d.only(o, path, ["type"]);
      return { type };
    case "named": {
      d.only(o, path, ["type", "name"]);
      return { type, name: d.str(o, "name", path) };
    }
  }
}

function decodeContract(d: Decoder, v: unknown): Contract {
  const o = d.obj(v, "");
  d.only(o, "", ["format", "goal", "base", "criteria", "effects", "allowedTools", "denied", "checks", "waker",
    "cadenceMinutes", "deadline", "notify", "limits", "approvedAt", "workflowScripts"]);
  const format = d.num(o, "format", "", { int: true });
  if (format !== FORMAT) d.fail("format", `record format ${format}, this script reads ${FORMAT}`);

  const rawCriteria = o["criteria"];
  if (!Array.isArray(rawCriteria) || rawCriteria.length === 0) d.fail("criteria", "expected a non-empty list");
  const seen = new Set<string>();
  const criteria = rawCriteria.map((raw: unknown, i): Criterion => {
    const path = `criteria[${i}]`;
    const c = d.obj(raw, path);
    d.only(c, path, ["id", "text", "check", "pass", "userVisible"]);
    const id = d.str(c, "id", path);
    if (!ID.test(id)) d.fail(join(path, "id"), "expected letters, digits, _ or -, at most 40");
    if (seen.has(id)) d.fail(join(path, "id"), `duplicate criterion id ${id}`);
    seen.add(id);
    return { id, text: d.str(c, "text", path), check: d.str(c, "check", path), pass: d.str(c, "pass", path), userVisible: d.bool(c, "userVisible", path) };
  });
  if (!criteria.some((c) => c.userVisible)) d.fail("criteria", "no criterion has userVisible: true; at least one must be the result the user sees");

  let effects: Effects = { pushRunBranch: false, draftPr: false };
  if (d.has(o, "effects")) {
    const e = d.obj(o["effects"], "effects");
    d.only(e, "effects", ["pushRunBranch", "draftPr"]);
    effects = { pushRunBranch: d.bool(e, "pushRunBranch", "effects"), draftPr: d.bool(e, "draftPr", "effects") };
    if (effects.draftPr && !effects.pushRunBranch) d.fail("effects.draftPr", "needs effects.pushRunBranch");
  }

  const checks: Record<string, NamedCheck> = {};
  if (d.has(o, "checks")) {
    const all = d.obj(o["checks"], "checks");
    for (const name of Object.keys(all)) {
      const path = join("checks", name);
      if (!/^[a-z0-9-]{1,40}$/.test(name)) d.fail(path, "check names use a-z, 0-9 and -");
      const c = d.obj(all[name], path);
      d.only(c, path, ["argv", "timeoutSeconds"]);
      const argv = d.strs(c, "argv", path);
      if (argv.length === 0) d.fail(join(path, "argv"), "expected at least the command");
      const timeoutSeconds = d.has(c, "timeoutSeconds") ? d.num(c, "timeoutSeconds", path, { above: 0 }) : DEFAULT_CHECK_TIMEOUT_SECONDS;
      checks[name] = { argv, timeoutSeconds };
    }
  }

  const notify = d.strs(o, "notify", "");
  if (!notify.includes("{message}")) d.fail("notify", "needs one element that is exactly {message}");
  notify.forEach((part, i) => {
    if (part !== "{message}" && part.includes("{message}")) d.fail(`notify[${i}]`, "{message} must be a whole element, never part of one");
  });

  const limits: Limits = { stallTicks: 2, maxNudges: 3, deadTicks: 3, leaseMinutes: 90 };
  if (d.has(o, "limits")) {
    const l = d.obj(o["limits"], "limits");
    d.only(l, "limits", ["stallTicks", "maxNudges", "deadTicks", "leaseMinutes", "tickBudgetUsd"]);
    if (d.has(l, "stallTicks")) limits.stallTicks = d.num(l, "stallTicks", "limits", { int: true, min: 1 });
    if (d.has(l, "maxNudges")) limits.maxNudges = d.num(l, "maxNudges", "limits", { int: true, min: 0 });
    if (d.has(l, "deadTicks")) limits.deadTicks = d.num(l, "deadTicks", "limits", { int: true, min: 1 });
    if (d.has(l, "leaseMinutes")) limits.leaseMinutes = d.num(l, "leaseMinutes", "limits", { above: 0 });
    if (d.has(l, "tickBudgetUsd")) limits.tickBudgetUsd = d.num(l, "tickBudgetUsd", "limits", { above: 0 });
  }

  const approvedAt = d.time(o, "approvedAt", "");
  const deadline = d.optTime(o, "deadline", "") ?? new Date(Date.parse(approvedAt) + DEFAULT_DEADLINE_MS).toISOString();
  return {
    format: FORMAT,
    goal: d.str(o, "goal", ""),
    base: d.str(o, "base", ""),
    criteria,
    effects,
    allowedTools: d.strs(o, "allowedTools", ""),
    denied: d.has(o, "denied") ? d.strs(o, "denied", "") : [],
    checks,
    waker: d.pick(o, "waker", "", WAKERS),
    cadenceMinutes: d.has(o, "cadenceMinutes") ? d.num(o, "cadenceMinutes", "", { above: 0 }) : DEFAULT_CADENCE_MINUTES,
    deadline,
    notify,
    limits,
    approvedAt,
    workflowScripts: d.has(o, "workflowScripts") ? d.bool(o, "workflowScripts", "") : false,
  };
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** Reads the one ```json block of contract.md. The sha covers that block only, so prose edits never re-open approval. */
export function parseContract(markdown: string): { contract: Contract; sha: string } {
  const rows = markdown.split("\n");
  const opens: number[] = [];
  rows.forEach((r, i) => {
    if (/^```json\s*$/.test(r)) opens.push(i);
  });
  const [start, second] = opens;
  if (start === undefined) throw new RecordError("contract.md", null, "no ```json block");
  if (second !== undefined) throw new RecordError("contract.md", second + 1, "more than one ```json block");
  const end = rows.findIndex((r, i) => i > start && /^```\s*$/.test(r));
  if (end < 0) throw new RecordError("contract.md", start + 1, "the ```json block is never closed");
  const body = rows.slice(start + 1, end).join("\n");
  const parsed = parseJson(body, "contract.md", start + 2);
  return { contract: decodeContract(new Decoder("contract.md", parsed.lines), parsed.value), sha: sha256(body) };
}

function decodeVerdict(d: Decoder, v: unknown, path: string): VerdictRef {
  const o = d.obj(v, path);
  d.only(o, path, ["id", "result", "at", "sha", "dirty"]);
  return { id: d.str(o, "id", path), result: d.pick(o, "result", path, ["met", "not_met", "untried"]), at: d.time(o, "at", path), sha: d.str(o, "sha", path), dirty: d.bool(o, "dirty", path) };
}

export function decodeWait(d: Decoder, v: unknown, path: string): Wait {
  const o = d.obj(v, path);
  d.only(o, path, ["id", "who", "what", "check", "blocks", "deadline", "onExpiry", "createdAt", "createdTick",
    "command", "sha", "approval", "checkError", "outcome", "settledAt", "why"]);
  const w: Wait = {
    id: d.str(o, "id", path),
    who: d.pick(o, "who", path, WHO),
    what: d.str(o, "what", path),
    check: decodeCheck(d, o["check"], join(path, "check")),
    blocks: d.strs(o, "blocks", path),
    deadline: d.time(o, "deadline", path),
    onExpiry: d.pick(o, "onExpiry", path, ["not_done", "notify"]),
    createdAt: d.time(o, "createdAt", path),
    createdTick: d.num(o, "createdTick", path, { int: true, min: 0 }),
  };
  if (d.has(o, "command")) w.command = d.strs(o, "command", path);
  if (d.has(o, "sha")) w.sha = d.str(o, "sha", path);
  if (d.has(o, "approval")) {
    const a = d.obj(o["approval"], join(path, "approval"));
    d.only(a, join(path, "approval"), ["at", "exitCode"]);
    w.approval = { at: d.time(a, "at", join(path, "approval")), exitCode: d.num(a, "exitCode", join(path, "approval"), { int: true }) };
  }
  if (d.has(o, "checkError")) w.checkError = d.str(o, "checkError", path);
  if (d.has(o, "outcome")) w.outcome = d.pick<CheckResult | "expired">(o, "outcome", path, ["resolved", "pending", "failed", "expired"]);
  if (d.has(o, "settledAt")) w.settledAt = d.time(o, "settledAt", path);
  if (d.has(o, "why")) w.why = d.str(o, "why", path);
  return w;
}

/** Reads state.json. A record of another format is refused, naming both formats. */
export function parseState(json: string): State {
  const parsed = parseJson(json, "state.json", 1);
  const d: Decoder = new Decoder("state.json", parsed.lines);
  const o = d.obj(parsed.value, "");
  const format = o["format"];
  if (format !== FORMAT) throw new RecordError("state.json", d.lineOf("format"), `record format ${JSON.stringify(format ?? null)}, this script reads ${FORMAT}`);
  d.only(o, "", ["format", "runId", "contractSha", "status", "reason", "criteria", "waits", "counters", "tick", "backoffUntil", "worktree", "branch", "remote"]);

  const criteria: Record<string, CriterionState> = {};
  const rawCriteria = d.obj(o["criteria"], "criteria");
  for (const id of Object.keys(rawCriteria)) {
    const path = join("criteria", id);
    const c = d.obj(rawCriteria[id], path);
    d.only(c, path, ["status", "verdict"]);
    const status = d.pick(c, "status", path, ["unmet", "met"]);
    criteria[id] = d.has(c, "verdict") ? { status, verdict: decodeVerdict(d, c["verdict"], join(path, "verdict")) } : { status };
  }

  const rawWaits = o["waits"];
  if (!Array.isArray(rawWaits)) d.fail("waits", "expected a list");
  const waits = rawWaits.map((w: unknown, i) => decodeWait(d, w, `waits[${i}]`));

  const c = d.obj(o["counters"], "counters");
  d.only(c, "counters", ["sinceProgress", "nudges", "deadInARow", "lastFailureKeys", "backoffStep"]);
  const counters: Counters = {
    sinceProgress: d.num(c, "sinceProgress", "counters", { int: true, min: 0 }),
    nudges: d.num(c, "nudges", "counters", { int: true, min: 0 }),
    deadInARow: d.num(c, "deadInARow", "counters", { int: true, min: 0 }),
    lastFailureKeys: d.strs(c, "lastFailureKeys", "counters"),
    backoffStep: d.num(c, "backoffStep", "counters", { int: true, min: 0 }),
  };

  const s: State = {
    format: FORMAT,
    runId: d.str(o, "runId", ""),
    contractSha: d.str(o, "contractSha", ""),
    status: d.pick(o, "status", "", ["active", "done", "not_done"]),
    criteria,
    waits,
    counters,
    worktree: d.str(o, "worktree", ""),
    branch: d.str(o, "branch", ""),
    remote: d.bool(o, "remote", ""),
  };
  if (d.has(o, "reason")) s.reason = d.str(o, "reason", "");
  if (d.has(o, "backoffUntil")) s.backoffUntil = d.time(o, "backoffUntil", "");
  if (d.has(o, "tick")) {
    const t = d.obj(o["tick"], "tick");
    d.only(t, "tick", ["n", "holder", "startedAt", "endedAt", "answer"]);
    const tick: Tick = { n: d.num(t, "n", "tick", { int: true, min: 1 }), holder: d.str(t, "holder", "tick"), startedAt: d.time(t, "startedAt", "tick") };
    if (d.has(t, "endedAt")) tick.endedAt = d.time(t, "endedAt", "tick");
    if (d.has(t, "answer")) tick.answer = d.pick<TickAnswer>(t, "answer", "tick", ["continue", "nudge", "stalled", "limit", "finished"]);
    s.tick = tick;
  }
  return s;
}

/** One journal line. */
export function parseEvent(text: string, lineNo: number): JournalEvent {
  const parsed = parseJson(text, "journal.jsonl", lineNo);
  const d: Decoder = new Decoder("journal.jsonl", parsed.lines);
  const o = d.obj(parsed.value, "");
  d.only(o, "", ["at", "tick", "kind", "data"]);
  return { at: d.time(o, "at", ""), tick: d.num(o, "tick", "", { int: true, min: 0 }), kind: d.pick(o, "kind", "", EVENT_KINDS), data: d.obj(o["data"], "data") };
}

export function initialState(runId: string, c: Contract, contractSha: string, worktree: string, branch: string): State {
  const criteria: Record<string, CriterionState> = {};
  for (const cr of c.criteria) criteria[cr.id] = { status: "unmet" };
  return {
    format: FORMAT, runId, contractSha, status: "active", criteria, waits: [],
    counters: { sinceProgress: 0, nudges: 0, deadInARow: 0, lastFailureKeys: [], backoffStep: 0 },
    worktree, branch, remote: false,
  };
}

export const DURATION = /^(\d+(?:\.\d+)?)(s|m|h|d)$/;

/** "90s" | "30m" | "2h" | "7d" → milliseconds. */
export function parseDuration(text: string): number {
  const m = DURATION.exec(text);
  if (m === null) throw new Refusal(`not a duration: ${text} (use 90s, 30m, 2h or 7d)`);
  const unit = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  const u = m[2];
  const n = Number(m[1]);
  return u === "s" ? n * unit.s : u === "m" ? n * unit.m : u === "h" ? n * unit.h : n * unit.d;
}

// ---------------------------------------------------------------- status

/** A line of inbox.md that ends the run. */
export const isStopLine = (line: string): boolean => line.trim() === "stop";

export function openWaits(s: State): Wait[] {
  return s.waits.filter((w) => w.outcome === undefined);
}

export function unmetIds(s: State): string[] {
  return Object.entries(s.criteria).filter(([, v]) => v.status === "unmet").map(([id]) => id);
}

/** The finish state, always the first line of `status`. */
export function firstLine(s: State, now: Date): string {
  if (s.status === "done") return `${s.runId}: Done`;
  if (s.status === "not_done") return `${s.runId}: Not done (${s.reason ?? "no reason recorded"})`;
  if (s.backoffUntil !== undefined && Date.parse(s.backoffUntil) > now.getTime()) {
    return `${s.runId}: Waiting on provider (until ${s.backoffUntil})`;
  }
  const open = openWaits(s);
  const unmet = unmetIds(s);
  if (unmet.length > 0 && unmet.every((id) => open.some((w) => w.blocks.includes(id)))) {
    const [w] = open
      .filter((x) => x.blocks.some((id) => unmet.includes(id)))
      .sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
    if (w !== undefined) return `${s.runId}: Waiting on ${w.who} (${w.what}, since ${w.createdAt}, deadline ${w.deadline})`;
  }
  return `${s.runId}: Working (tick ${s.tick?.n ?? 0})`;
}

/** Everything `status` prints after the first line. */
export function statusDetail(s: State, c: Contract): string[] {
  const out = ["criteria:"];
  for (const cr of c.criteria) {
    const st = s.criteria[cr.id];
    const v = st?.verdict;
    const verdict = v === undefined ? "" : ` (${v.id} ${v.result} at ${v.sha.slice(0, 7)}${v.dirty ? " with uncommitted changes" : ""})`;
    out.push(`  ${cr.id} ${st?.status ?? "unmet"}${verdict}: ${cr.text}`);
  }
  const open = openWaits(s);
  out.push(open.length === 0 ? "waits: none open" : "waits:");
  for (const w of open) {
    const error = w.checkError === undefined ? "" : `; check error: ${w.checkError}`;
    out.push(`  ${w.id} ${w.who}: ${w.what} (blocks ${w.blocks.join(", ")}; deadline ${w.deadline}${error})`);
  }
  const k = s.counters;
  const l = c.limits;
  out.push(`counters: no progress for ${k.sinceProgress} of ${l.stallTicks} ticks; nudges ${k.nudges} of ${l.maxNudges}; dead ticks in a row ${k.deadInARow} of ${l.deadTicks}; backoff step ${k.backoffStep}`);
  const t = s.tick;
  if (t === undefined) out.push("last tick: none");
  else if (t.endedAt === undefined) out.push(`last tick: ${t.n}, running since ${t.startedAt} (holder ${t.holder})`);
  else out.push(`last tick: ${t.n}, ended ${t.answer ?? "?"} at ${t.endedAt}`);
  return out;
}

// ---------------------------------------------------------------- claim, waits and due

/** Runs only after tryLease succeeded. A previous tick that never ended died; too many in a row end the run. */
export function decideClaim(s: State, c: Contract, now: Date, holder: string): Step<"claimed" | "finished"> {
  if (s.status !== "active") return { answer: "finished", next: s, events: [] };
  const prev = s.tick;
  if (prev !== undefined && prev.endedAt === undefined && prev.holder === holder) return { answer: "claimed", next: s, events: [] };
  const events: Draft[] = [];
  let deadInARow = s.counters.deadInARow;
  if (prev !== undefined && prev.endedAt === undefined) {
    events.push({ kind: "dead_tick", data: { died: prev.n, holder: prev.holder, startedAt: prev.startedAt } });
    deadInARow += 1;
  } else if (prev !== undefined && prev.answer !== "limit") {
    deadInARow = 0;
  }
  const counters: Counters = { ...s.counters, deadInARow };
  if (deadInARow >= c.limits.deadTicks) {
    return { answer: "finished", next: { ...s, counters, status: "not_done", reason: `crash loop: ${deadInARow} ticks died in a row` }, events };
  }
  events.push({ kind: "tick_start", data: { holder } });
  return { answer: "claimed", next: { ...s, counters, tick: { n: (prev?.n ?? 0) + 1, holder, startedAt: now.toISOString() } }, events };
}

/**
 * Why a write to the record is refused, or null. A holder must own the unexpired lease, so a tick whose lease expired
 * and passed to a successor cannot record over it. A write with no holder is the human's, refused only while a tick
 * runs: its tick is open and its holder's lease is unexpired. A tick that died leaves the human free to write.
 */
export function fenceProblem(s: State, lease: { holder: string; expiresAt: string } | null, holder: string | undefined, now: Date): string | null {
  const t = s.tick;
  if (holder === undefined) {
    if (t === undefined || t.endedAt !== undefined) return null;
    if (lease === null || lease.holder !== t.holder || Date.parse(lease.expiresAt) <= now.getTime()) return null;
    return `tick ${t.n} is running (holder ${t.holder}): pass --holder <holder>, or set LONGRUN_HOLDER, to write to the record`;
  }
  if (lease === null) return `${holder} holds no lease on run ${s.runId}; claim it first`;
  if (lease.holder !== holder) return `the lease is held by ${lease.holder} until ${lease.expiresAt}, not by ${holder}`;
  if (Date.parse(lease.expiresAt) <= now.getTime()) return `the lease of ${holder} expired at ${lease.expiresAt}; claim the run again`;
  return null;
}

/** True when the contract already lets a tick fetch this URL, so an http check gives `due` no reach of its own. */
function fetchAllowed(c: Contract, url: string): boolean {
  const host = URL.parse(url)?.hostname;
  if (host === undefined) return false;
  return c.allowedTools.some((t) => {
    if (t === "WebFetch") return true;
    const m = /^WebFetch\(domain:(.+)\)$/.exec(t);
    const rule = m?.[1];
    if (rule === undefined) return false;
    return rule.startsWith("*.") ? host.endsWith(rule.slice(1)) : host === rule;
  });
}

/** Why a new wait is refused, or null. */
export function validateWait(w: Omit<Wait, "id" | "createdAt" | "createdTick">, c: Contract, s: State): string | null {
  if (s.status !== "active") return `run ${s.runId} is finished and takes no new waits`;
  if (w.deadline === "" || Number.isNaN(Date.parse(w.deadline))) return "a wait needs --deadline <iso|duration>";
  if (Date.parse(w.deadline) > Date.parse(c.deadline)) return `wait deadline ${w.deadline} is past the run's deadline ${c.deadline}`;
  if (w.check.type === "named" && !Object.hasOwn(c.checks, w.check.name)) {
    const names = Object.keys(c.checks);
    return `named check ${w.check.name} is not in the contract's checks (${names.length === 0 ? "it defines none" : names.join(", ")})`;
  }
  if (w.check.type === "http" && !fetchAllowed(c, w.check.url)) {
    return `http check ${w.check.url}: the contract's allowedTools must allow WebFetch for that host, e.g. WebFetch(domain:${URL.parse(w.check.url)?.hostname ?? "<host>"})`;
  }
  if (w.blocks.length === 0) return "a wait must block at least one criterion (--blocks <ids,>)";
  const unknown = w.blocks.filter((id) => !c.criteria.some((cr) => cr.id === id));
  if (unknown.length > 0) return `--blocks names unknown criteria: ${unknown.join(", ")} (the contract has ${c.criteria.map((cr) => cr.id).join(", ")})`;
  if (w.check.type === "approval" && (w.command === undefined || w.sha === undefined)) return "an approval check needs --command and --sha";
  if (w.command !== undefined && w.sha === undefined) return "--command needs --sha, the commit the human approves";
  if (w.sha !== undefined && w.command === undefined) return "--sha only goes with --command";
  if (w.command !== undefined && w.command.length === 0) return "--command needs at least the program";
  if (w.sha !== undefined && !/^[0-9a-f]{40}$/.test(w.sha)) return `--sha ${w.sha} is not a full commit sha (git rev-parse HEAD)`;
  return null;
}

/** What `due` saw: each open wait's check outcome keyed by wait id (a missing one is pending), the inbox, and its holder. */
export interface DueInput { results: Record<string, CheckOutcome>; inboxPending: boolean; holder?: string }

/** The wait with its check error set to `error`, or cleared when there is none. */
function withCheckError(w: Wait, error: string | undefined): Wait {
  if (error === w.checkError) return w;
  const next: Wait = { ...w };
  if (error === undefined) delete next.checkError;
  else next.checkError = error;
  return next;
}

/**
 * What a waker does now. A session whose holder owns the open tick is answered `tick`: its launcher's `due` found the
 * work, and settling the waits it acts on may have used up every other reason.
 */
export function decideDue(s: State, c: Contract, now: Date, seen: DueInput): Step<"tick" | "sleep" | "backoff" | "finished"> {
  if (s.status !== "active") return { answer: "finished", next: s, events: [] };
  const unmet = unmetIds(s);
  if (Date.parse(c.deadline) <= now.getTime()) {
    const reason = `deadline ${c.deadline} passed; unmet: ${unmet.length === 0 ? "none" : unmet.join(", ")}`;
    return { answer: "finished", next: { ...s, status: "not_done", reason }, events: [] };
  }
  if (s.backoffUntil !== undefined && Date.parse(s.backoffUntil) > now.getTime()) return { answer: "backoff", next: s, events: [] };
  const events: Draft[] = [];
  const waits: Wait[] = [];
  let ended: Wait | undefined;
  for (const w of s.waits) {
    if (w.outcome !== undefined) {
      waits.push(w);
      continue;
    }
    const got = seen.results[w.id];
    let r = got?.result ?? "pending";
    if (r === "resolved" && w.command !== undefined && w.approval?.exitCode !== 0) r = "pending";
    const outcome = r !== "pending" ? r : Date.parse(w.deadline) <= now.getTime() ? "expired" : undefined;
    const checked = withCheckError(w, got?.error);
    if (outcome === undefined) {
      waits.push(checked);
      continue;
    }
    events.push({ kind: "wait_settle", data: { id: w.id, outcome, ...(outcome === "expired" ? { onExpiry: w.onExpiry } : {}) } });
    waits.push({ ...checked, outcome, settledAt: now.toISOString() });
    if (outcome === "expired" && w.onExpiry === "not_done") ended ??= w;
  }
  const next: State = { ...s, waits };
  if (ended !== undefined) return { answer: "finished", next: { ...next, status: "not_done", reason: `wait ${ended.id} expired: ${ended.what}` }, events };
  const open = openWaits(next);
  const unblocked = unmet.some((id) => !open.some((w) => w.blocks.includes(id)));
  const own = s.tick !== undefined && s.tick.endedAt === undefined && s.tick.holder === seen.holder;
  const work = own || events.length > 0 || seen.inboxPending || unmet.length === 0 || unblocked;
  return { answer: work ? "tick" : "sleep", next, events };
}

// ---------------------------------------------------------------- tick end, finish and reopen

const asText = (v: unknown): string => (typeof v === "string" ? v : "");

/** A failure reason with what changes from run to run (times, ids, numbers) masked, so a repeat is recognized. */
export function normalizeFailure(reason: string): string {
  return reason
    .toLowerCase()
    .replace(/\d{4}-\d{2}-\d{2}t\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:z|[+-]\d{2}:?\d{2})?/g, "#")
    .replace(/\b(?=[0-9a-f]*\d)[0-9a-f]{7,}\b/g, "#")
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The liveness rules, run once per tick. `tickEvents` are the events since the previous tick ended, so a wait that
 * `due` resolved between ticks counts for the tick that acts on it. Ending a tick twice repeats the first answer.
 */
export function decideTickEnd(s: State, c: Contract, now: Date, tickEvents: JournalEvent[]): Step<TickAnswer> {
  const t = s.tick;
  if (t === undefined) throw new Refusal("no tick to end; claim one first");
  if (t.endedAt !== undefined) return { answer: t.answer ?? "continue", next: s, events: [] };
  const progress = tickEvents.some((e) =>
    (e.kind === "verdict" && e.data["result"] === "met") || e.kind === "progress" || (e.kind === "wait_settle" && e.data["outcome"] === "resolved"));
  let sinceProgress = progress ? 0 : s.counters.sinceProgress + 1;
  let nudges = progress ? 0 : s.counters.nudges;
  const why: string[] = [];
  if (sinceProgress >= c.limits.stallTicks) why.push(`no progress for ${sinceProgress} ticks`);
  const keys = [...new Set(tickEvents
    .filter((e) => e.kind === "verdict" && e.data["result"] === "not_met")
    .map((e) => `${asText(e.data["criterion"])}:${normalizeFailure(asText(e.data["why"]))}`))];
  const repeated = keys.filter((k) => s.counters.lastFailureKeys.includes(k));
  if (repeated.length > 0) why.push(`the same failure again: ${repeated.join("; ")}`);
  const events: Draft[] = [];
  if (why.length > 0) {
    nudges += 1;
    sinceProgress = 0;
    events.push({ kind: "nudge", data: { nudges, why: why.join("; ") } });
  }
  const counters: Counters = { ...s.counters, sinceProgress, nudges, lastFailureKeys: keys };
  const stalled = nudges > c.limits.maxNudges;
  const answer: TickAnswer = stalled ? "stalled" : why.length > 0 ? "nudge" : "continue";
  const next: State = { ...s, counters, tick: { ...t, endedAt: now.toISOString(), answer } };
  if (stalled) return { answer, next: { ...next, status: "not_done", reason: `stalled: no progress after ${c.limits.maxNudges} nudges` }, events };
  return { answer, next, events };
}

/** Why `finish done` is refused, or null: every verdict met, at HEAD, on committed work. */
export function decideFinishDone(s: State, headSha: string, dirty: string[]): string | null {
  const all = Object.entries(s.criteria);
  for (const [id, st] of all) if (st.verdict?.result !== "met") return `criterion ${id} has no met verdict`;
  for (const [id, st] of all) {
    if (st.verdict !== undefined && st.verdict.sha !== headSha) return `verdict for ${id} was recorded at ${st.verdict.sha.slice(0, 7)}, HEAD is ${headSha.slice(0, 7)}`;
  }
  for (const [id, st] of all) if (st.verdict?.dirty === true) return `verdict for ${id} was recorded on uncommitted changes`;
  if (dirty.length > 0) return `worktree has uncommitted changes: ${dirty.join(", ")}`;
  return null;
}

/** Adds the end of a run to a step that moved the status off active: the open tick ends `finished`, and `finish` is journaled. */
export function withFinish<A>(step: Step<A>, before: State, now: Date): Step<A> {
  const s = step.next;
  if (before.status !== "active" || s.status === "active") return step;
  const answer: TickAnswer = "finished";
  const next: State = s.tick !== undefined && s.tick.endedAt === undefined ? { ...s, tick: { ...s.tick, endedAt: now.toISOString(), answer } } : s;
  const data = { status: s.status, ...(s.reason === undefined ? {} : { reason: s.reason }) };
  return { ...step, next, events: [...step.events, { kind: "finish", data }] };
}

/** The human's reopen: the contract's current sha becomes the approved one. A changed contract re-opens every criterion. */
export function decideReopen(s: State, c: Contract, sha: string, now: Date): Step<"reopened" | "unchanged"> {
  if (s.status === "active" && s.contractSha === sha) return { answer: "unchanged", next: s, events: [] };
  if (Date.parse(c.deadline) <= now.getTime()) throw new Refusal(`the contract's deadline ${c.deadline} has passed; set a later deadline in contract.md first`);
  const changed = s.contractSha !== sha;
  const criteria: Record<string, CriterionState> = {};
  for (const cr of c.criteria) criteria[cr.id] = changed ? { status: "unmet" } : (s.criteria[cr.id] ?? { status: "unmet" });
  const next: State = {
    ...s, contractSha: sha, status: "active", criteria,
    counters: { sinceProgress: 0, nudges: 0, deadInARow: 0, lastFailureKeys: [], backoffStep: 0 },
  };
  delete next.reason;
  return { answer: "reopened", next, events: [{ kind: "reopen", data: { contractSha: sha, criteriaReset: changed } }] };
}

// ---------------------------------------------------------------- backoff and notify

const BACKOFF_BASE_MS = 30 * 60_000;
const BACKOFF_MAX_MS = 6 * 3_600_000;

/** 30 min × 2^step, at most 6 h. A backoff still active is kept as it is. */
export function nextBackoff(s: State, now: Date): { until: Date; step: number } {
  if (s.backoffUntil !== undefined && Date.parse(s.backoffUntil) > now.getTime()) return { until: new Date(s.backoffUntil), step: s.counters.backoffStep };
  const ms = Math.min(BACKOFF_BASE_MS * 2 ** s.counters.backoffStep, BACKOFF_MAX_MS);
  return { until: new Date(now.getTime() + ms), step: s.counters.backoffStep + 1 };
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** How far `zone`'s wall clock is ahead of UTC at `instant`, in ms; null for an unknown zone. */
function zoneOffset(instant: number, zone: string): number | null {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
    }).formatToParts(instant);
  } catch {
    return null; // RangeError: not a time zone
  }
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return wall - Math.floor(instant / 1000) * 1000;
}

/** The instant at which `zone`'s wall clock reads y-mo-d h:mi. */
function zonedTime(y: number, mo: number, d: number, h: number, mi: number, zone: string): number | null {
  const guess = Date.UTC(y, mo, d, h, mi);
  const first = zoneOffset(guess, zone);
  if (first === null) return null;
  const second = zoneOffset(guess - first, zone);
  return second === null ? null : guess - second;
}

/** The time in a usage-limit message: "resets Nov 25 at 1pm (Asia/Saigon)" or "resets 3pm (America/New_York)". */
export function parseResetText(text: string, now: Date): Date | null {
  const m = /resets\s+(?:([a-z]{3})[a-z]*\.?\s+(\d{1,2})\s+at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?:\s*\(([^)]+)\))?/i.exec(text);
  if (m === null) return null;
  const [, mon, day, hourText, minuteText, ampm, zoneText] = m;
  const zone = zoneText ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  let h = Number(hourText);
  if (ampm !== undefined) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (ampm.toLowerCase() === "pm" ? 12 : 0);
  } else if (h > 23) return null;
  const mi = minuteText === undefined ? 0 : Number(minuteText);
  if (mi > 59) return null;
  const offset = zoneOffset(now.getTime(), zone);
  if (offset === null) return null;
  const local = new Date(now.getTime() + offset); // its UTC fields read the zone's wall clock now
  const candidates: (number | null)[] = [];
  if (mon !== undefined && day !== undefined) {
    const mo = MONTHS.indexOf(mon.toLowerCase());
    if (mo < 0) return null;
    // The message names no year: take the year that puts the reset nearest to now (Dec 30 → "Jan 2" is next year).
    for (const y of [local.getUTCFullYear() - 1, local.getUTCFullYear(), local.getUTCFullYear() + 1]) candidates.push(zonedTime(y, mo, Number(day), h, mi, zone));
  } else {
    for (const add of [0, 1]) candidates.push(zonedTime(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + add, h, mi, zone));
  }
  const times = candidates.filter((t): t is number => t !== null);
  const pick = mon === undefined
    ? times.find((t) => t > now.getTime())
    : times.sort((a, b) => Math.abs(a - now.getTime()) - Math.abs(b - now.getTime()))[0];
  return pick === undefined ? null : new Date(pick);
}

export function notifyArgv(c: Contract, message: string): string[] {
  return c.notify.map((part) => (part === "{message}" ? message : part));
}

// ---------------------------------------------------------------- the tick session and the wakers

/** The skill a waker's prompt names: `/aio-longrun:aio-longrun tick <record>`. */
export const SKILL_COMMAND = "/aio-longrun:aio-longrun";

export const shellQuote = (v: string): string => `'${v.replaceAll("'", "'\\''")}'`;

/** The record commands a tick runs. Each gets its own rule, pinned to the record; the human's commands get none. */
export const TICK_COMMANDS = ["status", "due", "claim", "renew", "release", "tick-end", "verdict", "progress", "log", "lesson add",
  "lesson list", "lesson supersede", "handoff set", "inbox take", "wait add", "wait list", "finish"] as const satisfies readonly string[];

/**
 * The rules a tick gets on top of the contract's: its record commands, the procedure's git commands (merging covers
 * the base branch and the workers' worktree branches), the run branch push, and the draft PR commands.
 */
export function tickRules(c: Contract, s: State, recordDir: string): string[] {
  const longrun = TICK_COMMANDS.map((cmd) => `Bash(bun ${recordDir}/.bin/longrun.ts ${cmd} ${recordDir}:*)`);
  const git = ["Bash(git status:*)", "Bash(git log --oneline -10)", "Bash(git add:*)", "Bash(git commit -m:*)", "Bash(git rev-parse HEAD)",
    `Bash(git fetch origin ${c.base})`, "Bash(git merge:*)"];
  const push = c.effects.pushRunBranch ? [`Bash(git push origin ${s.branch})`] : [];
  const pr = c.effects.draftPr ? ["Bash(gh pr create --draft:*)", "Bash(gh pr view:*)", "Bash(gh pr comment:*)", "Bash(gh pr checks:*)"] : [];
  return [...longrun, ...git, ...push, ...pr];
}

/**
 * Denied in every tick, whatever the contract allows: git options that run a program or reach another repository,
 * and merging a PR. A trailing `*` with no space before it also matches `--git-dir=<path>`.
 */
export const TICK_DENIED = ["Bash(git -c:*)", "Bash(git -C:*)", "Bash(git --config-env*)", "Bash(git --work-tree*)", "Bash(git --git-dir*)",
  "Bash(gh pr merge:*)"];

/** Claude Code settings for a tick: an isolated subagent's worktree branches from the run branch, not from origin's default. */
export const TICK_SETTINGS = JSON.stringify({ worktree: { baseRef: "head" } });

/** What every tick is told the human approved: the one branch it may commit to (and push), and nothing else. */
export function authorizationLine(c: Contract, s: State): string {
  const parts = [`The human approved run contract ${s.runId} on ${c.approvedAt}. In worktree ${s.worktree}, committing on branch ${s.branch} is authorized`];
  if (c.effects.pushRunBranch) parts.push("pushing that branch to origin is authorized (never force, never another branch)");
  if (c.effects.draftPr) parts.push("opening or updating its draft pull request and commenting on it are authorized");
  return `${parts.join("; ")}. Nothing else that leaves this machine is authorized.`;
}

/** The `claude -p` command of a tick, and of the dry run's status session. The variadic flags come last. */
export function tickArgv(c: Contract, s: State, recordDir: string, o: { claudeBin: string; prompt: string; pluginDir?: string; model?: string; readRule?: string }): string[] {
  const budget = c.limits.tickBudgetUsd;
  return [
    o.claudeBin, "-p", o.prompt, "--permission-mode", "acceptEdits", "--permission-prompts", "none",
    "--output-format", "json", "--append-system-prompt", authorizationLine(c, s), "--add-dir", `${recordDir}/out`,
    "--settings", TICK_SETTINGS,
    ...(o.pluginDir === undefined ? [] : ["--plugin-dir", o.pluginDir]),
    ...(o.model === undefined ? [] : ["--model", o.model]),
    ...(budget === undefined ? [] : ["--max-budget-usd", String(budget)]),
    "--allowedTools", ...c.allowedTools, ...tickRules(c, s, recordDir), ...(o.readRule === undefined ? [] : [o.readRule]),
    "--disallowedTools", ...c.denied, ...TICK_DENIED,
  ];
}

/** The programs that ticks and named checks start: each `Bash(<program> …)` rule's first word, and each check's argv[0]. */
export function neededPrograms(c: Contract, s: State, recordDir: string): string[] {
  const rules = [...c.allowedTools, ...tickRules(c, s, recordDir)].map((t) => /^Bash\(([^\s:)]+)/.exec(t)?.[1]);
  const checks = Object.values(c.checks).map((n) => n.argv[0]);
  return [...new Set([...rules, ...checks].filter((x): x is string => x !== undefined && x !== ""))];
}

/** A usage limit, in any result. */
const LIMIT = /hit your .*limit/i;
/** What claude prints when a session fails on the provider's side: no usage or credits left, a 429, an overload, a 5xx. */
const PROVIDER = /you.ve reached your|out of (?:extra )?usage|seat type doesn.t include|usage allocation has been disabled|usage limit is set to \$0|requires usage credits|credit balance is too low|overloaded|high load|rate.limit|API Error: (?:429|5\d\d)\b/i;

/** `providerText` is the line that names a usage limit or a provider failure. */
export interface SessionOutcome { isError: boolean; result: string; providerText: string | null; costUsd?: number; why?: string }

/** What a `claude -p --output-format json` session printed: its result, whether it failed, a provider refusal, its cost. */
export function readSession(stdout: string, stderr: string): SessionOutcome {
  let out: unknown;
  try {
    out = JSON.parse(stdout.trim());
  } catch {
    out = undefined; // no result: the session crashed or never started
  }
  const o: Record<string, unknown> = isRecord(out) ? out : {};
  const result = typeof o["result"] === "string" ? o["result"] : "";
  const isError = o["is_error"] !== false;
  const line = [result, stderr].flatMap((t) => t.split("\n")).map((l) => l.trim()).find((l) => LIMIT.test(l) || (isError && PROVIDER.test(l)));
  const providerText = line === undefined ? null : line.slice(0, LESSON_MAX_CHARS);
  const cost = o["total_cost_usd"];
  const subtype = typeof o["subtype"] === "string" ? o["subtype"] : undefined;
  const lastErr = stderr.split("\n").map((l) => l.trim()).filter((l) => l !== "").at(-1);
  const why = (result.split("\n").find((l) => l.trim() !== "") ?? subtype ?? lastErr ?? "no output").slice(0, LESSON_MAX_CHARS);
  return { isError, result, providerText, ...(typeof cost === "number" ? { costUsd: cost } : {}), ...(isError ? { why } : {}) };
}

/**
 * After a launched session exits. A usage limit or a provider failure is a shortage, not a fault: the run backs off
 * until the reset time the text names (else the doubling backoff), and the holder's open tick ends `limit`, which no
 * liveness counter sees. Any other exit resets the backoff step. The wake is journaled last.
 */
export function decideSessionEnd(s: State, now: Date, holder: string, provider: { text: string; resetAt: Date | null } | null, wake: Record<string, unknown>): Step<null> {
  const events: Draft[] = [];
  let next = s;
  if (provider !== null && s.status === "active") {
    const b = provider.resetAt === null ? nextBackoff(s, now) : { until: provider.resetAt, step: s.counters.backoffStep };
    const until = b.until.toISOString();
    next = { ...next, backoffUntil: until, counters: { ...next.counters, backoffStep: b.step } };
    events.push({ kind: "backoff", data: { until, step: b.step } });
    const t = next.tick;
    if (t !== undefined && t.holder === holder && t.endedAt === undefined) {
      next = { ...next, tick: { ...t, endedAt: now.toISOString(), answer: "limit" } };
      events.push({ kind: "tick_end", data: { outcome: `provider: ${provider.text}`, answer: "limit" } });
    }
  } else if (provider === null && s.counters.backoffStep !== 0) {
    next = { ...next, counters: { ...next.counters, backoffStep: 0 } };
  }
  events.push({ kind: "wake", data: wake });
  return { answer: null, next, events };
}

/**
 * The last line of wake.log when the last wake failed before it could journal its `wake` event: the log changed after
 * that event, and does not end on the launcher's `<iso> wake start` line.
 */
export function wakeFailure(log: string, changedAtMs: number, lastWakeAt: string | undefined): string | null {
  const last = log.split("\n").map((l) => l.trim()).filter((l) => l !== "").at(-1);
  if (last === undefined || /^\S+ wake start$/.test(last)) return null;
  if (lastWakeAt !== undefined && changedAtMs <= Date.parse(lastWakeAt)) return null;
  return last;
}

const cronEvery = (m: number): string => (m < 60 ? `*/${m} * * * *` : `0 */${Math.min(23, Math.max(1, Math.round(m / 60)))} * * *`);

/** The command that arms or disarms this run's waker; for launchd, longrun's own `arm` and `disarm`. */
export function wakerCommand(c: Contract, s: State, recordDir: string, action: "arm" | "disarm"): string {
  const wake = `${recordDir}/.bin/longrun-wake.sh`;
  const name = `longrun-${s.runId}`;
  switch (c.waker) {
    case "launchd":
      return `bun ${recordDir}/.bin/longrun.ts ${action} ${recordDir}`;
    case "cron":
      if (action === "disarm") return `crontab -l | grep -vF ${shellQuote(wake)} | crontab -`;
      return `(crontab -l 2>/dev/null; echo ${shellQuote(`${cronEvery(c.cadenceMinutes)} /bin/bash ${wake} ${recordDir} >> ${recordDir}/wake.log 2>&1`)}) | crontab -`;
    case "paseo":
      if (action === "disarm") return `paseo schedule delete <id>, with the id paseo schedule ls shows for ${name}`;
      return `paseo schedule create --every ${c.cadenceMinutes}m --name ${name} --cwd ${s.worktree} ${shellQuote(`${SKILL_COMMAND} tick ${recordDir}\n\n${authorizationLine(c, s)}`)}`;
    case "temporal":
      if (action === "disarm") return `temporal workflow terminate --workflow-id ${name} --reason ${shellQuote(s.status)}`;
      return `start the Temporal workflow ${name} for ${recordDir}, as references/wakers.md shows`;
    case "cloud":
      return "waker cloud is not supported: a Claude cloud routine's session does not load plugins";
  }
}

// ---------------------------------------------------------------- lessons

export const LESSON_KINDS = ["pitfall", "preference", "fact"] as const satisfies readonly Lesson["kind"][];

export function parseLessons(json: string): Lesson[] {
  const parsed = parseJson(json, "lessons.json", 1);
  const d: Decoder = new Decoder("lessons.json", parsed.lines);
  const v = parsed.value;
  if (!Array.isArray(v)) d.fail("", "expected a list");
  return v.map((raw: unknown, i): Lesson => {
    const path = `[${i}]`;
    const o = d.obj(raw, path);
    d.only(o, path, ["id", "kind", "text", "source", "at", "supersededBy"]);
    const l: Lesson = { id: d.str(o, "id", path), kind: d.pick(o, "kind", path, LESSON_KINDS), text: d.str(o, "text", path), source: d.str(o, "source", path), at: d.time(o, "at", path) };
    if (d.has(o, "supersededBy")) l.supersededBy = d.str(o, "supersededBy", path);
    return l;
  });
}

export const activeLessons = (ls: Lesson[]): Lesson[] => ls.filter((l) => l.supersededBy === undefined);

/**
 * Adds a lesson. By hand (`auto` false), more than 300 characters or a 21st active lesson is refused. From a not_met
 * verdict (`auto` true), the text is cut to 300, a repeat of an active pitfall is not added again, and at the cap the
 * oldest active pitfall gives way; with no pitfall to give way, the lesson is skipped with a warning.
 */
export function decideLesson(ls: Lesson[], draft: { kind: Lesson["kind"]; text: string; source: string }, now: Date, auto: boolean): { lessons: Lesson[]; id: string | null; warning: string | null } {
  const body = auto && draft.text.length > LESSON_MAX_CHARS ? `${draft.text.slice(0, LESSON_MAX_CHARS - 1)}…` : draft.text;
  if (body.length > LESSON_MAX_CHARS) throw new Refusal(`a lesson is at most ${LESSON_MAX_CHARS} characters; this one has ${body.length}`);
  const active = activeLessons(ls);
  const same = active.find((l) => (auto ? l.kind === draft.kind && normalizeFailure(l.text) === normalizeFailure(body) : l.text === body));
  if (same !== undefined) return { lessons: ls, id: same.id, warning: null };
  const used = ls.map((l) => /^l(\d+)$/.exec(l.id)?.[1]).map(Number).filter((n) => Number.isInteger(n));
  const id = `l${Math.max(0, ...used) + 1}`;
  const lesson: Lesson = { id, kind: draft.kind, text: body, source: draft.source, at: now.toISOString() };
  if (active.length < LESSONS_MAX_ACTIVE) return { lessons: [...ls, lesson], id, warning: null };
  if (!auto) throw new Refusal(`${LESSONS_MAX_ACTIVE} lessons are active; supersede one first (longrun lesson supersede <record> <id> --by <id>)`);
  const oldest = active.find((l) => l.kind === "pitfall");
  if (oldest === undefined) return { lessons: ls, id: null, warning: `warning: ${LESSONS_MAX_ACTIVE} lessons are active and none is a pitfall; the lesson from ${draft.source} was skipped` };
  return { lessons: [...ls.map((l) => (l.id === oldest.id ? { ...l, supersededBy: id } : l)), lesson], id, warning: null };
}
