<!-- Mermaid Dependency Graph Partial -->
<!-- Usage: Render a dependency subgraph for a set of nodes -->
<!-- Variables: graph_direction (TD|LR|BT|RL), nodes[], edges[] -->

```mermaid
graph {{graph_direction}}
{{#each nodes}}
    {{id}}{{#if is_hub}}[["{{name}}"]]{{else}}["{{name}}"]{{/if}}
{{/each}}

{{#each edges}}
    {{source}} -->{{#if label}}|{{label}}|{{/if}} {{target}}
{{/each}}

{{#each style_classes}}
    classDef {{name}} {{style}}
{{/each}}
{{#each node_classes}}
    class {{node_id}} {{class_name}}
{{/each}}
```
