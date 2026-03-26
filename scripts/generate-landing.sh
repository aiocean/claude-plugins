#!/bin/bash
set -euo pipefail

# Generate docs/index.html from .claude-plugin/marketplace.json
# Usage: bash scripts/generate-landing.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MARKETPLACE="$ROOT_DIR/.claude-plugin/marketplace.json"
OUTPUT="$ROOT_DIR/docs/index.html"

if [ ! -f "$MARKETPLACE" ]; then
  echo "ERROR: $MARKETPLACE not found" >&2
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required. Install with: brew install jq" >&2
  exit 1
fi

MARKETPLACE_NAME=$(jq -r '.name' "$MARKETPLACE")
REPO="$(jq -r '.owner.name' "$MARKETPLACE")/claude-plugins"

# Category mapping — plugin name → category
declare -A CATEGORIES=(
  [aio-codebase-oracle]="Codebase & Architecture"
  [aio-deep-plan]="Codebase & Architecture"
  [aio-debug]="Codebase & Architecture"
  [aio-code-review]="Codebase & Architecture"
  [aio-worktree]="Development Tools"
  [aio-bun-fullstack-setup]="Development Tools"
  [aio-claude-manager]="Development Tools"
  [aio-reflect]="Development Tools"
  [aio-feedback]="Development Tools"
  [aio-install]="Development Tools"
  [aio-golang-mastery]="Language & Framework"
  [aio-react-minimal-effects]="Language & Framework"
  [aio-xstate]="Language & Framework"
  [aio-tui]="Language & Framework"
  [aio-ios-device-debug]="iOS"
  [aio-uiux]="Design & Visualization"
  [aio-neobrutalism]="Design & Visualization"
  [aio-mermaid]="Design & Visualization"
  [aio-grafana-diagram]="Design & Visualization"
  [aio-monitoring-observability]="Observability"
  [aio-mental-models]="Content & Knowledge"
  [aio-youtube]="Content & Knowledge"
  [aio-epub-packing]="Content & Knowledge"
  [aio-epub-translate]="Content & Knowledge"
  [aio-gherkin-refine]="Content & Knowledge"
  [aio-research-kit]="Content & Knowledge"
  [aio-jira]="Integrations"
  [aio-github]="Integrations"
  [aio-gitlab]="Integrations"
  [aio-confluence]="Integrations"
  [aio-google-workspace]="Integrations"
  [aio-x]="Integrations"
  [aio-tanca]="Integrations"
  [aio-rag-kit]="Integrations"
  [aio-browser-cookie]="Integrations"
  [aio-remove-bg]="Development Tools"
)

# Category display order
CATEGORY_ORDER=(
  "Codebase & Architecture"
  "Development Tools"
  "Language & Framework"
  "iOS"
  "Design & Visualization"
  "Observability"
  "Content & Knowledge"
  "Integrations"
)

# Read plugins from marketplace.json (skip deprecated)
PLUGINS_JSON=$(jq -c '[.plugins[] | select(.deprecated != true) | {name: .name, version: .version, desc: .description}]' "$MARKETPLACE")
PLUGIN_COUNT=$(echo "$PLUGINS_JSON" | jq 'length')

echo "Generating landing page from $PLUGIN_COUNT plugins..."

