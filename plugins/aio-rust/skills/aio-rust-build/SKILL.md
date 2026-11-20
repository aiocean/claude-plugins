---
name: aio-rust-build
description: |
  Use when Rust builds are slow, cargo target/ folders fill the disk, several agents or
  terminals build Rust projects in parallel, or someone asks to set up ~/.cargo/config.toml,
  .cargo/config.toml, sccache, build-dir, target-dir, incremental compilation, debuginfo
  size, or cleanup of old build output. Also use before changing an existing cargo config
  or redirecting build output with CARGO_TARGET_DIR.
when_to_use: |
  slow rust build, cargo build slow, compile time, incremental, target dir too big, disk full,
  No space left on device, sccache, build-dir, target-dir, CARGO_TARGET_DIR, cargo config,
  ~/.cargo/config.toml, debuginfo, split-debuginfo, cargo clean, cargo-sweep, parallel agents,
  build chậm, ổ đầy, dọn target
argument-hint: "project or workspace directory (optional)"
effort: low
---

# aio-rust-build

Fast Rust builds with bounded disk use come from four settings, applied once in the global `~/.cargo/config.toml` so every project gets them. Turning incremental compilation off is never one of them.

## Before changing anything

1. Read `~/.cargo/config.toml` and every `.cargo/config.toml` from the project up to `/`, plus `CARGO_TARGET_DIR`, `CARGO_BUILD_*` and `RUSTC_WRAPPER` in the environment. An existing `target-dir` or `build-dir` usually points at a disk chosen on purpose, often because the internal disk is nearly full. Keep it. Do not export `CARGO_TARGET_DIR` over it.
2. Measure: `cargo build --timings` writes an HTML report of which crates dominate the build. Apply a setting for a cause the report shows.

## The global config

```toml
# Most debug-build bytes are DWARF. Line tables keep file:line in panics and backtraces.
[profile.dev]
debug = "line-tables-only"

# Dependencies are rarely stepped through in a debugger.
[profile.dev.package."*"]
debug = false

[build]
# Intermediates (deps, incremental, build scripts) in one folder per workspace, on the disk
# with room. Final binaries stay in each project's target/.
build-dir = "/path/with/room/rust-build/{workspace-path-hash}"
# Shares compiled third-party crates across projects.
rustc-wrapper = "sccache"
```

| Setting | Why | Limit |
|---|---|---|
| `debug = "line-tables-only"`, deps `debug = false` | Shrinks the build dir and link time. On macOS most debug-build bytes are DWARF. | Full variable inspection in a debugger needs `debug = true` again, per project. |
| `build-dir` with `{workspace-path-hash}` | Moves heavy intermediates off the project folder. Each workspace gets its own folder, so parallel builds never wait on each other's lock. | If the path is on a removable drive, builds fail while it is unplugged. That is better than silently filling the internal disk. |
| `rustc-wrapper = "sccache"` | Compiles a given dependency version once for every project. | Workspace crates build incrementally, which sccache does not cache. Expect a hit rate well under 100%; the non-cacheable calls are your own crates. Put its cache (`[cache.disk] dir`, `size`) on the same disk as the build dir. |
| Incremental stays on (the dev default) | Rebuilds after a small edit recompile only what changed. | It costs disk; bound that with cleanup, not by turning it off. |

## Do not

| Tempting fix | What goes wrong |
|---|---|
| One `target-dir` (or `CARGO_TARGET_DIR`) shared by every project | All builds wait on one lock, so parallel agents serialize. Binaries with the same name from different projects overwrite each other. |
| `incremental = false` / `CARGO_INCREMENTAL=0` to save disk | Every edit rebuilds whole crates, so builds slow down a lot. Bound disk with cleanup instead. |
| `cargo clean` as the routine fix | It throws away the incremental and dependency cache, so the next build is a full one. Run it only when the user asks, or for a broken build state. |
| Building into the internal disk when the configured build disk is missing | It can fill the system disk. Stop and tell the user the drive is unmounted. |

## Cleanup

Build folders grow without limit. Remove stale ones on a schedule:

- Per project: `cargo sweep --time 7` ([cargo-sweep](https://crates.io/crates/cargo-sweep)) deletes artifacts not used in 7 days.
- Across a shared `build-dir` root: delete workspace folders with no compile in N days or above a size cap. Skip folders that a running cargo has locked.

## Workspaces

`cargo build -p <crate>` resolves dependency features for the selected crates only, so building different members can compile a shared dependency (tokio, serde) once per feature set. On nightly, unify features across the workspace in its `.cargo/config.toml`:

```toml
[unstable]
feature-unification = true

[resolver]
feature-unification = "workspace"
```

Stable cargo ignores them and prints `warning: ignoring resolver.feature-unification without -Zfeature-unification`.
