#!/usr/bin/env python3
"""
Resolve minified symbol names from stable anchors in Claude Code's cli.js.

Bun's minifier renames every internal identifier between releases, so
hard-coded symbol names break on each new Anthropic release. This module
resolves names from structural/string-literal anchors that Anthropic
cannot mangle without breaking their own contracts.

Six anchors (all verified on Claude Code 2.1.131+):

  1. Emit helper      — enclosing function of ``body:`claude_code.${ `` template
  2. State var        — `<var>={status:"allowed",unifiedRateLimitFallbackAvailable:`
  3. Parser function  — enclosing function of `[["five_hour","5h"],["seven_day","7d"],...]`
  4. Header template  — defense-in-depth: `anthropic-ratelimit-unified-${`
  5. Buckets + arg    — `<var>=<parser>(<arg>)` at caller site
  6. Shadow generator — grep/find shell-shadow builder; resolves its
                        command-name / tool-name / joined-args identifiers

Usage as CLI (for verification):
  python3 resolve_symbols.py <cli-body.js>
  → prints JSON dict with keys: emit_helper, state, parser, buckets, arg,
    shadow_cmd, shadow_tool, shadow_args

Usage as library:
  from resolve_symbols import resolve_symbols
  syms = resolve_symbols(open("cli-body.js").read())
"""

import json
import re
import sys


def _find_function_before(text: str, idx: int, window_size: int = 8192) -> str:
    """Find the nearest named function declaration before idx.

    Scans backward for `function NAME(` within a window. More robust than
    brace-counting for minified code where string literals containing { }
    can miscount nesting depth. Trade-off: a nested inner function between
    the target function's header and the anchor would fool this scan, but
    Bun's minified output keeps these functions compact with no inner named
    declarations near our specific anchor points.
    """
    window_start = max(0, idx - window_size)
    window = text[window_start:idx]

    matches = list(re.finditer(r"function\s+([a-zA-Z_$][\w$]*)\s*\(", window))
    if not matches:
        raise ValueError(
            f"no function declaration found within {window_size} bytes before index {idx}"
        )
    return matches[-1].group(1)


def resolve_symbols(text: str) -> dict:
    """Resolve 8 symbol names from stable anchors in cli.js source text.

    Returns dict with keys: emit_helper, state, parser, buckets, arg,
    shadow_cmd, shadow_tool, shadow_args.
    Raises SystemExit with a descriptive error if any anchor is not found.
    """
    s = {}

    # Anchor 1 — emit helper function
    # Stable because `body:\`claude_code.\${...}\`` is the OTel event-name format
    # that dashboards query by (e.g. WHERE body = 'claude_code.api_request').
    idx = text.find("body:`claude_code.${")
    if idx < 0:
        raise SystemExit(
            "resolve: anchor 1 failed — emit body template not found "
            "(expected `body:\\`claude_code.\\${`)"
        )
    s["emit_helper"] = _find_function_before(text, idx)

    # Anchor 2 — rate-limit state variable
    # Matches the beginning of the state object initialization. Only depends on
    # the first property name+value and the second property name — not the full
    # object literal. Property names are API-contract identifiers that Anthropic
    # can't rename without breaking their own rate-limit consumers.
    m = re.search(
        r'([a-zA-Z_$][\w$]*)=\{status:"allowed",unifiedRateLimitFallbackAvailable:',
        text,
    )
    if not m:
        raise SystemExit(
            "resolve: anchor 2 failed — state object init not found "
            '(expected `<var>={status:"allowed",unifiedRateLimitFallbackAvailable:`)'
        )
    s["state"] = m.group(1)

    # Anchor 3 — parser function
    # Stable because the dispatch table maps API-contract field names to
    # API-contract header suffixes. Anthropic can't rename "five_hour"/"5h"
    # without breaking every downstream consumer of those headers.
    dispatch_literal = '[["five_hour","5h"],["seven_day","7d"],["overage","overage"]]'
    idx = text.find(dispatch_literal)
    if idx < 0:
        raise SystemExit(
            "resolve: anchor 3 failed — parser dispatch table not found "
            f"(expected `{dispatch_literal}`)"
        )
    s["parser"] = _find_function_before(text, idx)

    # Anchor 4 — defense-in-depth: confirm rate-limit header template exists.
    # Not a symbol extraction, just a validation that the rate-limit code is
    # present and structurally intact.
    header_template = "`anthropic-ratelimit-unified-${"
    if header_template not in text:
        raise SystemExit(
            "resolve: anchor 4 failed — ratelimit header template not found "
            f"(expected `{header_template}`)"
        )

    # Anchor 5 — buckets variable + parser argument
    # Pattern: `<buckets>=<parser>(<arg>)` where <parser> is resolved above.
    # Captures the actual argument name so the patch anchor matches regardless
    # of what the minifier chose (could be `_`, `a`, `headers`, etc.).
    # Use JS identifier pattern ([a-zA-Z_$][\w$]*) instead of \w+ so that
    # $-prefixed names (e.g. $0H) produced by some Bun minifier targets are
    # captured in full. Python's \w does not match $, causing partial capture
    # that generates invalid JS like `0H.five_hour` in the replacement.
    pattern = rf"([a-zA-Z_$][\w$]*)={re.escape(s['parser'])}\(([^)$\s]+)\)"
    m = re.search(pattern, text)
    if not m:
        raise SystemExit(
            f"resolve: anchor 5 failed — buckets assignment not found "
            f"(expected `<var>={s['parser']}(<arg>)`)"
        )
    s["buckets"] = m.group(1)
    s["arg"] = m.group(2)

    # Anchor 6 — grep/find shell-shadow generator.
    # This function builds the `function grep {…}` / `function find {…}`
    # shell snippet Claude Code injects into its shell snapshot. Anchored on
    # the function's fixed shape (two required params, two `=[]`-defaulted
    # params) plus the `.join(" ")` / `"$@"` shell-syntax string literals,
    # which Anthropic cannot rename without breaking the generated shell.
    # Captures the command-name param, the tool-name param, and the
    # joined-args local — consumed by the `shadow_grep_find_siblings` patch.
    m = re.search(
        r"function [\w$]+\(([\w$]+),([\w$]+),([\w$]+)=\[\],[\w$]+=\[\]\)\{"
        r'let ([\w$]+)=\3\.length>0\?`\$\{\3\.join\(" "\)\} "\$@"`:\'"\$@"\',',
        text,
    )
    if not m:
        raise SystemExit(
            "resolve: anchor 6 failed — grep/find shadow generator not found "
            "(expected `function X(a,b,c=[],d=[]){let O=c.length>0?...`)"
        )
    s["shadow_cmd"] = m.group(1)
    s["shadow_tool"] = m.group(2)
    s["shadow_args"] = m.group(4)

    return s


def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <cli-body.js>", file=sys.stderr)
        sys.exit(2)

    text = open(sys.argv[1], "r", errors="replace").read()
    syms = resolve_symbols(text)
    print(json.dumps(syms, indent=2))

    # Sanity: all values must be non-empty identifiers
    for k, v in syms.items():
        if not v or not re.match(r"^[a-zA-Z_$][\w$]*$", v):
            print(f"WARNING: {k} resolved to suspicious value: {v!r}", file=sys.stderr)
            sys.exit(1)

    print(f"\nResolved {len(syms)} symbols successfully.", file=sys.stderr)


if __name__ == "__main__":
    main()
