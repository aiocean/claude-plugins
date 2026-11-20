---
name: aio-rust
description: |
  Use when writing, fixing, refactoring or reviewing Rust code: creating a crate or
  Cargo workspace, editing .rs files or Cargo.toml, fixing cargo build or clippy errors,
  adding threads or async, or setting a project up "properly" for the long term. Makes
  clippy refuse panicking code (unwrap, expect, panic, indexing, overflowing arithmetic,
  truncating casts, unsafe) and gives the panic-free replacement for each.
when_to_use: |
  rust, cargo, Cargo.toml, .rs file, crate, clippy, rustc error, borrow checker, cargo new,
  cargo build fails, unwrap, expect, panic, thread join, overflow, indexing, unsafe_code,
  lints, production-quality Rust, set up a Rust project, viết Rust
argument-hint: "crate directory (optional)"
effort: medium
---

# aio-rust

Rust code an agent writes should not be able to panic in production, and a tool, not the agent's discipline, should enforce that. A strict clippy profile turns the common panic sites into errors. This skill shows what to write instead.

The script is `${CLAUDE_PLUGIN_ROOT}/skills/aio-rust/scripts/aio-rust-lints.sh`. Call it by its full path every time, because shell variables do not persist between commands.

## Workflow

1. **Before editing a crate:** `bash ${CLAUDE_PLUGIN_ROOT}/skills/aio-rust/scripts/aio-rust-lints.sh setup <dir>`. `<dir>` holds the Cargo.toml: the crate, a workspace member, or the workspace root. For a new crate, run `cargo new` first.
   - The script writes the profile into Cargo.toml (`[workspace.lints]` at a workspace root) and the test exemptions into `clippy.toml`.
   - At a workspace root, add `[lints]` `workspace = true` to each member's Cargo.toml.
   - Exit 1 means existing settings conflict. Edit the keys it lists in the tables that already exist, then run setup again until it exits 0.
2. Write the code. When clippy rejects a panic site, rewrite it with the replacement table below.
3. **Before reporting done:** `bash ${CLAUDE_PLUGIN_ROOT}/skills/aio-rust/scripts/aio-rust-lints.sh check <dir>`. It must exit 0. The check runs clippy on all targets with the profile passed on the command line, so it covers every crate whatever its Cargo.toml says. It then fails on any `#[allow]`/`#[expect]` of a profile lint in the source, and runs `cargo test`. `cargo build` and `cargo test` alone run no clippy lints, so they are not the gate.

The profile is `deny` for `unwrap_used`, `expect_used`, `panic`, `todo`, `unimplemented`, `unreachable`, `indexing_slicing`, `string_slice`, `arithmetic_side_effects` and `cast_possible_truncation`, plus `unsafe_code = "forbid"`. Test code (`#[cfg(test)]`, `#[test]`) may still unwrap, expect, panic and index. Macros such as `#[tokio::main]` and `#[derive(clap::Parser)]` work unchanged.

## Replacement table

| Rejected | Write instead |
|---|---|
| `opt.unwrap()` / `opt.expect("..")` | `opt.ok_or(Error::Missing("name"))?` |
| `res.unwrap()` / `res.expect("..")` | `res?`, with `.map_err(..)` or anyhow `.context("..")` to add what failed |
| `handle.join().expect("worker panicked")` | `handle.join().map_err(\|_\| Error::WorkerPanicked)?`. The function returns `Result` and the caller decides. |
| `v[i]`, `&v[a..b]` | `v.get(i).ok_or(..)?`, `v.get(a..b)`. Iterate with `iter()`/`zip`/`windows` instead of indices. |
| `&s[a..b]` on a `str` | `s.get(a..b)`. Byte offsets must fall on char boundaries. |
| `a + b`, `a * b`, `a - b` on input-driven values | `a.checked_add(b).ok_or(Error::Overflow)?` |
| `*count += 1` on a counter | `*count = count.saturating_add(1)`. Saturating is correct only when clamping at MAX is the intended meaning. |
| `a / b`, `a % b` | `a.checked_div(b)`, `a.checked_rem(b)` |
| `x as u32` from a wider type | `u32::try_from(x)?` |
| `panic!` / `todo!` / `unimplemented!` / `unreachable!` | Return an error variant. Leave unfinished paths out of the change. Make an unreachable branch unrepresentable with an enum or a type. |
| `fn main()` that can fail | `fn main() -> anyhow::Result<()>` (app) or `-> ExitCode` after printing the error |

No lint catches `map[&key]` on a `HashMap`/`BTreeMap`: it panics when the key is missing. Write `map.get(&key)` instead.

Error types: libraries define an enum with `thiserror`. Binaries use `anyhow` with `.context(..)` at each I/O call, so the message names the file or input that failed.

## Rationalizations

The check fails on these. The ones on the right still pass, and each hides the failure instead of surfacing it:

| Thought | Reality |
|---|---|
| "A worker panic is a bug, so `expect` there is fine." | The caller decides what a failed worker means. Return it as an error. A panic in a library takes down the caller's whole process. |
| "This invariant can't fail, so `expect` documents it." | If it can't fail, encode it in the type (`NonZero*`, a newtype, a non-empty struct) or restructure so the `Option` never appears. If it can, it's an error. |
| "`unwrap_or_default()` / `unwrap_or(0)` keeps it simple." | Only when the default is the correct meaning (an absent key means 0). If absence is a failure, a silent default hides it. |
| "`wrapping_add` silences the overflow lint." | Wrapping is for modular arithmetic (hashes, checksums). For a quantity or count it is a silent wrong answer. |
| "`let _ = result;` the error doesn't matter here." | Write why in a comment, or handle it. A discarded `Result` is a bug the reader can't see. |
| "Move the logic into a test helper / `#[cfg(test)]` so it passes." | The exemption covers test assertions, not production code paths. |

## Red flags — stop and rewrite

- You are about to edit Cargo.toml or clippy.toml to weaken a level or delete a lint from the profile.
- `wrapping_*`, `unwrap_or_default` or `let _ =` appears where the code reported an error before your change.
- The check step was skipped because "it's a small change".
