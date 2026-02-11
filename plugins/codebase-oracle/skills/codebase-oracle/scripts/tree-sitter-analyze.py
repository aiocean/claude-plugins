#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# dependencies = [
#   "tree-sitter>=0.23.0",
#   "tree-sitter-python",
#   "tree-sitter-javascript",
#   "tree-sitter-typescript",
#   "tree-sitter-go",
#   "tree-sitter-rust",
#   "tree-sitter-java",
#   "tree-sitter-ruby",
# ]
# ///
"""
Tree-sitter Analyzer for Codebase Oracle
Performs static analysis using Tree-sitter AST parsing for accurate:
- Import/dependency extraction
- Function/class/method discovery
- Export identification
- Call graph construction

Run with: uv run tree-sitter-analyze.py [path]
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# Language extension mappings
LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".rb": "ruby",
}


def get_language(name: str):
    """Dynamically import and return language module."""
    try:
        if name == "python":
            from tree_sitter_python import language
            return language
        elif name == "javascript":
            from tree_sitter_javascript import language
            return language
        elif name in ("typescript", "tsx"):
            from tree_sitter_typescript import language_typescript, language_tsx
            return language_typescript if name == "typescript" else language_tsx
        elif name == "go":
            from tree_sitter_go import language
            return language
        elif name == "rust":
            from tree_sitter_rust import language
            return language
        elif name == "java":
            from tree_sitter_java import language
            return language
        elif name == "ruby":
            from tree_sitter_ruby import language
            return language
    except ImportError:
        return None
    return None


# Tree-sitter queries for each language
QUERIES = {
    "python": """
        ; Imports
        (import_statement name: (_) @import_name)
        (import_from_statement module_name: (_) @import_from)
        (future_import_statement name: (_) @future_import)

        ; Function definitions
        (function_definition name: (identifier) @func_name)
        (method_definition name: (identifier) @method_name)

        ; Class definitions
        (class_definition name: (identifier) @class_name)

        ; Call expressions (for call graph)
        (call_expression function: (identifier) @call_func)
        (call_expression function: (attribute attribute: (identifier) @call_method))

        ; Exports (in Python, we look for __all__ or module-level definitions)
        (assignment left: (identifier) @export_name right: (list))
    """,
    "javascript": """
        ; ES6 imports
        (import_statement source: (string) @import_source)
        (import_specifier name: (identifier) @import_name)
        (namespace_import (identifier) @import_namespace)

        ; ES6 exports
        (export_statement (function_declaration name: (identifier) @export_func))
        (export_statement (class_declaration name: (identifier) @export_class))
        (export_statement (lexical_declaration (variable_declarator name: (identifier) @export_const)))
        (export_specifier name: (identifier) @export_specifier)

        ; CommonJS require
        (call_expression
            function: (identifier) @require_func
            arguments: (arguments (string) @require_path)
            (#eq? @require_func "require"))

        ; CommonJS exports
        (assignment_expression
            left: (member_expression
                object: (identifier) @exports_obj
                (#eq? @exports_obj "module"))
            right: (_) @commonjs_export)
        (assignment_expression
            left: (member_expression
                object: (identifier) @exports_obj
                (#eq? @exports_obj "exports")))

        ; Function definitions
        (function_declaration name: (identifier) @func_name)
        (method_definition name: (property_identifier) @method_name)
        (arrow_function) @arrow_func

        ; Class definitions
        (class_declaration name: (identifier) @class_name)

        ; Call expressions (for call graph)
        (call_expression function: (identifier) @called_function)
        (call_expression function: (member_expression property: (property_identifier) @called_method))
    """,
    "typescript": """
        ; ES6 imports
        (import_statement source: (string) @import_source)
        (import_specifier name: (identifier) @import_name)
        (namespace_import (identifier) @import_namespace)

        ; ES6 exports
        (export_statement (function_declaration name: (identifier) @export_func))
        (export_statement (class_declaration name: (type_identifier) @export_class))
        (export_statement (interface_declaration name: (type_identifier) @export_interface))
        (export_statement (type_alias_declaration name: (type_identifier) @export_type))
        (export_specifier name: (identifier) @export_specifier)

        ; CommonJS require (with type)
        (call_expression
            function: (identifier) @require_func
            arguments: (arguments (string) @require_path)
            (#eq? @require_func "require"))

        ; Function definitions
        (function_declaration name: (identifier) @func_name)
        (method_signature name: (property_identifier) @method_sig_name)
        (method_definition name: (property_identifier) @method_name)

        ; Class/interface definitions
        (class_declaration name: (type_identifier) @class_name)
        (interface_declaration name: (type_identifier) @interface_name)
        (type_alias_declaration name: (type_identifier) @type_name)

        ; Call expressions
        (call_expression function: (identifier) @called_function)
        (call_expression function: (member_expression property: (property_identifier) @called_method))

        ; Decorators (common in TypeScript frameworks)
        (decorator (call_expression function: (identifier) @decorator_name))
        (decorator (identifier) @decorator_simple)
    """,
    "tsx": """
        ; ES6 imports
        (import_statement source: (string) @import_source)
        (import_specifier name: (identifier) @import_name)

        ; ES6 exports
        (export_statement (function_declaration name: (identifier) @export_func))
        (export_statement (class_declaration name: (type_identifier) @export_class))

        ; JSX components
        (function_declaration name: (identifier) @component_func)
        (class_declaration name: (type_identifier) @component_class)

        ; Call expressions
        (call_expression function: (identifier) @called_function)
        (jsx_opening_element name: (identifier) @jsx_component)
        (jsx_self_closing_element name: (identifier) @jsx_self_component)
    """,
    "go": """
        ; Imports
        (import_spec path: (interpreted_string_literal) @import_path)
        (import_spec name: (package_identifier) @import_alias path: (interpreted_string_literal))

        ; Function definitions
        (function_declaration name: (identifier) @func_name)
        (method_declaration name: (field_identifier) @method_name receiver: (parameter_list (parameter_declaration type: (type_identifier) @receiver_type)))

        ; Type definitions (structs and interfaces)
        (type_declaration (type_spec name: (type_identifier) @type_name type: (struct_type)))
        (type_declaration (type_spec name: (type_identifier) @interface_name type: (interface_type)))

        ; Call expressions
        (call_expression function: (identifier) @called_function)
        (call_expression function: (selector_expression field: (field_identifier) @called_method))

        ; Package declaration
        (package_clause (package_identifier) @package_name)
    """,
    "rust": """
        ; Use statements (imports)
        (use_declaration argument: (_) @use_path)
        (scoped_use_list path: (identifier) @use_base)
        (use_list (identifier) @use_item)

        ; Function definitions
        (function_item name: (identifier) @func_name)
        (function_signature name: (identifier) @func_sig_name)

        ; Struct/enum/trait definitions
        (struct_item name: (type_identifier) @struct_name)
        (enum_item name: (type_identifier) @enum_name)
        (trait_item name: (type_identifier) @trait_name)
        (impl_item trait: (type_identifier) @impl_trait type: (type_identifier) @impl_type)

        ; Module declarations
        (mod_item name: (identifier) @mod_name)

        ; Call expressions
        (call_expression function: (identifier) @called_function)
        (call_expression function: (field_expression field: (field_identifier) @called_method))

        ; Visibility (pub = exported)
        (visibility_modifier) @visibility
    """,
    "java": """
        ; Package and imports
        (package_declaration (identifier) @package_name)
        (import_declaration (identifier) @import_name)
        (import_declaration (asterisk) @import_wildcard)

        ; Class/interface/enum definitions
        (class_declaration name: (identifier) @class_name)
        (interface_declaration name: (identifier) @interface_name)
        (enum_declaration name: (identifier) @enum_name)

        ; Method definitions
        (method_declaration name: (identifier) @method_name)
        (constructor_declaration name: (identifier) @constructor_name)

        ; Call expressions
        (method_invocation name: (identifier) @called_method)
        (method_invocation object: (identifier) @call_object name: (identifier) @called_method)

        ; Annotations (common in Java frameworks)
        (annotation name: (identifier) @annotation_name)
    """,
    "ruby": """
        ; Require/include statements
        (call method: (identifier) @require_func arguments: (argument_list (string) @require_path) (#match? @require_func "^(require|require_relative|load|autoload)$"))

        ; Module and class definitions
        (module name: (constant) @module_name)
        (class name: (constant) @class_name)
        (singleton_class value: (self) @singleton_self)

        ; Method definitions
        (method name: (identifier) @method_name)
        (singleton_method name: (identifier) @singleton_method_name)

        ; Call expressions
        (call method: (identifier) @called_method)
        (call method: (identifier) @called_method receiver: (_) @call_receiver)

        ; Include/extend (mixins)
        (call method: (identifier) @mixin_func arguments: (argument_list (constant) @mixin_module) (#match? @mixin_func "^(include|extend|prepend)$"))
    """,
}


def analyze_file(file_path: Path, language: str) -> dict[str, Any]:
    """Analyze a single file using tree-sitter."""
    from tree_sitter import Language, Parser

    lang_module = get_language(language)
    if lang_module is None:
        return {"error": f"Language module not available: {language}"}

    try:
        lang = Language(lang_module())
        parser = Parser(lang)
    except Exception as e:
        return {"error": f"Failed to initialize parser: {e}"}

    try:
        content = file_path.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        return {"error": f"Failed to read file: {e}"}

    try:
        tree = parser.parse(content.encode("utf-8"))
    except Exception as e:
        return {"error": f"Failed to parse file: {e}"}

    results = {
        "imports": [],
        "exports": [],
        "functions": [],
        "classes": [],
        "types": [],
        "calls": [],
        "decorators": [],
    }

    query_text = QUERIES.get(language, "")
    if not query_text:
        return results

    try:
        query = lang.query(query_text)
        captures = query.captures(tree.root_node)

        # Process captures
        for node, capture_name in captures:
            text = content[node.start_byte:node.end_byte]
            line = node.start_point[0] + 1  # 1-indexed line numbers

            if capture_name in ("import_name", "import_from", "import_source",
                               "import_path", "import_alias", "require_path",
                               "use_path", "use_base", "use_item"):
                # Clean up import paths (remove quotes)
                clean_path = text.strip("'\"`")
                if clean_path and clean_path not in [i["path"] for i in results["imports"]]:
                    results["imports"].append({
                        "path": clean_path,
                        "line": line,
                        "raw": text,
                    })

            elif capture_name in ("func_name", "method_name", "method_sig_name",
                                 "func_sig_name", "singleton_method_name"):
                if text not in [f["name"] for f in results["functions"]]:
                    results["functions"].append({
                        "name": text,
                        "line": line,
                        "type": "method" if "method" in capture_name else "function",
                    })

            elif capture_name in ("class_name", "struct_name", "enum_name",
                                 "trait_name", "interface_name", "component_class"):
                if text not in [c["name"] for c in results["classes"]]:
                    results["classes"].append({
                        "name": text,
                        "line": line,
                        "type": capture_name.replace("_name", ""),
                    })

            elif capture_name in ("export_func", "export_class", "export_interface",
                                 "export_type", "export_const", "export_specifier",
                                 "export_name"):
                export_text = text
                if capture_name == "export_name" and "=" in content[node.start_byte:node.start_byte+50]:
                    # Python __all__ assignment - extract list contents
                    export_text = "__all__ export"
                if export_text not in [e["name"] for e in results["exports"]]:
                    results["exports"].append({
                        "name": export_text,
                        "line": line,
                        "type": capture_name.replace("export_", ""),
                    })

            elif capture_name in ("type_name", "interface_name", "impl_trait", "impl_type"):
                if text not in [t["name"] for t in results["types"]]:
                    results["types"].append({
                        "name": text,
                        "line": line,
                        "type": capture_name.replace("_name", ""),
                    })

            elif capture_name in ("called_function", "called_method", "call_func",
                                 "call_method", "called_method"):
                results["calls"].append({
                    "name": text,
                    "line": line,
                    "type": "method" if "method" in capture_name else "function",
                })

            elif capture_name in ("decorator_name", "decorator_simple", "annotation_name"):
                results["decorators"].append({
                    "name": text,
                    "line": line,
                })

    except Exception as e:
        results["error"] = f"Query error: {e}"

    return results


def should_analyze(path: Path, gitignore_patterns: list[str]) -> bool:
    """Check if file should be analyzed."""
    name = path.name

    # Default ignores (same as scan-codebase.py)
    default_ignores = {
        "node_modules", "__pycache__", ".git", "venv", ".venv",
        "dist", "build", ".next", ".nuxt", ".output",
        "target", "vendor",
    }

    parts = path.parts
    if any(part in default_ignores for part in parts):
        return False

    # Check extension
    if path.suffix.lower() not in LANGUAGE_MAP:
        return False

    return True


def analyze_codebase(root: Path) -> dict[str, Any]:
    """Analyze entire codebase using tree-sitter."""
    from tree_sitter import Language

    results = {
        "root": str(root),
        "files": {},
        "summary": {
            "total_files": 0,
            "by_language": {},
            "total_imports": 0,
            "total_exports": 0,
            "total_functions": 0,
            "total_classes": 0,
            "total_calls": 0,
        },
        "language_stats": {},
    }

    # Check which languages are available
    available_languages = {}
    for ext, lang in LANGUAGE_MAP.items():
        if lang not in available_languages:
            mod = get_language(lang)
            available_languages[lang] = mod is not None

    results["available_languages"] = [k for k, v in available_languages.items() if v]

    # Walk directory
    for path in root.rglob("*"):
        if not path.is_file():
            continue

        if not should_analyze(path, []):
            continue

        ext = path.suffix.lower()
        if ext not in LANGUAGE_MAP:
            continue

        language = LANGUAGE_MAP[ext]
        if not available_languages.get(language):
            continue

        rel_path = str(path.relative_to(root))

        try:
            file_results = analyze_file(path, language)
            if "error" not in file_results:
                results["files"][rel_path] = {
                    "language": language,
                    **file_results,
                }

                # Update summary
                results["summary"]["total_files"] += 1
                results["summary"]["by_language"][language] = results["summary"]["by_language"].get(language, 0) + 1
                results["summary"]["total_imports"] += len(file_results["imports"])
                results["summary"]["total_exports"] += len(file_results["exports"])
                results["summary"]["total_functions"] += len(file_results["functions"])
                results["summary"]["total_classes"] += len(file_results["classes"])
                results["summary"]["total_calls"] += len(file_results["calls"])
        except Exception as e:
            results["files"][rel_path] = {"error": str(e)}

    # Build import graph
    results["import_graph"] = build_import_graph(results["files"])

    # Identify hubs (files imported by many others)
    results["hubs"] = identify_hubs(results["import_graph"])

    return results


def build_import_graph(files: dict) -> dict:
    """Build module-level import graph from file analysis."""
    graph = {
        "nodes": [],
        "edges": [],
    }

    # Create node list
    for file_path in files:
        if "error" not in files[file_path]:
            graph["nodes"].append(file_path)

    # Build edges from imports
    for file_path, data in files.items():
        if "error" in data:
            continue

        imports = data.get("imports", [])
        for imp in imports:
            import_path = imp["path"]

            # Try to resolve import to a file in the codebase
            resolved = resolve_import(file_path, import_path, graph["nodes"])
            if resolved:
                edge = {
                    "from": file_path,
                    "to": resolved,
                    "import": import_path,
                    "line": imp["line"],
                }
                if edge not in graph["edges"]:
                    graph["edges"].append(edge)

    return graph


def resolve_import(source_file: str, import_path: str, known_files: list[str]) -> str | None:
    """Try to resolve an import path to a file in the codebase."""
    # Handle relative imports (Python, JS, etc.)
    if import_path.startswith("."):
        source_dir = Path(source_file).parent
        attempted = []

        # Try various extensions
        for ext in ["", ".js", ".ts", ".jsx", ".tsx", ".py", ".go", ".rs", ".java", ".rb"]:
            # Try as file
            resolved = source_dir / (import_path + ext)
            resolved_str = str(resolved).replace("./", "").replace(".\\", "")
            attempted.append(resolved_str)
            if resolved_str in known_files:
                return resolved_str

            # Try as index file in directory
            resolved = source_dir / import_path / (f"index{ext}")
            resolved_str = str(resolved).replace("./", "").replace(".\\", "")
            attempted.append(resolved_str)
            if resolved_str in known_files:
                return resolved_str

        return None

    # Handle absolute/module imports - try to match against known files
    # This is a heuristic match
    parts = import_path.replace("/", ".").split(".")

    for file in known_files:
        file_lower = file.lower()
        # Match if all parts appear in the file path
        if all(part.lower() in file_lower for part in parts if part):
            return file

    return None


def identify_hubs(import_graph: dict) -> list[dict]:
    """Identify hub files (files imported by many others)."""
    in_degree = {}

    for edge in import_graph["edges"]:
        target = edge["to"]
        in_degree[target] = in_degree.get(target, 0) + 1

    # Sort by in-degree
    hubs = [
        {"file": f, "dependents": count}
        for f, count in sorted(in_degree.items(), key=lambda x: -x[1])
        if count >= 3  # Threshold for hub
    ]

    return hubs


def main():
    parser = argparse.ArgumentParser(
        description="Analyze codebase using Tree-sitter AST parsing"
    )
    parser.add_argument(
        "path",
        nargs="?",
        default=".",
        help="Path to analyze (default: current directory)",
    )
    parser.add_argument(
        "--format",
        choices=["json", "compact"],
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "--language",
        help="Only analyze files of this language",
        choices=list(set(LANGUAGE_MAP.values())),
    )
    parser.add_argument(
        "--file",
        help="Analyze a single file instead of directory",
    )

    args = parser.parse_args()
    root = Path(args.path).resolve()

    if not root.exists():
        print(f"ERROR: Path does not exist: {root}", file=sys.stderr)
        sys.exit(1)

    # Check tree-sitter is available
    try:
        from tree_sitter import Language, Parser
    except ImportError:
        print("ERROR: tree-sitter not installed.", file=sys.stderr)
        print("Run: uv run tree-sitter-analyze.py", file=sys.stderr)
        sys.exit(1)

    if args.file:
        # Single file analysis
        file_path = Path(args.file)
        if not file_path.exists():
            print(f"ERROR: File not found: {file_path}", file=sys.stderr)
            sys.exit(1)

        ext = file_path.suffix.lower()
        if ext not in LANGUAGE_MAP:
            print(f"ERROR: Unsupported file type: {ext}", file=sys.stderr)
            sys.exit(1)

        language = LANGUAGE_MAP[ext]
        result = analyze_file(file_path, language)
        print(json.dumps(result, indent=2))
    else:
        # Directory analysis
        results = analyze_codebase(root)

        if args.format == "json":
            print(json.dumps(results, indent=2))
        elif args.format == "compact":
            print(f"# Tree-sitter Analysis: {results['root']}")
            print(f"# Files analyzed: {results['summary']['total_files']}")
            print(f"# Languages: {', '.join(results['summary']['by_language'].keys())}")
            print()
            print("## Summary")
            print(f"  Functions: {results['summary']['total_functions']}")
            print(f"  Classes:   {results['summary']['total_classes']}")
            print(f"  Imports:   {results['summary']['total_imports']}")
            print(f"  Exports:   {results['summary']['total_exports']}")
            print(f"  Calls:     {results['summary']['total_calls']}")
            print()
            print("## Top Hubs")
            for hub in results['hubs'][:10]:
                print(f"  {hub['dependents']:3d}  {hub['file']}")


if __name__ == "__main__":
    main()
