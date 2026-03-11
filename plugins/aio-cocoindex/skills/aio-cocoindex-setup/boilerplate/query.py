#!/usr/bin/env python3
"""
Semantic search over CocoIndex-indexed project — DO NOT EDIT.
Auto-discovers all indexed tables for the project and searches them together.

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


def get_connection():
    return psycopg2.connect(config.DATABASE_URL)


def get_tables():
    """Auto-discover all tables for this project.

    CocoIndex naming convention:
        Flow name: {ProjectTitle}{LanguageTitle}
        Export name: {project}_{language}
        Actual table: {flowname_lowercase}__{project}_{language}

    Example: PROJECT_NAME="compass", language="python"
        -> Flow: CompassPython
        -> Table: compasspython__compass_python
    """
    conn = get_connection()
    cur = conn.cursor()
    pattern = f"%\\_\\_{config.PROJECT_NAME}\\_%"
    cur.execute("""
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename LIKE %s
        AND tablename NOT LIKE '%%\\_tracking'
    """, (pattern,))
    tables = [row[0] for row in cur.fetchall()]
    conn.close()
    return tables


def _table_language(table: str) -> str:
    """Extract language name from table name."""
    separator = f"__{config.PROJECT_NAME}_"
    if separator in table:
        return table.split(separator, 1)[1]
    return table


def get_status():
    """Check index status — row counts per language."""
    conn = get_connection()
    cur = conn.cursor()
    tables = get_tables()
    results = {}
    for table in tables:
        lang = _table_language(table)
        try:
            cur.execute(f'SELECT count(*) FROM "{table}"')
            results[lang] = cur.fetchone()[0]
        except Exception:
            conn.rollback()
            results[lang] = 0
    conn.close()
    return results


def query_similar(question: str, top_k: int = 5):
    """Search all project tables by semantic similarity."""
    query_embedding = _embed_query(question)

    conn = get_connection()
    cur = conn.cursor()

    tables = get_tables()
    all_results = []
    for table in tables:
        lang = _table_language(table)
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
                    "language": lang,
                    "filename": row[0],
                    "text": row[1],
                    "similarity": round(float(row[2]), 4),
                })
        except Exception as e:
            conn.rollback()
            print(f"Warning: Could not query {table}: {e}", file=sys.stderr)

    conn.close()
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
