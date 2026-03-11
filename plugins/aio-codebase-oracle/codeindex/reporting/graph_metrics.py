import logging
import re
from itertools import islice
import networkx as nx
from typing import Dict, List, Tuple
from codeindex.analyzer.models.core import Node

logger = logging.getLogger(__name__)


def compute_graph_metrics(components: Dict[str, Node], graph: nx.DiGraph) -> List[Tuple[str, ...]]:
    """
    Compute graph metrics and annotate Node objects in-place.
    Returns list of circular dependencies found.
    """
    if not graph.nodes():
        return []

    # Fan-in / Fan-out
    for node_id in graph.nodes():
        if node_id in components:
            components[node_id].fan_in = graph.in_degree(node_id)
            components[node_id].fan_out = graph.out_degree(node_id)

    # Instability (Robert C. Martin)
    for node_id in graph.nodes():
        if node_id in components:
            node = components[node_id]
            total = node.fan_in + node.fan_out
            node.instability = node.fan_out / total if total > 0 else 0.0

    # Betweenness centrality (bottleneck detection)
    try:
        bc_scores = nx.betweenness_centrality(graph)
        for node_id, score in bc_scores.items():
            if node_id in components:
                components[node_id].betweenness_centrality = score
    except Exception as e:
        logger.warning(f"Betweenness centrality computation failed: {e}")

    # PageRank with naming-convention heuristics
    try:
        personalization = {}
        for node_id in graph.nodes():
            if node_id not in components:
                continue
            name = components[node_id].name
            weight = 1.0
            # Boost well-named identifiers (snake_case or camelCase, length >= 8)
            if (re.search(r'[a-z][A-Z]', name) or '_' in name) and len(name) >= 8:
                weight = 10.0
            # Penalize private/internal identifiers
            if name.startswith('_'):
                weight = 0.1
            # Penalize very common names
            if name.lower() in {'get', 'set', 'run', 'main', 'init', 'new', 'test', 'data', 'self', 'cls', 'args'}:
                weight = 0.1
            personalization[node_id] = weight

        pagerank_scores = nx.pagerank(graph, alpha=0.85, personalization=personalization)
        for node_id, score in pagerank_scores.items():
            if node_id in components:
                components[node_id].pagerank = score
    except Exception as e:
        logger.warning(f"PageRank computation failed: {e}")

    # Hub detection: top 10% PageRank OR fan_in >= 3 OR top 5% betweenness
    if components:
        pagerank_values = sorted(
            [(nid, components[nid].pagerank) for nid in graph.nodes() if nid in components],
            key=lambda x: x[1], reverse=True
        )
        bc_values = sorted(
            [(nid, components[nid].betweenness_centrality) for nid in graph.nodes() if nid in components],
            key=lambda x: x[1], reverse=True
        )
        top_10_pr = max(1, len(pagerank_values) // 10)
        top_5_bc = max(1, len(bc_values) // 20)
        top_pagerank_ids = {nid for nid, _ in pagerank_values[:top_10_pr]}
        top_bc_ids = {nid for nid, _ in bc_values[:top_5_bc]}

        for node_id in graph.nodes():
            if node_id in components:
                components[node_id].is_hub = (
                    node_id in top_pagerank_ids or
                    components[node_id].fan_in >= 3 or
                    node_id in top_bc_ids
                )

    # Louvain communities
    try:
        import community as community_louvain
        undirected = graph.to_undirected()
        if undirected.nodes():
            partition = community_louvain.best_partition(undirected, resolution=1.5)
            for node_id, comm_id in partition.items():
                if node_id in components:
                    components[node_id].community_id = comm_id
    except ImportError:
        logger.warning("python-louvain not installed, skipping community detection")
    except Exception as e:
        logger.warning(f"Community detection failed: {e}")

    # Circular dependency detection
    circular_deps = []
    try:
        circular_deps = [tuple(cycle) for cycle in islice(nx.simple_cycles(graph), 100)]
        if circular_deps:
            logger.warning(f"Found {len(circular_deps)} circular dependencies")
    except Exception as e:
        logger.warning(f"Cycle detection failed: {e}")

    return circular_deps
