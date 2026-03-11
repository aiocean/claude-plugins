"""
Architectural rule validation.

Configurable rules for detecting structural issues in the codebase,
inspired by dependency-cruiser and SonarQube.
"""
import logging
from typing import Dict, List, Any
from codeindex.analyzer.models.core import Node

logger = logging.getLogger(__name__)


def evaluate_rules(
    components: Dict[str, Node],
    circular_deps: List = None,
    temporal_couplings: List[Dict] = None,
) -> List[Dict[str, Any]]:
    """
    Evaluate architectural rules against the codebase.

    Returns list of violations:
    [{"rule": str, "severity": str, "message": str, "components": list}]
    """
    violations = []

    if circular_deps is None:
        circular_deps = []
    if temporal_couplings is None:
        temporal_couplings = []

    # Rule 1: Circular dependencies longer than 3 nodes
    for cycle in circular_deps:
        if len(cycle) > 3:
            violations.append({
                "rule": "no-long-circular-deps",
                "severity": "high",
                "message": f"Circular dependency chain of {len(cycle)} components",
                "components": list(cycle)[:10],
            })

    # Rule 2: God components (very high fan-in + high complexity)
    for comp_id, node in components.items():
        if node.fan_in >= 10 and node.complexity_score > 70:
            violations.append({
                "rule": "no-god-components",
                "severity": "high",
                "message": f"{node.name}: fan-in={node.fan_in}, complexity={node.complexity_score:.1f} — likely doing too much",
                "components": [comp_id],
            })

    # Rule 3: Highly unstable hubs (hub + instability > 0.8)
    for comp_id, node in components.items():
        if node.is_hub and node.instability > 0.8:
            violations.append({
                "rule": "no-unstable-hubs",
                "severity": "medium",
                "message": f"{node.name}: hub with instability={node.instability:.2f} — changes here cascade widely",
                "components": [comp_id],
            })

    # Rule 4: Low maintainability (MI < 20)
    for comp_id, node in components.items():
        if node.maintainability_index < 20 and (node.nloc > 20 or node.cyclomatic_complexity > 5):
            violations.append({
                "rule": "low-maintainability",
                "severity": "medium",
                "message": f"{node.name}: maintainability_index={node.maintainability_index:.1f}/100, CC={node.cyclomatic_complexity}",
                "components": [comp_id],
            })

    # Rule 5: High cognitive complexity (> 15 per function, SonarQube threshold)
    for comp_id, node in components.items():
        if node.cognitive_complexity > 15:
            violations.append({
                "rule": "high-cognitive-complexity",
                "severity": "medium",
                "message": f"{node.name}: cognitive_complexity={node.cognitive_complexity} (threshold: 15)",
                "components": [comp_id],
            })

    # Rule 6: Strong temporal coupling without code dependency
    for coupling in temporal_couplings:
        if coupling["coupling_ratio"] > 0.7:
            # Check if there's a code dependency between these files
            file_a_comps = [c for c in components.values() if c.relative_path == coupling["file_a"]]
            file_b_comps = [c for c in components.values() if c.relative_path == coupling["file_b"]]

            has_code_dep = False
            for a in file_a_comps:
                for b in file_b_comps:
                    if b.id in a.depends_on or a.id in b.depends_on:
                        has_code_dep = True
                        break

            if not has_code_dep:
                violations.append({
                    "rule": "hidden-coupling",
                    "severity": "low",
                    "message": f"{coupling['file_a']} ↔ {coupling['file_b']}: {coupling['coupling_ratio']:.0%} temporal coupling without code dependency",
                    "components": [],
                })

    # Rule 7: Bottleneck components (high betweenness centrality + high fan-in)
    bc_values = [(cid, n.betweenness_centrality) for cid, n in components.items() if n.betweenness_centrality > 0]
    if bc_values:
        bc_values.sort(key=lambda x: x[1], reverse=True)
        top_bottlenecks = bc_values[:max(1, len(bc_values) // 20)]  # top 5%
        for comp_id, bc in top_bottlenecks:
            node = components[comp_id]
            if node.fan_in >= 5:
                violations.append({
                    "rule": "bottleneck-component",
                    "severity": "low",
                    "message": f"{node.name}: betweenness={bc:.4f}, fan-in={node.fan_in} — sits on many dependency paths",
                    "components": [comp_id],
                })

    # Sort by severity
    severity_order = {"high": 0, "medium": 1, "low": 2}
    violations.sort(key=lambda v: severity_order.get(v["severity"], 3))

    logger.info(f"Evaluated architectural rules: {len(violations)} violations found")
    return violations
