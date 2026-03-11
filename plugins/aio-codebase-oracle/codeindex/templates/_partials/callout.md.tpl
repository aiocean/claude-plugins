<!-- Callout Partial -->
<!-- Usage: Render a highlighted callout box -->
<!-- Variables: type (tip|warning|note|important), content -->

{{#if is_tip}}
> **Tip**: {{content}}
{{/if}}

{{#if is_warning}}
> **Warning**: {{content}}
{{/if}}

{{#if is_note}}
> **Note**: {{content}}
{{/if}}

{{#if is_important}}
> **Important**: {{content}}
{{/if}}
