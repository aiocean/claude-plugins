<!-- Health Badge Partial -->
<!-- Usage: Render a traffic-light health indicator -->
<!-- Variables: metric_name, value, thresholds{good, warning, critical} -->

{{#if is_good}}
| {{metric_name}} | {{value}} | Good |
{{/if}}
{{#if is_warning}}
| {{metric_name}} | {{value}} | Needs Attention |
{{/if}}
{{#if is_critical}}
| {{metric_name}} | {{value}} | Critical |
{{/if}}
