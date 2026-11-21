#!/usr/bin/env bun
// record.ts: reading and writing one run's record folder. State writes are atomic and happen under the state lock;
// the journal is append-only.

import { randomUUID } from "node:crypto";
import {
  appendFileSync, closeSync, existsSync, fstatSync, ftruncateSync, mkdirSync, openSync, readFileSync, readSync, renameSync, rmSync, statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  type Contract, type Draft, type JournalEvent, type Lesson, type State, type Step,
  Decoder, RecordError, Refusal, parseContract, parseEvent, parseJson, parseLessons, parseState, withFinish,
} from "./core.ts";

export interface Paths {
  dir: string; contract: string; state: string; journal: string; handoff: string; lessons: string;
  inbox: string; lease: string; stateLock: string; out: string; bin: string; wakeLog: string; worktree: string;
}

export function paths(recordDir: string): Paths {
  const f = (name: string): string => join(recordDir, name);
  return {
    dir: recordDir, contract: f("contract.md"), state: f("state.json"), journal: f("journal.jsonl"), handoff: f("handoff.md"),
    lessons: f("lessons.json"), inbox: f("inbox.md"), lease: f(".lease"), stateLock: f(".state-lock"), out: f("out"), bin: f(".bin"),
    wakeLog: f("wake.log"), worktree: f("worktree"),
  };
}

export interface Loaded { contract: Contract; sha: string; state: State }

/** Parses the record at its edge. A contract changed since approval is refused unless the caller allows it. */
export function load(p: Paths, o: { allowChangedContract: boolean }): Loaded {
  if (!existsSync(p.state)) throw new Refusal(`no run at ${p.dir} (no state.json)`);
  const state = parseState(readFileSync(p.state, "utf8"));
  const { contract, sha } = parseContract(readFileSync(p.contract, "utf8"));
  if (!o.allowChangedContract && sha !== state.contractSha) {
    throw new Refusal(`contract.md changed since it was approved; run longrun reopen ${p.dir} in your terminal`);
  }
  return { contract, sha, state };
}

export function writeState(p: Paths, s: State): void {
  const tmp = `${p.state}.tmp-${process.pid}`;
  writeFileSync(tmp, `${JSON.stringify(s, null, 2)}\n`);
  renameSync(tmp, p.state);
}

export function append(p: Paths, tick: number, events: Draft[], now: Date): void {
  if (events.length === 0) return;
  dropTornTail(p.journal);
  const at = now.toISOString();
  appendFileSync(p.journal, events.map((e) => `${JSON.stringify({ at, tick, kind: e.kind, data: e.data })}\n`).join(""));
}

/**
 * Cuts a last line that has no newline: an append that crashed midway. Its state write never ran, so nothing refers
 * to it; left in place, the next event would extend it into a malformed line that is no longer the last.
 */
function dropTornTail(file: string): void {
  let fd: number;
  try {
    fd = openSync(file, "r+");
  } catch (e) {
    if (isErrno(e, "ENOENT")) return;
    throw e;
  }
  try {
    const size = fstatSync(fd).size;
    const buf = Buffer.alloc(64 * 1024);
    if (size === 0 || (readSync(fd, buf, 0, 1, size - 1) === 1 && buf[0] === 0x0a)) return;
    let end = size;
    for (;;) {
      const start = Math.max(0, end - buf.length);
      const n = readSync(fd, buf, 0, end - start, start);
      const i = buf.subarray(0, n).lastIndexOf(0x0a);
      if (i >= 0 || start === 0) {
        end = i >= 0 ? start + i + 1 : 0;
        break;
      }
      end = start;
    }
    ftruncateSync(fd, end);
    console.error(`warning: journal.jsonl: cut a half-written last line (${size - end} bytes)`);
  } finally {
    closeSync(fd);
  }
}

/** Every journal event. A malformed last line (a crash mid-append) is skipped with a warning; anywhere else it is refused. */
export function journal(p: Paths): JournalEvent[] {
  if (!existsSync(p.journal)) return [];
  const rows = readFileSync(p.journal, "utf8").split("\n");
  while (rows.length > 0 && rows[rows.length - 1] === "") rows.pop();
  const out: JournalEvent[] = [];
  rows.forEach((row, i) => {
    try {
      out.push(parseEvent(row, i + 1));
    } catch (e) {
      if (!(e instanceof RecordError) || i !== rows.length - 1) throw e;
      console.error(`warning: journal.jsonl:${i + 1}: skipped a half-written last line`);
    }
  });
  return out;
}

export function tail(p: Paths, n: number): JournalEvent[] {
  return journal(p).slice(-n);
}

