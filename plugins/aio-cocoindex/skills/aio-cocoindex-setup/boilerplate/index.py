#!/usr/bin/env python3
"""
CocoIndex flow definitions — DO NOT EDIT.
Auto-detects languages from file extensions and creates
tree-sitter aware flows per language.

Customize PROJECT_NAME and SOURCE_DIRS in config.py instead.

Usage:
    cocoindex -e .cocoindex/.env setup .cocoindex/index.py -f    # Setup DB schema
    cocoindex -e .cocoindex/.env update .cocoindex/index.py -f   # Index once and exit
    cocoindex -e .cocoindex/.env ls .cocoindex/index.py          # List flows

IMPORTANT:
    - The -e flag MUST come BEFORE the subcommand (setup/update/ls)
    - Use "update" for one-shot indexing (exits when done)
    - Use "update -L" for continuous live-updating (watches for changes)
    - query.py works independently — no running process needed after indexing
    - First run downloads the embedding model (~90MB) for local mode
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"), override=True)

import cocoindex
import config


def _get_embed_spec():
    """Return the embedding function spec based on config."""
    if config.EMBEDDING_API_TYPE == "gemini":
        return cocoindex.functions.EmbedText(
            api_type=cocoindex.llm.LlmApiType.GEMINI,
            model=config.EMBEDDING_MODEL,
            task_type="RETRIEVAL_DOCUMENT",
            output_dimension=2000,
        )
    return cocoindex.functions.SentenceTransformerEmbed(
        model=config.EMBEDDING_MODEL,
    )


def _detect_languages():
    """Scan SOURCE_DIRS and return detected languages with their file patterns.

    Returns:
        dict: {language: {"patterns": [...], "category": "code"|"docs"|"config"}}
    """
    detected = {}
    for source_dir in config.SOURCE_DIRS:
        abs_dir = os.path.join(config.PROJECT_ROOT, source_dir)
        if not os.path.isdir(abs_dir):
            continue
        for root, dirs, files in os.walk(abs_dir):
            # Prune excluded directories in-place
            dirs[:] = [d for d in dirs if d not in config.EXCLUDED_DIRS]
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in config.EXTENSION_MAP:
                    lang, category = config.EXTENSION_MAP[ext]
                    if lang not in detected:
                        detected[lang] = {"patterns": set(), "category": category}
                    detected[lang]["patterns"].add(f"**/*{ext}")
    # Convert sets to sorted lists
    for lang_info in detected.values():
        lang_info["patterns"] = sorted(lang_info["patterns"])
    return detected


def build_flow(
    flow_builder: cocoindex.FlowBuilder,
    data_scope: cocoindex.DataScope,
    language: str,
    patterns: list[str],
    category: str,
):
    """Build a CocoIndex flow for one language."""
    chunk_cfg = config.CHUNK_CONFIG.get(category, config.CHUNK_CONFIG["code"])

    for source_dir in config.SOURCE_DIRS:
        abs_path = os.path.join(config.PROJECT_ROOT, source_dir)
        if not os.path.isdir(abs_path):
            continue

        data_scope["documents"] = flow_builder.add_source(
            cocoindex.sources.LocalFile(
                path=abs_path,
                included_patterns=patterns,
            )
        )

    doc_embeddings = data_scope.add_collector()

    with data_scope["documents"].row() as doc:
        doc["chunks"] = doc["content"].transform(
            cocoindex.functions.SplitRecursively(),
            language=language,
            chunk_size=chunk_cfg["chunk_size"],
            chunk_overlap=chunk_cfg["chunk_overlap"],
        )

        with doc["chunks"].row() as chunk:
            chunk["embedding"] = chunk["text"].transform(_get_embed_spec())

            doc_embeddings.collect(
                filename=doc["filename"],
                location=chunk["location"],
                text=chunk["text"],
                embedding=chunk["embedding"],
            )

    table_name = f"{config.PROJECT_NAME}_{language}"
    doc_embeddings.export(
        table_name,
        cocoindex.storages.Postgres(),
        primary_key_fields=["filename", "location"],
        vector_indexes=[
            cocoindex.VectorIndexDef(
                field_name="embedding",
                metric=cocoindex.VectorSimilarityMetric.COSINE_SIMILARITY,
            )
        ],
    )


def _register_flows():
    """Auto-detect languages and register one flow per language."""
    languages = _detect_languages()
    for lang, info in languages.items():
        flow_name = f"{config.PROJECT_NAME.title()}{lang.title()}"

        # Default arg captures the loop variable in the closure
        @cocoindex.flow_def(name=flow_name)
        def _flow(fb, ds, _lang=lang, _patterns=info["patterns"], _cat=info["category"]):
            build_flow(fb, ds, _lang, _patterns, _cat)

    if languages:
        print(f"Detected {len(languages)} languages: {', '.join(sorted(languages.keys()))}")


_register_flows()