# Build JS plugin data grouped by category
build_plugin_js() {
  local first_cat=true
  echo "const PLUGINS = ["

  for category in "${CATEGORY_ORDER[@]}"; do
    # Collect plugins for this category
    local plugins_in_cat=()
    local count
    count=$(echo "$PLUGINS_JSON" | jq 'length')

    for ((i = 0; i < count; i++)); do
      local name
      name=$(echo "$PLUGINS_JSON" | jq -r ".[$i].name")
      local mapped_cat="${CATEGORIES[$name]:-Uncategorized}"
      if [ "$mapped_cat" = "$category" ]; then
        plugins_in_cat+=("$i")
      fi
    done

    [ ${#plugins_in_cat[@]} -eq 0 ] && continue

    if [ "$first_cat" = true ]; then
      first_cat=false
    else
      echo "  ,"
    fi

    echo "  {"
    echo "    category: \"$category\","
    echo "    plugins: ["

    local first_plugin=true
    for idx in "${plugins_in_cat[@]}"; do
      local name version desc
      name=$(echo "$PLUGINS_JSON" | jq -r ".[$idx].name")
      version=$(echo "$PLUGINS_JSON" | jq -r ".[$idx].version")
      desc=$(echo "$PLUGINS_JSON" | jq -r ".[$idx].desc" | sed 's/"/\\"/g' | head -c 200)

      if [ "$first_plugin" = true ]; then
        first_plugin=false
      else
        echo "      ,"
      fi
      echo "      { name: \"$name\", version: \"$version\", desc: \"$desc\" }"
    done

    echo "    ]"
    echo "  }"
  done

  # Check for uncategorized plugins
  local count
  count=$(echo "$PLUGINS_JSON" | jq 'length')
  local uncat_plugins=()
  for ((i = 0; i < count; i++)); do
    local name
    name=$(echo "$PLUGINS_JSON" | jq -r ".[$i].name")
    local mapped_cat="${CATEGORIES[$name]:-}"
    if [ -z "$mapped_cat" ]; then
      uncat_plugins+=("$i")
      echo "  WARNING: Uncategorized plugin: $name" >&2
    fi
  done

  if [ ${#uncat_plugins[@]} -gt 0 ]; then
    echo "  ,"
    echo "  {"
    echo "    category: \"Other\","
    echo "    plugins: ["
    local first_plugin=true
    for idx in "${uncat_plugins[@]}"; do
      local name version desc
      name=$(echo "$PLUGINS_JSON" | jq -r ".[$idx].name")
      version=$(echo "$PLUGINS_JSON" | jq -r ".[$idx].version")
      desc=$(echo "$PLUGINS_JSON" | jq -r ".[$idx].desc" | sed 's/"/\\"/g' | head -c 200)
      if [ "$first_plugin" = true ]; then
        first_plugin=false
      else
        echo "      ,"
      fi
      echo "      { name: \"$name\", version: \"$version\", desc: \"$desc\" }"
    done
    echo "    ]"
    echo "  }"
  fi

  echo "];"
}

PLUGIN_JS_DATA=$(build_plugin_js)

cat > "$OUTPUT" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>aiocean — Claude Code Plugins</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0a0a0a;
    --surface: #141414;
    --surface-2: #1a1a1a;
    --border: #262626;
    --border-hover: #333;
    --text: #ededed;
    --text-2: #a1a1a1;
    --text-3: #666;
    --accent: #00e5a0;
    --accent-dim: rgba(0, 229, 160, 0.08);
    --accent-border: rgba(0, 229, 160, 0.25);
    --blue: #3b82f6;
    --amber: #f59e0b;
    --mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
    --sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --radius: 6px;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: var(--sans);
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  .container {
    max-width: 880px;
    margin: 0 auto;
    padding: 3rem 1.5rem 4rem;
  }

  header { margin-bottom: 2rem; }

  .logo {
    font-family: var(--mono);
    font-size: 0.8rem;
    color: var(--accent);
    letter-spacing: 0.05em;
    margin-bottom: 0.75rem;
  }

  header h1 {
    font-family: var(--sans);
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    margin-bottom: 0.5rem;
  }

  header p {
    color: var(--text-2);
    font-size: 0.9rem;
  }

  .config-bar {
    position: sticky;
    top: 0;
    z-index: 100;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.75rem 1rem;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    backdrop-filter: blur(16px);
    background: rgba(20, 20, 20, 0.9);
  }

  .config-bar .left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
  }

  .config-bar .count {
    font-family: var(--mono);
    font-size: 0.8rem;
    color: var(--text-2);
    white-space: nowrap;
  }

  .config-bar .count strong { color: var(--accent); }

  .config-bar .actions {
    display: flex;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  button {
    font-family: var(--mono);
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.4rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-2);
    transition: all 0.12s;
    letter-spacing: 0.01em;
  }

  button:hover {
    border-color: var(--border-hover);
    color: var(--text);
  }

  button.primary {
    background: var(--accent);
    color: #0a0a0a;
    border-color: var(--accent);
    font-weight: 600;
  }

  button.primary:hover {
    background: #00ffb2;
    border-color: #00ffb2;
  }

  button.primary:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    background: var(--accent);
    border-color: var(--accent);
  }

  button.ghost {
    background: transparent;
    border-color: transparent;
  }

  button.ghost:hover {
    background: var(--surface-2);
    border-color: var(--border);
  }

  .category { margin-bottom: 1.25rem; }

  .category-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0;
    margin-bottom: 0.25rem;
  }

  .category-header h2 {
    font-family: var(--mono);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .category-header button {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
    border-color: transparent;
    background: transparent;
  }

  .plugin {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    padding: 0.6rem 0.75rem;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.12s;
    border: 1px solid transparent;
  }

  .plugin:hover { background: var(--surface); }
  .plugin.selected { background: var(--surface); }
  .plugin.selected .plugin-name { color: var(--accent); }

  .plugin input[type="checkbox"] {
    appearance: none;
    width: 16px;
    height: 16px;
    border: 1.5px solid var(--border-hover);
    border-radius: 3px;
    margin-top: 2px;
    flex-shrink: 0;
    cursor: pointer;
    position: relative;
    transition: all 0.12s;
    background: var(--bg);
  }

  .plugin input[type="checkbox"]:checked {
    background: var(--accent);
    border-color: var(--accent);
  }

  .plugin input[type="checkbox"]:checked::after {
    content: '';
    position: absolute;
    left: 3.5px;
    top: 0.5px;
    width: 5px;
    height: 9px;
    border: solid #0a0a0a;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  .plugin-info { flex: 1; min-width: 0; }

  .plugin-top {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .plugin-name {
    font-family: var(--mono);
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text);
  }

  .plugin-version {
    font-family: var(--mono);
    font-size: 0.7rem;
    color: var(--text-3);
  }

  .plugin-desc {
    font-size: 0.82rem;
    color: var(--text-2);
    margin-top: 0.1rem;
    line-height: 1.45;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .modal-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    z-index: 200;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    backdrop-filter: blur(4px);
  }

  .modal-overlay.open { display: flex; }

  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    width: 100%;
    max-width: 680px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
  }

  .modal-header h3 {
    font-family: var(--mono);
    font-size: 0.9rem;
    font-weight: 600;
  }

  .modal-header .close {
    background: none;
    border: none;
    color: var(--text-3);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  .modal-header .close:hover { color: var(--text); }

  .modal-body {
    padding: 1.25rem;
    overflow-y: auto;
    flex: 1;
  }

  .hint {
    font-size: 0.8rem;
    color: var(--text-3);
    margin-bottom: 0.75rem;
  }

  .modal-body pre {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem 1.25rem;
    font-family: var(--mono);
    font-size: 0.78rem;
    line-height: 1.75;
    overflow-x: auto;
    white-space: pre;
    color: var(--text);
  }

  .modal-body pre .comment { color: var(--text-3); }

  .modal-footer {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    padding: 0.75rem 1.25rem;
    border-top: 1px solid var(--border);
  }

  .toast {
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: var(--accent);
    color: #0a0a0a;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-family: var(--mono);
    font-size: 0.8rem;
    font-weight: 600;
    opacity: 0;
    transition: all 0.25s;
    z-index: 300;
    pointer-events: none;
  }

  .toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  footer {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: var(--text-3);
  }

  footer a {
    font-family: var(--mono);
    color: var(--text-2);
    text-decoration: none;
  }

  footer a:hover { color: var(--accent); }

  .search-bar { margin-bottom: 0.75rem; }

  .search-bar input {
    width: 100%;
    font-family: var(--mono);
    font-size: 0.85rem;
    padding: 0.6rem 0.75rem;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    outline: none;
    transition: border-color 0.12s;
  }

  .search-bar input::placeholder { color: var(--text-3); }
  .search-bar input:focus { border-color: var(--accent); }

  .category.hidden { display: none; }
  .plugin.hidden { display: none; }

  @media (max-width: 640px) {
    .container { padding: 2rem 1rem 3rem; }
    header h1 { font-size: 1.4rem; }
    .config-bar { padding: 0.6rem 0.75rem; gap: 0.5rem; }
    .config-bar .left { flex-wrap: wrap; }
    footer { flex-direction: column; gap: 0.5rem; text-align: center; }
  }
</style>
</head>
<body>

<div class="container">
  <header>
    <div class="logo">aiocean/claude-plugins</div>
    <h1>Plugin Marketplace</h1>
    <p>Select plugins, configure scope, generate install script.</p>
  </header>

  <div class="search-bar">
    <input type="text" id="searchInput" placeholder="search plugins..." oninput="filterPlugins()">
  </div>

  <div class="config-bar">
    <div class="left">
      <span class="count"><strong id="selectedCount">0</strong> selected</span>
    </div>
    <div class="actions">
      <button class="ghost" onclick="selectAll()">all</button>
      <button class="ghost" onclick="clearAll()">clear</button>
      <button class="primary" id="generateBtn" onclick="openModal()" disabled>generate</button>
    </div>
  </div>

  <div id="pluginList"></div>

  <footer>
    <a href="https://github.com/aiocean/claude-plugins">github.com/aiocean/claude-plugins</a>
    <span>MIT</span>
  </footer>
</div>

<div class="modal-overlay" id="modal">
  <div class="modal">
    <div class="modal-header">
      <h3>install script</h3>
      <button class="close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <p class="hint">Run each command in your terminal:</p>
      <pre id="scriptOutput"></pre>
    </div>
    <div class="modal-footer">
      <button onclick="closeModal()">close</button>
      <button class="primary" onclick="copyScript()">copy</button>
    </div>
  </div>
</div>

<div class="toast" id="toast">copied</div>

<script>
HTMLEOF

# Inject the dynamic plugin data
cat >> "$OUTPUT" << JSEOF
const MARKETPLACE = '${MARKETPLACE_NAME}';

${PLUGIN_JS_DATA}
JSEOF

# Append the rest of the JS (static logic)
cat >> "$OUTPUT" << 'HTMLEOF'

const selected = new Set();

function buildCmd(pluginName) {
  return `claude plugin install --scope project ${pluginName}@${MARKETPLACE}`;
}

function render() {
  const container = document.getElementById('pluginList');
  container.innerHTML = PLUGINS.map(cat => `
    <div class="category">
      <div class="category-header">
        <h2>${cat.category}</h2>
        <button class="ghost" onclick="toggleCategory('${cat.category}')">toggle</button>
      </div>
      ${cat.plugins.map(p => `
        <label class="plugin ${selected.has(p.name) ? 'selected' : ''}" id="card-${p.name}">
          <input type="checkbox" ${selected.has(p.name) ? 'checked' : ''}
                 onchange="toggle('${p.name}')">
          <div class="plugin-info">
            <div class="plugin-top">
              <span class="plugin-name">${p.name}</span>
              <span class="plugin-version">${p.version}</span>
            </div>
            <div class="plugin-desc">${p.desc}</div>
          </div>
        </label>
      `).join('')}
    </div>
  `).join('');
  updateBar();
}

function toggle(name) {
  if (selected.has(name)) selected.delete(name);
  else selected.add(name);
  const card = document.getElementById('card-' + name);
  if (card) card.classList.toggle('selected', selected.has(name));
  updateBar();
}

function toggleCategory(catName) {
  const cat = PLUGINS.find(c => c.category === catName);
  if (!cat) return;
  const allSelected = cat.plugins.every(p => selected.has(p.name));
  cat.plugins.forEach(p => {
    if (allSelected) selected.delete(p.name);
    else selected.add(p.name);
  });
  render();
}

function selectAll() {
  PLUGINS.forEach(cat => cat.plugins.forEach(p => selected.add(p.name)));
  render();
}

function clearAll() {
  selected.clear();
  render();
}

function updateBar() {
  document.getElementById('selectedCount').textContent = selected.size;
  document.getElementById('generateBtn').disabled = selected.size === 0;
}

function getSelectedPlugins() {
  const ordered = [];
  PLUGINS.forEach(cat => cat.plugins.forEach(p => {
    if (selected.has(p.name)) ordered.push(p.name);
  }));
  return ordered;
}

function generateScript() {
  const plugins = getSelectedPlugins();
  let out = `<span class="comment">#!/bin/bash</span>\n`;
  out += `<span class="comment"># Install aiocean plugins for Claude Code</span>\n\n`;
  out += plugins.map(name => buildCmd(name)).join('\n') + '\n';
  return out;
}

function generatePlainScript() {
  const plugins = getSelectedPlugins();
  let out = `#!/bin/bash\n`;
  out += `# Install aiocean plugins for Claude Code\n\n`;
  out += plugins.map(name => buildCmd(name)).join('\n') + '\n';
  return out;
}

function openModal() {
  if (selected.size === 0) return;
  document.getElementById('scriptOutput').innerHTML = generateScript();
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function copyScript() {
  navigator.clipboard.writeText(generatePlainScript()).then(() => showToast('copied'));
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

function filterPlugins() {
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  document.querySelectorAll('.category').forEach(catEl => {
    const plugins = catEl.querySelectorAll('.plugin');
    let visible = 0;
    plugins.forEach(p => {
      const name = p.querySelector('.plugin-name').textContent.toLowerCase();
      const desc = p.querySelector('.plugin-desc').textContent.toLowerCase();
      const match = !q || name.includes(q) || desc.includes(q);
      p.classList.toggle('hidden', !match);
      if (match) visible++;
    });
    catEl.classList.toggle('hidden', visible === 0);
  });
}

document.getElementById('modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

render();
</script>

</body>
</html>
HTMLEOF

echo "Generated $OUTPUT with $PLUGIN_COUNT plugins"
