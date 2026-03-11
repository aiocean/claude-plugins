#!/usr/bin/env python3
"""
Semantic search over CocoIndex-indexed project — DO NOT EDIT.
Auto-discovers all indexed collections for the project and searches them together.

Usage:
    python .cocoindex/query.py "search query"
    python .cocoindex/query.py "search query" --top-k 10 --json
    python .cocoindex/query.py --status
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
        result = client.models.embed_content(
            model=config.EMBEDDING_MODEL,
            contents=text,
            config={
                "task_type": "RETRIEVAL_QUERY",
                "output_dimensionality": 1536,
            },
        )
        return result.embeddings[0].values
    else:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(config.EMBEDDING_MODEL)
        return model.encode(text).tolist()


def get_client():
    kwargs = {"url": config.QDRANT_URL}
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
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

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
