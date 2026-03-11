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

# Embedding model — local, free, no API key needed
# all-MiniLM-L6-v2: 384-dim, fast, good quality
# all-mpnet-base-v2: 768-dim, slower, better quality
EMBEDDING_MODEL = os.getenv(
    "COCOINDEX_EMBEDDING_MODEL",
    "sentence-transformers/all-MiniLM-L6-v2",
)

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
# Supported languages for chunking:
#   markdown, python, javascript, typescript, go, java, rust,
#   c, cpp, ruby, php, swift, kotlin, scala, html, css, json, yaml, toml
COLLECTIONS = {
    "docs": {
        "dirs": ["docs/"],               # Directories to scan (relative to project root)
        "patterns": ["**/*.md"],          # File glob patterns to include
        "chunk_size": 1500,              # Max characters per chunk
        "chunk_overlap": 300,            # Overlap between chunks for context continuity
        "language": "markdown",          # Chunking language (affects split boundaries)
    },
    # Examples of other collection types:
    #
    # "code": {
    #     "dirs": ["src/", "lib/"],
    #     "patterns": ["**/*.ts", "**/*.js"],
    #     "chunk_size": 1000,
    #     "chunk_overlap": 200,
    #     "language": "typescript",
    # },
    #
    # "configs": {
    #     "dirs": ["."],
    #     "patterns": ["*.yaml", "*.toml", "docker-compose*.yml"],
    #     "chunk_size": 500,
    #     "chunk_overlap": 100,
    #     "language": "yaml",
    # },
}
