# Revising an existing artifact

A revision request edits the file that exists. Regenerating from scratch to satisfy one is a
defect: it destroys the shared anchors other documents and chat messages already link to, and it
throws away every hand edit the reader made after you handed the file over.

## Procedure

1. **Read the file.** Open it with Read before forming the edit, so the change lands on the
   markup that is actually there.
2. **Keep fixed:** the `:root` token block, the `id` on every section and figure, every
   `href="#…"` that points at them, the structure recorded in the `ARTIFACT CONTRACT` comment,
   and the declared voice. These are the parts other people have addresses into.
3. **Make the smallest edit that satisfies the request,** with Edit rather than Write. One
   sentence changed is one sentence changed.
4. **Update the revision stamp** so the file states its own history:

```html
<p class="revision" data-revision="3" data-revised="2026-08-13T14:40Z">
  Revision 3 · 2026-08-13T14:40Z · softened the pool recommendation to
  <b class="conf">likely (55-80%)</b>; added the rollback section.
</p>
```

5. **Re-run the validator for the same kind** the artifact was generated as:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-html-artifact.mjs" --kind <report|deck|explorer|editor> <path>`
6. **Report a change summary:** the absolute path, what changed, what stayed, the validator's
   PASS line verbatim, and any remaining warnings.

## The common follow-ups, and the edit each one is

| Request | Smallest edit |
|---|---|
| Soften the recommendation | Replace the confidence word and its numeric band in the verdict sentence and in the matching `data-confidence` attribute. The section, its evidence, and its id stay. |
| Add a rollback section | Insert one `<section id="rollback">` after the recommendation section, built from the same internal skeleton every other section uses — claim heading → verdict line with band → same chart form → `<details>` excerpt → impact line — and add its entry to the nav. |
| Add a section | Same skeleton, placed where the spine's transition type puts it, with a fresh id that no existing id prefixes. |
| Change the recommendation | Rewrite the `data-claim="recommended"` paragraph, the verdict sentence in the first screen, and the falsifier entry that tests it. Every section id stays, so existing links keep resolving. |
| Update numbers after a rerun | Edit the `<details>` data table and the `<script type="application/json" class="chart-src">` island in the same pass, set the island's `ran_at` to the new run, then move the SVG mark geometry onto the new values. Update the coverage line if the scanned/total split moved. |

A request that changes the reader, the question, or the genre is a new artifact with its own
contract — write it beside the old one and say which one supersedes which in the handoff.
