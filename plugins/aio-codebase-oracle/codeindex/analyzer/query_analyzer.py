"""
Generic tree-sitter query-based analyzer.

Uses SCM query files to extract definitions and references
from source code in a language-agnostic way.
"""
import logging
import os
from typing import Dict, List, Optional, Tuple

from tree_sitter import Language, Parser, Query

from codeindex.analyzer.models.core import Node, CallRelationship

logger = logging.getLogger(__name__)

QUERIES_DIR = os.path.join(os.path.dirname(__file__), "queries")

LANGUAGE_LOADERS = {
    "python": lambda: __import__("tree_sitter_python", fromlist=["language"]).language(),
    "javascript": lambda: __import__("tree_sitter_javascript", fromlist=["language"]).language(),
    "typescript": lambda: __import__("tree_sitter_typescript", fromlist=["language_typescript"]).language_typescript(),
    "java": lambda: __import__("tree_sitter_java", fromlist=["language"]).language(),
    "csharp": lambda: __import__("tree_sitter_c_sharp", fromlist=["language"]).language(),
    "c": lambda: __import__("tree_sitter_c", fromlist=["language"]).language(),
    "cpp": lambda: __import__("tree_sitter_cpp", fromlist=["language"]).language(),
    "go": lambda: __import__("tree_sitter_go", fromlist=["language"]).language(),
    "php": lambda: __import__("tree_sitter_php", fromlist=["language"]).language_php(),
}

_parser_cache: Dict[str, Parser] = {}
_language_cache: Dict[str, Language] = {}
_query_cache: Dict[str, Query] = {}


def _get_language(language: str) -> Optional[Language]:
    """Get or create a cached Language for the given language."""
    if language in _language_cache:
        return _language_cache[language]

    loader = LANGUAGE_LOADERS.get(language)
    if not loader:
        return None

    try:
        lang = Language(loader())
        _language_cache[language] = lang
        return lang
    except Exception as e:
        logger.warning(f"Failed to create language for {language}: {e}")
        return None


def _get_parser(language: str) -> Optional[Parser]:
    """Get or create a cached parser for the given language."""
    if language in _parser_cache:
        return _parser_cache[language]

    lang = _get_language(language)
    if not lang:
        return None

    try:
        parser = Parser(lang)
        _parser_cache[language] = parser
        return parser
    except Exception as e:
        logger.warning(f"Failed to create parser for {language}: {e}")
        return None


def _get_query(language: str) -> Optional[Query]:
    """Load and cache the SCM query for the given language."""
    if language in _query_cache:
        return _query_cache[language]

    query_path = os.path.join(QUERIES_DIR, f"{language}.scm")
    if not os.path.exists(query_path):
        return None

    lang = _get_language(language)
    if not lang:
        return None

    try:
        with open(query_path, "r") as f:
            query_text = f.read()

        query = lang.query(query_text)
        _query_cache[language] = query
        return query
    except Exception as e:
        logger.warning(f"Failed to load query for {language}: {e}")
        return None


def _find_parent_class(node) -> Optional[str]:
    """Walk up the tree to find the enclosing class name for a method."""
    parent = node.parent
    while parent:
        if parent.type in (
            "class_definition", "class_declaration", "class_specifier",
            "abstract_class_declaration", "struct_specifier", "struct_declaration",
            "record_declaration",
        ):
            for child in parent.children:
                if child.type in ("identifier", "type_identifier", "name"):
                    return child.text.decode() if child.text else None
            break
        parent = parent.parent
    return None


