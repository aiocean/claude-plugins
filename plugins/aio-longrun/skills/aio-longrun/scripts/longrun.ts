#!/usr/bin/env bun
// longrun: the record CLI of aio-longrun. Every command returns its exit code; only main() exits.
// Exit codes: 0 ok/tick/claimed/continue · 2 refusal · 10 sleep/busy/nudge · 11 backoff · 12 finished/stalled.

import { randomUUID } from "node:crypto";
import {
  chmodSync, closeSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, readSync, realpathSync, rmSync,
  statSync, writeFileSync, writeSync,
} from "node:fs";
import { homedir, tmpdir, userInfo } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { runCheck } from "./checks.ts";
import {
  type CheckOutcome, type Contract, type Draft, type State, type Step, type VerdictRef, type Wait,
  DURATION, Decoder, HANDOFF_MAX_LINES, LESSON_KINDS, RUN_ID, RecordError, Refusal, SKILL_COMMAND, WHO,
  activeLessons, decideClaim, decideDue, decideFinishDone, decideLesson, decideReopen, decideSessionEnd, decideTickEnd, decodeCheck, fenceProblem,
  firstLine, initialState, isStopLine, neededPrograms, nextBackoff, notifyArgv, openWaits, parseContract, parseDuration, parseJson, parseResetText,
  readSession, shellQuote, statusDetail, tickArgv, validateWait, wakeFailure, wakerCommand,
} from "./core.ts";
import { addExclude, createWorktree, mainCheckout, worktreeState } from "./git.ts";
import {
  type Loaded, type Paths, type Updated, append, inboxNotes, journal, load, paths, readLease, readLessons, releaseLease, renewLease, tail,
  takeInbox, tickWindow, tryLease, update, writeAtomic, writeLessons, writeState,
} from "./record.ts";

export interface Ctx {
  now: Date;
  env: Record<string, string | undefined>;
  /** False inside a launched tick: there `launch` disarms after the session, since booting out a job kills it. */
  disarm: boolean;
}
interface Command { usage: string; run: (args: string[], ctx: Ctx) => number | Promise<number> }

function refuseBadArgs<T>(f: () => T): T {
  try {
    return f();
  } catch (e) {
    throw new Refusal(e instanceof Error ? e.message : String(e));
  }
}

