#!/usr/bin/env python3
"""
Unit tests for resolve_symbols.py.

Uses a synthetic cli.js fixture that replicates the structural patterns of
Claude Code's minified output — enough to exercise all 6 anchors without
shipping proprietary source. Each test verifies that the resolver extracts
the expected minified name from the synthetic fixture.
"""

import pytest
from resolve_symbols import resolve_symbols, _find_function_before


# Synthetic fixture that mimics the relevant cli.js patterns.
# Minified names here are arbitrary (J4, yT, ky9, o2H, gFn) but match
# the 2.1.131 resolution for documentation purposes.
SYNTHETIC_CLI_JS = """\
// ... preamble ...
var er=someModule.getLogger("com.anthropic.claude_code.events");
function J4(eventName,attrs){er.emit({body:`claude_code.${eventName}`,attributes:attrs})}
var yT={status:"allowed",unifiedRateLimitFallbackAvailable:!1,isUsingOverage:!1};
function ky9(headers){
  for(let[fieldName,headerSuffix]of[["five_hour","5h"],["seven_day","7d"],["overage","overage"]]){
    let u=headers[`anthropic-ratelimit-unified-${headerSuffix}-utilization`];
    let r=headers[`anthropic-ratelimit-unified-${headerSuffix}-reset`];
    if(u!==undefined)result[fieldName]={utilization:parseFloat(u),resets_at:parseInt(r)};
  }
  return result;
}
function oAA(headers){
  o2H=ky9(headers);
  yT.status=headers["anthropic-ratelimit-unified-status"]||"allowed";
}
function gFn(cmdP,toolP,argsP=[],passP=[]){let joinedV=argsP.length>0?`${argsP.join(" ")} "$@"`:'"$@"',winV=1;return[joinedV]}
// ... rest of cli.js ...
"""


class TestResolveSymbols:
    """Test the full resolver against the synthetic fixture."""

    def test_resolves_all_symbols(self):
        syms = resolve_symbols(SYNTHETIC_CLI_JS)
        assert syms["emit_helper"] == "J4"
        assert syms["state"] == "yT"
        assert syms["parser"] == "ky9"
        assert syms["buckets"] == "o2H"
        assert syms["arg"] == "headers"
        assert syms["shadow_cmd"] == "cmdP"
        assert syms["shadow_tool"] == "toolP"
        assert syms["shadow_args"] == "joinedV"

    def test_all_values_are_identifiers(self):
        syms = resolve_symbols(SYNTHETIC_CLI_JS)
        import re

        for k, v in syms.items():
            assert v, f"{k} is empty"
            assert re.match(r"^\w+$", v), f"{k}={v!r} is not a valid JS identifier"

    def test_returns_exactly_8_keys(self):
        syms = resolve_symbols(SYNTHETIC_CLI_JS)
        expected = {
            "emit_helper",
            "state",
            "parser",
            "buckets",
            "arg",
            "shadow_cmd",
            "shadow_tool",
            "shadow_args",
        }
        assert set(syms.keys()) == expected


