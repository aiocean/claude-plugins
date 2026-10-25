#!/usr/bin/env python3
"""
skill-eval.py — run real headless Claude Code agents on a plugin's skill, with and
without the plugin loaded, then score every run.

    python3 .claude/skills/skill-eval/skill-eval.py run evals/<plugin>/<suite>.json [options]
    python3 .claude/skills/skill-eval/skill-eval.py grade evals/<plugin>/runs/<run-id>

Each run is `claude -p` in a fresh temp workdir (outside the repo, so no project
CLAUDE.md is discovered) with --setting-sources project,local --strict-mcp-config:
user settings, user-installed plugins, hooks, MCP servers and the global CLAUDE.md
are excluded. The only non-builtin skill an arm sees is the one it loads.

Arms:
    with      --plugin-dir plugins/<plugin> (working tree)
    without   no plugin
    against   --plugin-dir of plugins/<plugin> at git ref --against REF

Run layout (gitignored):
    evals/<plugin>/runs/<suite>-<timestamp>/
        suite.json                       # copy of the suite, used by `grade`
        summary.json, summary.md
        <case-id>/<arm>-<rep>/
            transcript.jsonl, stderr.txt, run.json, grading.json
            work/                        # workdir after the agent finished
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
PLUGINS_DIR = REPO_ROOT / "plugins"
ISOLATION_FLAGS = ["--setting-sources", "project,local", "--strict-mcp-config"]
JUDGE_FILE_LIMIT = 20
JUDGE_FILE_BYTES = 50_000

GRADING_SCHEMA = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "passed": {"type": "boolean"},
                    "evidence": {"type": "string"},
                },
                "required": ["text", "passed", "evidence"],
            },
        }
    },
    "required": ["items"],
}


# ---------- pure core: transcript parsing and grading ----------


def parse_transcript(lines, plugin, skill):
    """Extract tool calls, skill trigger and the result event from stream-json lines."""
    tool_calls, triggered, result = [], False, {}
    for line in lines:
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if event.get("type") == "result":
            result = event
        if event.get("type") != "assistant":
            continue
        for item in event.get("message", {}).get("content", []):
            if item.get("type") != "tool_use":
                continue
            name, tool_input = item.get("name", ""), item.get("input", {})
            tool_calls.append({"name": name, "input": tool_input})
            if name == "Skill" and tool_input.get("skill") in (
                skill,
                f"{plugin}:{skill}",
            ):
                triggered = True
            if name == "Read" and f"/skills/{skill}/SKILL.md" in tool_input.get(
                "file_path", ""
            ):
                triggered = True
    return {"tool_calls": tool_calls, "triggered": triggered, "result": result}


def grade_check(check, output, read_file):
    """Grade one regex check against the final reply or a workdir file."""
    if check.get("output"):
        target, label = output, "final reply"
    else:
        target, label = read_file(check["file"]), check["file"]
        if target is None:
            return {
                "text": check["desc"],
                "passed": False,
                "evidence": f"{label} missing",
            }
    if "regex" in check:
        match = re.search(check["regex"], target, re.MULTILINE)
        passed = match is not None
        evidence = (
            f"{label}: matched {match.group(0)!r}"
            if match
            else f"{label}: no match for /{check['regex']}/"
        )
    else:
        match = re.search(check["not_regex"], target, re.MULTILINE)
        passed = match is None
        evidence = (
            f"{label}: no match for /{check['not_regex']}/"
            if passed
            else f"{label}: found {match.group(0)!r}"
        )
    return {"text": check["desc"], "passed": passed, "evidence": evidence}


def grade_trigger(expected, triggered):
    text = "skill loaded" if expected else "skill not loaded"
    return {
        "text": text,
        "passed": triggered == expected,
        "evidence": f"triggered={triggered}",
    }


def summarize(records):
    """Aggregate run records into one row per (case, arm)."""
    groups = {}
    for rec in records:
        groups.setdefault((rec["case"], rec["arm"]), []).append(rec)
    rows = []
    for (case, arm), recs in sorted(groups.items()):
        scores = [r["score"] for r in recs if r["score"] is not None]
        has_plugin = arm != "without"
        rows.append(
            {
                "case": case,
                "arm": arm,
                "runs": len(recs),
                "score": round(sum(scores) / len(scores), 3) if scores else None,
                "trigger_rate": round(sum(r["triggered"] for r in recs) / len(recs), 3)
                if has_plugin
                else None,
                "cost_usd": round(sum(r["cost_usd"] for r in recs) / len(recs), 4),
                "turns": round(sum(r["turns"] for r in recs) / len(recs), 1),
                "seconds": round(sum(r["seconds"] for r in recs) / len(recs), 1),
                "errors": sum(1 for r in recs if r["error"]),
                "permission_denials": sum(r["permission_denials"] for r in recs),
            }
        )
    return rows


def render_markdown(rows):
    def cell(value, fmt):
        return "–" if value is None else fmt.format(value)

    out = [
        "| case | arm | runs | score | trigger | cost $ | turns | sec | errors | denials |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for r in rows:
        out.append(
            f"| {r['case']} | {r['arm']} | {r['runs']} | {cell(r['score'], '{:.0%}')} | "
            f"{cell(r['trigger_rate'], '{:.0%}')} | {r['cost_usd']:.4f} | {r['turns']} | "
            f"{r['seconds']} | {r['errors']} | {r['permission_denials']} |"
        )
    return "\n".join(out) + "\n"


# ---------- shell: claude subprocesses and filesystem ----------


def claude_cmd(prompt, opts, plugin_dir=None, extra=()):
    cmd = ["claude", "-p", prompt, "--no-session-persistence", *ISOLATION_FLAGS, *extra]
    if opts.get("model"):
        cmd += ["--model", opts["model"]]
    if plugin_dir:
        # --add-dir: the plugin lives outside the workdir, and the skill must be able to
        # read its own references/scripts without a permission prompt (denied headless).
        cmd += ["--plugin-dir", str(plugin_dir), "--add-dir", str(plugin_dir)]
    return cmd


def extract_plugin_at_ref(plugin, ref, dest):
    archive = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "archive", ref, f"plugins/{plugin}"],
        capture_output=True,
        check=True,
    )
    subprocess.run(["tar", "-x", "-C", str(dest)], input=archive.stdout, check=True)
    return dest / "plugins" / plugin


def run_agent(case, arm, rep, plugin_dir, suite, opts, run_root):
    run_dir = run_root / case["id"] / f"{arm}-{rep}"
    run_dir.mkdir(parents=True)
    workdir = Path(tempfile.mkdtemp(prefix="skill-eval-"))
    for rel, content in case.get("files", {}).items():
        (workdir / rel).parent.mkdir(parents=True, exist_ok=True)
        (workdir / rel).write_text(content)

    extra = [
        "--output-format",
        "stream-json",
        "--verbose",
        "--permission-mode",
        suite.get("permission_mode", "acceptEdits"),
        "--max-turns",
        str(opts["max_turns"]),
    ]
    if suite.get("allowed_tools"):
        extra += ["--allowedTools", *suite["allowed_tools"]]
    if opts.get("budget"):
        extra += ["--max-budget-usd", str(opts["budget"])]
    cmd = claude_cmd(case["prompt"], opts, plugin_dir, extra)

    started, error = time.time(), None
    with (
        open(run_dir / "transcript.jsonl", "w") as out,
        open(run_dir / "stderr.txt", "w") as err,
    ):
        try:
            proc = subprocess.run(
                cmd, cwd=workdir, stdout=out, stderr=err, timeout=opts["timeout"]
            )
            if proc.returncode != 0:
                error = f"exit {proc.returncode}"
        except subprocess.TimeoutExpired:
            error = f"timeout after {opts['timeout']}s"
    seconds = round(time.time() - started, 1)

    shutil.copytree(workdir, run_dir / "work")
    shutil.rmtree(workdir)
    parsed = parse_transcript(
        (run_dir / "transcript.jsonl").read_text().splitlines(),
        suite["plugin"],
        suite["skill"],
    )
    result = parsed["result"]
    meta = {
        "case": case["id"],
        "arm": arm,
        "rep": rep,
        "plugin_dir": str(plugin_dir) if plugin_dir else None,
        "cmd": cmd,
        "error": error or (result.get("subtype") if result.get("is_error") else None),
        "seconds": seconds,
        "triggered": parsed["triggered"],
        "cost_usd": result.get("total_cost_usd", 0.0),
        "turns": result.get("num_turns", 0),
        "permission_denials": result.get("permission_denials", []),
        "output": result.get("result", ""),
        "tool_calls": parsed["tool_calls"],
    }
    (run_dir / "run.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))
    return run_dir


def read_workdir_file(run_dir):
    def read(rel):
        path = run_dir / "work" / rel
        return path.read_text(errors="replace") if path.is_file() else None

    return read


def judge(run_dir, case, meta, judge_model):
    files = sorted(p for p in (run_dir / "work").rglob("*") if p.is_file())
    shown = files[:JUDGE_FILE_LIMIT]
    blocks = []
    for path in shown:
        text = path.read_bytes()[:JUDGE_FILE_BYTES].decode("utf-8", errors="replace")
        blocks.append(
            f'<file path="{path.relative_to(run_dir / "work")}">\n{text}\n</file>'
        )
    if len(files) > len(shown):
        blocks.append(
            f"<note>{len(files) - len(shown)} more files not shown (limit {JUDGE_FILE_LIMIT})</note>"
        )
    rubric = "\n".join(f"{i}. {item}" for i, item in enumerate(case["rubric"], 1))
    prompt = (
        "You are grading one AI agent run against a rubric. You see the task the agent was given, "
        "its final reply, and the files in its working directory after it finished. Judge each rubric "
        "item independently. passed=true only when the evidence clearly shows the item is met. In "
        "evidence, quote what you saw or state what is missing. Return one item per rubric line, in "
        "order, with text copied verbatim.\n\n"
        f"<task>\n{case['prompt']}\n</task>\n\n<final_reply>\n{meta['output']}\n</final_reply>\n\n"
        f"<files>\n{chr(10).join(blocks)}\n</files>\n\n<rubric>\n{rubric}\n</rubric>"
    )
    cmd = claude_cmd(
        prompt,
        {"model": judge_model},
        extra=[
            "--output-format",
            "json",
            "--tools",
            "",
            "--max-turns",
            "3",
            "--json-schema",
            json.dumps(GRADING_SCHEMA),
        ],
    )
    proc = subprocess.run(
        cmd, cwd=tempfile.gettempdir(), capture_output=True, text=True, timeout=600
    )
    try:
        result = next(e for e in json.loads(proc.stdout) if e.get("type") == "result")
        return result["structured_output"]["items"]
    except (json.JSONDecodeError, StopIteration, KeyError, TypeError):
        return [
            {
                "text": item,
                "passed": False,
                "evidence": f"judge failed: {proc.stderr[:200]}",
            }
            for item in case["rubric"]
        ]


def grade_run(run_dir, case, judge_model):
    meta = json.loads((run_dir / "run.json").read_text())
    items = []
    if "trigger" in case and meta["plugin_dir"]:
        items.append(grade_trigger(case["trigger"], meta["triggered"]))
    read = read_workdir_file(run_dir)
    items += [
        grade_check(check, meta["output"], read) for check in case.get("checks", [])
    ]
    if case.get("rubric") and not meta["error"]:
        items += judge(run_dir, case, meta, judge_model)
    score = sum(i["passed"] for i in items) / len(items) if items else None
    (run_dir / "grading.json").write_text(
        json.dumps({"score": score, "items": items}, indent=2, ensure_ascii=False)
    )
    return {
        "case": meta["case"],
        "arm": meta["arm"],
        "score": score,
        "triggered": meta["triggered"],
        "cost_usd": meta["cost_usd"],
        "turns": meta["turns"],
        "seconds": meta["seconds"],
        "error": meta["error"],
        "permission_denials": len(meta["permission_denials"]),
    }


def grade_all(run_root, judge_model, jobs):
    suite = json.loads((run_root / "suite.json").read_text())
    cases = {c["id"]: c for c in suite["cases"]}
    run_dirs = sorted(p.parent for p in run_root.glob("*/*/run.json"))
    with ThreadPoolExecutor(jobs) as pool:
        records = list(
            pool.map(
                lambda d: grade_run(d, cases[d.parent.name], judge_model), run_dirs
            )
        )
    rows = summarize(records)
    (run_root / "summary.json").write_text(json.dumps(rows, indent=2))
    table = render_markdown(rows)
    (run_root / "summary.md").write_text(table)
    print(f"\n{run_root}\n\n{table}")


def cmd_run(args):
    suite_path = Path(args.suite).resolve()
    suite = json.loads(suite_path.read_text())
    plugin = suite["plugin"]
    arms = args.arms.split(",")
    if "against" in arms and not args.against:
        sys.exit("--arms includes 'against' but --against REF is missing")
    cases = [c for c in suite["cases"] if not args.case or c["id"] in args.case]

    run_root = (
        REPO_ROOT
        / "evals"
        / plugin
        / "runs"
        / f"{suite_path.stem}-{time.strftime('%Y%m%d-%H%M%S')}"
    )
    run_root.mkdir(parents=True)
    (run_root / "suite.json").write_text(
        json.dumps(suite, indent=2, ensure_ascii=False)
    )

    plugin_dirs = {"with": PLUGINS_DIR / plugin, "without": None}
    ref_tmp = None
    if "against" in arms:
        ref_tmp = Path(tempfile.mkdtemp(prefix="skill-eval-ref-"))
        plugin_dirs["against"] = extract_plugin_at_ref(plugin, args.against, ref_tmp)

    opts = {
        "model": args.model,
        "max_turns": args.max_turns,
        "timeout": args.timeout,
        "budget": args.budget,
    }
    jobs = [
        (c, arm, rep) for c in cases for arm in arms for rep in range(1, args.reps + 1)
    ]
    print(
        f"{len(jobs)} runs: {len(cases)} cases × {arms} × {args.reps} reps → {run_root}"
    )
    try:
        with ThreadPoolExecutor(args.jobs) as pool:
            futures = {
                pool.submit(
                    run_agent, c, arm, rep, plugin_dirs[arm], suite, opts, run_root
                ): (c, arm, rep)
                for c, arm, rep in jobs
            }
            for done, future in enumerate(as_completed(futures), 1):
                meta = json.loads((future.result() / "run.json").read_text())
                print(
                    f"[{done}/{len(jobs)}] {meta['case']} {meta['arm']}-{meta['rep']} "
                    f"{meta['error'] or 'ok'} triggered={meta['triggered']} "
                    f"${meta['cost_usd']:.4f} {meta['seconds']}s",
                    flush=True,
                )
    finally:
        if ref_tmp:
            shutil.rmtree(ref_tmp)
    grade_all(run_root, args.judge_model, args.jobs)


def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    sub = parser.add_subparsers(dest="command", required=True)

    run = sub.add_parser("run", help="run agents for a suite, then grade")
    run.add_argument("suite", help="path to evals/<plugin>/<suite>.json")
    run.add_argument(
        "--arms", default="with,without", help="comma list of with,without,against"
    )
    run.add_argument(
        "--against", help="git ref for the 'against' arm (e.g. HEAD, main~3)"
    )
    run.add_argument("--reps", type=int, default=3)
    run.add_argument(
        "--case", action="append", help="only run this case id (repeatable)"
    )
    run.add_argument("--model", help="agent model (default: your configured model)")
    run.add_argument("--judge-model", default="sonnet")
    run.add_argument("--jobs", type=int, default=4, help="parallel claude processes")
    run.add_argument("--max-turns", type=int, default=30)
    run.add_argument("--timeout", type=int, default=900, help="seconds per agent run")
    run.add_argument("--budget", type=float, help="--max-budget-usd per agent run")
    run.set_defaults(func=cmd_run)

    grade = sub.add_parser("grade", help="re-grade an existing run directory")
    grade.add_argument("run_dir")
    grade.add_argument("--judge-model", default="sonnet")
    grade.add_argument("--jobs", type=int, default=4)
    grade.set_defaults(
        func=lambda a: grade_all(Path(a.run_dir).resolve(), a.judge_model, a.jobs)
    )

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
