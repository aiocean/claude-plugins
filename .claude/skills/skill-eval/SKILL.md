---
name: skill-eval
description: Use when checking whether a plugin skill in this repo actually works on a real agent — does it trigger on the right prompts, stay quiet on unrelated ones, and produce better output than no skill or than its previous version. Also use before releasing a skill change, when a RED baseline is needed, or when the user says "eval this skill", "benchmark the skill", "test with a real agent", "with vs without skill", "did my skill edit help".
---

# skill-eval

Runs headless `claude -p` agents on a suite of prompts, once per **arm**, then scores each run.

| Arm | What the agent sees |
|---|---|
| `with` | `plugins/<plugin>` from the working tree |
| `without` | no plugin |
| `against` | `plugins/<plugin>` at `--against <git-ref>`, for old-vs-new comparisons |

Every run uses a fresh temp workdir outside the repo with `--setting-sources project,local --strict-mcp-config`. User plugins, hooks, MCP servers and the global CLAUDE.md are not loaded, so the only non-built-in skill an arm can see is the one under test. Trigger rates are therefore measured without competition from other installed skills.

## Run

```bash
EVAL=.claude/skills/skill-eval/skill-eval.py
python3 $EVAL run evals/<plugin>/<suite>.json --model sonnet --reps 3 --budget 1
python3 $EVAL run evals/<plugin>/<suite>.json --arms with,against --against HEAD   # did my uncommitted edit help?
python3 $EVAL grade evals/<plugin>/runs/<run-id>                                   # re-grade after editing checks/rubric
```

`run --help` lists every flag. Output goes to `evals/<plugin>/runs/<suite>-<timestamp>/` (gitignored): `summary.md` holds the table, and each `<case>/<arm>-<rep>/` holds `transcript.jsonl`, `run.json` (tool calls, cost, turns, final reply), `grading.json` and `work/` (files after the run).

Each run is a paid model call. Run 1 rep on one `--case` first, read its transcript, then scale up.

## Suite format

`evals/<plugin>/<suite>.json`. Example: `evals/aio-anti-slop/prose.json`.

```json
{
  "plugin": "aio-anti-slop", "skill": "aio-anti-slop",
  "permission_mode": "acceptEdits", "allowed_tools": ["Bash"],
  "cases": [{
    "id": "readme-robotic",
    "prompt": "Our README.md sounds robotic ...",
    "files": {"README.md": "seed content"},
    "trigger": true,
    "checks": [{"desc": "install command kept", "file": "README.md", "regex": "bun add tinyq"},
               {"desc": "answers O(log n)", "output": true, "not_regex": "..."}],
    "rubric": ["README.md adds no new factual claims"]
  }]
}
```

- `trigger`: whether the skill should load in plugin arms. Set `false` for unrelated prompts to measure false triggers. It's detected from `Skill` / `Read …/SKILL.md` tool calls in the transcript, not from the agent's own account.
- `checks`: regex tests against a workdir `file` or the final reply (`output: true`). They're cheap and deterministic, so use them for anything a regex can decide.
- `rubric`: judged by a separate blind `claude -p` call (`--judge-model`, default `sonnet`). The judge sees the task, the final reply and the workdir files, but not the arm.
- `permission_mode` / `allowed_tools`: headless runs deny any tool that would prompt. Add `allowed_tools` when the skill runs scripts, and check the `denials` column.

## Reading results

- Score is the fraction of trigger, check and rubric items passed, averaged over reps. The number that matters is the **difference between arms**, not the absolute score.
- An item that passes in every arm doesn't discriminate. Replace it with one the baseline fails.
- High variance across reps means you need more reps or a more specific prompt before drawing a conclusion.
- Before trusting a judge item, open the `grading.json` evidence for at least one run.

## Common mistakes

- Writing only should-trigger cases. Always include at least one prompt that must **not** trigger the skill.
- Seed files that already pass the checks. The `without` arm has to fail them, or the case measures nothing.
- Copying the skill's own trigger phrases into the prompt. Write the request the way a user would actually phrase it.
