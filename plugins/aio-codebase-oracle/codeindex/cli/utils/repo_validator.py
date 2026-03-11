"""Repository validation utilities."""

import subprocess
from pathlib import Path
from typing import Tuple, List

from codeindex.cli.utils.errors import RepositoryError
from codeindex.cli.utils.validation import validate_repository_path, detect_supported_languages


def validate_repository(repo_path: Path) -> Tuple[Path, List[Tuple[str, int]]]:
    """Validate repository contains supported code files."""
    repo_path = validate_repository_path(repo_path)
    languages = detect_supported_languages(repo_path)
    if not languages:
        raise RepositoryError(
            f"No supported code files found in {repo_path}\n\n"
            "CodeIndex supports: Python, Java, JavaScript, TypeScript, C, C++, C#, PHP, Go\n\n"
            "Please navigate to a code repository:\n"
            "  cd /path/to/your/project\n"
            "  codeindex generate"
        )
    return repo_path, languages


def is_git_repository(repo_path: Path) -> bool:
    """Check if path is a git repository."""
    git_dir = repo_path / ".git"
    return git_dir.exists() and git_dir.is_dir()


def get_git_commit_hash(repo_path: Path) -> str:
    """Get current git commit hash using subprocess."""
    if not is_git_repository(repo_path):
        return ""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.stdout.strip() if result.returncode == 0 else ""
    except Exception:
        return ""