/** The events that count for tick `tick`: everything since the tick before it ended, so waits settled in between count. */
export function tickWindow(p: Paths, tick: number): JournalEvent[] {
  const all = journal(p);
  const start = all.findLastIndex((e) => e.kind === "tick_start" && e.tick === tick);
  if (start < 0) return [];
  return all.slice(all.findLastIndex((e, i) => i < start && e.kind === "tick_end") + 1);
}

/** Writes beside the file, then renames over it, so a reader never sees half a file. */
export function writeAtomic(file: string, body: string): void {
  const tmp = `${file}.tmp-${process.pid}-${randomUUID()}`;
  writeFileSync(tmp, body);
  renameSync(tmp, file);
}

export function readLessons(p: Paths): Lesson[] {
  return existsSync(p.lessons) ? parseLessons(readFileSync(p.lessons, "utf8")) : [];
}

export function writeLessons(p: Paths, ls: Lesson[]): void {
  writeAtomic(p.lessons, `${JSON.stringify(ls, null, 2)}\n`);
}

/**
 * Takes the notes out of inbox.md: the file is moved aside, and a new empty one is created only if the human has not
 * written a new one meanwhile, so a note written during the take waits for the next take instead of being lost.
 */
export function takeInbox(p: Paths): string[] {
  const aside = `${p.inbox}.take-${randomUUID()}`;
  try {
    renameSync(p.inbox, aside);
  } catch (e) {
    if (isErrno(e, "ENOENT")) return [];
    throw e;
  }
  try {
    writeFileSync(p.inbox, "", { flag: "wx" });
  } catch (e) {
    if (!isErrno(e, "EEXIST")) throw e;
  }
  const notes = readFileSync(aside, "utf8").split("\n").filter((l) => l.trim() !== "");
  rmSync(aside, { force: true });
  return notes;
}

/** The lines of inbox.md that are not blank. */
export function inboxNotes(p: Paths): string[] {
  try {
    return readFileSync(p.inbox, "utf8").split("\n").filter((l) => l.trim() !== "");
  } catch (e) {
    if (isErrno(e, "ENOENT")) return [];
    throw e;
  }
}

// ---------------------------------------------------------------- locks
// A lock is a directory holding lease.json {holder, expiresAt}. mkdir is atomic, so one contender creates it.
// The run's lease (.lease) and the short state lock (.state-lock) are both such locks.

interface Lock { holder: string; expiresAt: string }
type Acquired = { ok: true } | { ok: false; holder: string; expiresAt: string };

function isErrno(e: unknown, code: string): boolean {
  return e instanceof Error && "code" in e && e.code === code;
}

const lockFile = (dir: string): string => join(dir, "lease.json");

function readLock(dir: string): Lock | null {
  let text: string;
  try {
    text = readFileSync(lockFile(dir), "utf8");
  } catch (e) {
    if (isErrno(e, "ENOENT") || isErrno(e, "ENOTDIR")) return null;
    throw e;
  }
  try {
    const parsed = parseJson(text, "lease.json", 1);
    const d: Decoder = new Decoder("lease.json", parsed.lines);
    const o = d.obj(parsed.value, "");
    return { holder: d.str(o, "holder", ""), expiresAt: d.time(o, "expiresAt", "") };
  } catch (e) {
    if (e instanceof RecordError) return null;
    throw e;
  }
}

/** lease.json appears whole: written beside it, then renamed over it. */
function writeLock(dir: string, l: Lock): void {
  const tmp = join(dir, `.tmp-${process.pid}-${randomUUID()}`);
  writeFileSync(tmp, `${JSON.stringify(l)}\n`);
  renameSync(tmp, lockFile(dir));
}

/** Reads the lock, giving a contender that is between its mkdir and its write half a second to finish. */
function settledLock(dir: string): Lock | null {
  for (let i = 0; i < 25; i++) {
    const l = readLock(dir);
    if (l !== null || !existsSync(dir)) return l;
    Bun.sleepSync(20);
  }
  return null;
}

/** A lock directory left without lease.json for a minute: its creator died between mkdir and write. Wall-clock time. */
function orphaned(dir: string): boolean {
  try {
    return Date.now() - statSync(dir).mtimeMs > 60_000;
  } catch (e) {
    if (isErrno(e, "ENOENT")) return false;
    throw e;
  }
}

const sameLock = (a: Lock | null, b: Lock | null): boolean =>
  a === null || b === null ? a === b : a.holder === b.holder && a.expiresAt === b.expiresAt;

/**
 * Moves the lock aside and deletes it, but only when it is still the one `seen`. A contender may have replaced it
 * between the read and the rename; that lock is put back, so breaking a stale lock never removes a fresh one.
 */
