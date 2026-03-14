# Quality Gates Reference

CI-friendly rules and commands for keeping Oracle-generated docs meaningful over time.

## Gate Definitions

1. **Evidence density**: docs must have `path:line` references throughout the body, not just in a footer.
2. **Placeholder check**: fail if `REPLACE` remains anywhere in docs.
3. **Unknown discipline**: fail if uncertainty is implied but no `Unknowns` section exists.
4. **Drift check**: if module files changed since docs were last generated, corresponding module docs must be updated. Detect with: `git diff --name-only $(git log -1 --format=%H -- docs/) -- src/ lib/ internal/ cmd/ pkg/ | head -20` — if source files changed after the last docs commit, docs are stale.
5. **Writing quality**: no "simply"/"just"/"easily"/"obviously" in docs. No weasel words ("some", "many", "various") without specifics. All code blocks specify language. Headings in sentence case.
6. **Sensitive data**: no webhook URLs, API keys, bot tokens, personal names from git config, internal server names, or file paths containing usernames (`/Users/username/...`, `/home/username/...`). Replace with placeholders like `<YOUR_WEBHOOK_URL>`, `<BOT_TOKEN>`, `your-username`.

## Bundled Checker Commands

```bash
# from project root
bash scripts/doc-quality-check.sh docs

# fallback when developing in this plugin repo
bash scripts/doc-quality-check.sh docs

# CI/MR mode: compare against target branch
DOC_CHECK_BASE_REF=origin/main \
  bash scripts/doc-quality-check.sh docs
```

## Fallback Manual Checks

```bash
# 1) No placeholders
! rg -n "REPLACE" docs/*.md

# 2) Evidence references throughout doc body (not just in a footer)
rg -n '`[^`]+:[0-9]+`' docs/*.md

# 3) Must have Unknowns section
rg -n "### Unknowns" docs/*.md

# 4) No filler/weasel words
! rg -wn "simply|obviously|easily" docs/*.md
# Should not find unqualified weasel words
rg -wn "some\b|many\b|various\b|several\b" docs/*.md

# 5) Writing quality: code blocks specify language, headings in sentence case
# Check for bare code fences (no language specified)
! rg -n '```$' docs/*.md
# Check for Title Case headings (rough check — flags headings where 3+ consecutive words are capitalized)
rg -n '^#{1,6} ([A-Z][a-z]+ ){2,}[A-Z]' docs/*.md

# 6) No sensitive data leakage
! rg -in "webhook.*https?://|bot.*token|api[_-]?key" docs/*.md
! rg -n "/Users/[a-zA-Z]|/home/[a-zA-Z]" docs/*.md
```
