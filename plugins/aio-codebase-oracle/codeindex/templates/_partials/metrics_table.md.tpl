<!-- Metrics Table Partial -->
<!-- Usage: Render a sortable metrics table for a set of components -->
<!-- Variables: title, components[], columns[] -->

### {{title}}

| Component | Type | File {{#each extra_columns}}| {{header}} {{/each}}|
|-----------|------|------{{#each extra_columns}}|{{separator}}{{/each}}|
{{#each components}}
| {{name}} | {{type}} | `{{file_path}}:{{line}}` {{#each metrics}}| {{value}} {{/each}}|
{{/each}}

{{#if footnote}}
> {{footnote}}
{{/if}}