function breakLock(dir: string, seen: Lock | null): boolean {
  const aside = `${dir}.stale-${randomUUID()}`;
  try {
    renameSync(dir, aside);
  } catch (e) {
    if (isErrno(e, "ENOENT")) return false;
    throw e;
  }
  if (sameLock(readLock(aside), seen)) {
    rmSync(aside, { recursive: true, force: true });
    return true;
  }
  try {
    renameSync(aside, dir);
  } catch (e) {
    if (!isErrno(e, "ENOTEMPTY") && !isErrno(e, "EEXIST")) throw e;
    rmSync(aside, { recursive: true, force: true }); // a newer lock holds the path; its holder keeps it
  }
  return false;
}

function acquire(dir: string, holder: string, ttlMs: number, now: Date): Acquired {
  const mine: Lock = { holder, expiresAt: new Date(now.getTime() + ttlMs).toISOString() };
  let seen: Lock | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      mkdirSync(dir);
      writeLock(dir, mine);
      return { ok: true };
    } catch (e) {
      if (!isErrno(e, "EEXIST")) throw e;
    }
    seen = settledLock(dir);
    const expired = seen === null ? orphaned(dir) : Date.parse(seen.expiresAt) <= now.getTime();
    if (seen !== null && seen.holder === holder && !expired) {
      try {
        writeLock(dir, mine);
        return { ok: true };
      } catch (e) {
        if (!isErrno(e, "ENOENT")) throw e; // broken meanwhile: contend again
        continue;
      }
    }
    if (!expired || !breakLock(dir, seen)) break;
  }
  const cur = settledLock(dir) ?? seen;
  return { ok: false, holder: cur?.holder ?? "a claim still being written", expiresAt: cur?.expiresAt ?? "unknown" };
}

/** An expired lock is never renewed: a contender may be breaking it at this moment. */
function renew(dir: string, holder: string, ttlMs: number, now: Date): boolean {
  const cur = readLock(dir);
  if (cur === null || cur.holder !== holder || Date.parse(cur.expiresAt) <= now.getTime()) return false;
  try {
    writeLock(dir, { holder, expiresAt: new Date(now.getTime() + ttlMs).toISOString() });
    return true;
  } catch (e) {
    if (isErrno(e, "ENOENT")) return false;
    throw e;
  }
}

function release(dir: string, holder: string): "released" | "none" | "other" {
  if (!existsSync(dir)) return "none";
  const cur = settledLock(dir);
  if (cur === null) return existsSync(dir) ? "other" : "none";
  if (cur.holder !== holder) return "other";
  return breakLock(dir, cur) ? "released" : "other";
}

export function tryLease(p: Paths, holder: string, ttlMs: number, now: Date): Acquired {
  return acquire(p.lease, holder, ttlMs, now);
}

export function renewLease(p: Paths, holder: string, ttlMs: number, now: Date): boolean {
  return renew(p.lease, holder, ttlMs, now);
}

export function releaseLease(p: Paths, holder: string): "released" | "none" | "other" {
  return release(p.lease, holder);
}

export function readLease(p: Paths): Lock | null {
  return readLock(p.lease);
}

const STATE_LOCK_TTL_MS = 30_000;
const STATE_LOCK_WAIT_MS = 15_000;

/** Runs `f` holding the state lock, so concurrent commands (two judges, a waker's `due`) never lose an update. */
export function locked<T>(p: Paths, f: () => T): T {
  const holder = `${process.pid}-${randomUUID()}`;
  const giveUp = Date.now() + STATE_LOCK_WAIT_MS;
  while (!acquire(p.stateLock, holder, STATE_LOCK_TTL_MS, new Date()).ok) {
    if (Date.now() > giveUp) throw new Refusal(`state.json stayed locked for ${STATE_LOCK_WAIT_MS / 1000} s (${p.stateLock}); another longrun command is still running`);
    Bun.sleepSync(5 + Math.random() * 20);
  }
  try {
    return f();
  } finally {
    release(p.stateLock, holder);
  }
}

export interface Updated<A> { step: Step<A>; before: State; contract: Contract; finished: boolean }

/**
 * Loads the record under the state lock, applies `decide`, journals its events, then writes the new state. A step that
 * ends the run also ends any open tick and journals `finish`; `finished` tells the caller to run onFinished.
 */
export function update<A>(p: Paths, now: Date, decide: (r: Loaded) => Step<A>, o: { allowChangedContract: boolean } = { allowChangedContract: false }): Updated<A> {
  return locked(p, () => {
    const r = load(p, o);
    const step = withFinish(decide(r), r.state, now);
    append(p, step.next.tick?.n ?? 0, step.events, now);
    if (step.next !== r.state) writeState(p, step.next);
    return { step, before: r.state, contract: r.contract, finished: r.state.status === "active" && step.next.status !== "active" };
  });
}
