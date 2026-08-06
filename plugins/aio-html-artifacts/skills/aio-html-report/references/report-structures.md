# Report structures

Choose the structure that matches the reader's question. Do not combine all of them.

## Investigation / code review

Verdict → scope and method → system path → findings ordered by severity → code/diff evidence beside each finding → cross-system implications → recommendation → verification checklist → evidence register.

## Incident

Current state → impact → event timeline → causal chain → contributing conditions → response evaluation → corrective actions with owner/date → detection gaps → appendix. Keep chronology and causality distinct.

## Implementation plan

Outcome and constraints → current state → proposed flow → milestones and dependencies → key interfaces/code → rollout and observability → risks/mitigations → unresolved decisions → definition of done.

## Research / explainer

Answer in one sentence → mental model → guided walkthrough → worked example → common failure modes → evidence/citations → implications → questions still open.

## Status

Trajectory → what materially changed → shipped outcomes → risk/carryover → decisions or help needed → next horizon. Avoid activity inventories with no consequence.

## Composition patterns

- Use a narrow reading column for reasoning and a wider breakout for diagrams, tables, and code.
- Use a rail for metadata, legend, or navigation only when it stays useful across several sections.
- Use margin callouts to connect findings to exact lines.
- Use a visual seam—rule, large whitespace, or contrast shift—when the story changes phase.
- End with action at the same specificity as the evidence: owner, condition, due date, command, or decision.
