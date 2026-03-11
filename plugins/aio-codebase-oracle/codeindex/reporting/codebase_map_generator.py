import logging
import os
from typing import Dict, Any, List, Optional
from collections import defaultdict
from datetime import datetime

from codeindex.utils import file_manager
from codeindex.analyzer.models.core import Node

logger = logging.getLogger(__name__)


def generate_codebase_map(
    components: Dict[str, Node],
    working_dir: str,
    commit_id: Optional[str],
    repo_path: str,
    circular_deps: Optional[List] = None,
    temporal_couplings: Optional[List] = None,
    arch_violations: Optional[List] = None,
) -> None:
    """Generate codebase_map.json with structural analysis data."""
    repo_name = os.path.basename(os.path.normpath(repo_path))
    languages = set()
    for node in components.values():
        ext = os.path.splitext(node.relative_path)[1]
        if ext:
            languages.add(ext.lstrip('.'))

    # Community aggregation
    communities_map = defaultdict(lambda: {"node_count": 0, "hub_count": 0, "keywords": defaultdict(float)})
    for node in components.values():
        cid = node.community_id
        if cid >= 0:
            communities_map[cid]["node_count"] += 1
            if node.is_hub:
                communities_map[cid]["hub_count"] += 1
            for kw, score in node.tfidf_keywords:
                communities_map[cid]["keywords"][kw] += score

    communities = []
    for cid, info in sorted(communities_map.items()):
        top_kw = sorted(info["keywords"].items(), key=lambda x: x[1], reverse=True)[:10]
        communities.append({
            "id": cid,
            "node_count": info["node_count"],
            "hub_count": info["hub_count"],
            "tfidf_keywords": [[kw, round(s, 4)] for kw, s in top_kw]
        })

    # Build nodes and edges
    nodes = []
    edges = []
    hub_files = []
    instabilities = []

    for comp_id, node in components.items():
        nodes.append({
            "id": comp_id,
            "name": node.name,
            "type": node.component_type,
            "file_path": node.relative_path,
            "metrics": {
                "pagerank": round(node.pagerank, 6),
                "fan_in": node.fan_in,
                "fan_out": node.fan_out,
                "instability": round(node.instability, 4),
                "is_hub": node.is_hub,
                "complexity_score": round(node.complexity_score, 2),
                "tfidf_keywords": node.tfidf_keywords,
                "betweenness_centrality": round(node.betweenness_centrality, 6),
                "cyclomatic_complexity": node.cyclomatic_complexity,
                "cognitive_complexity": node.cognitive_complexity,
                "nloc": node.nloc,
                "maintainability_index": round(node.maintainability_index, 2),
            },
            "community_id": node.community_id,
            "depends_on": list(node.depends_on)
        })

        # Advanced analysis data (populated by Go analyzer, extensible to other languages)
        has_analysis = (node.implements_interfaces or node.spawns_goroutines or
                        node.uses_channels or node.uses_select or node.returns_error or
                        node.has_defers or node.has_panic)
        if has_analysis or node.is_exported:
            nodes[-1]["analysis"] = {
                "implements_interfaces": node.implements_interfaces,
                "spawns_goroutines": node.spawns_goroutines,
                "uses_channels": node.uses_channels,
                "uses_select": node.uses_select,
                "returns_error": node.returns_error,
                "has_defers": node.has_defers,
                "has_panic": node.has_panic,
                "is_exported": node.is_exported,
            }

        for dep in node.depends_on:
            edges.append({"source": comp_id, "target": dep, "type": "depends_on"})

        if node.is_hub:
            hub_files.append(node.name)
        instabilities.append((node.name, node.instability))

    instabilities.sort(key=lambda x: x[1], reverse=True)

    if circular_deps is None:
        circular_deps = []

    codebase_map = {
        "version": "1.0",
        "metadata": {
            "project_name": repo_name,
            "generated_at": datetime.now().isoformat(),
            "commit_sha": commit_id,
            "languages": sorted(languages),
            "total_components": len(components)
        },
        "nodes": nodes,
        "edges": edges,
        "communities": communities,
        "temporal_coupling": temporal_couplings or [],
        "architectural_violations": arch_violations or [],
        "summary_metrics": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "hub_files": hub_files,
            "most_unstable": [name for name, _ in instabilities[:5]],
            "most_stable": [name for name, _ in instabilities[-5:]],
            "circular_dependencies": circular_deps,
            "avg_maintainability": round(sum(n.maintainability_index for n in components.values()) / max(len(components), 1), 1),
            "high_cognitive_complexity": [n.name for n in components.values() if n.cognitive_complexity > 15][:10],
            "bottleneck_components": [n.name for n in components.values() if n.betweenness_centrality > 0.1][:10],
            "interface_implementations": sum(1 for n in components.values() if n.implements_interfaces),
            "concurrent_components": sum(1 for n in components.values() if n.spawns_goroutines or n.uses_channels),
            "error_returning_functions": sum(1 for n in components.values() if n.returns_error),
            "exported_symbols": sum(1 for n in components.values() if n.is_exported),
        }
    }

    map_path = os.path.join(working_dir, "codebase_map.json")
    file_manager.save_json(codebase_map, map_path)
    logger.info(f"Generated codebase_map.json with {len(nodes)} nodes and {len(edges)} edges")
