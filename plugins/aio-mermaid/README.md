# aio-mermaid

Generate shareable MinimalMermaid diagram URLs. Compress mermaid code into shareable links.

## Install

```bash
/plugin install aio-mermaid@aiocean-plugins
```

## What It Does

- Generate Mermaid diagram definitions (flowchart, sequence, ER, etc.)
- Compress diagram source using LZ-String encoding
- Produce shareable URLs hosted at mimaid.aiocean.dev
- No server upload — diagram is encoded entirely in the URL

## Requirements

- bun or node (for LZ-String compression script)