class TestAnchorFailures:
    """Test that missing anchors produce clear error messages."""

    def test_missing_emit_body_template(self):
        text = SYNTHETIC_CLI_JS.replace("body:`claude_code.${", "body:`other_prefix.${")
        with pytest.raises(SystemExit, match="anchor 1 failed"):
            resolve_symbols(text)

    def test_missing_state_object(self):
        # Change the property name so the anchor doesn't match
        text = SYNTHETIC_CLI_JS.replace(
            "unifiedRateLimitFallbackAvailable", "somethingCompletelyDifferent"
        )
        with pytest.raises(SystemExit, match="anchor 2 failed"):
            resolve_symbols(text)

    def test_state_survives_added_fields(self):
        """State anchor only matches the beginning of the object, so added
        fields after unifiedRateLimitFallbackAvailable don't break it."""
        text = SYNTHETIC_CLI_JS.replace(
            "isUsingOverage:!1}", 'isUsingOverage:!1,newField:"test",anotherField:42}'
        )
        syms = resolve_symbols(text)
        assert syms["state"] == "yT"

    def test_state_survives_changed_values(self):
        """State anchor doesn't depend on the values after the first two
        property names, so changed values don't break it."""
        text = SYNTHETIC_CLI_JS.replace(
            "unifiedRateLimitFallbackAvailable:!1,isUsingOverage:!1",
            "unifiedRateLimitFallbackAvailable:!0,isUsingOverage:!0",
        )
        syms = resolve_symbols(text)
        assert syms["state"] == "yT"

    def test_missing_dispatch_table(self):
        text = SYNTHETIC_CLI_JS.replace(
            '[["five_hour","5h"],["seven_day","7d"],["overage","overage"]]',
            '[["different","x"]]',
        )
        with pytest.raises(SystemExit, match="anchor 3 failed"):
            resolve_symbols(text)

    def test_missing_header_template(self):
        text = SYNTHETIC_CLI_JS.replace(
            "`anthropic-ratelimit-unified-${", "`some-other-header-${"
        )
        with pytest.raises(SystemExit, match="anchor 4 failed"):
            resolve_symbols(text)

    def test_missing_buckets_assignment(self):
        text = SYNTHETIC_CLI_JS.replace("o2H=ky9(", "o2H=somethingElse(")
        with pytest.raises(SystemExit, match="anchor 5 failed"):
            resolve_symbols(text)

    def test_missing_shadow_generator(self):
        # Break the shadow generator's structural anchor (the `.length>0`
        # discriminator) so anchor 6's regex no longer matches.
        text = SYNTHETIC_CLI_JS.replace("argsP.length>0", "argsP.count>0")
        with pytest.raises(SystemExit, match="anchor 6 failed"):
            resolve_symbols(text)


class TestFindFunctionBefore:
    """Test the backward-scanning function finder."""

    def test_finds_nearest_function(self):
        text = "function foo(a,b){var x=1;return x;}"
        idx = text.index("var x")
        assert _find_function_before(text, idx) == "foo"

    def test_finds_last_of_multiple(self):
        text = "function first(){stuff()}function second(){var x=1;}"
        idx = text.index("var x")
        assert _find_function_before(text, idx) == "second"

    def test_raises_when_no_function(self):
        text = "var x=1; if(true){y=2;}"
        with pytest.raises(ValueError, match="no function declaration"):
            _find_function_before(text, len(text) - 1)

    def test_respects_window_size(self):
        # Function is outside the window
        text = "function far(){}" + "x" * 100 + "anchor"
        idx = text.index("anchor")
        # Window of 50 won't reach the function declaration
        with pytest.raises(ValueError, match="no function declaration"):
            _find_function_before(text, idx, window_size=50)


class TestDifferentMinifiedNames:
    """Verify the resolver works when names change (the whole point)."""

    def test_renamed_symbols(self):
        # Simulate a future release where all names are different
        text = SYNTHETIC_CLI_JS
        text = text.replace("function J4(", "function Q9(")
        text = text.replace("yT={", "aB={").replace("yT.status", "aB.status")
        text = text.replace("function ky9(", "function xR3(")
        text = text.replace("o2H=ky9(", "mN=xR3(")

        syms = resolve_symbols(text)
        assert syms["emit_helper"] == "Q9"
        assert syms["state"] == "aB"
        assert syms["parser"] == "xR3"
        assert syms["buckets"] == "mN"
        assert syms["arg"] == "headers"

    def test_different_arg_name(self):
        """The resolver captures whatever the minifier chose as the
        parser argument — not hardcoded to any specific name."""
        text = SYNTHETIC_CLI_JS.replace("ky9(headers)", "ky9(_)")
        syms = resolve_symbols(text)
        assert syms["arg"] == "_"

        text2 = SYNTHETIC_CLI_JS.replace("ky9(headers)", "ky9(a)")
        syms2 = resolve_symbols(text2)
        assert syms2["arg"] == "a"

    def test_renamed_shadow_symbols(self):
        """Shadow generator symbols resolve regardless of minified names —
        the per-platform drift that broke the original static patch."""
        text = SYNTHETIC_CLI_JS.replace(
            "function gFn(cmdP,toolP,argsP=[],passP=[]){let joinedV=argsP",
            "function zQ(x9,y8,p7=[],r6=[]){let s5=p7",
        )
        text = text.replace("${argsP.join", "${p7.join")
        syms = resolve_symbols(text)
        assert syms["shadow_cmd"] == "x9"
        assert syms["shadow_tool"] == "y8"
        assert syms["shadow_args"] == "s5"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
