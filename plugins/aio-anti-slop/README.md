# aio-anti-slop

Remove AI slop from prose and code without flattening the author's voice. Detection is mechanical (a grep-able catalog of English and Vietnamese tells), every hit is triaged in context, and repairs are minimal and re-scanned so a rewrite cannot smuggle new slop back in.

## What it does

- **Prose pass** — anchors genre and voice, runs the `rg` patterns from `references/patterns.md`, triages each hit as defect or protected use (quotes, code, proper names, the author's own habits), repairs finding by finding, re-scans up to 3 times, and reports found / fixed / kept.
- **Structural pass** (reports, explainers, write-ups) — checks the piece has a throughline: assertive headings, a real opening claim, and a close that answers it.
- **Code pass** (diff-scoped) — strips narrating comments, defensive `try/catch` on trusted paths, `any` casts, and needless abstraction while keeping behavior identical.

Meaning, claims, facts, and code behavior never change. A no-op is a valid outcome.

## Install

```bash
/plugin install aio-anti-slop@aiocean-plugins
```

## Usage

Trigger phrases: "deslop", "unslop", "humanize", "sounds like ChatGPT", "bớt giọng AI", "văn AI quá", or run it before publishing any agent-drafted README, blog post, report, or PR description.

```
/aio-anti-slop:aio-anti-slop docs/announcement.md
```

Example prompts:

- "Deslop this README before I publish it."
- "Review this diff for code slop — narrating comments, needless try/catch."
- "Bài này nghe như AI viết, làm cho tự nhiên hơn nhưng giữ nguyên ý."

## Layout

```
skills/aio-anti-slop/
├── SKILL.md                 # workflow: prose pass, structural pass, code pass
└── references/patterns.md   # grep-able catalog of tells + banned escape hatches
```
