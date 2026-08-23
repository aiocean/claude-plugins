---
name: aio-anti-slop
description: |
  Remove AI slop from prose and code. Use when text or code reads AI-generated
  and the tells need removing — user says "deslop", "unslop", "anti-slop",
  "humanize", "bớt giọng AI", "nghe như AI viết", "văn AI quá", "sounds like
  ChatGPT", "make it sound human", "làm cho tự nhiên hơn"; before publishing any
  agent-drafted prose (README, docs, blog post, report, announcement, commit/PR
  message); or when reviewing an agent-written diff for code slop (narrating
  comments, defensive try/catch on trusted paths, any-casts, needless
  abstraction).
when_to_use: |
  deslop, unslop, anti-slop, de-slop, humanize, AI slop, slop check, remove AI
  tells, sounds like ChatGPT, sounds robotic, bớt giọng AI, nghe như AI viết,
  văn AI quá, làm cho tự nhiên, gỡ giọng AI, review AI-written diff, code slop,
  narrating comments, em dash overuse, not just but, rule of three, publish
  README, publish blog post, announcement draft
effort: medium
---

# Anti-slop

## Overview

Slop is the absence of a decision: the statistically likely filler nobody chose. Two failure modes both count as slop — AI tells left in, and overcorrected "anti-slop voice" (staccato fragments, forced slang, fake casualness). You cannot reliably see your own slop; the priors that produce a pattern make it invisible on re-read. So: detect mechanically, judge each hit in context, repair minimally.

This is a style pass, not a content edit. Meaning, claims, facts, and code behavior stay identical.

## Prose pass

1. **Anchor genre and voice.** If the target genre (docs, blog, tweet, academic) or the author's voice is unclear, ask one question first. The author's existing voice overrides every rule below.
2. **Scan mechanically** using the catalog at [references/patterns.md](references/patterns.md) (relative to this SKILL.md) — run the `rg` commands, then do the by-hand checks. A match is a lead, not a verdict.
3. **Triage every hit: defect or protected use.** Protected: quotations, code blocks, proper names, domain terms used precisely, and the author's own recognizable habits. Edit only when the defect is clearer than preservation — when unsure, no-op. A no-op is a first-class outcome.
4. **Repair finding by finding.** Decide what the sentence actually asserts, then assert that. Never fix a pattern by paraphrasing the pattern — the catalog lists banned escape hatches that count as new findings. Sentences without findings are copied byte-for-byte.
5. **Re-scan after rewriting** (rewrites reintroduce slop). Maximum 3 passes; a pattern surviving 3 passes gets rewritten as a bare claim, not paraphrased again.
6. **Report**: hits found → fixed → intentionally kept (with the reason), per pattern.

## Code pass (diff-scoped)

1. **Scope is the diff** — branch vs main, or the files just written. Do not expand into general cleanup uninvited.
2. **Hunt, in order:** comments that narrate code or restate names · defensive checks and try/catch on trusted internal paths · `any` / `@ts-ignore` / `# type: ignore` used to bypass types · deep nesting fixable by early returns · needless abstraction and generic names (`handleData`, `processItem`, `result`) · test slop (ask: would this test fail if the function broke?).
3. **Two-way defensive check:** real defenses stay — timeouts, retries, rate limits on external calls are not slop. Removing all error handling is overcorrection.
4. **Behavior unchanged** unless fixing a clear bug. One smell per pass, smallest diff, match surrounding style. Summary in 1–3 sentences.

## Hard rules

- **Never invent specifics.** Names, numbers, dates, quotes, citations come only from the source text, the conversation, or verification you actually ran. Missing detail → leave a `[ADD: which study?]`-style placeholder, or use a simpler sentence.
- **Em dash is budgeted, not banned:** at most one per ~150 words, never the paired-aside form `— like this —`, never two in a sentence.
- **Preserve force-bearing words exactly** — "never", "must", "all" in safety, security, legal, and technical rules do not get softened.
- **No manufactured humanity:** no fake typos, no forced slang, no persona. Humanizer-tool output is its own genre of slop.
- **Final audit before returning:** ask "what still makes this obviously AI-generated?" — fix it or name it in the report.
