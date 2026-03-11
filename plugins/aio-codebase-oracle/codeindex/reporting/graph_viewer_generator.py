import html
import json
import os
import logging

logger = logging.getLogger(__name__)


def generate_graph_viewer(working_dir: str) -> str:
    """
    Generate an interactive HTML graph viewer from codebase_map.json.
    Returns path to generated HTML file.
    """
    map_path = os.path.join(working_dir, "codebase_map.json")
    if not os.path.exists(map_path):
        logger.warning("codebase_map.json not found, skipping graph viewer generation")
        return ""

    with open(map_path, 'r') as f:
        codebase_map = json.load(f)

    html_content = _build_html(codebase_map)

    output_path = os.path.join(working_dir, "graph.html")
    with open(output_path, 'w') as f:
        f.write(html_content)

    logger.info(f"Generated interactive graph viewer: {output_path}")
    return output_path


def _build_html(data: dict) -> str:
    """Build self-contained HTML with embedded D3.js visualization."""
    json_data = json.dumps(data, indent=None)
    project_name = html.escape(data.get("metadata", {}).get("project_name", "Codebase"))

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{project_name} — Codebase Graph</title>
<script src="https://d3js.org/d3.v7.min.js"></script>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; overflow: hidden; }}
#controls {{ position: fixed; top: 16px; left: 16px; z-index: 10; display: flex; gap: 8px; align-items: center; }}
#search {{ padding: 8px 12px; border-radius: 6px; border: 1px solid #30363d; background: #161b22; color: #c9d1d9; font-size: 14px; width: 240px; outline: none; }}
#search:focus {{ border-color: #58a6ff; }}
#info {{ position: fixed; top: 16px; right: 16px; z-index: 10; background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; max-width: 320px; font-size: 13px; display: none; }}
#info h3 {{ color: #58a6ff; margin-bottom: 8px; font-size: 15px; }}
#info .metric {{ display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #21262d; }}
#info .metric-label {{ color: #8b949e; }}
#info .metric-value {{ color: #c9d1d9; font-weight: 600; }}
#info .keywords {{ margin-top: 8px; }}
#info .kw {{ display: inline-block; background: #1f2937; padding: 2px 6px; border-radius: 3px; margin: 2px; font-size: 11px; color: #7ee787; }}
#info .hub-badge {{ display: inline-block; background: #f0883e33; color: #f0883e; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; margin-left: 6px; }}
#legend {{ position: fixed; bottom: 16px; left: 16px; z-index: 10; background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px; font-size: 12px; }}
#legend h4 {{ margin-bottom: 6px; color: #8b949e; }}
.legend-item {{ display: flex; align-items: center; gap: 6px; margin: 3px 0; }}
.legend-dot {{ width: 10px; height: 10px; border-radius: 50%; }}
#stats {{ position: fixed; bottom: 16px; right: 16px; z-index: 10; background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px; font-size: 12px; color: #8b949e; }}
svg {{ width: 100vw; height: 100vh; }}
.link {{ stroke-opacity: 0.3; }}
.link:hover {{ stroke-opacity: 0.8; }}
.node-circle {{ cursor: pointer; stroke-width: 1.5px; transition: stroke-width 0.2s; }}
.node-circle:hover {{ stroke-width: 3px; }}
.node-label {{ font-size: 10px; fill: #8b949e; pointer-events: none; text-anchor: middle; }}
.node-highlight .node-circle {{ stroke-width: 3px; }}
.node-dim {{ opacity: 0.15; }}
</style>
</head>
<body>
<div id="controls">
  <input type="text" id="search" placeholder="Search components..." />
</div>
<div id="info"></div>
<div id="legend">
  <h4>Communities</h4>
  <div id="legend-items"></div>
  <div class="legend-item" style="margin-top:8px"><div class="legend-dot" style="border:2px solid #f0883e;background:transparent"></div> Hub component</div>
</div>
<div id="stats"></div>
<svg></svg>
<script>
const data = {json_data};
const nodes = data.nodes.map(n => ({{...n, id: n.id}}));
const links = data.edges.map(e => ({{source: e.source, target: e.target}}));
const nodeMap = new Map(nodes.map(n => [n.id, n]));

// Filter links to only include valid node references
const validLinks = links.filter(l => nodeMap.has(l.source) && nodeMap.has(l.target));

const width = window.innerWidth;
const height = window.innerHeight;
const colors = d3.scaleOrdinal(d3.schemeTableau10);

// PageRank range for sizing
const prValues = nodes.map(n => n.metrics?.pagerank || 0);
const prMin = Math.min(...prValues);
const prMax = Math.max(...prValues);
const radiusScale = d3.scaleLinear().domain([prMin, prMax]).range([4, 20]).clamp(true);

const svg = d3.select("svg");
const g = svg.append("g");

// Zoom
const zoom = d3.zoom().scaleExtent([0.1, 8]).on("zoom", e => g.attr("transform", e.transform));
svg.call(zoom);

// Arrow markers
svg.append("defs").append("marker")
  .attr("id", "arrow").attr("viewBox", "0 -5 10 10")
  .attr("refX", 20).attr("refY", 0)
  .attr("markerWidth", 6).attr("markerHeight", 6)
  .attr("orient", "auto")
  .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#30363d");

const simulation = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(validLinks).id(d => d.id).distance(80))
  .force("charge", d3.forceManyBody().strength(-200))
  .force("center", d3.forceCenter(width/2, height/2))
  .force("collision", d3.forceCollide().radius(d => radiusScale(d.metrics?.pagerank||0) + 2));

const link = g.append("g").selectAll("line")
  .data(validLinks).join("line")
  .attr("class", "link")
  .attr("stroke", "#30363d")
  .attr("marker-end", "url(#arrow)");

const nodeGroup = g.append("g").selectAll("g")
  .data(nodes).join("g")
  .call(d3.drag()
    .on("start", (e,d) => {{ if(!e.active) simulation.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; }})
    .on("drag", (e,d) => {{ d.fx=e.x; d.fy=e.y; }})
    .on("end", (e,d) => {{ if(!e.active) simulation.alphaTarget(0); d.fx=null; d.fy=null; }}));

nodeGroup.append("circle")
  .attr("class", "node-circle")
  .attr("r", d => radiusScale(d.metrics?.pagerank || 0))
  .attr("fill", d => colors(d.community_id >= 0 ? d.community_id : 0))
  .attr("stroke", d => d.metrics?.is_hub ? "#f0883e" : "#0d1117")
  .attr("stroke-width", d => d.metrics?.is_hub ? 2.5 : 1);

nodeGroup.append("text")
  .attr("class", "node-label")
  .attr("dy", d => radiusScale(d.metrics?.pagerank||0) + 12)
  .text(d => d.name.length > 20 ? d.name.slice(0,18) + "..." : d.name);

// Info panel
const infoPanel = d3.select("#info");
nodeGroup.on("click", (e, d) => {{
  const m = d.metrics || {{}};
  let html = `<h3>${{d.name}}${{m.is_hub ? '<span class="hub-badge">HUB</span>' : ''}}</h3>`;
  html += `<div style="color:#8b949e;margin-bottom:8px">${{d.type}} &middot; ${{d.file_path}}</div>`;
  html += `<div class="metric"><span class="metric-label">PageRank</span><span class="metric-value">${{(m.pagerank||0).toFixed(5)}}</span></div>`;
  html += `<div class="metric"><span class="metric-label">Fan-in</span><span class="metric-value">${{m.fan_in||0}}</span></div>`;
  html += `<div class="metric"><span class="metric-label">Fan-out</span><span class="metric-value">${{m.fan_out||0}}</span></div>`;
  html += `<div class="metric"><span class="metric-label">Instability</span><span class="metric-value">${{(m.instability||0).toFixed(3)}}</span></div>`;
  html += `<div class="metric"><span class="metric-label">Complexity</span><span class="metric-value">${{(m.complexity_score||0).toFixed(1)}}</span></div>`;
  html += `<div class="metric"><span class="metric-label">Betweenness</span><span class="metric-value">${{(m.betweenness_centrality||0).toFixed(4)}}</span></div>`;
  html += `<div class="metric"><span class="metric-label">Cyclomatic CC</span><span class="metric-value">${{m.cyclomatic_complexity||0}}</span></div>`;
  html += `<div class="metric"><span class="metric-label">Cognitive CC</span><span class="metric-value">${{m.cognitive_complexity||0}}</span></div>`;
  html += `<div class="metric"><span class="metric-label">Maintainability</span><span class="metric-value">${{(m.maintainability_index||100).toFixed(1)}}</span></div>`;
  html += `<div class="metric"><span class="metric-label">Community</span><span class="metric-value">${{d.community_id}}</span></div>`;
  if (m.tfidf_keywords && m.tfidf_keywords.length) {{
    html += `<div class="keywords">`;
    m.tfidf_keywords.forEach(([kw]) => {{ html += `<span class="kw">${{kw}}</span>`; }});
    html += `</div>`;
  }}
  infoPanel.html(html).style("display", "block");
}});

svg.on("click", (e) => {{ if(e.target.tagName === 'svg') infoPanel.style("display","none"); }});

// Search
const searchInput = d3.select("#search");
searchInput.on("input", function() {{
  const query = this.value.toLowerCase();
  if (!query) {{
    nodeGroup.classed("node-dim", false).classed("node-highlight", false);
    link.classed("node-dim", false);
    return;
  }}
  const matches = new Set();
  nodes.forEach(n => {{ if(n.name.toLowerCase().includes(query) || n.file_path.toLowerCase().includes(query)) matches.add(n.id); }});
  nodeGroup.classed("node-dim", d => !matches.has(d.id)).classed("node-highlight", d => matches.has(d.id));
  link.classed("node-dim", d => !matches.has(d.source.id) && !matches.has(d.target.id));
}});

// Community cluster hulls
const hullG = g.insert("g", ":first-child");
const hullPadding = 30;

function updateHulls() {{
  const communityNodes = {{}};
  nodes.forEach(n => {{
    if (n.community_id >= 0) {{
      if (!communityNodes[n.community_id]) communityNodes[n.community_id] = [];
      communityNodes[n.community_id].push([n.x, n.y]);
    }}
  }});

  hullG.selectAll("path.hull").remove();
  Object.entries(communityNodes).forEach(([cid, points]) => {{
    if (points.length < 3) return;
    const hull = d3.polygonHull(points);
    if (!hull) return;

    const centroid = d3.polygonCentroid(hull);
    const expanded = hull.map(([x, y]) => {{
      const dx = x - centroid[0];
      const dy = y - centroid[1];
      const dist = Math.sqrt(dx*dx + dy*dy);
      const scale = (dist + hullPadding) / dist;
      return [centroid[0] + dx * scale, centroid[1] + dy * scale];
    }});

    hullG.append("path")
      .attr("class", "hull")
      .attr("d", `M${{expanded.map(p => p.join(",")).join("L")}}Z`)
      .attr("fill", colors(parseInt(cid)))
      .attr("fill-opacity", 0.06)
      .attr("stroke", colors(parseInt(cid)))
      .attr("stroke-opacity", 0.2)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,4");
  }});
}}

simulation.on("tick", () => {{
  link.attr("x1",d=>d.source.x).attr("y1",d=>d.source.y).attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);
  nodeGroup.attr("transform", d => `translate(${{d.x}},${{d.y}})`);
  updateHulls();
}});

// Legend
const communityIds = [...new Set(nodes.map(n => n.community_id).filter(c => c >= 0))].sort((a,b)=>a-b);
const legendItems = d3.select("#legend-items");
communityIds.forEach(cid => {{
  const count = nodes.filter(n => n.community_id === cid).length;
  legendItems.append("div").attr("class","legend-item")
    .html(`<div class="legend-dot" style="background:${{colors(cid)}}"></div> Community ${{cid}} (${{count}})`);
}});

// Stats
const sm = data.summary_metrics || {{}};
d3.select("#stats").html(
  `Nodes: ${{sm.total_nodes||nodes.length}} &middot; Edges: ${{sm.total_edges||validLinks.length}} &middot; Hubs: ${{(sm.hub_files||[]).length}} &middot; Cycles: ${{(sm.circular_dependencies||[]).length}}`
);
</script>
</body>
</html>'''
