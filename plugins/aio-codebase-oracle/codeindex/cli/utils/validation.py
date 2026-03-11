"""Validation utilities for CLI inputs."""

from pathlib import Path
from typing import List, Tuple

from codeindex.cli.utils.errors import RepositoryError


def parse_patterns(patterns_str: str) -> List[str]:
    """Parse comma-separated patterns into a list."""
    if not patterns_str:
        return []
    return [p.strip() for p in patterns_str.split(',') if p.strip()]


def validate_repository_path(path: Path) -> Path:
    """Validate repository path exists and is a directory."""
    path = Path(path).expanduser().resolve()
    if not path.exists():
        raise RepositoryError(f"Repository path does not exist: {path}")
    if not path.is_dir():
        raise RepositoryError(f"Repository path is not a directory: {path}")
    return path


def detect_supported_languages(directory: Path) -> List[Tuple[str, int]]:
    """Detect supported programming languages in a directory."""
    language_extensions = {
        'Python': ['.py'],
        'Java': ['.java'],
        'JavaScript': ['.js', '.jsx'],
        'TypeScript': ['.ts', '.tsx'],
        'C': ['.c', '.h'],
        'C++': ['.cpp', '.hpp', '.cc', '.hh', '.cxx', '.hxx'],
        'C#': ['.cs'],
        'PHP': ['.php', '.phtml', '.inc'],
        'Go': ['.go'],
    }

    excluded_dirs = {
        'node_modules', '__pycache__', '.git', 'build', 'dist',
        '.venv', 'venv', 'env', '.env', 'target', 'bin', 'obj',
        '.pytest_cache', '.mypy_cache', '.tox', 'coverage',
        'htmlcov', '.eggs', '*.egg-info', 'vendor', 'bower_components',
        '.idea', '.vscode', '.gradle', '.mvn',
    }

    def should_exclude_file(file_path: Path) -> bool:
        return any(d in file_path.parts for d in excluded_dirs)

    ext_to_language = {}
    for language, extensions in language_extensions.items():
        for ext in extensions:
            ext_to_language[ext] = language

    language_counts = {}
    for f in directory.rglob("*"):
        if not f.is_file() or should_exclude_file(f):
            continue
        ext = f.suffix
        if ext in ext_to_language:
            lang = ext_to_language[ext]
            language_counts[lang] = language_counts.get(lang, 0) + 1

    return sorted(language_counts.items(), key=lambda x: x[1], reverse=True)
