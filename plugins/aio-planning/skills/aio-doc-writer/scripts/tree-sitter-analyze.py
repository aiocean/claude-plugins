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

DEFAULT_IGNORES = {
    "node_modules",
    "__pycache__",
    ".git",
    "venv",
    ".venv",
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".output",
    "target",
    "vendor",
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
        (import_statement name: (_) @import_source)
        (import_from_statement module_name: (_) @import_from)

        ; Function definitions
        (function_definition name: (identifier) @func_name)

        ; Class definitions
        (class_definition name: (identifier) @class_name)

        ; Call expressions (for call graph)
        (call function: (identifier) @call_func)
        (call function: (attribute attribute: (identifier) @call_method))

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

        ; Function definitions
        (function_declaration name: (identifier) @func_name)
        (method_declaration name: (field_identifier) @method_name)

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
        (import_declaration (identifier) @import_path)
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


def build_parser(lang):
    """Construct a parser compatible with old and new tree-sitter APIs."""
    from tree_sitter import Parser

    try:
        return Parser(lang)
    except TypeError:
        parser = Parser()
        parser.set_language(lang)
        return parser


def compile_query(lang, query_text: str):
    """Compile a query with compatibility fallback."""
    try:
        from tree_sitter import Query

        return Query(lang, query_text)
    except Exception:
        if hasattr(lang, "query"):
            return lang.query(query_text)
        raise


def iter_query_captures(query, tree_root):
    """Yield (node, capture_name) pairs across tree-sitter API variants."""
    raw_captures = None

    if hasattr(query, "captures"):
        raw_captures = query.captures(tree_root)
    else:
        from tree_sitter import QueryCursor

        try:
            cursor = QueryCursor(query)
            raw_captures = cursor.captures(tree_root)
        except TypeError:
            cursor = QueryCursor()
            try:
                raw_captures = cursor.captures(query, tree_root)
            except TypeError:
                raw_captures = cursor.captures(tree_root, query)

    if isinstance(raw_captures, dict):
        for capture_name, nodes in raw_captures.items():
            for node in nodes:
                yield node, str(capture_name)
        return

    for item in raw_captures or []:
        if not isinstance(item, tuple) or len(item) != 2:
            continue

        first, second = item
        if hasattr(first, "start_byte"):
            capture_name = second
            if isinstance(second, int) and hasattr(query, "capture_name"):
                capture_name = query.capture_name(second)
            yield first, str(capture_name)
            continue

        if isinstance(second, dict):
            for capture_name, nodes in second.items():
                for node in nodes:
                    yield node, str(capture_name)


def analyze_file(file_path: Path, language: str) -> dict[str, Any]:
    """Analyze a single file using tree-sitter."""
    from tree_sitter import Language

    lang_module = get_language(language)
    if lang_module is None:
        return {"error": f"Language module not available: {language}"}

    try:
        lang = Language(lang_module())
        parser = build_parser(lang)
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
    seen = {name: set() for name in results}

    query_text = QUERIES.get(language, "")
    if not query_text:
        return results

    try:
        query = compile_query(lang, query_text)

        for node, capture_name in iter_query_captures(query, tree.root_node):
            text = content[node.start_byte:node.end_byte]
            line = node.start_point[0] + 1

            if capture_name in ("import_source", "import_from", "import_path", "require_path", "use_path"):
                clean_path = text.strip("'\"`")
                if clean_path and clean_path not in seen["imports"]:
                    results["imports"].append({
                        "path": clean_path,
                        "line": line,
                        "raw": text,
                    })
                    seen["imports"].add(clean_path)

            elif capture_name in (
                "func_name",
                "method_name",
                "method_sig_name",
                "func_sig_name",
                "singleton_method_name",
                "component_func",
                "arrow_func",
                "constructor_name",
            ):
                if text not in seen["functions"]:
                    results["functions"].append({
                        "name": text,
                        "line": line,
                        "type": "method" if "method" in capture_name else "function",
                    })
                    seen["functions"].add(text)

            elif capture_name in ("class_name", "struct_name", "enum_name", "trait_name", "interface_name", "component_class", "module_name"):
                if text not in seen["classes"]:
                    results["classes"].append({
                        "name": text,
                        "line": line,
                        "type": capture_name.replace("_name", ""),
                    })
                    seen["classes"].add(text)

            elif capture_name in ("export_func", "export_class", "export_interface", "export_type", "export_const", "export_specifier", "export_name"):
                export_text = text
                if capture_name == "export_name" and "=" in content[node.start_byte:node.start_byte + 50]:
                    export_text = "__all__ export"
                if export_text not in seen["exports"]:
                    results["exports"].append({
                        "name": export_text,
                        "line": line,
                        "type": capture_name.replace("export_", ""),
                    })
                    seen["exports"].add(export_text)

            elif capture_name in ("type_name", "interface_name", "impl_trait", "impl_type"):
                if text not in seen["types"]:
                    results["types"].append({
                        "name": text,
                        "line": line,
                        "type": capture_name.replace("_name", ""),
                    })
                    seen["types"].add(text)

            elif capture_name in ("called_function", "called_method", "call_func", "call_method"):
                key = f"{text}:{line}:{capture_name}"
                if key not in seen["calls"]:
                    results["calls"].append({
                        "name": text,
                        "line": line,
                        "type": "method" if "method" in capture_name else "function",
                    })
                    seen["calls"].add(key)

            elif capture_name in ("decorator_name", "decorator_simple", "annotation_name"):
                key = f"{text}:{line}"
                if key not in seen["decorators"]:
                    results["decorators"].append({
                        "name": text,
                        "line": line,
                    })
                    seen["decorators"].add(key)

    except Exception as e:
        results["error"] = f"Query error: {e}"

    return results


def should_analyze(path: Path, root: Path, allowed_languages: set[str] | None = None) -> bool:
    """Check if file should be analyzed."""
    try:
        relative_path = path.relative_to(root)
    except ValueError:
        return False

    if any(part in DEFAULT_IGNORES for part in relative_path.parts[:-1]):
        return False

    language = LANGUAGE_MAP.get(path.suffix.lower())
    if language is None:
        return False

    if allowed_languages is not None and language not in allowed_languages:
        return False

    return True


def read_go_module_path(root: Path) -> str | None:
    """Read Go module path from go.mod if present."""
    go_mod = root / "go.mod"
    if not go_mod.exists():
        return None

    try:
        for line in go_mod.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if line.startswith("module "):
                module_path = line[len("module "):].strip()
                return module_path or None
    except Exception:
        return None

    return None


def analyze_codebase(root: Path, language_filter: str | None = None) -> dict[str, Any]:
    """Analyze entire codebase using tree-sitter."""

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
        "go_module_path": read_go_module_path(root),
    }

    # Check which languages are available
    available_languages = {}
    for ext, lang in LANGUAGE_MAP.items():
        if language_filter is not None and lang != language_filter:
            continue
        if lang not in available_languages:
            mod = get_language(lang)
            available_languages[lang] = mod is not None

    results["available_languages"] = [k for k, v in available_languages.items() if v]
    allowed_languages = set(results["available_languages"])
    if language_filter is not None and language_filter not in allowed_languages:
        return results

    # Walk directory
    for path in root.rglob("*"):
        if not path.is_file():
            continue

        if not should_analyze(path, root, allowed_languages):
            continue

        language = LANGUAGE_MAP[path.suffix.lower()]

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
    results["import_graph"] = build_import_graph(results["files"], results["go_module_path"])

    # Identify hubs (files imported by many others)
    results["hubs"] = identify_hubs(results["import_graph"])

    return results


