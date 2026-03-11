"""
Project-specific CocoIndex configuration.
THIS IS THE ONLY FILE YOU NEED TO CUSTOMIZE.

Modify PROJECT_NAME and COLLECTIONS for your project.
Leave index.py and query.py unchanged.
"""
import os

# Auto-detect project root (parent of .cocoindex/)
PROJECT_ROOT = os.getenv(
    "COCOINDEX_PROJECT_ROOT",
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
)

# PostgreSQL connection (with pgvector extension)
DATABASE_URL = os.getenv(
    "COCOINDEX_DATABASE_URL",
    "postgresql://cocoindex:cocoindex@localhost:5432/cocoindex",
)

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
# CODE LANGUAGE MAP (extension → tree-sitter language + patterns)
# ============================================================
# Used by generate_code_collections() to create per-language
# collections with tree-sitter aware chunking (AST boundaries).
# Each language gets its own collection for proper chunking.
CODE_LANGUAGE_MAP = {
    "python":     {"patterns": ["**/*.py"],                    "language": "python"},
    "typescript": {"patterns": ["**/*.ts", "**/*.tsx"],        "language": "typescript"},
    "javascript": {"patterns": ["**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"], "language": "javascript"},
    "go":         {"patterns": ["**/*.go"],                    "language": "go"},
    "rust":       {"patterns": ["**/*.rs"],                    "language": "rust"},
    "java":       {"patterns": ["**/*.java"],                  "language": "java"},
    "cpp":        {"patterns": ["**/*.cpp", "**/*.cc", "**/*.cxx", "**/*.h", "**/*.hpp"], "language": "cpp"},
    "c":          {"patterns": ["**/*.c"],                     "language": "c"},
    "csharp":     {"patterns": ["**/*.cs"],                    "language": "c_sharp"},
    "ruby":       {"patterns": ["**/*.rb"],                    "language": "ruby"},
    "php":        {"patterns": ["**/*.php"],                   "language": "php"},
    "swift":      {"patterns": ["**/*.swift"],                 "language": "swift"},
    "kotlin":     {"patterns": ["**/*.kt", "**/*.kts"],        "language": "kotlin"},
    "scala":      {"patterns": ["**/*.scala"],                 "language": "scala"},
    "sql":        {"patterns": ["**/*.sql"],                   "language": "sql"},
    "shell":      {"patterns": ["**/*.sh", "**/*.bash"],       "language": "bash"},
}


def generate_code_collections(
    dirs: list[str],
    languages: list[str] | None = None,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> dict:
    """Generate per-language code collections for tree-sitter aware chunking.

    Args:
        dirs: Source directories to scan (relative to project root)
        languages: Language keys to include (default: all from CODE_LANGUAGE_MAP)
        chunk_size: Max characters per chunk (default: 1000)
        chunk_overlap: Overlap between chunks (default: 200)

    Returns:
        Dict of collection configs keyed as "code_{language}"

    Example:
        COLLECTIONS = {
            "docs": { ... },
            **generate_code_collections(["src/", "lib/"], languages=["typescript", "python"]),
        }
    """
    langs = languages or list(CODE_LANGUAGE_MAP.keys())
    collections = {}
    for lang in langs:
        if lang not in CODE_LANGUAGE_MAP:
            continue
        info = CODE_LANGUAGE_MAP[lang]
        collections[f"code_{lang}"] = {
            "dirs": dirs,
            "patterns": info["patterns"],
            "chunk_size": chunk_size,
            "chunk_overlap": chunk_overlap,
            "language": info["language"],
        }
    return collections


# ============================================================
# CUSTOMIZE BELOW
# ============================================================

# Unique name for this project (used in table names)
# Convention: lowercase, no hyphens (underscores ok)
PROJECT_NAME = "myproject"

# Collections to index.
# Each collection = one CocoIndex flow = one PostgreSQL table.
# Table name: {PROJECT_NAME}{collection_title}__{PROJECT_NAME}_{collection_name}
#
# Supported languages for chunking (tree-sitter aware):
#   markdown, python, javascript, typescript, go, java, rust,
#   c, cpp, c_sharp, ruby, php, swift, kotlin, scala, sql, bash,
#   html, css, json, yaml, toml
COLLECTIONS = {
    "docs": {
        "dirs": ["docs/"],               # Directories to scan (relative to project root)
        "patterns": ["**/*.md"],          # File glob patterns to include
        "chunk_size": 1500,              # Max characters per chunk
        "chunk_overlap": 300,            # Overlap between chunks for context continuity
        "language": "markdown",          # Chunking language (affects split boundaries)
    },
    # === CODE COLLECTIONS ===
    # Option 1: Use generate_code_collections() for auto tree-sitter chunking:
    #
    # **generate_code_collections(
    #     ["src/", "lib/"],
    #     languages=["typescript", "python"],  # omit for all languages
    # ),
    #
    # Option 2: Manual per-language collection:
    #
    # "code_typescript": {
    #     "dirs": ["src/", "lib/"],
    #     "patterns": ["**/*.ts", "**/*.tsx"],
    #     "chunk_size": 1000,
    #     "chunk_overlap": 200,
    #     "language": "typescript",
    # },
    #
    # === CONFIGS ===
    #
    # "configs": {
    #     "dirs": ["."],
    #     "patterns": ["*.yaml", "*.toml", "docker-compose*.yml"],
    #     "chunk_size": 500,
    #     "chunk_overlap": 100,
    #     "language": "yaml",
    # },
}
