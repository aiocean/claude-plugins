#!/usr/bin/env python3
"""
Semantic search over CocoIndex-indexed project — DO NOT EDIT.
Auto-discovers all indexed collections for the project and searches them together.

Usage:
    python .cocoindex/query.py "search query"
    python .cocoindex/query.py "search query" --top-k 10 --json
    python .cocoindex/query.py --status
    python .cocoindex/query.py --dry-run          # List files that WOULD be indexed
    python .cocoindex/query.py --dry-run --json   # Same, as JSON
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"), override=True)

from qdrant_client import QdrantClient

import config


def _embed_query(text: str) -> list[float]:
    """Embed a query string using the configured embedding backend."""
    if config.EMBEDDING_API_TYPE == "gemini":
        import google.genai
        client = google.genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        # NOTE: Do not pass output_dimensionality — must match indexing dimension (3072).
        # CocoIndex 0.3.x indexes without dimension reduction, so query must match.
        result = client.models.embed_content(
            model=config.EMBEDDING_MODEL,
            contents=text,
            config={"task_type": "RETRIEVAL_QUERY"},
        )
        return result.embeddings[0].values
    else:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(config.EMBEDDING_MODEL)
        return model.encode(text).tolist()


def get_client():
    # QDRANT_URL is the gRPC endpoint (port 6334) used by CocoIndex.
    # qdrant_client Python library uses REST API (port 6333), so swap the port.
    url = config.QDRANT_URL.replace(":6334", ":6333")
    kwargs = {"url": url}
    if config.QDRANT_API_KEY:
        kwargs["api_key"] = config.QDRANT_API_KEY
    return QdrantClient(**kwargs)


def get_collections():
    """Auto-discover all Qdrant collections for this project.

    CocoIndex naming convention: {project}_{language}
    Example: PROJECT_NAME="compass", language="python" -> "compass_python"
    """
    client = get_client()
    all_collections = client.get_collections().collections
    prefix = f"{config.PROJECT_NAME}_"
    return [c.name for c in all_collections if c.name.startswith(prefix)]


def _collection_language(collection: str) -> str:
    """Extract language name from collection name."""
    prefix = f"{config.PROJECT_NAME}_"
    if collection.startswith(prefix):
        return collection[len(prefix):]
    return collection


def get_status():
    """Check index status — point counts per language."""
    client = get_client()
    collections = get_collections()
    results = {}
    for coll in collections:
        lang = _collection_language(coll)
        try:
            info = client.get_collection(coll)
            results[lang] = info.points_count
        except Exception:
            results[lang] = 0
    return results


def dry_run():
    """Scan PROJECT_ROOT with the same logic as index.py and list files that would be indexed.

    Uses EXCLUDED_DIRS, EXTENSION_MAP, and the same excluded_patterns that LocalFile would use.
    This lets you verify exclusions BEFORE running the expensive embedding step.
    """
    from fnmatch import fnmatch

    excluded_patterns = [f"{d}/**" for d in config.EXCLUDED_DIRS]
    excluded_patterns.append(".*/**")  # Exclude all dot-directories
    results = {}  # {language: [file_paths]}

    for root, dirs, files in os.walk(config.PROJECT_ROOT):
        dirs[:] = [d for d in dirs if d not in config.EXCLUDED_DIRS and not d.startswith(".")]
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext not in config.EXTENSION_MAP:
                continue
            lang, category = config.EXTENSION_MAP[ext]
            abs_path = os.path.join(root, f)
            rel_path = os.path.relpath(abs_path, config.PROJECT_ROOT)

            # Check excluded_patterns (same as LocalFile would)
            excluded = any(fnmatch(rel_path, pat) for pat in excluded_patterns)
            if excluded:
                continue

            if lang not in results:
                results[lang] = []
            results[lang].append(rel_path)

    # Sort files within each language
    for lang in results:
        results[lang].sort()
    return results


def query_similar(question: str, top_k: int = 5):
    """Search all project collections by semantic similarity."""
    query_embedding = _embed_query(question)

    client = get_client()
    collections = get_collections()
    all_results = []

    for coll in collections:
        lang = _collection_language(coll)
        try:
            hits = client.query_points(
                collection_name=coll,
                query=query_embedding,
                using="embedding",
                limit=top_k,
                with_payload=True,
            ).points
            for hit in hits:
                payload = hit.payload or {}
                all_results.append({
                    "language": lang,
                    "filename": payload.get("filename", ""),
                    "text": payload.get("text", ""),
                    "similarity": round(float(hit.score), 4),
                })
        except Exception as e:
            print(f"Warning: Could not query {coll}: {e}", file=sys.stderr)

    all_results.sort(key=lambda x: x["similarity"], reverse=True)
    return all_results[:top_k]


def main():
    parser = argparse.ArgumentParser(description="Semantic search over indexed project")
    parser.add_argument("question", nargs="?", help="Search query")
    parser.add_argument("--top-k", "-k", type=int, default=5, help="Number of results (default: 5)")
    parser.add_argument("--status", action="store_true", help="Show index status")
    parser.add_argument("--dry-run", action="store_true", help="List files that would be indexed (no embedding, no Qdrant needed)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    if args.dry_run:
        results = dry_run()
        total_files = sum(len(files) for files in results.values())
        if args.json:
            print(json.dumps({"languages": {k: len(v) for k, v in results.items()}, "total": total_files, "files": results}, indent=2))
        else:
            print(f"Dry Run — files that WOULD be indexed ({total_files} total):")
            print(f"  PROJECT_ROOT: {config.PROJECT_ROOT}")
            print(f"  EXCLUDED_DIRS: {sorted(config.EXCLUDED_DIRS)}")
            print()
            for lang in sorted(results.keys()):
                files = results[lang]
                print(f"  {lang}: {len(files)} files")
                for f in files[:10]:
                    print(f"    {f}")
                if len(files) > 10:
                    print(f"    ... and {len(files) - 10} more")
            print(f"\n  Total: {total_files} files")
        return

    if args.status:
        status = get_status()
        total = sum(status.values())
        if args.json:
            print(json.dumps({"languages": status, "total": total}))
        else:
            print("CocoIndex Status:")
            for lang, count in sorted(status.items()):
                print(f"  {lang}: {count:,} chunks")
            print(f"  Total: {total:,} chunks")
        return

    if not args.question:
        parser.print_help()
        return

    results = query_similar(args.question, args.top_k)

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        if not results:
            print("No results found.")
            return
        for i, r in enumerate(results, 1):
            print(f"\n{'='*60}")
            print(f"#{i} [{r['language']}] {r['filename']} (similarity: {r['similarity']})")
            print(f"{'='*60}")
            print(r["text"][:500])


if __name__ == "__main__":
    main()