function readText(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch (e) {
    throw new Refusal(`cannot read ${path}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

const nonEmpty = (v: string | undefined): string | undefined => (v === "" ? undefined : v);
const lastLine = (text: string): string | undefined => text.split("\n").map((l) => l.trim()).filter((l) => l !== "").at(-1);

function clock(env: Record<string, string | undefined>): Date {
  const fixed = env["LONGRUN_NOW"];
  if (fixed === undefined || fixed === "") return new Date();
  const t = Date.parse(fixed);
  if (Number.isNaN(t)) throw new Refusal(`LONGRUN_NOW is not a time: ${fixed}`);
  return new Date(t);
}

// ---------------------------------------------------------------- init

/** Copies the scripts next to this file into the record, so a waker never points into the versioned plugin cache. */
function pinScripts(bin: string): void {
  const here = import.meta.dir;
  if (resolve(here) === resolve(bin)) return;
  for (const f of readdirSync(here)) {
    if (!f.endsWith(".ts") && f !== "longrun-wake.sh") continue;
    copyFileSync(join(here, f), join(bin, f));
    chmodSync(join(bin, f), 0o755);
  }
}

/** The binaries a waker needs, found now while the human's PATH is in effect. */
function writeEnv(bin: string, pluginDir: string | undefined): void {
  const bun = process.execPath;
  const claude = Bun.which("claude") ?? "";
  const gh = Bun.which("gh") ?? "";
  const git = Bun.which("git") ?? "";
  const found = [bun, claude, gh, git].filter((x) => x !== "").map((x) => dirname(x));
  const dirs = [...new Set([...found, "/usr/bin", "/bin", "/usr/sbin", "/sbin"])];
  const lines = [
    "# Written by longrun init. longrun-wake.sh sources it, so launchd and cron find the same binaries.",
    `export BUN_BIN=${shellQuote(bun)}`,
    `export CLAUDE_BIN=${shellQuote(claude)}`,
    `export GH_BIN=${shellQuote(gh)}`,
    "# claude finds its keychain login through USER; launchd sets it, a bare environment may not.",
    `[[ -n \${USER:-} ]] || export USER=${shellQuote(userInfo().username)}`,
  ];
  if (pluginDir !== undefined) lines.push(`export LONGRUN_PLUGIN_DIR=${shellQuote(pluginDir)}`);
  lines.push(`export PATH=${shellQuote(dirs.join(":"))}`);
  writeFileSync(join(bin, "env.sh"), `${lines.join("\n")}\n`);
  if (claude === "") console.error("warning: claude is not on PATH; set CLAUDE_BIN in .bin/env.sh before arming a waker");
}

function cmdInit(args: string[], ctx: Ctx): number {
  const { values, positionals } = refuseBadArgs(() =>
    parseArgs({ args, allowPositionals: true, options: { contract: { type: "string" }, repo: { type: "string" }, "plugin-dir": { type: "string" } } }),
  );
  const [runId, extra] = positionals;
  if (runId === undefined || extra !== undefined || values.contract === undefined) throw new Refusal(`usage: longrun ${USAGE.init}`);
  if (!RUN_ID.test(runId)) throw new Refusal(`bad run id ${runId}: expected <yyyy-mm-dd>-<slug>, the slug a-z, 0-9 and -, up to 40`);
  const source = readText(values.contract);
  const { contract, sha } = parseContract(source);
  const repo = realpathSync(mainCheckout(resolve(values.repo ?? ".")));
  const dir = join(repo, ".longrun", runId);
  if (/\s/.test(dir)) throw new Refusal(`the record path contains whitespace: ${dir}`);
  const p = paths(dir);
  if (existsSync(p.state)) {
    const { state } = load(p, { allowChangedContract: true });
    if (state.contractSha !== sha) throw new Refusal(`run ${runId} already exists with a different contract: ${dir}`);
    console.log(`already initialized: ${dir}`);
    return 0;
  }
  if (Date.parse(contract.deadline) <= ctx.now.getTime()) throw new Refusal(`the contract's deadline ${contract.deadline} is in the past`);
  if (contract.waker === "cloud") throw new Refusal("waker cloud needs remote mode, which this version does not have");
  const pluginDir = values["plugin-dir"] === undefined ? undefined : realpathSync(resolve(values["plugin-dir"]));

  mkdirSync(p.out, { recursive: true });
  mkdirSync(p.bin, { recursive: true });
  const { branch } = createWorktree(repo, runId, contract.base, p.worktree);
  addExclude(repo, ".longrun/");
  addExclude(repo, ".claude/worktrees/"); // isolated subagents' worktrees, nested in the run's worktree
  pinScripts(p.bin);
  writeEnv(p.bin, pluginDir);
  writeFileSync(p.contract, source);
  if (!existsSync(p.inbox)) writeFileSync(p.inbox, "");
  if (!existsSync(p.handoff)) writeFileSync(p.handoff, "");
  if (!existsSync(p.lessons)) writeFileSync(p.lessons, "[]\n");
  append(p, 0, [{ kind: "init", data: { runId, contractSha: sha, branch, worktree: p.worktree } }], ctx.now);
  writeState(p, initialState(runId, contract, sha, p.worktree, branch)); // last: state.json marks the run as created
  console.log(`initialized ${runId}`);
  console.log(`record:   ${dir}`);
  console.log(`worktree: ${p.worktree} (branch ${branch})`);
  console.log(`next:     env -i HOME="$HOME" /bin/bash ${join(p.bin, "longrun-wake.sh")} ${dir} --dry-run   (the preflight, in launchd's bare environment)`);
  return 0;
}

// ---------------------------------------------------------------- status

function listRuns(ctx: Ctx): number {
  const repo = mainCheckout(resolve("."));
  const root = join(repo, ".longrun");
  const runs = existsSync(root) ? readdirSync(root).filter((d) => existsSync(join(root, d, "state.json"))).sort() : [];
  if (runs.length === 0) {
    console.log(`no runs in ${repo}`);
    return 0;
  }
  for (const id of runs) {
    try {
      console.log(firstLine(load(paths(join(root, id)), { allowChangedContract: true }).state, ctx.now));
    } catch (e) {
      if (!(e instanceof RecordError) && !(e instanceof Refusal)) throw e;
      console.log(`${id}: unreadable (${e.message})`);
    }
  }
  return 0;
}

function cmdStatus(args: string[], ctx: Ctx): number {
  const { values, positionals } = refuseBadArgs(() =>
    parseArgs({ args, allowPositionals: true, options: { brief: { type: "boolean" }, journal: { type: "string" }, json: { type: "boolean" } } }),
  );
  const [record, extra] = positionals;
  if (extra !== undefined) throw new Refusal(`usage: longrun ${USAGE.status}`);
  if (record === undefined) return listRuns(ctx);
  const p = paths(resolve(record));
  const { contract, sha, state } = load(p, { allowChangedContract: true });
  if (values.json === true) {
    console.log(JSON.stringify(state, null, 2));
    return 0;
  }
  console.log(firstLine(state, ctx.now));
  if (values.brief === true) return 0;
  if (sha !== state.contractSha) console.log(`contract.md changed since it was approved; run longrun reopen ${p.dir} in your terminal`);
  const failed = lastWakeFailure(p);
  if (failed !== null) console.log(`last wake failed: ${failed}`);
  for (const line of statusDetail(state, contract)) console.log(line);
  if (values.journal !== undefined) {
    const n = Number(values.journal);
    if (!Number.isInteger(n) || n < 1) throw new Refusal("--journal needs a whole number above 0");
    console.log("journal:");
    for (const e of tail(p, n)) console.log(`  ${JSON.stringify(e)}`);
  }
  return 0;
}

/** wake.log's last line, when the last wake failed before journaling its `wake` event. */
function lastWakeFailure(p: Paths): string | null {
  if (!existsSync(p.wakeLog)) return null;
  const last = journal(p).findLast((e) => e.kind === "wake");
  return wakeFailure(readFileSync(p.wakeLog, "utf8"), statSync(p.wakeLog).mtimeMs, last?.at);
}

// ---------------------------------------------------------------- shared flag readers

/** The record path, and nothing else, as the positionals. */
function recordArg(positionals: string[], usage: string): Paths {
  const [record, extra] = positionals;
  if (record === undefined || extra !== undefined) throw new Refusal(`usage: longrun ${usage}`);
  return paths(resolve(record));
}

/** The record as its real path, which is what permission rules and a LaunchAgent must name (/tmp is /private/tmp). */
function realRecordArg(positionals: string[], usage: string): Paths {
  const p = recordArg(positionals, usage);
  if (!existsSync(p.state)) throw new Refusal(`no run at ${p.dir} (no state.json)`);
  return paths(realpathSync(p.dir));
}

function holderOf(flag: string | undefined, ctx: Ctx, command: string): string {
  const h = flag ?? ctx.env["LONGRUN_HOLDER"];
  if (h === undefined || h === "") throw new Refusal(`${command} needs --holder or LONGRUN_HOLDER`);
  return h;
}

/** Who a record write comes from: --holder, else the launcher's LONGRUN_HOLDER. Neither means the human. */
function writerOf(flag: string | undefined, ctx: Ctx): string | undefined {
  return nonEmpty(flag) ?? nonEmpty(ctx.env["LONGRUN_HOLDER"]);
}

/** update(), refused unless `holder` may write now (fenceProblem). The lease is read under the state lock, with the write. */
function fencedUpdate<A>(p: Paths, ctx: Ctx, holder: string | undefined, decide: (r: Loaded) => Step<A>): Updated<A> {
  return update(p, ctx.now, (r) => {
    const problem = fenceProblem(r.state, readLease(p), holder, ctx.now);
    if (problem !== null) throw new Refusal(problem);
    return decide(r);
  });
}

/** A JSON flag value, decoded with the flag's name in place of a file name. */
function flagJson(flag: string, text: string): { value: unknown; d: Decoder } {
  const parsed = parseJson(text, flag, 1);
  return { value: parsed.value, d: new Decoder(flag, parsed.lines) };
}

// ---------------------------------------------------------------- side effects

/** Runs the contract's notify command. A failing notify warns; it never fails the command that triggered it. */
function notify(c: Contract, message: string): void {
  const argv = notifyArgv(c, message);
  try {
    const r = Bun.spawnSync(argv, { stdin: "ignore", stdout: "ignore", stderr: "pipe", timeout: 30_000 });
    if (!r.success) console.error(`warning: notify failed (exit ${String(r.exitCode)}): ${r.stderr.toString().trim()}`);
  } catch (e) {
    console.error(`warning: notify could not start ${argv[0] ?? "its command"}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Once a run is no longer active, the human is told and the waker stops: launchd is disarmed, any other waker's disarm
 * command is printed. Inside a launched tick (`o.disarm` false) the disarm is left to `launch`, after the session.
 */
function onFinished(p: Paths, c: Contract, s: State, now: Date, o: { disarm: boolean }): void {
  notify(c, firstLine(s, now));
  if (!o.disarm) return;
  if (c.waker !== "launchd") {
    console.log(`disarm the ${c.waker} waker: ${wakerCommand(c, s, p.dir, "disarm")}`);
    return;
  }
  try {
    const done = disarmLaunchd(s);
    if (done !== null) console.log(done);
  } catch (e) {
    console.error(`warning: ${e instanceof Error ? e.message : String(e)}; disarm it with ${wakerCommand(c, s, p.dir, "disarm")}`);
  }
}

/** Every command whose update can end the run calls this afterwards. */
function afterUpdate<A>(r: Updated<A>, p: Paths, ctx: Ctx): void {
  if (r.finished) onFinished(p, r.contract, r.step.next, ctx.now, { disarm: ctx.disarm });
}

interface Terminal { say: (text: string) => void; ask: (prompt: string) => string; close: () => void }

/** The controlling terminal. A Claude Code session has none, so only a human at a terminal can confirm. */
function openTerminal(command: string): Terminal {
  let fd: number;
  try {
    fd = openSync("/dev/tty", "r+");
  } catch {
    throw new Refusal(`${command} needs a terminal`);
  }
  const say = (text: string): void => {
    writeSync(fd, text);
  };
  return {
    say,
    ask(prompt) {
      say(prompt);
      const buf = Buffer.alloc(1024);
      let line = "";
      while (!line.includes("\n")) {
        const n = readSync(fd, buf, 0, buf.length, null);
        if (n <= 0) break;
        line += buf.toString("utf8", 0, n);
      }
      return (line.split("\n")[0] ?? "").trim();
    },
    close() {
      closeSync(fd);
    },
  };
}

// ---------------------------------------------------------------- lease

interface Claimed { answer: "claimed" | "busy" | "finished"; lines: string[] }

/** Takes the lease for `holder`, then opens its tick; a previous tick that never ended is recorded dead. */
function claim(p: Paths, holder: string, ttlMs: number | undefined, ctx: Ctx): Claimed {
  const { contract, state } = load(p, { allowChangedContract: false });
  if (state.status !== "active") return { answer: "finished", lines: [firstLine(state, ctx.now)] };
  if (!existsSync(join(state.worktree, ".git"))) throw new Refusal(`worktree missing at ${state.worktree}`);
  const lease = tryLease(p, holder, ttlMs ?? contract.limits.leaseMinutes * 60_000, ctx.now);
  if (!lease.ok) return { answer: "busy", lines: [`busy: held by ${lease.holder} until ${lease.expiresAt}`] };
  const r = update(p, ctx.now, ({ contract: c, state: s }) => decideClaim(s, c, ctx.now, holder));
  const died = r.step.events.some((e) => e.kind === "dead_tick") ? [`previous tick ${r.before.tick?.n ?? 0} died`] : [];
  if (r.step.answer === "finished") {
    releaseLease(p, holder);
    afterUpdate(r, p, ctx);
    return { answer: "finished", lines: [...died, firstLine(r.step.next, ctx.now)] };
  }
  return { answer: "claimed", lines: [...died, `claimed tick ${r.step.next.tick?.n ?? 0}`] };
}

const CLAIM_EXIT = { claimed: 0, busy: 10, finished: 12 } as const;

function cmdClaim(args: string[], ctx: Ctx): number {
  const { values, positionals } = refuseBadArgs(() =>
    parseArgs({ args, allowPositionals: true, options: { holder: { type: "string" }, ttl: { type: "string" } } }),
  );
  const p = recordArg(positionals, USAGE.claim);
  const holder = holderOf(values.holder, ctx, "claim");
  const r = claim(p, holder, values.ttl === undefined ? undefined : parseDuration(values.ttl), ctx);
  for (const line of r.lines) console.log(line);
  return CLAIM_EXIT[r.answer];
}

function cmdRenew(args: string[], ctx: Ctx): number {
  const { values, positionals } = refuseBadArgs(() =>
    parseArgs({ args, allowPositionals: true, options: { holder: { type: "string" }, ttl: { type: "string" } } }),
  );
  const p = recordArg(positionals, USAGE.renew);
  const holder = holderOf(values.holder, ctx, "renew");
  const { contract } = load(p, { allowChangedContract: false });
  const ttl = values.ttl === undefined ? contract.limits.leaseMinutes * 60_000 : parseDuration(values.ttl);
  if (!renewLease(p, holder, ttl, ctx.now)) {
    const cur = readLease(p);
    const expired = cur !== null && Date.parse(cur.expiresAt) <= ctx.now.getTime() ? " (expired)" : "";
    throw new Refusal(`lease lost: ${cur === null ? "none" : `held by ${cur.holder} until ${cur.expiresAt}${expired}`}`);
  }
  console.log(`renewed until ${new Date(ctx.now.getTime() + ttl).toISOString()}`);
  return 0;
}

function cmdRelease(args: string[], ctx: Ctx): number {
  const { values, positionals } = refuseBadArgs(() =>
    parseArgs({ args, allowPositionals: true, options: { holder: { type: "string" } } }),
  );
  const p = recordArg(positionals, USAGE.release);
  const holder = holderOf(values.holder, ctx, "release");
  if (!existsSync(p.state)) throw new Refusal(`no run at ${p.dir} (no state.json)`);
  const r = releaseLease(p, holder);
  if (r === "other") throw new Refusal(`the lease is held by ${readLease(p)?.holder ?? "a claim still being written"}, not ${holder}`);
  console.log(r === "released" ? "released" : "no lease");
  return 0;
}

// ---------------------------------------------------------------- waits

function parseDeadline(text: string | undefined, now: Date): string {
  if (text === undefined) return "";
  if (DURATION.test(text)) return new Date(now.getTime() + parseDuration(text)).toISOString();
  const t = Date.parse(text);
  if (Number.isNaN(t)) throw new Refusal(`--deadline ${text} is neither an ISO time nor a duration (90s, 30m, 2h, 7d)`);
  if (t <= now.getTime()) throw new Refusal(`--deadline ${text} is already past`);
  return new Date(t).toISOString();
}

function nextWaitId(waits: Wait[]): string {
  const used = waits.map((w) => /^w(\d+)$/.exec(w.id)?.[1]).map(Number).filter((n) => Number.isInteger(n));
  return `w${Math.max(0, ...used) + 1}`;
}

function cmdWaitAdd(args: string[], ctx: Ctx): number {
  const { values, positionals } = refuseBadArgs(() =>
    parseArgs({
      args, allowPositionals: true,
      options: {
        who: { type: "string" }, what: { type: "string" }, check: { type: "string" }, blocks: { type: "string" },
        deadline: { type: "string" }, "on-expiry": { type: "string" }, command: { type: "string" }, sha: { type: "string" },
        holder: { type: "string" },
      },
    }),
  );
  const p = recordArg(positionals, USAGE["wait add"]);
  const who = WHO.find((x) => x === values.who);
  if (who === undefined) throw new Refusal(`--who must be one of ${WHO.join(", ")}`);
  const what = values.what?.trim() ?? "";
  if (what === "") throw new Refusal("--what needs the thing waited for");
  if (values.check === undefined) throw new Refusal(`--check needs a typed check as JSON, e.g. '{"type":"file","path":"out.txt"}'`);
  const c = flagJson("--check", values.check);
  const check = decodeCheck(c.d, c.value, "");
  const blocks = (values.blocks ?? "").split(",").map((b) => b.trim()).filter((b) => b !== "");
  const onExpiry = values["on-expiry"] ?? "notify";
  if (onExpiry !== "not_done" && onExpiry !== "notify") throw new Refusal("--on-expiry must be not_done or notify");
  const w: Omit<Wait, "id" | "createdAt" | "createdTick"> = { who, what, check, blocks, deadline: parseDeadline(values.deadline, ctx.now), onExpiry };
  if (values.command !== undefined) {
    const cmd = flagJson("--command", values.command);
    w.command = cmd.d.strs({ command: cmd.value }, "command", "");
  }
  if (values.sha !== undefined) w.sha = values.sha;

  const r = fencedUpdate(p, ctx, writerOf(values.holder, ctx), ({ contract, state }) => {
    const problem = validateWait(w, contract, state);
    if (problem !== null) throw new Refusal(problem);
    const same = openWaits(state).find((x) => x.who === w.who && x.what === w.what && JSON.stringify(x.check) === JSON.stringify(w.check));
    if (same !== undefined) return { answer: same.id, next: state, events: [] };
    const wait: Wait = { ...w, id: nextWaitId(state.waits), createdAt: ctx.now.toISOString(), createdTick: state.tick?.n ?? 0 };
    const data = { id: wait.id, who, what, check, blocks, deadline: wait.deadline, onExpiry, ...(w.command === undefined ? {} : { command: w.command, sha: w.sha }) };
    return { answer: wait.id, next: { ...state, waits: [...state.waits, wait] }, events: [{ kind: "wait_add", data }] };
  });
  if (r.step.events.length > 0 && who === "human") notify(r.contract, `Waiting on human: ${what}`);
  console.log(r.step.answer);
  return 0;
}

function cmdWaitResolve(args: string[], ctx: Ctx): number {
  const { values, positionals } = refuseBadArgs(() =>
    parseArgs({ args, allowPositionals: true, options: { why: { type: "string" }, holder: { type: "string" } } }),
  );
  const [record, id, extra] = positionals;
  if (record === undefined || id === undefined || extra !== undefined) throw new Refusal(`usage: longrun ${USAGE["wait resolve"]}`);
  const why = values.why?.trim() ?? "";
  if (why === "") throw new Refusal("--why needs what showed the wait resolved");
  const { step } = fencedUpdate(paths(resolve(record)), ctx, writerOf(values.holder, ctx), ({ state }) => {
    const w = state.waits.find((x) => x.id === id);
    if (w === undefined) throw new Refusal(`no wait ${id}`);
    if (w.command !== undefined) throw new Refusal(`only longrun approve settles ${id}`);
    if (w.outcome === "resolved") return { answer: `${id} already resolved`, next: state, events: [] };
    if (w.outcome !== undefined) throw new Refusal(`wait ${id} is already settled: ${w.outcome}`);
    if (w.who === "human") throw new Refusal(`wait ${id} is the human's: only its ${w.check.type} check settles it`);
    const waits = state.waits.map((x): Wait => (x.id === id ? { ...x, outcome: "resolved", settledAt: ctx.now.toISOString(), why } : x));
    return { answer: `${id} resolved`, next: { ...state, waits }, events: [{ kind: "wait_settle", data: { id, outcome: "resolved", why } }] };
  });
  console.log(step.answer);
  return 0;
}

function waitLine(w: Wait): string {
  const settled = w.settledAt === undefined ? "" : `; settled ${w.settledAt}`;
  const why = w.why === undefined ? "" : `; ${w.why}`;
  const error = w.checkError === undefined ? "" : `; check error: ${w.checkError}`;
  return `${w.id} ${w.outcome ?? "open"} ${w.who}: ${w.what} (blocks ${w.blocks.join(", ")}; deadline ${w.deadline}${settled}${why}; check ${JSON.stringify(w.check)}${error})`;
}

function cmdWaitList(args: string[]): number {
  const { positionals } = refuseBadArgs(() => parseArgs({ args, allowPositionals: true, options: {} }));
  const { state } = load(recordArg(positionals, USAGE["wait list"]), { allowChangedContract: false });
  if (state.waits.length === 0) console.log("no waits");
  for (const w of state.waits) console.log(waitLine(w));
  return 0;
}

// ---------------------------------------------------------------- due and tick-end

const DUE_EXIT = { tick: 0, sleep: 10, backoff: 11, finished: 12 } as const;

/** Takes the human's notes into the journal. A line that is exactly `stop` ends an active run. */
function takeInboxStep(p: Paths, state: State): Step<string[]> {
  const notes = takeInbox(p);
  if (notes.length === 0) return { answer: notes, next: state, events: [] };
  const events: Draft[] = [{ kind: "inbox", data: { notes } }];
  if (state.status === "active" && notes.some(isStopLine)) {
    return { answer: notes, next: { ...state, status: "not_done", reason: "stopped by the human" }, events };
  }
  return { answer: notes, next: state, events };
}

/** The human's `stop`, the open waits' checks, then whether a tick has work. A stop ends the run before any session. */
async function due(p: Paths, ctx: Ctx): Promise<keyof typeof DUE_EXIT> {
  const snap = load(p, { allowChangedContract: false });
  if (snap.state.status === "active" && inboxNotes(p).some(isStopLine)) {
    const stopped = update(p, ctx.now, ({ state }) => takeInboxStep(p, state));
    afterUpdate(stopped, p, ctx);
    if (stopped.step.next.status !== "active") return "finished";
  }
  // Finished and backoff answers do not depend on any check, so a waiting-out run costs no check at all.
  const early = decideDue(snap.state, snap.contract, ctx.now, { results: {}, inboxPending: false }).answer;
  const results: Record<string, CheckOutcome> = {};
  if (early !== "finished" && early !== "backoff") {
    const open = openWaits(snap.state);
    const gh = nonEmpty(ctx.env["GH_BIN"]) ?? "gh";
    const got = await Promise.all(open.map((wait) => runCheck(wait.check, { c: snap.contract, s: snap.state, p, wait, now: ctx.now, gh })));
    open.forEach((w, i) => {
      const g = got[i];
      if (g !== undefined) results[w.id] = g;
    });
  }
  const seen = { results, inboxPending: inboxNotes(p).length > 0 };
  const holder = nonEmpty(ctx.env["LONGRUN_HOLDER"]);
  const r = update(p, ctx.now, ({ contract, state }) => decideDue(state, contract, ctx.now, holder === undefined ? seen : { ...seen, holder }));
  for (const e of r.step.events) {
    if (e.kind !== "wait_settle" || e.data["outcome"] !== "expired" || e.data["onExpiry"] !== "notify") continue;
    const w = r.step.next.waits.find((x) => x.id === e.data["id"]);
    if (w !== undefined) notify(r.contract, `${r.step.next.runId}: wait ${w.id} expired: ${w.what}`);
  }
  afterUpdate(r, p, ctx);
  return r.step.answer;
}

async function cmdDue(args: string[], ctx: Ctx): Promise<number> {
  const { positionals } = refuseBadArgs(() => parseArgs({ args, allowPositionals: true, options: {} }));
  const answer = await due(recordArg(positionals, USAGE.due), ctx);
  console.log(answer);
  return DUE_EXIT[answer];
}

const TICK_EXIT = { continue: 0, nudge: 10, limit: 11, stalled: 12, finished: 12 } as const;

/** Applies the liveness rules, then ends the open tick: continue 0, nudge 10, stalled 12. */
function cmdTickEnd(args: string[], ctx: Ctx): number {
  const { values, positionals } = refuseBadArgs(() =>
    parseArgs({ args, allowPositionals: true, options: { outcome: { type: "string" }, holder: { type: "string" } } }),
  );
  const p = recordArg(positionals, USAGE["tick-end"]);
  const outcome = values.outcome?.trim() ?? "";
  if (outcome === "") throw new Refusal("--outcome needs what this tick did");
  const r = fencedUpdate(p, ctx, writerOf(values.holder, ctx), ({ contract, state }) => {
    const step = decideTickEnd(state, contract, ctx.now, tickWindow(p, state.tick?.n ?? 0));
    if (step.next === state) return step;
    return { ...step, events: [...step.events, { kind: "tick_end", data: { outcome, answer: step.answer } }] };
  });
  afterUpdate(r, p, ctx);
  const why = r.step.events.find((e) => e.kind === "nudge")?.data["why"];
  console.log(`tick ${r.step.next.tick?.n ?? 0}: ${r.step.answer}${typeof why === "string" ? ` (${why})` : ""}`);
  return TICK_EXIT[r.step.answer];
}

// ---------------------------------------------------------------- verdicts, progress, log

const RESULTS = ["met", "not_met", "untried"] as const;

function cmdVerdict(args: string[], ctx: Ctx): number {
  const { values, positionals } = refuseBadArgs(() =>
    parseArgs({
      args, allowPositionals: true,
      options: { evidence: { type: "string" }, why: { type: "string" }, judge: { type: "string" }, holder: { type: "string" } },
    }),
  );
  const [record, criterion, resultText, extra] = positionals;
  const result = RESULTS.find((x) => x === resultText);
  if (record === undefined || criterion === undefined || result === undefined || extra !== undefined) throw new Refusal(`usage: longrun ${USAGE.verdict}`);
  const evidence = values.evidence?.trim() ?? "";
  const why = values.why?.trim() ?? "";
  const judge = values.judge?.trim() ?? "";
  if (result === "met" && evidence === "") throw new Refusal("a met verdict needs --evidence: the tool output that shows the check passing");
  if (result !== "met" && why === "") throw new Refusal(`a ${result} verdict needs --why`);
  const p = paths(resolve(record));
  const r = fencedUpdate(p, ctx, writerOf(values.holder, ctx), ({ contract, state }) => {
    if (state.status !== "active") throw new Refusal(`run ${state.runId} is finished; it takes no new verdicts`);
    if (!contract.criteria.some((c) => c.id === criterion)) throw new Refusal(`no criterion ${criterion} (the contract has ${contract.criteria.map((c) => c.id).join(", ")})`);
    const wt = worktreeState(state.worktree);
    if (!wt.exists) throw new Refusal(`worktree missing at ${state.worktree}`);
    const id = `v${journal(p).filter((e) => e.kind === "verdict").length + 1}`;
    const verdict: VerdictRef = { id, result, at: ctx.now.toISOString(), sha: wt.headSha, dirty: wt.dirty.length > 0 };
    const next: State = { ...state, criteria: { ...state.criteria, [criterion]: { status: result === "met" ? "met" : "unmet", verdict } } };
    const data = { id, criterion, result, sha: wt.headSha, dirty: verdict.dirty, ...(evidence === "" ? {} : { evidence }), ...(why === "" ? {} : { why }), ...(judge === "" ? {} : { judge }) };
    const events: Draft[] = [{ kind: "verdict", data }];
    let warning: string | null = null;
    if (result === "not_met") {
      const before = readLessons(p);
      const l = decideLesson(before, { kind: "pitfall", text: `${criterion}: ${why}`, source: `verdict:${id}` }, ctx.now, true);
      warning = l.warning;
      if (l.lessons !== before) {
        writeLessons(p, l.lessons);
        events.push({ kind: "lesson", data: { id: l.id, kind: "pitfall", source: `verdict:${id}` } });
      }
    }
    return { answer: { id, sha: wt.headSha, warning }, next, events };
  });
  if (r.step.answer.warning !== null) console.error(r.step.answer.warning);
  console.log(`${r.step.answer.id}: ${criterion} ${result} at ${r.step.answer.sha.slice(0, 7)}`);
  return 0;
}

function journalNote(p: Paths, ctx: Ctx, holder: string | undefined, kind: "progress" | "dispatch" | "effect", what: string): void {
  fencedUpdate(p, ctx, holder, ({ state }) => ({ answer: kind, next: state, events: [{ kind, data: { what } }] }));
}

const WHAT_OPTIONS = { what: { type: "string" }, holder: { type: "string" } } as const;

function cmdProgress(args: string[], ctx: Ctx): number {
  const { values, positionals } = refuseBadArgs(() => parseArgs({ args, allowPositionals: true, options: WHAT_OPTIONS }));
  const p = recordArg(positionals, USAGE.progress);
  const what = values.what?.trim() ?? "";
  if (what === "") throw new Refusal("--what needs the progress made");
  journalNote(p, ctx, writerOf(values.holder, ctx), "progress", what);
  console.log("progress recorded");
  return 0;
}

function cmdLog(args: string[], ctx: Ctx): number {
  const { values, positionals } = refuseBadArgs(() => parseArgs({ args, allowPositionals: true, options: WHAT_OPTIONS }));
  const [record, kindText, extra] = positionals;
  const kind = kindText === "dispatch" || kindText === "effect" ? kindText : undefined;
  if (record === undefined || kind === undefined || extra !== undefined) throw new Refusal(`usage: longrun ${USAGE.log}`);
  const what = values.what?.trim() ?? "";
  if (what === "") throw new Refusal(`--what needs the ${kind} to record`);
  journalNote(paths(resolve(record)), ctx, writerOf(values.holder, ctx), kind, what);
  console.log(`${kind} recorded`);
  return 0;
}

// ---------------------------------------------------------------- lessons, handoff, inbox

function cmdLessonAdd(args: string[], ctx: Ctx): number {
  const { values, positionals } = refuseBadArgs(() =>
    parseArgs({
      args, allowPositionals: true,
      options: { kind: { type: "string" }, text: { type: "string" }, source: { type: "string" }, holder: { type: "string" } },
    }),
  );
  const p = recordArg(positionals, USAGE["lesson add"]);
  const kind = LESSON_KINDS.find((k) => k === values.kind);
  if (kind === undefined) throw new Refusal(`--kind must be one of ${LESSON_KINDS.join(", ")}`);
  const body = values.text?.trim() ?? "";
  const source = values.source?.trim() ?? "";
  if (body === "" || source === "") throw new Refusal("a lesson needs --text and --source");
  const r = fencedUpdate(p, ctx, writerOf(values.holder, ctx), ({ state }) => {
    const before = readLessons(p);
    const l = decideLesson(before, { kind, text: body, source }, ctx.now, false);
    if (l.lessons === before) return { answer: l.id ?? "", next: state, events: [] };
    writeLessons(p, l.lessons);
    return { answer: l.id ?? "", next: state, events: [{ kind: "lesson", data: { id: l.id, kind, source } }] };
  });
  console.log(r.step.answer);
  return 0;
}

function cmdLessonSupersede(args: string[], ctx: Ctx): number {
  const { values, positionals } = refuseBadArgs(() =>
    parseArgs({ args, allowPositionals: true, options: { by: { type: "string" }, holder: { type: "string" } } }),
  );
  const [record, id, extra] = positionals;
  const by = values.by;
  if (record === undefined || id === undefined || by === undefined || extra !== undefined) throw new Refusal(`usage: longrun ${USAGE["lesson supersede"]}`);
  const p = paths(resolve(record));
  const r = fencedUpdate(p, ctx, writerOf(values.holder, ctx), ({ state }) => {
    const ls = readLessons(p);
    const old = ls.find((l) => l.id === id);
    const newer = ls.find((l) => l.id === by);
    if (old === undefined) throw new Refusal(`no lesson ${id}`);
    if (newer === undefined) throw new Refusal(`no lesson ${by}`);
    if (id === by) throw new Refusal("a lesson cannot supersede itself");
    if (old.supersededBy === by) return { answer: `${id} already superseded by ${by}`, next: state, events: [] };
    if (old.supersededBy !== undefined) throw new Refusal(`${id} is already superseded by ${old.supersededBy}`);
    if (newer.supersededBy !== undefined) throw new Refusal(`${by} is itself superseded by ${newer.supersededBy}`);
    writeLessons(p, ls.map((l) => (l.id === id ? { ...l, supersededBy: by } : l)));
    return { answer: `${id} superseded by ${by}`, next: state, events: [{ kind: "lesson", data: { id, supersededBy: by } }] };
  });
  console.log(r.step.answer);
  return 0;
}

function cmdLessonList(args: string[]): number {
  const { positionals } = refuseBadArgs(() => parseArgs({ args, allowPositionals: true, options: {} }));
  const p = recordArg(positionals, USAGE["lesson list"]);
  load(p, { allowChangedContract: false });
  const active = activeLessons(readLessons(p));
  if (active.length === 0) console.log("no active lessons");
  for (const l of active) console.log(`${l.id} ${l.kind}: ${l.text} (from ${l.source})`);
  return 0;
}

const HOLDER_OPTION = { holder: { type: "string" } } as const;

async function cmdHandoffSet(args: string[], ctx: Ctx): Promise<number> {
  const { values, positionals } = refuseBadArgs(() => parseArgs({ args, allowPositionals: true, options: HOLDER_OPTION }));
  const p = recordArg(positionals, USAGE["handoff set"]);
  const body = await Bun.stdin.text();
  const lines = body.trim() === "" ? 0 : body.replace(/\n$/, "").split("\n").length;
  if (lines > HANDOFF_MAX_LINES) throw new Refusal(`the handoff has ${lines} lines; at most ${HANDOFF_MAX_LINES}`);
  fencedUpdate(p, ctx, writerOf(values.holder, ctx), ({ state }) => {
    writeAtomic(p.handoff, lines === 0 ? "" : `${body.replace(/\n$/, "")}\n`);
    return { answer: lines, next: state, events: [{ kind: "handoff", data: { lines } }] };
  });
  console.log(`handoff: ${lines} lines`);
  return 0;
}

/** Prints the human's notes and journals them; a line that is exactly `stop` ends the run (exit 12). */
function cmdInboxTake(args: string[], ctx: Ctx): number {
  const { values, positionals } = refuseBadArgs(() => parseArgs({ args, allowPositionals: true, options: HOLDER_OPTION }));
  const p = recordArg(positionals, USAGE["inbox take"]);
  const r = fencedUpdate(p, ctx, writerOf(values.holder, ctx), ({ state }) => takeInboxStep(p, state));
  afterUpdate(r, p, ctx);
  for (const n of r.step.answer) if (!isStopLine(n)) console.log(n);
  return r.finished ? 12 : 0;
}

// ---------------------------------------------------------------- backoff and finish

function cmdBackoff(args: string[], ctx: Ctx): number {
  const { values, positionals } = refuseBadArgs(() =>
    parseArgs({ args, allowPositionals: true, options: { until: { type: "string" }, "reset-text": { type: "string" }, auto: { type: "boolean" } } }),
  );
  const p = recordArg(positionals, USAGE.backoff);
  if ([values.until !== undefined, values["reset-text"] !== undefined, values.auto === true].filter((x) => x).length !== 1) {
    throw new Refusal(`usage: longrun ${USAGE.backoff}`);
  }
  let fixed: Date | null = null;
  let note = "";
  if (values.until !== undefined) {
    const t = Date.parse(values.until);
    if (Number.isNaN(t)) throw new Refusal(`--until ${values.until} is not an ISO time`);
    fixed = new Date(t);
  }
  if (values["reset-text"] !== undefined) {
    fixed = parseResetText(values["reset-text"], ctx.now);
    if (fixed === null) note = " (the reset text names no time it could read, so this is the doubling backoff)";
  }
  const r = update(p, ctx.now, ({ state }) => {
    if (state.status !== "active") throw new Refusal(`run ${state.runId} is finished`);
    const b = fixed === null ? nextBackoff(state, ctx.now) : { until: fixed, step: state.counters.backoffStep };
    const until = b.until.toISOString();
    if (until === state.backoffUntil && b.step === state.counters.backoffStep) return { answer: until, next: state, events: [] };
    const next: State = { ...state, backoffUntil: until, counters: { ...state.counters, backoffStep: b.step } };
    return { answer: until, next, events: [{ kind: "backoff", data: { until, step: b.step } }] };
  });
  console.log(`backoff until ${r.step.answer}${note}`);
  return 0;
}

function cmdFinish(args: string[], ctx: Ctx): number {
  const { values, positionals } = refuseBadArgs(() =>
    parseArgs({ args, allowPositionals: true, options: { reason: { type: "string" }, holder: { type: "string" } } }),
  );
  const [record, kind, extra] = positionals;
  if (record === undefined || (kind !== "done" && kind !== "not-done") || extra !== undefined) throw new Refusal(`usage: longrun ${USAGE.finish}`);
  const reason = values.reason?.trim() ?? "";
  if (kind === "not-done" && reason === "") throw new Refusal("finish not-done needs --reason: what was tried and what is left");
  const p = paths(resolve(record));
  const r = fencedUpdate(p, ctx, writerOf(values.holder, ctx), ({ state }) => {
    if (state.status !== "active") return { answer: "already finished", next: state, events: [] };
    if (kind === "not-done") return { answer: "not_done", next: { ...state, status: "not_done", reason }, events: [] };
    const wt = worktreeState(state.worktree);
    if (!wt.exists) throw new Refusal(`worktree missing at ${state.worktree}`);
    const problem = decideFinishDone(state, wt.headSha, wt.dirty);
    if (problem !== null) throw new Refusal(problem);
    const next: State = { ...state, status: "done" };
    delete next.reason;
    return { answer: "done", next, events: [] };
  });
  afterUpdate(r, p, ctx);
  console.log(firstLine(r.step.next, ctx.now));
  return 0;
}

// ---------------------------------------------------------------- human only: reopen, approve

function cmdReopen(args: string[], ctx: Ctx): number {
  const { positionals } = refuseBadArgs(() => parseArgs({ args, allowPositionals: true, options: {} }));
  const p = realRecordArg(positionals, USAGE.reopen);
  const tty = openTerminal("reopen");
  try {
    const shown = load(p, { allowChangedContract: true });
    // Run once before asking, so a refusal (a past deadline) comes before the human types anything.
    if (decideReopen(shown.state, shown.contract, shown.sha, ctx.now).answer === "unchanged") {
      console.log(`${shown.state.runId} is active and its contract is unchanged; nothing to reopen`);
      return 0;
    }
    const changed = shown.sha !== shown.state.contractSha;
    tty.say(`${firstLine(shown.state, ctx.now)}\ncontract ${shown.state.contractSha.slice(0, 7)} -> ${shown.sha.slice(0, 7)}${changed ? ": changed, so every criterion re-opens unmet" : ": unchanged"}\n`);
    if (tty.ask(`Type the run id ${shown.state.runId} to reopen it: `) !== shown.state.runId) throw new Refusal("reopen not confirmed; nothing changed");
    const r = update(p, ctx.now, ({ contract, sha, state }) => {
      if (sha !== shown.sha) throw new Refusal("contract.md changed again while you confirmed; run reopen again");
      return decideReopen(state, contract, sha, ctx.now);
    }, { allowChangedContract: true });
    console.log(firstLine(r.step.next, ctx.now));
    const { contract: c } = r;
    const s = r.step.next;
    console.log(c.waker === "launchd" ? armLaunchd(p, c, s) : `arm the ${c.waker} waker again: ${wakerCommand(c, s, p.dir, "arm")}`);
    return 0;
  } finally {
    tty.close();
  }
}

/**
 * A value a tick wrote, for the human's terminal: JSON, so escape sequences and quotes show as text, with the
 * invisible characters that reorder or hide text escaped too (C1 controls, zero-width and bidi marks).
 */
const shown = (v: unknown): string =>
  JSON.stringify(v).replace(/[\u0080-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`);

/** Runs a rung-3 action the run asked for, after the human types the wait id, only at the commit the wait names. */
function cmdApprove(args: string[], ctx: Ctx): number {
  const { positionals } = refuseBadArgs(() => parseArgs({ args, allowPositionals: true, options: {} }));
  const [record, id, extra] = positionals;
  if (record === undefined || id === undefined || extra !== undefined) throw new Refusal(`usage: longrun ${USAGE.approve}`);
  const p = paths(resolve(record));
  const tty = openTerminal("approve");
  try {
    const { state } = load(p, { allowChangedContract: false });
    const w = state.waits.find((x) => x.id === id);
    if (w === undefined) throw new Refusal(`no wait ${id}`);
    const { command, sha } = w;
    if (command === undefined || sha === undefined) throw new Refusal(`wait ${id} has no command to approve`);
    if (w.outcome !== undefined) throw new Refusal(`wait ${id} is already settled: ${w.outcome}`);
    if (w.approval?.exitCode === 0) throw new Refusal(`wait ${id} is already approved`);
    const wt = worktreeState(state.worktree);
    if (!wt.exists) throw new Refusal(`worktree missing at ${state.worktree}`);
    if (wt.headSha !== sha) throw new Refusal(`wait ${id} approves commit ${sha.slice(0, 7)}, but the worktree HEAD is ${wt.headSha.slice(0, 7)}; the run must ask again for the new commit`);
    // the command comes last, next to the prompt, so it is what the human reads before typing
    tty.say(`${state.runId} asks you to run this, for: ${shown(w.what)}\n  in:      ${state.worktree}\n  commit:  ${sha}\n  command: ${shown(command)}\n`);
    if (tty.ask(`Type the wait id ${id} to run it: `) !== id) throw new Refusal("not approved; nothing ran");
    let ran;
    try {
      ran = Bun.spawnSync(command, { cwd: state.worktree, stdin: "inherit", stdout: "inherit", stderr: "inherit" });
    } catch (e) {
      throw new Refusal(`could not start ${command[0] ?? "the command"}: ${e instanceof Error ? e.message : String(e)}`);
    }
    const exitCode = ran.success ? 0 : ran.exitCode || 1;
    update(p, ctx.now, ({ state: s }) => {
      const cur = s.waits.find((x) => x.id === id);
      if (cur === undefined || cur.outcome !== undefined) throw new Refusal(`wait ${id} was settled while the command ran`);
      const waits = s.waits.map((x): Wait => (x.id === id ? { ...x, approval: { at: ctx.now.toISOString(), exitCode } } : x));
      return { answer: exitCode, next: { ...s, waits }, events: [{ kind: "approval", data: { id, sha, exitCode } }] };
    });
    console.log(`${id}: ${shown(command)} exited ${exitCode}${exitCode === 0 ? "; the next due settles the wait" : "; the wait stays open"}`);
    return exitCode === 0 ? 0 : 2;
  } finally {
    tty.close();
  }
}

// ---------------------------------------------------------------- the launchd waker: arm, disarm

const LAUNCHCTL = "/bin/launchctl";
const LAUNCHD_PATH = "/usr/bin:/bin:/usr/sbin:/sbin";
const label = (s: State): string => `dev.aiocean.longrun.${s.runId}`;
const plistFile = (s: State): string => join(homedir(), "Library", "LaunchAgents", `${label(s)}.plist`);
const domain = (): string => `gui/${userInfo().uid}`;
const service = (s: State): string => `${domain()}/${label(s)}`;

function launchctl(args: string[]): { ok: boolean; err: string } {
  const r = Bun.spawnSync([LAUNCHCTL, ...args], { stdin: "ignore", stdout: "ignore", stderr: "pipe", timeout: 60_000 });
  return { ok: r.success, err: r.stderr.toString().trim() };
}

const xml = (v: string): string => v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function plist(p: Paths, c: Contract, s: State): string {
  const str = (v: string): string => `<string>${xml(v)}</string>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>${str(label(s))}
  <key>ProgramArguments</key>
  <array>${str("/bin/bash")}${str(join(p.bin, "longrun-wake.sh"))}${str(p.dir)}</array>
  <key>StartInterval</key><integer>${Math.round(c.cadenceMinutes * 60)}</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key>${str(p.wakeLog)}
  <key>StandardErrorPath</key>${str(p.wakeLog)}
</dict>
</plist>
`;
}

/** Writes the run's LaunchAgent and loads it, booting out a loaded one first. RunAtLoad wakes the run at once. */
function armLaunchd(p: Paths, c: Contract, s: State): string {
  const file = plistFile(s);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, plist(p, c, s));
  if (launchctl(["print", service(s)]).ok) {
    const out = launchctl(["bootout", service(s)]);
    if (!out.ok) throw new Refusal(`launchctl bootout ${service(s)}: ${out.err}`);
  }
  const r = launchctl(["bootstrap", domain(), file]);
  if (!r.ok) throw new Refusal(`launchctl bootstrap ${domain()} ${file}: ${r.err}`);
  return `armed ${label(s)}: a wake now, then every ${c.cadenceMinutes} min (${file})`;
}

/** Deletes the LaunchAgent, then unloads it. Null when nothing was loaded. */
function disarmLaunchd(s: State): string | null {
  rmSync(plistFile(s), { force: true });
  if (!launchctl(["print", service(s)]).ok) return null;
  const r = launchctl(["bootout", service(s)]);
  if (!r.ok) throw new Refusal(`launchctl bootout ${service(s)}: ${r.err}`);
  return `disarmed ${label(s)}`;
}

function cmdArm(args: string[], ctx: Ctx): number {
  const { positionals } = refuseBadArgs(() => parseArgs({ args, allowPositionals: true, options: {} }));
  const p = realRecordArg(positionals, USAGE.arm);
  const { contract: c, state: s } = load(p, { allowChangedContract: false });
  if (c.waker !== "launchd") throw new Refusal(`arm drives launchd; this run's waker is ${c.waker}: ${wakerCommand(c, s, p.dir, "arm")}`);
  if (s.status !== "active") throw new Refusal(`${firstLine(s, ctx.now)}; a finished run is not armed (longrun reopen re-arms it)`);
  console.log(armLaunchd(p, c, s));
  return 0;
}

function cmdDisarm(args: string[]): number {
  const { positionals } = refuseBadArgs(() => parseArgs({ args, allowPositionals: true, options: {} }));
  const p = realRecordArg(positionals, USAGE.disarm);
  const { contract: c, state: s } = load(p, { allowChangedContract: true });
  if (c.waker !== "launchd") throw new Refusal(`disarm drives launchd; this run's waker is ${c.waker}: ${wakerCommand(c, s, p.dir, "disarm")}`);
  console.log(disarmLaunchd(s) ?? `not armed: ${label(s)} is not loaded`);
  return 0;
}

// ---------------------------------------------------------------- launch: one wake of a local waker

const WATCHDOG_MS = 60_000;
const STOP_GRACE_MS = 10_000;
const DRY_RUN_TIMEOUT_MS = 300_000;

/** Task 1 fact 3: reads outside the working directories need a rule, and `//` starts an absolute path in one. */
const readRule = (p: Paths): string => `Read(/${p.dir}/**)`;

interface SessionEnd { exitCode: number | null; stdout: string; stderr: string; durationMs: number; stopped: string | null }

function spawnInto(argv: string[], cwd: string, env: Record<string, string | undefined>, out: number, err: number): Bun.Subprocess {
  try {
    return Bun.spawn(argv, { cwd, env, detached: true, stdin: "ignore", stdout: out, stderr: err });
  } finally {
    closeSync(out); // the child has its own copies
    closeSync(err);
  }
}

/**
 * Runs a session in its own process group, its output in files, so nothing it leaves running can hold a pipe open.
 * Every `everyMs`, `stop` may give a reason to end it: SIGTERM to the group, then SIGKILL 10 s later. Once the session
 * exits, whatever it left running in its group gets SIGTERM.
 */
async function runSession(argv: string[], cwd: string, env: Record<string, string | undefined>, everyMs: number, stop: () => string | null): Promise<SessionEnd> {
  const dir = mkdtempSync(join(tmpdir(), "longrun-session-"));
  try {
    const outFile = join(dir, "stdout");
    const errFile = join(dir, "stderr");
    const t0 = Date.now();
    const proc = spawnInto(argv, cwd, env, openSync(outFile, "w"), openSync(errFile, "w"));
    const group = (signal: "SIGTERM" | "SIGKILL"): void => {
      try {
        process.kill(-proc.pid, signal);
      } catch {
        // ESRCH: nothing is left in the group
      }
    };
    let stopped: string | null = null;
    let wait = everyMs;
    while ((await Promise.race([proc.exited, Bun.sleep(wait).then(() => null)])) === null) {
      if (stopped !== null) {
        group("SIGKILL");
        continue;
      }
      stopped = stop();
      if (stopped === null) continue;
      group("SIGTERM");
      wait = STOP_GRACE_MS;
    }
    group("SIGTERM");
    const exitCode = proc.signalCode === null ? proc.exitCode : null;
    return { exitCode, stdout: readFileSync(outFile, "utf8"), stderr: readFileSync(errFile, "utf8"), durationMs: Date.now() - t0, stopped };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Why a launched session must stop: its holder no longer holds an unexpired lease. */
function leaseLost(p: Paths, holder: string, now: Date): string | null {
  const l = readLease(p);
  if (l === null) return "the lease was released";
  if (l.holder !== holder) return `the lease is held by ${l.holder}`;
  return Date.parse(l.expiresAt) <= now.getTime() ? `the lease expired at ${l.expiresAt}` : null;
}

/** launch's last step: a run no longer active stops its launchd job. Only a failure prints, so wake.log shows it. */
function disarmIfFinished(c: Contract, s: State): void {
  if (s.status === "active" || c.waker !== "launchd") return;
  try {
    disarmLaunchd(s);
  } catch (e) {
    console.error(`disarm failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** A wake that started no session: journaled, then a finished run is disarmed. */
function endWake(p: Paths, now: Date, answer: string): number {
  const r = update(p, now, ({ state }) => ({ answer: null, next: state, events: [{ kind: "wake", data: { answer } }] }));
  disarmIfFinished(r.contract, r.step.next);
  return 0;
}

/**
 * One wake: `due`, `claim`, then the tick session from the worktree under a lease watchdog; afterwards a usage limit
 * or a provider failure backs off, the lease is released and the wake journaled. On success it prints nothing:
 * wake.log keeps failures.
 */
async function cmdLaunch(args: string[], ctx: Ctx): Promise<number> {
  const { values, positionals } = refuseBadArgs(() =>
    parseArgs({ args, allowPositionals: true, options: { "dry-run": { type: "boolean" }, claude: { type: "string" } } }),
  );
  const p = realRecordArg(positionals, USAGE.launch);
  const claudeBin = values.claude ?? nonEmpty(ctx.env["CLAUDE_BIN"]);
  const pluginDir = nonEmpty(ctx.env["LONGRUN_PLUGIN_DIR"]);
  if (values["dry-run"] === true) return dryRun(p, ctx, claudeBin, pluginDir);

  const inner: Ctx = { ...ctx, disarm: false }; // booting out the job would kill this process: launch disarms last
  const answer = await due(p, inner);
  if (answer !== "tick") return endWake(p, ctx.now, answer);
  if (claudeBin === undefined || Bun.which(claudeBin) === null) {
    throw new Refusal(`launch needs claude: set CLAUDE_BIN in ${p.bin}/env.sh or pass --claude (${claudeBin ?? "CLAUDE_BIN is empty"} is not executable)`);
  }
  const holder = `launch-${process.pid}-${randomUUID().slice(0, 8)}`; // a reused pid must not adopt a dead launch's tick
  const claimed = claim(p, holder, undefined, inner);
  if (claimed.answer !== "claimed") return endWake(p, ctx.now, claimed.answer);

  const { contract: c, state: s } = load(p, { allowChangedContract: false });
  const argv = tickArgv(c, s, p.dir, { claudeBin, prompt: `${SKILL_COMMAND} tick ${p.dir}`, pluginDir, readRule: readRule(p) });
  const t0 = Date.now();
  const now = (): Date => new Date(ctx.now.getTime() + Date.now() - t0); // a LONGRUN_NOW clock moves on with the wall clock
  const end = await runSession(argv, s.worktree, { ...ctx.env, LONGRUN_HOLDER: holder }, WATCHDOG_MS, () => leaseLost(p, holder, now()));
  const out = readSession(end.stdout, end.stderr);
  const at = now();
  const provider = out.providerText === null ? null : { text: out.providerText, resetAt: parseResetText(out.providerText, at) };
  const wake = {
    answer: "tick", exitCode: end.exitCode, durationMs: end.durationMs, isError: out.isError, limit: provider !== null,
    ...(out.costUsd === undefined ? {} : { costUsd: out.costUsd }),
    ...(out.why === undefined ? {} : { why: out.why }),
    ...(end.stopped === null ? {} : { watchdog: end.stopped }),
  };
  const r = update(p, at, ({ state }) => decideSessionEnd(state, at, holder, provider, wake));
  releaseLease(p, holder); // a tick the session left open is recorded dead by the next claim
  disarmIfFinished(r.contract, r.step.next);
  return 0;
}

type Probe = { ok: true; detail: string } | { ok: false; why: string };

/** The PATH a waker's process runs with: env.sh sourced over launchd's minimal PATH. */
function wakerPath(p: Paths): { PATH: string; problem: string | null } {
  const file = join(p.bin, "env.sh");
  const r = Bun.spawnSync(["/bin/bash", "-c", '. "$1" && printf %s "$PATH"', "longrun", file], {
    env: { HOME: homedir(), PATH: LAUNCHD_PATH }, stdin: "ignore", stdout: "pipe", stderr: "pipe", timeout: 10_000,
  });
  if (r.success) return { PATH: r.stdout.toString(), problem: null };
  return { PATH: LAUNCHD_PATH, problem: `cannot source ${file}: ${lastLine(r.stderr.toString()) ?? "no output"}` };
}

/** Runs one preflight command, its program found on the waker's PATH. */
function probe(program: string, args: string[], cwd: string, env: Record<string, string | undefined>, timeoutMs: number, detail: string): Probe {
  const PATH = env["PATH"] ?? LAUNCHD_PATH;
  const bin = Bun.which(program, { PATH, cwd });
  if (bin === null) return { ok: false, why: `${program} is not on the waker's PATH (${PATH})` };
  const r = Bun.spawnSync([bin, ...args], { cwd, env, stdin: "ignore", stdout: "pipe", stderr: "pipe", timeout: timeoutMs });
  if (r.success) return { ok: true, detail };
  // git ends on advice ("and the repository exists."); its first fatal: or error: line says what is wrong
  const err = r.stderr.toString();
  const fatal = err.split("\n").map((l) => l.trim()).find((l) => /^(fatal|error):/i.test(l));
  const why = fatal ?? lastLine(err) ?? lastLine(r.stdout.toString()) ?? `failed with no output (limit ${timeoutMs / 1000} s)`;
  return { ok: false, why: `${[program, ...args].join(" ")}: ${why}` };
}

async function claudeProbe(p: Paths, c: Contract, s: State, ctx: Ctx, claudeBin: string | undefined, pluginDir: string | undefined, PATH: string): Promise<Probe> {
  const bin = claudeBin === undefined ? null : Bun.which(claudeBin, { PATH, cwd: s.worktree });
  if (bin === null) return { ok: false, why: `no claude at ${claudeBin ?? "CLAUDE_BIN (empty)"}: set CLAUDE_BIN in ${p.bin}/env.sh or pass --claude` };
  const argv = tickArgv(c, s, p.dir, { claudeBin: bin, prompt: `${SKILL_COMMAND} status ${p.dir}`, model: "haiku", pluginDir, readRule: readRule(p) });
  const end = await runSession(argv, s.worktree, ctx.env, DRY_RUN_TIMEOUT_MS, () => `timed out after ${DRY_RUN_TIMEOUT_MS / 1000} s`);
  if (end.stopped !== null) return { ok: false, why: end.stopped };
  const out = readSession(end.stdout, end.stderr);
  const said = out.result.split("\n").find((l) => l.includes(`${s.runId}:`));
  if (said !== undefined) return { ok: true, detail: `: ${said.trim()}` };
  // A session that cannot load the skill still answers, so the likeliest cause is named with the fix.
  const hint = pluginDir === undefined
    ? `if aio-longrun is not installed for this user, set LONGRUN_PLUGIN_DIR in ${p.bin}/env.sh to the plugin's directory`
    : `check that LONGRUN_PLUGIN_DIR (${pluginDir}) holds the plugin`;
  return { ok: false, why: `the status session did not print "${s.runId}:" (${out.why ?? lastLine(out.result) ?? "empty result"}); ${hint}` };
}

/** The preflight: what an unattended wake needs, checked while the human can still fix it. No due, no claim. */
async function dryRun(p: Paths, ctx: Ctx, claudeBin: string | undefined, pluginDir: string | undefined): Promise<number> {
  const { contract: c, state: s } = load(p, { allowChangedContract: false });
  if (!existsSync(join(s.worktree, ".git"))) throw new Refusal(`worktree missing at ${s.worktree}`);
  const lines: string[] = [];
  const report = (check: string, r: Probe): void => {
    const line = r.ok ? `ok ${check}${r.detail}` : `FAIL ${check}: ${r.why}`;
    lines.push(line);
    console.log(line);
  };
  const path = wakerPath(p);
  if (path.problem !== null) report("env.sh", { ok: false, why: path.problem });
  const env = { ...ctx.env, PATH: path.PATH, GIT_TERMINAL_PROMPT: "0" };
  const programs = neededPrograms(c, s, p.dir);
  const missing = programs.filter((x) => Bun.which(x, { PATH: path.PATH, cwd: s.worktree }) === null);
  report("binaries", missing.length === 0 ? { ok: true, detail: `: ${programs.join(", ")}` } : { ok: false, why: `not on the PATH that ${p.bin}/env.sh sets: ${missing.join(", ")}` });
  // gh serves the draft PR, any Bash(gh …) rule, and the ci, review and merged checks of open waits
  const ghWaits = openWaits(s).some((w) => w.check.type === "ci" || w.check.type === "review" || w.check.type === "merged");
  if (c.effects.draftPr || ghWaits || programs.some((x) => x === "gh" || x.endsWith("/gh"))) {
    report("gh", probe(nonEmpty(ctx.env["GH_BIN"]) ?? "gh", ["auth", "status"], s.worktree, env, 30_000, ""));
  }
  if (c.effects.pushRunBranch) report("push", probe("git", ["push", "--dry-run", "origin", s.branch], s.worktree, env, 60_000, `: ${s.branch} to origin`));
  report("claude", await claudeProbe(p, c, s, ctx, claudeBin, pluginDir, path.PATH));
  return lines.some((l) => l.startsWith("FAIL ")) ? 2 : 0;
}

// ---------------------------------------------------------------- dispatch

const USAGE = {
  init: "init <run-id> --contract <file> [--repo <path>] [--plugin-dir <path>]",
  status: "status [<record>] [--brief] [--journal N] [--json]",
  claim: "claim <record> [--holder <h>] [--ttl <duration>]",
  renew: "renew <record> [--holder <h>] [--ttl <duration>]",
  release: "release <record> [--holder <h>]",
  "wait add": "wait add <record> --who <who> --what <text> --check <json> --blocks <ids,> --deadline <iso|duration> [--on-expiry not_done|notify] [--command <json argv> --sha <sha>] [--holder <h>]",
  "wait resolve": "wait resolve <record> <id> --why <text> [--holder <h>]",
  "wait list": "wait list <record>",
  due: "due <record>",
  "tick-end": "tick-end <record> --outcome <text> [--holder <h>]",
  verdict: "verdict <record> <criterion> met|not_met|untried [--evidence <text>] [--why <text>] [--judge <label>] [--holder <h>]",
  progress: "progress <record> --what <text> [--holder <h>]",
  log: "log <record> dispatch|effect --what <text> [--holder <h>]",
  "lesson add": "lesson add <record> --kind pitfall|preference|fact --text <text> --source <source> [--holder <h>]",
  "lesson supersede": "lesson supersede <record> <id> --by <id> [--holder <h>]",
  "lesson list": "lesson list <record>",
  "handoff set": "handoff set <record> [--holder <h>]   (the handoff on stdin, at most 60 lines)",
  "inbox take": "inbox take <record> [--holder <h>]",
  backoff: "backoff <record> --until <iso> | --reset-text <text> | --auto",
  finish: "finish <record> done|not-done [--reason <text>] [--holder <h>]",
  reopen: "reopen <record>   (human only, from a terminal)",
  approve: "approve <record> <wait-id>   (human only, from a terminal)",
  launch: "launch <record> [--dry-run] [--claude <path>]   (one wake; longrun-wake.sh runs it)",
  arm: "arm <record>   (waker launchd: install and load the LaunchAgent)",
  disarm: "disarm <record>   (waker launchd: unload and delete the LaunchAgent)",
};

const COMMANDS: Record<string, Command> = {
  init: { usage: USAGE.init, run: cmdInit },
  status: { usage: USAGE.status, run: cmdStatus },
  claim: { usage: USAGE.claim, run: cmdClaim },
  renew: { usage: USAGE.renew, run: cmdRenew },
  release: { usage: USAGE.release, run: cmdRelease },
  "wait add": { usage: USAGE["wait add"], run: cmdWaitAdd },
  "wait resolve": { usage: USAGE["wait resolve"], run: cmdWaitResolve },
  "wait list": { usage: USAGE["wait list"], run: cmdWaitList },
  due: { usage: USAGE.due, run: cmdDue },
  "tick-end": { usage: USAGE["tick-end"], run: cmdTickEnd },
  verdict: { usage: USAGE.verdict, run: cmdVerdict },
  progress: { usage: USAGE.progress, run: cmdProgress },
  log: { usage: USAGE.log, run: cmdLog },
  "lesson add": { usage: USAGE["lesson add"], run: cmdLessonAdd },
  "lesson supersede": { usage: USAGE["lesson supersede"], run: cmdLessonSupersede },
  "lesson list": { usage: USAGE["lesson list"], run: cmdLessonList },
  "handoff set": { usage: USAGE["handoff set"], run: cmdHandoffSet },
  "inbox take": { usage: USAGE["inbox take"], run: cmdInboxTake },
  backoff: { usage: USAGE.backoff, run: cmdBackoff },
  finish: { usage: USAGE.finish, run: cmdFinish },
  reopen: { usage: USAGE.reopen, run: cmdReopen },
  approve: { usage: USAGE.approve, run: cmdApprove },
  launch: { usage: USAGE.launch, run: cmdLaunch },
  arm: { usage: USAGE.arm, run: cmdArm },
  disarm: { usage: USAGE.disarm, run: cmdDisarm },
};

/** The human's and the waker's commands. A launched tick has LONGRUN_HOLDER set, and none of these runs there. */
const NOT_FOR_A_TICK = new Set(["init", "launch", "arm", "disarm", "reopen", "approve"]);

function help(): void {
  console.log("usage:");
  for (const c of Object.values(COMMANDS)) console.log(`  longrun ${c.usage}`);
}

export async function main(argv: string[], env: Record<string, string | undefined>): Promise<number> {
  const [first, second] = argv;
  if (first === undefined || first === "--help" || first === "help") {
    help();
    return first === undefined ? 2 : 0;
  }
  const pair = second === undefined ? "" : `${first} ${second}`;
  const name = pair in COMMANDS ? pair : first;
  const cmd = COMMANDS[name];
  if (cmd === undefined) {
    const group = Object.entries(COMMANDS).filter(([k]) => k.startsWith(`${first} `));
    if (group.length === 0) {
      console.error(`unknown command: ${first}`);
      help();
      return 2;
    }
    for (const [, c] of group) console.log(`usage: longrun ${c.usage}`);
    return second === "--help" ? 0 : 2;
  }
  const args = argv.slice(name === pair ? 2 : 1);
  if (args.includes("--help")) {
    console.log(`usage: longrun ${cmd.usage}`);
    return 0;
  }
  const inTick = nonEmpty(env["LONGRUN_HOLDER"]) !== undefined;
  if (inTick && NOT_FOR_A_TICK.has(name)) {
    console.error(`longrun ${name} is not for a tick (LONGRUN_HOLDER is set)`);
    return 2;
  }
  try {
    return await cmd.run(args, { now: clock(env), env, disarm: !inTick });
  } catch (e) {
    if (e instanceof RecordError) {
      console.error(e.line === null ? `${e.file}: ${e.message}` : `${e.file}:${e.line}: ${e.message}`);
      return 2;
    }
    if (e instanceof Refusal) {
      console.error(e.message);
      return 2;
    }
    throw e;
  }
}

if (import.meta.main) process.exit(await main(process.argv.slice(2), process.env));
