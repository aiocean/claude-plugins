#!/usr/bin/env python3
"""
CocoIndex flow definitions — DO NOT EDIT.
Customize collections in config.py instead.

Usage:
    cocoindex -e .cocoindex/.env setup .cocoindex/index.py -f
    cocoindex -e .cocoindex/.env server .cocoindex/index.py -f -L
    cocoindex -e .cocoindex/.env ls .cocoindex/index.py

IMPORTANT:
    - The -e flag MUST come BEFORE the subcommand (setup/server/ls)
    - The -L flag is REQUIRED to trigger actual indexing
    - First run downloads the embedding model (~90MB)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

import cocoindex
import config


def build_flow(
    flow_builder: cocoindex.FlowBuilder,
    data_scope: cocoindex.DataScope,
    collection_name: str,
    collection_config: dict,
):
    """Build a CocoIndex flow for one collection."""

    for source_dir in collection_config["dirs"]:
        abs_path = os.path.join(config.PROJECT_ROOT, source_dir)
        if not os.path.isdir(abs_path):
            continue

        data_scope["documents"] = flow_builder.add_source(
            cocoindex.sources.LocalFile(
                path=abs_path,
                included_patterns=collection_config.get("patterns", ["**/*.md"]),
            )
        )

    doc_embeddings = data_scope.add_collector()

    with data_scope["documents"].row() as doc:
        doc["chunks"] = doc["content"].transform(
            cocoindex.functions.SplitRecursively(),
            language=collection_config.get("language", "markdown"),
            chunk_size=collection_config.get("chunk_size", 1500),
            chunk_overlap=collection_config.get("chunk_overlap", 300),
        )

        with doc["chunks"].row() as chunk:
            chunk["embedding"] = chunk["text"].transform(
                cocoindex.functions.SentenceTransformerEmbed(
                    model=config.EMBEDDING_MODEL,
                )
            )

            doc_embeddings.collect(
                filename=doc["filename"],
                location=chunk["location"],
                text=chunk["text"],
                embedding=chunk["embedding"],
            )

    table_name = f"{config.PROJECT_NAME}_{collection_name}"
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
    """Dynamically register one flow per collection."""
    for name, cfg in config.COLLECTIONS.items():
        flow_name = f"{config.PROJECT_NAME.title()}{name.title()}"

        # Default arg _name/_cfg captures the loop variable in the closure
        @cocoindex.flow_def(name=flow_name)
        def _flow(fb, ds, _name=name, _cfg=cfg):
            build_flow(fb, ds, _name, _cfg)


_register_flows()
