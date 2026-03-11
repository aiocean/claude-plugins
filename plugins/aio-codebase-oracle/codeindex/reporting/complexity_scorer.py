import logging
import math
import re
from typing import Dict
import lizard
from codeindex.analyzer.models.core import Node

logger = logging.getLogger(__name__)


def _compute_cognitive_complexity(source: str) -> int:
    """Compute cognitive complexity (SonarQube-inspired).

    Rules:
    - +1 for each: if, elif, else, for, while, catch, switch case, ternary, &&, ||
    - +nesting_increment for nested control flow (nesting starts at 0, increments per level)
    """
    score = 0
    nesting = 0
    NESTING_KEYWORDS = re.compile(r'\b(if|for|while|switch)\b')
    INCREMENT_KEYWORDS = re.compile(r'\b(if|elif|else|for|while|catch|case)\b')
    BOOLEAN_OPS = re.compile(r'(&&|\|\||\band\b|\bor\b)')

    for line in source.split('\n'):
        stripped = line.strip()
        if not stripped or stripped.startswith('#') or stripped.startswith('//'):
            continue

        # Count boolean operators (each sequence counts as 1)
        bool_matches = len(BOOLEAN_OPS.findall(stripped))
        score += bool_matches

        # Count control flow increments
        increments = INCREMENT_KEYWORDS.findall(stripped)
        for kw in increments:
            score += 1 + nesting  # base + nesting penalty

        # Track nesting (simplified via indentation)
        indent = len(line) - len(line.lstrip())
        depth = indent // 4 if '\t' not in line else line.count('\t')
        if NESTING_KEYWORDS.search(stripped):
            nesting = max(nesting, depth + 1)
        elif depth == 0:
            nesting = 0

    return score


def _compute_maintainability_index(loc: int, cc: int, halstead_volume: float, comment_ratio: float) -> float:
    """Compute Maintainability Index (SEI formula).

    MI = max(0, 100 * (171 - 5.2*ln(V) - 0.23*G - 16.2*ln(L) + 50*sin(sqrt(2.4*C))) / 171)
    Where V=Halstead Volume, G=Cyclomatic Complexity, L=LOC, C=comment ratio
    """
    if loc <= 0:
        return 100.0

    v = max(halstead_volume, 1.0)  # avoid log(0)
    g = cc
    l = loc
    c = comment_ratio

    mi = 171 - 5.2 * math.log(v) - 0.23 * g - 16.2 * math.log(l) + 50 * math.sin(math.sqrt(2.4 * c))
    return max(0.0, round(100 * mi / 171, 2))


def compute_complexity_scores(components: Dict[str, Node]) -> None:
    """Compute complexity metrics for all components using Lizard and custom algorithms."""
    # Group components by file for efficient Lizard analysis
    file_components: dict[str, list[str]] = {}
    for comp_id, node in components.items():
        if node.file_path:
            if node.file_path not in file_components:
                file_components[node.file_path] = []
            file_components[node.file_path].append(comp_id)

    # Run Lizard per file
    for file_path, comp_ids in file_components.items():
        try:
            analysis = lizard.analyze_file(file_path)
            for func_info in analysis.function_list:
                # Match Lizard functions to our components by line range overlap
                for comp_id in comp_ids:
                    node = components[comp_id]
                    if (node.start_line <= func_info.start_line <= node.end_line or
                        node.start_line <= func_info.end_line <= node.end_line or
                        node.name == func_info.name or
                        node.name in func_info.long_name):
                        node.cyclomatic_complexity = max(node.cyclomatic_complexity, func_info.cyclomatic_complexity)
                        node.nloc = max(node.nloc, func_info.nloc)
                        node.token_count = max(node.token_count, func_info.token_count)
                        node.parameter_count = max(node.parameter_count, len(func_info.parameters))
                        break
        except Exception as e:
            logger.warning(f"Lizard analysis failed for {file_path}: {e}")

    # Compute cognitive complexity and maintainability index from source code
    for comp_id, node in components.items():
        if not node.source_code:
            continue

        # Cognitive complexity
        node.cognitive_complexity = _compute_cognitive_complexity(node.source_code)

        # Estimate Halstead volume from token count (approximation)
        halstead_volume = node.token_count * math.log2(max(node.token_count, 2)) if node.token_count > 0 else 1.0

        # Comment ratio (approximate)
        lines = node.source_code.split('\n')
        total_lines = len([l for l in lines if l.strip()])
        comment_lines = len([l for l in lines if l.strip().startswith('#') or l.strip().startswith('//')])
        comment_ratio = comment_lines / max(total_lines, 1)

        loc = node.nloc if node.nloc > 0 else total_lines
        cc = node.cyclomatic_complexity if node.cyclomatic_complexity > 0 else 1

        node.maintainability_index = _compute_maintainability_index(loc, cc, halstead_volume, comment_ratio)

    # Normalized complexity_score (0-100) for backward compatibility
    raw_scores = {}
    for comp_id, node in components.items():
        # Weighted combination: CC * 3 + cognitive * 2 + (100 - MI)
        cc = node.cyclomatic_complexity
        cog = node.cognitive_complexity
        mi_penalty = 100 - node.maintainability_index
        raw_scores[comp_id] = cc * 3 + cog * 2 + mi_penalty

    if not raw_scores:
        return

    min_score = min(raw_scores.values())
    max_score = max(raw_scores.values())
    score_range = max_score - min_score

    for comp_id, raw_score in raw_scores.items():
        if score_range > 0:
            components[comp_id].complexity_score = round(((raw_score - min_score) / score_range) * 100, 2)
        else:
            components[comp_id].complexity_score = 0.0
