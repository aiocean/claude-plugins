#!/usr/bin/env python3
"""
Semantic search over CocoIndex-indexed documents — DO NOT EDIT.
Customize collections in config.py instead.

Usage:
    python .cocoindex/query.py "search query"
    python .cocoindex/query.py "search query" --collection docs
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

import psycopg2

import config


def _embed_query(text: str) -> list[float]:
    """Embed a query string using the configured embedding backend."""
    if config.EMBEDDING_API_TYPE == "gemini":
        import google.genai
        client = google.genai.Client(api_key=os.environ["GEMINI_API_KEY"])
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


def get_tables():
    """Map collection names to PostgreSQL table names.

    CocoIndex naming convention:
        Flow name: {ProjectTitle}{CollectionTitle}
        Export name: {project}_{collection}
        Actual table: {flowname_lowercase}__{export_name}

    Example: PROJECT_NAME="compass", collection="knowledge"
        -> Flow: CompassKnowledge
        -> Table: compassknowledge__compass_knowledge
    """
    return {
        name: f"{config.PROJECT_NAME.lower()}{name.lower()}__{config.PROJECT_NAME}_{name}"
        for name in config.COLLECTIONS
    }


def get_connection():
    return psycopg2.connect(config.DATABASE_URL)


def get_status():
    """Check index status — row counts per collection."""
    conn = get_connection()
    cur = conn.cursor()
    results = {}
    for collection, table in get_tables().items():
        try:
            cur.execute(f'SELECT count(*) FROM "{table}"')
            results[collection] = cur.fetchone()[0]
        except Exception:
            conn.rollback()
            results[collection] = 0
    conn.close()
    return results


def query_similar(question: str, top_k: int = 5, collection: str | None = None):
    """Search indexed documents by semantic similarity."""
    query_embedding = _embed_query(question)

    conn = get_connection()
    cur = conn.cursor()

    tables = get_tables()
    if collection and collection in tables:
        tables = {collection: tables[collection]}

    all_results = []
    for coll_name, table in tables.items():
        try:
            cur.execute(
                f"""
                SELECT filename, text, 1 - (embedding <=> %s::vector) as similarity
                FROM "{table}"
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (str(query_embedding), str(query_embedding), top_k),
            )
            for row in cur.fetchall():
                all_results.append({
                    "collection": coll_name,
                    "filename": row[0],
                    "text": row[1],
                    "similarity": round(float(row[2]), 4),
                })
        except Exception as e:
            conn.rollback()
            print(f"Warning: Could not query {coll_name}: {e}", file=sys.stderr)

    conn.close()
    all_results.sort(key=lambda x: x["similarity"], reverse=True)
    return all_results[:top_k]


def main():
    parser = argparse.ArgumentParser(description="Semantic search over indexed documents")
    parser.add_argument("question", nargs="?", help="Search query")
    parser.add_argument("--collection", "-c", choices=list(get_tables().keys()), help="Filter by collection")
    parser.add_argument("--top-k", "-k", type=int, default=5, help="Number of results (default: 5)")
    parser.add_argument("--status", action="store_true", help="Show index status")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    if args.status:
        status = get_status()
        total = sum(status.values())
        if args.json:
            print(json.dumps({"collections": status, "total": total}))
        else:
            print("CocoIndex Status:")
            for coll, count in status.items():
                print(f"  {coll}: {count:,} chunks")
            print(f"  Total: {total:,} chunks")
        return

    if not args.question:
        parser.print_help()
        return

    results = query_similar(args.question, args.top_k, args.collection)

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        if not results:
            print("No results found.")
            return
        for i, r in enumerate(results, 1):
            print(f"\n{'='*60}")
            print(f"#{i} [{r['collection']}] {r['filename']} (similarity: {r['similarity']})")
            print(f"{'='*60}")
            print(r["text"][:500])


if __name__ == "__main__":
    main()
