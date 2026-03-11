from dataclasses import dataclass
from typing import Optional, List
import os

# Constants
DEPENDENCY_GRAPHS_DIR = 'dependency_graphs'

@dataclass
class Config:
    """Configuration for CodeWiki static analysis."""
    repo_path: str
    output_dir: str
    dependency_graph_dir: str
    include_patterns: Optional[List[str]] = None
    exclude_patterns: Optional[List[str]] = None

    @classmethod
    def from_cli(
        cls,
        repo_path: str,
        output_dir: str,
        include_patterns: Optional[List[str]] = None,
        exclude_patterns: Optional[List[str]] = None,
    ) -> 'Config':
        return cls(
            repo_path=repo_path,
            output_dir=output_dir,
            dependency_graph_dir=os.path.join(output_dir, DEPENDENCY_GRAPHS_DIR),
            include_patterns=include_patterns,
            exclude_patterns=exclude_patterns,
        )
