# Claude Plugins Marketplace Landing Page

A cyberpunk developer console landing page for the `aiocean/claude-plugins` marketplace.

## Design

**Aesthetic**: Terminal-inspired cyberpunk interface with:
- Dark obsidian background (#0a0a0f) with animated grid pattern
- Electric cyan accents (#00f0ff) with glow effects
- Monospace typography (JetBrains Mono) for code elements
- Display typography (Space Grotesk) for headlines
- Glassmorphism cards with neon borders
- Scan lines overlay for retro terminal feel

## Features

- **Typing animation** - Hero headline types out on page load
- **Search/filter** - Real-time plugin search by name/description
- **Category filtering** - Filter by DevTools, Utilities, Knowledge, Design
- **Copy to clipboard** - One-click copy for install commands
- **Card glow effects** - Mouse-following glow on featured cards
- **Parallax background** - Floating code snippets move on scroll
- **Keyboard shortcuts** - Press `/` to focus search, `Escape` to blur
- **Responsive design** - Works on all screen sizes

## File Structure

```
landingpage/
├── index.html     # Main HTML structure
├── styles.css     # All styles with CSS variables
├── script.js      # Interactivity and plugin data
└── README.md      # This file
```

## Usage

Open `index.html` in any modern browser:

```bash
open index.html
```

Or serve with a simple HTTP server:

```bash
python3 -m http.server 8000
# or
npx serve .
```

## Data Source

Plugin data is embedded in `script.js` and synced with `../.claude-plugin/marketplace.json`:
- 14 total plugins
- 4 categories: DevTools, Utilities, Knowledge, Design

## Browser Support

- Chrome/Edge 90+
- Firefox 90+
- Safari 14+
