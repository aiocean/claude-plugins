# Upgrade Andy Note Nuxt to 0.15.0

## Goal

Upgrade the marketplace site from the published `andy-note-nuxt` 0.11 line to
the published 0.15 line, preserve the site's current consumer-owned behavior,
and deploy the generated site through the existing Cloudflare Pages workflow.

## Scope

- Change `docs/package.json` from `andy-note-nuxt@^0.11.0` to
  `andy-note-nuxt@^0.15.0`.
- Regenerate `docs/bun.lock` with Bun so it resolves 0.15.0 and its published
  transitive dependencies.
- Update release-specific Andy references in `docs/CLAUDE.md` to describe the
  installed release accurately.
- Keep the existing consumer configuration, content schema, local components,
  locale plugin, AI-annotator dependency, and disabled reader-comments state.
- Exclude uncommitted files from `/Users/firegroup/projects/andy-note-nuxt`.
- Preserve unrelated worktree changes.

## Compatibility

Andy 0.15.0 adds inherited KaTeX markdown rendering, reader-comments machinery,
loading feedback, and column styling fixes. Reader comments remain disabled by
the layer default, so this consumer does not need Firebase, VueFire module
configuration, Firestore rules, or deployment bindings. The six generic content
query fields and `rawbody` field already declared by the consumer remain valid.

The existing Vietnamese content routing limitation is unchanged by this
upgrade. The marketplace continues to ship Vietnamese prerendered routes with
the known layer-level Not Found body until locale-aware collection routing is
implemented upstream or in a consumer override.

## Verification

1. Generate the lockfile with `bun install`, then prove reproducibility with
   `bun install --frozen-lockfile` in `docs/`.
2. Confirm both the manifest and lockfile resolve Andy 0.15.0 and contain no
   stale 0.11.0 release references.
3. Run the repository validation script and the marketplace static generation.
4. Smoke-test generated English index, plugin listing, and representative
   article output; record the Vietnamese route as the known baseline.
5. Exercise inherited math rendering with a disposable content fixture, verify
   KaTeX markup in generated output, and remove the fixture.
6. Obtain an independent review of the final diff and verification evidence.

## Deployment

Commit only the upgrade files, push the verified commit to `main`, and let
`.github/workflows/pages.yml` build and deploy `docs/.output/public` to the
`claude-plugins` Cloudflare Pages project. Confirm the workflow succeeds and the
production domain serves the deployed commit or equivalent version evidence.

## Rollback

Revert the upgrade commit and push the revert to `main`. The same Pages workflow
will rebuild the previous dependency graph and replace the production deployment.
