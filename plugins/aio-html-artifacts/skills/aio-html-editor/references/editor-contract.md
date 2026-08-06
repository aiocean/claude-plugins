# Editor contract

Write this contract before HTML:

```text
Source:        where the initial data came from and its revision
Schema:        fields, types, IDs, ordering rules
Operations:    what the user may change
Invariants:    what must remain true
Derived state: what previews/scores/warnings are computed
Dirty state:   how original and current values are compared
Export:        exact format, ordering, and inclusion rules
Failure paths: invalid input, empty data, clipboard blocked, reset
```

## Interaction rules

- Prefer direct manipulation only when it reduces effort; always provide a button/keyboard alternative.
- Use `aria-live="polite"` for export and validation feedback.
- Disable impossible actions, but explain why near the control.
- Confirmation is required for destructive reset when meaningful work may be lost.
- Keep stable IDs independent of visual order.
- Serialize deterministically: stable key order, explicit indentation, newline at end when exporting a file.
- Never claim a change is saved merely because it exists in browser memory.

## Export patterns

- **Copy diff:** only changed keys plus old/new values.
- **Copy JSON:** complete machine-readable current state.
- **Copy prompt:** human-readable context, requested changes, constraints, and unresolved warnings.
- **Download:** use a Blob and revoke the object URL after use.

Clipboard calls can fail on local files or insecure origins. Include a textarea/dialog fallback that selects the full export.
