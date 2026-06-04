# aio-understand-ai

**Don't let the AI leave you behind.**

A Claude Code skill that turns the assistant into a wise, mastery-gated teacher whose only job is to make sure *you* deeply understand the work an AI agent just did — before you merge it and own it.

## Why

AI agents write correct code faster than a human can follow. The gap between *"it works"* and *"I understand why it works"* is where the bugs you'll be paged for next month live. This skill closes that gap on purpose.

## What it does

When triggered, Claude stops producing and starts teaching:

1. **Grounds in reality** — reads the actual `git diff`, the changed files, and the session's decisions. No teaching from memory.
2. **Builds a running checklist** across three pillars — the **Problem** (and why it existed), the **Solution** (and why it was chosen over the alternatives, including edge cases), and the **Broader context** (what it impacts, what you'd need to know to change it safely).
3. **Elicits before it explains** — you restate your understanding first, so it teaches the gap, not the whole textbook.
4. **Explains at your depth** — `eli5`, `eli14`, or like-an-intern, shifting on request, showing real code and the debugger.
5. **Quizzes you** — open-ended for depth, multiple-choice via `AskUserQuestion` with answers never leaked and the correct option never telegraphed.
6. **Won't conclude until you've demonstrated mastery** — a correct guess isn't enough; it drills the *whys* until your understanding bottoms out in a real invariant.

## Trigger it

> "teach me what you just did" · "make sure I understand this change" · "walk me through this" · "why did you do it this way" · "quiz me on this" · "eli5 this diff" · "I don't get it — don't let me fall behind"

## Install

```bash
claude plugin marketplace add aiocean/claude-plugins
claude plugin install aio-understand-ai@aiocean-plugins
```
