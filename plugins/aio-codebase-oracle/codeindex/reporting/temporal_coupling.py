"""
Temporal coupling analysis from git history.

Scans git log to find files that frequently change together,
revealing hidden dependencies not visible in source code.
"""
import logging
import subprocess
import os
from collections import defaultdict
from typing import Dict, List, Tuple, Optional

from codeindex.analyzer.models.core import Node

logger = logging.getLogger(__name__)


def compute_temporal_coupling(
    repo_path: str,
    components: Dict[str, Node],
    min_shared_commits: int = 5,
    min_coupling_ratio: float = 0.3,
    max_commits_per_file: int = 50,
) -> List[Dict]:
    """
    Compute temporal coupling between files from git history.

    Algorithm:
    1. Get git log with changed files per commit
    2. Filter commits with > 50 files (bulk reformats, merges)
    3. Count co-occurrences for each file pair
    4. Compute coupling ratio: shared_commits / min(commits_a, commits_b)
    5. Filter by thresholds

    Returns list of coupling entries:
    [{"file_a": str, "file_b": str, "shared_commits": int, "coupling_ratio": float}]
    """
    if not os.path.isdir(os.path.join(repo_path, ".git")):
        logger.info("Not a git repository, skipping temporal coupling analysis")
        return []

    # Get all files we care about (from components)
    tracked_files = set()
    for node in components.values():
        if node.relative_path:
            tracked_files.add(node.relative_path)

    if not tracked_files:
        return []

    # Parse git log
    try:
        result = subprocess.run(
            ["git", "log", "--name-only", "--format=COMMIT:%H", "--no-merges", "-n", "500"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            logger.warning(f"git log failed: {result.stderr}")
            return []
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        logger.warning(f"git log error: {e}")
        return []

    # Parse commits into list of file sets
    commits = []
    current_files = set()

    for line in result.stdout.split('\n'):
        line = line.strip()
        if line.startswith("COMMIT:"):
            if current_files:
                commits.append(current_files)
            current_files = set()
        elif line and not line.startswith("COMMIT:"):
            # Only track files we have components for
            if line in tracked_files:
                current_files.add(line)
    if current_files:
        commits.append(current_files)

    # Filter out bulk commits (> max_commits_per_file files)
    commits = [c for c in commits if len(c) <= max_commits_per_file]

    # Count co-occurrences and individual occurrences
    file_commits: Dict[str, int] = defaultdict(int)
    pair_commits: Dict[Tuple[str, str], int] = defaultdict(int)

    for file_set in commits:
        files = sorted(file_set)
        for f in files:
            file_commits[f] += 1

        for i in range(len(files)):
            for j in range(i + 1, len(files)):
                pair = (files[i], files[j])
                pair_commits[pair] += 1

    # Compute coupling ratios and filter
    couplings = []
    for (file_a, file_b), shared in pair_commits.items():
        if shared < min_shared_commits:
            continue

        min_individual = min(file_commits[file_a], file_commits[file_b])
        if min_individual == 0:
            continue

        ratio = shared / min_individual
        if ratio >= min_coupling_ratio:
            couplings.append({
                "file_a": file_a,
                "file_b": file_b,
                "shared_commits": shared,
                "coupling_ratio": round(ratio, 3),
            })

    # Sort by coupling ratio descending
    couplings.sort(key=lambda x: x["coupling_ratio"], reverse=True)

    logger.info(f"Found {len(couplings)} temporal coupling pairs from {len(commits)} commits")
    return couplings[:100]  # Limit to top 100