def build_import_graph(files: dict, go_module_path: str | None = None) -> dict:
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
            resolved = resolve_import(
                file_path,
                import_path,
                graph["nodes"],
                source_language=data.get("language"),
                go_module_path=go_module_path,
            )
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


def resolve_import(
    source_file: str,
    import_path: str,
    known_files: list[str],
    source_language: str | None = None,
    go_module_path: str | None = None,
) -> str | None:
    """Try to resolve an import path to a file in the codebase."""
    known_set = set(known_files)

    def find_exact_or_suffix(candidate: str) -> str | None:
        if candidate in known_set:
            return candidate

        suffix = f"/{candidate}"
        matches = [file for file in known_files if file.endswith(suffix)]
        if matches:
            return sorted(matches, key=lambda p: (p.count("/"), p))[0]
        return None

    def resolve_with_extensions(base: str) -> str | None:
        for ext in ["", ".js", ".ts", ".jsx", ".tsx", ".py", ".go", ".rs", ".java", ".rb"]:
            for candidate in (f"{base}{ext}", f"{base}/index{ext}", f"{base}/main{ext}"):
                resolved = find_exact_or_suffix(candidate)
                if resolved is not None:
                    return resolved
        return None

    def resolve_package_directory(base: str) -> str | None:
        exact_prefix = f"{base}/"
        suffix_prefix = f"/{base}/"
        directory_files = [
            file
            for file in known_files
            if file.startswith(exact_prefix) or suffix_prefix in file
        ]
        if not directory_files:
            return None
        return sorted(directory_files, key=lambda p: (p.count("/"), p))[0]

    # Handle relative imports (Python, JS, etc.)
    if import_path.startswith("."):
        source_dir = Path(source_file).parent

        # Try various extensions
        for ext in ["", ".js", ".ts", ".jsx", ".tsx", ".py", ".go", ".rs", ".java", ".rb"]:
            for candidate in (
                source_dir / f"{import_path}{ext}",
                source_dir / import_path / f"index{ext}",
                source_dir / import_path / f"main{ext}",
            ):
                resolved_str = str(candidate).replace("\\", "/")
                while resolved_str.startswith("./"):
                    resolved_str = resolved_str[2:]
                if resolved_str in known_set:
                    return resolved_str

        return None

    # Strip query/hash fragments and normalize separators.
    normalized = import_path.split("?", 1)[0].split("#", 1)[0].strip().strip("'\"`")
    normalized = normalized.strip("/").replace("\\", "/")
    if not normalized:
        return None

    # Skip known non-local import forms.
    if normalized.startswith("node:"):
        return None

    if source_language == "go":
        if go_module_path:
            module_prefix = go_module_path.rstrip("/")
            if normalized == module_prefix:
                return None
            if not normalized.startswith(module_prefix + "/"):
                # External module or stdlib import.
                return None
            normalized = normalized[len(module_prefix) + 1:]
        else:
            # Without module path, avoid guessing for absolute Go imports.
            return None

    parts = [part for part in normalized.split("/") if part and part != "."]
    if len(parts) < 2:
        # Avoid mapping stdlib/global modules like "os", "fs", "react", etc.
        return None

    # Try longest suffix first so local paths win over broad package prefixes.
    suffixes = ["/".join(parts[i:]) for i in range(len(parts))]
    for suffix in suffixes:
        resolved = resolve_with_extensions(suffix)
        if resolved is not None:
            return resolved

        resolved = resolve_package_directory(suffix)
        if resolved is not None:
            return resolved

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
        file_path = Path(args.file).resolve()
        if not file_path.exists():
            print(f"ERROR: File not found: {file_path}", file=sys.stderr)
            sys.exit(1)

        ext = file_path.suffix.lower()
        if ext not in LANGUAGE_MAP:
            print(f"ERROR: Unsupported file type: {ext}", file=sys.stderr)
            sys.exit(1)

        language = LANGUAGE_MAP[ext]
        if args.language is not None and args.language != language:
            print(
                f"ERROR: --language={args.language} does not match file language {language}",
                file=sys.stderr,
            )
            sys.exit(1)
        result = analyze_file(file_path, language)
        print(json.dumps(result, indent=2))
    else:
        # Directory analysis
        results = analyze_codebase(root, args.language)

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
