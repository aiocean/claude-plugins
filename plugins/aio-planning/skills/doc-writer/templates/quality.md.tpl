# Code Quality: {{project_name}}

> Complexity analysis, maintainability metrics, and architectural violations

## Health Summary

| Indicator | Value | Status | Threshold |
|-----------|-------|--------|-----------|
| Avg Maintainability Index | {{avg_maintainability}} | {{mi_status}} | > 40 good, < 20 critical |
| High Complexity Components | {{high_complexity_count}} / {{total_components}} | {{complexity_status}} | CC > 10 or CogC > 15 |
| Architectural Violations | {{violation_count}} | {{violation_status}} | 0 = clean |
| Circular Dependencies | {{circular_dep_count}} | {{circular_status}} | 0 = clean |
| Hidden Couplings | {{hidden_coupling_count}} | {{coupling_status}} | 0 = clean |

## Complexity Hotspots

<!-- Components ranked by combined complexity score -->

### Cyclomatic Complexity (Top 20)

| Component | CC | File | Lines | Assessment |
|-----------|----|------|-------|------------|
{{#each top_cyclomatic}}
| {{name}} | {{cc}} | `{{file_path}}:{{line}}` | {{nloc}} | {{assessment}} |
{{/each}}

> CC 1-10: simple | CC 11-20: moderate | CC 21-50: complex | CC 50+: untestable

### Cognitive Complexity (Top 20)

| Component | CogC | File | Lines | Assessment |
|-----------|------|------|-------|------------|
{{#each top_cognitive}}
| {{name}} | {{cognitive}} | `{{file_path}}:{{line}}` | {{nloc}} | {{assessment}} |
{{/each}}

> CogC > 15: hard to understand | CogC > 25: should be refactored

## Maintainability Index Distribution

<!-- SEI Maintainability Index: 0-100 scale -->

| Range | Count | Components | Assessment |
|-------|-------|------------|------------|
| 80-100 | {{mi_excellent_count}} | {{mi_excellent_pct}}% | Excellent |
| 40-79 | {{mi_good_count}} | {{mi_good_pct}}% | Good |
| 20-39 | {{mi_moderate_count}} | {{mi_moderate_pct}}% | Moderate — needs attention |
| 0-19 | {{mi_critical_count}} | {{mi_critical_pct}}% | Critical — refactor priority |

### Lowest Maintainability Components

| Component | MI | CC | CogC | NLOC | File |
|-----------|----|----|------|------|------|
{{#each lowest_maintainability}}
| {{name}} | {{mi}} | {{cc}} | {{cognitive}} | {{nloc}} | `{{file_path}}` |
{{/each}}

## Architectural Violations

{{#each violation_rules}}
### {{rule_name}}

{{rule_description}}

**Affected**: {{count}} components | **Severity**: {{severity}}

| Component | File | Detail |
|-----------|------|--------|
{{#each components}}
| {{name}} | `{{file_path}}` | {{detail}} |
{{/each}}

{{/each}}

### Violation Rules Reference

| Rule | Description | Threshold |
|------|-------------|-----------|
| God Component | Fan-in >= 10 AND complexity > 70 | High coupling + high complexity |
| Long Circular Dep | Cycle length > 3 | Deep circular chains |
| Unstable Hub | Hub with instability > 0.8 | Central component too dependent on others |
| Low Maintainability | MI < 20 AND (NLOC > 20 or CC > 5) | Hard to maintain |
| High Cognitive Complexity | CogC > 15 | Hard to understand |
| Hidden Coupling | Temporal coupling > 0.7 without code dep | Implicit dependency |
| Bottleneck | Top 5% betweenness AND fan-in >= 5 | Single point of failure |

## Improvement Priorities

<!-- Ranked by impact: how many violations/metrics would improve if addressed -->

{{#each priorities}}
{{index}}. **{{title}}**
   - Impact: {{impact}}
   - Components affected: {{component_count}}
   - Suggested action: {{action}}
{{/each}}

## Trends

<!-- If historical data is available, show metric trends -->

{{#if has_trends}}
| Metric | Previous | Current | Change |
|--------|----------|---------|--------|
{{#each trends}}
| {{metric}} | {{previous}} | {{current}} | {{change}} |
{{/each}}
{{/if}}

{{#if no_trends}}
> Historical trend data not available. Run CodeWiki periodically to track trends over time.
{{/if}}
