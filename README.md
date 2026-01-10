# Claude Code Plugin Marketplace

A collection of Claude Code plugins by aiocean.

## Installation

Add this marketplace:

```bash
/plugin marketplace add aiocean/claude-plugins
```

Then install plugins:

```bash
/plugin install <plugin-name>@aiocean-plugins
```

## Available Plugins

_No plugins yet. Add your first plugin to `plugins/` directory._

## Creating a Plugin

1. Create a directory in `plugins/`:

```
plugins/my-plugin/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   └── hello.md
└── README.md
```

2. Add `plugin.json`:

```json
{
  "name": "my-plugin",
  "description": "What it does",
  "version": "1.0.0",
  "author": { "name": "Your Name" }
}
```

3. Register in `.claude-plugin/marketplace.json`

4. Push changes
