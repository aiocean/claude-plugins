# Patch body sources

Big patch bodies live as readable `.js` files here. `inline_sources.py` reads
them and inlines them into the `new` field of the matching patch in
`tools/pipeline/patches.json` at build time.

- Name a source file `<basename>.js` and reference it in patches.json as
  `"new_from_source": "<basename>"`.
- Reference example: `dirty_control_channel.js.example` (the HTTP control-channel
  patch body from the dirty-claude reference project).

When you write your first patch body:
1. Copy `dirty_control_channel.js.example` to `my_patch.js`
2. Edit it
3. Reference it in `tools/pipeline/patches.json` patches list
4. Run `./tools/build.sh` — `inline_sources.py` syncs the body into patches.json before patching