def analyze_file_with_queries(
    language: str,
    file_path,
    content: str,
    repo_path: str,
) -> Optional[Tuple[List[Node], List[CallRelationship]]]:
    """
    Analyze a file using tree-sitter queries.

    Returns (nodes, relationships) or None if the language query is unavailable.
    """
    parser = _get_parser(language)
    query = _get_query(language)

    if not parser or not query:
        return None

    try:
        tree = parser.parse(content.encode())
    except Exception as e:
        logger.warning(f"Failed to parse {file_path}: {e}")
        return None

    rel_path = os.path.relpath(str(file_path), repo_path)
    module_path = os.path.splitext(rel_path)[0].replace(os.sep, ".").replace("/", ".")

    # Run query - use captures() which returns dict of {capture_name: [nodes]}
    try:
        from tree_sitter import QueryCursor
        cursor = QueryCursor(query)
        captures_dict = cursor.captures(tree.root_node)
    except (ImportError, TypeError):
        # Fallback for different tree-sitter API versions
        try:
            captures_dict = query.captures(tree.root_node)
        except Exception:
            return None

    definitions = []
    references = []

    # Process captures - captures_dict is {capture_name: [nodes]}
    for capture_name, nodes_list in captures_dict.items():
        for node in nodes_list:
            text = node.text.decode() if node.text else ""
            start_line = node.start_point[0] + 1
            end_line = node.end_point[0] + 1

            if capture_name.startswith("definition."):
                def_type = capture_name.split(".", 1)[1]

                # Get the full body source from the parent node
                body_node = node.parent
                body_source = body_node.text.decode() if body_node and body_node.text else ""
                body_start = body_node.start_point[0] + 1 if body_node else start_line
                body_end = body_node.end_point[0] + 1 if body_node else end_line

                parent_class = None
                if def_type == "method":
                    parent_class = _find_parent_class(node)

                definitions.append({
                    "name": text,
                    "type": def_type,
                    "start_line": body_start,
                    "end_line": body_end,
                    "source_code": body_source,
                    "parent_class": parent_class,
                })

            elif capture_name.startswith("reference."):
                references.append({
                    "name": text,
                    "line": start_line,
                })

    # Build Node objects
    nodes = []
    node_names = set()

    for defn in definitions:
        name = defn["name"]
        def_type = defn["type"]
        parent_class = defn["parent_class"]

        if parent_class:
            comp_id = f"{module_path}.{parent_class}.{name}"
            display_name = f"{parent_class}.{name}"
        else:
            comp_id = f"{module_path}.{name}"
            display_name = name

        type_map = {
            "class": "class",
            "function": "function",
            "method": "method",
            "interface": "interface",
            "enum": "enum",
            "type_alias": "type_alias",
        }
        component_type = type_map.get(def_type, "function")

        node = Node(
            id=comp_id,
            name=name,
            component_type=component_type,
            file_path=str(file_path),
            relative_path=rel_path,
            source_code=defn["source_code"],
            start_line=defn["start_line"],
            end_line=defn["end_line"],
            node_type=component_type,
            class_name=parent_class,
            display_name=display_name,
            component_id=comp_id,
        )

        nodes.append(node)
        node_names.add(name)

    # Build CallRelationship objects
    relationships = []
    node_id_map = {n.name: n.id for n in nodes}

    for ref in references:
        ref_name = ref["name"]
        ref_line = ref["line"]

        if ref_name in ("self", "cls", "this", "super"):
            continue

        # Find which definition contains this reference
        caller_id = None
        for defn in definitions:
            if defn["start_line"] <= ref_line <= defn["end_line"]:
                parent = defn["parent_class"]
                if parent:
                    caller_id = f"{module_path}.{parent}.{defn['name']}"
                else:
                    caller_id = f"{module_path}.{defn['name']}"
                break

        if caller_id and ref_name in node_id_map:
            callee_id = node_id_map[ref_name]
            if caller_id != callee_id:
                relationships.append(CallRelationship(
                    caller=caller_id,
                    callee=callee_id,
                    call_line=ref_line,
                    is_resolved=True,
                ))
        elif caller_id:
            # Cross-file reference: keep as unresolved for global resolution
            relationships.append(CallRelationship(
                caller=caller_id,
                callee=ref_name,
                call_line=ref_line,
                is_resolved=False,
            ))

    return nodes, relationships
