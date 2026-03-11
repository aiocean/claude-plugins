"""
Project-specific CocoIndex configuration.
THIS IS THE ONLY FILE YOU NEED TO CUSTOMIZE.

Set PROJECT_NAME and SOURCE_DIRS. Languages are auto-detected from file extensions.
Each detected language gets tree-sitter aware chunking at AST boundaries.
Leave index.py and query.py unchanged.
"""
import os

# Auto-detect project root (parent of .cocoindex/)
PROJECT_ROOT = os.getenv(
    "COCOINDEX_PROJECT_ROOT",
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
)

# PostgreSQL connection (CocoIndex internal metadata only — NOT for vectors)
DATABASE_URL = os.getenv(
    "COCOINDEX_DATABASE_URL",
    "postgresql://cocoindex:cocoindex@localhost:5432/cocoindex",
)

# Qdrant connection (vector storage)
QDRANT_URL = os.getenv("COCOINDEX_QDRANT_URL", "http://localhost:6334")
QDRANT_API_KEY = os.getenv("COCOINDEX_QDRANT_API_KEY", "")

# ============================================================
# EMBEDDING CONFIGURATION
# ============================================================
# Two options:
#   "local"  — Free, uses sentence-transformers (default)
#   "gemini" — Better quality (especially multilingual), uses Google API
#
# For Gemini: set GEMINI_API_KEY in .env
EMBEDDING_API_TYPE = os.getenv("COCOINDEX_EMBEDDING_API_TYPE", "local")

# Model name (depends on API type):
#   local:  "sentence-transformers/all-MiniLM-L6-v2" (384-dim, fast)
#           "sentence-transformers/all-mpnet-base-v2" (768-dim, better)
#   gemini: "gemini-embedding-2-preview" (3072-dim, best multilingual)
_DEFAULT_MODELS = {
    "local": "sentence-transformers/all-MiniLM-L6-v2",
    "gemini": "gemini-embedding-2-preview",
}
EMBEDDING_MODEL = os.getenv(
    "COCOINDEX_EMBEDDING_MODEL",
    _DEFAULT_MODELS.get(EMBEDDING_API_TYPE, _DEFAULT_MODELS["local"]),
)

# ============================================================
# CUSTOMIZE BELOW
# ============================================================

# Unique name for this project (lowercase, no hyphens, underscores ok)
PROJECT_NAME = "myproject"

# Directories to scan (relative to project root)
# All supported files are indexed with auto-detected language
SOURCE_DIRS = ["."]

# ============================================================
# AUTO-DETECTION CONFIG (usually no need to modify)
# ============================================================

# File extension → (tree-sitter language, category)
# Category determines chunk sizes: code=1000/200, docs=1500/300, config=500/100
EXTENSION_MAP = {
    # Code
    ".py":   ("python", "code"),
    ".ts":   ("typescript", "code"),
    ".tsx":  ("typescript", "code"),
    ".js":   ("javascript", "code"),
    ".jsx":  ("javascript", "code"),
    ".mjs":  ("javascript", "code"),
    ".cjs":  ("javascript", "code"),
    ".go":   ("go", "code"),
    ".rs":   ("rust", "code"),
    ".java": ("java", "code"),
    ".cpp":  ("cpp", "code"),
    ".cc":   ("cpp", "code"),
    ".cxx":  ("cpp", "code"),
    ".h":    ("cpp", "code"),
    ".hpp":  ("cpp", "code"),
    ".c":    ("c", "code"),
    ".cs":   ("c_sharp", "code"),
    ".rb":   ("ruby", "code"),
    ".php":  ("php", "code"),
    ".swift": ("swift", "code"),
    ".kt":   ("kotlin", "code"),
    ".kts":  ("kotlin", "code"),
    ".scala": ("scala", "code"),
    ".sql":  ("sql", "code"),
    ".sh":   ("bash", "code"),
    ".bash": ("bash", "code"),
    # Docs
    ".md":   ("markdown", "docs"),
    ".mdx":  ("markdown", "docs"),
    ".rst":  ("markdown", "docs"),
    ".txt":  ("markdown", "docs"),
    # Config
    ".yaml": ("yaml", "config"),
    ".yml":  ("yaml", "config"),
    ".toml": ("toml", "config"),
    ".json": ("json", "config"),
    ".html": ("html", "docs"),
    ".css":  ("css", "code"),
}

# Chunk sizes by category
CHUNK_CONFIG = {
    "code":   {"chunk_size": 1000, "chunk_overlap": 200},
    "docs":   {"chunk_size": 1500, "chunk_overlap": 300},
    "config": {"chunk_size": 500,  "chunk_overlap": 100},
}

# Directories to always skip during language detection scan
EXCLUDED_DIRS = {
    "node_modules", ".git", "__pycache__", "dist", "build",
    ".venv", ".venv-cocoindex", "vendor", "target", ".cocoindex",
    ".next", ".nuxt", "coverage", ".tox", ".mypy_cache", ".ruff_cache",
}
