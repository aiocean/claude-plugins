"""File system utilities for CLI operations."""

from pathlib import Path

from codeindex.cli.utils.errors import FileSystemError


def ensure_directory(path: Path, mode: int = 0o700) -> Path:
    """Ensure directory exists, create if necessary."""
    try:
        path = Path(path).expanduser().resolve()
        path.mkdir(parents=True, exist_ok=True, mode=mode)
        return path
    except PermissionError:
        raise FileSystemError(f"Permission denied: Cannot create directory {path}")
    except OSError as e:
        raise FileSystemError(f"Cannot create directory {path}: {e}")


def safe_write(path: Path, content: str, encoding: str = "utf-8"):
    """Safely write content to a file using atomic write (temp file + rename)."""
    path = Path(path).expanduser().resolve()
    temp_path = path.with_suffix(path.suffix + ".tmp")
    try:
        with open(temp_path, "w", encoding=encoding) as f:
            f.write(content)
        temp_path.replace(path)
    except Exception as e:
        if temp_path.exists():
            temp_path.unlink()
        raise FileSystemError(f"Cannot write to {path}: {e}")


def safe_read(path: Path, encoding: str = "utf-8") -> str:
    """Safely read content from a file."""
    path = Path(path).expanduser().resolve()
    try:
        with open(path, "r", encoding=encoding) as f:
            return f.read()
    except FileNotFoundError:
        raise FileSystemError(f"File not found: {path}")
    except PermissionError:
        raise FileSystemError(f"Permission denied: Cannot read {path}")
    except Exception as e:
        raise FileSystemError(f"Cannot read {path}: {e}")
