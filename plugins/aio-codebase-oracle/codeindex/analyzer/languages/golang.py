"""
Go language analyzer using tree-sitter-go.

Extracts functions, methods, structs, interfaces, and type declarations from Go files,
along with their dependency relationships (imports, struct embedding, interface implementation,
function calls, method calls).
"""

import logging
from typing import List, Optional, Tuple, Dict, Set
from pathlib import Path
import os

from tree_sitter import Parser, Language
import tree_sitter_go
from codeindex.analyzer.models.core import Node, CallRelationship

logger = logging.getLogger(__name__)

# Go primitive and built-in types to exclude from dependencies
GO_PRIMITIVES: Set[str] = {
    "bool", "byte", "rune", "int", "int8", "int16", "int32", "int64",
    "uint", "uint8", "uint16", "uint32", "uint64", "uintptr",
    "float32", "float64", "complex64", "complex128",
    "string", "error", "any",
}

# Go built-in functions to exclude from call tracking
GO_BUILTINS: Set[str] = {
    "append", "cap", "clear", "close", "complex", "copy", "delete",
    "imag", "len", "make", "new", "panic", "print", "println",
    "real", "recover", "min", "max",
}


class TreeSitterGoAnalyzer:
    """Analyzes Go files using tree-sitter to extract nodes and relationships."""

    def __init__(self, file_path: str, content: str, repo_path: Optional[str] = None):
        self.file_path = Path(file_path)
        self.content = content or ""
        self.repo_path = repo_path or ""
        self.nodes: List[Node] = []
        self.call_relationships: List[CallRelationship] = []
        self._top_level_nodes: Dict[str, Node] = {}
        self._package_name: str = ""
        self._import_map: Dict[str, str] = {}  # alias -> full package path
        self._current_function: Optional[str] = None
        self._current_method_receiver: Optional[str] = None
        self._current_receiver_var: Optional[str] = None
        # Type resolution context
        self._struct_fields: Dict[str, Dict[str, str]] = {}  # StructName -> {field: Type}
        self._func_signatures: Dict[str, Dict] = {}  # func_key -> {params: {name: type}, returns: [type]}
        self._current_scope_vars: Dict[str, str] = {}  # var_name -> Type (per-function)
        self._interface_methods: Dict[str, Set[str]] = {}  # InterfaceName -> {method_name#param_count}
        self._struct_methods: Dict[str, Set[str]] = {}  # StructName -> {method_name#param_count}

        self._analyze()

    def _get_module_path(self) -> str:
        """Get module path for the file (package-based)."""
        if self.repo_path:
            try:
                rel_path = os.path.relpath(str(self.file_path), self.repo_path)
            except ValueError:
                rel_path = str(self.file_path)
        else:
            rel_path = str(self.file_path)

        # Remove .go extension
        if rel_path.endswith('.go'):
            rel_path = rel_path[:-3]

        return rel_path.replace('/', '.').replace('\\', '.')

    def _get_relative_path(self) -> str:
        """Get relative path from repo root."""
        if self.repo_path:
            try:
                return os.path.relpath(str(self.file_path), self.repo_path)
            except ValueError:
                return str(self.file_path)
        return str(self.file_path)

    def _get_component_id(self, name: str, receiver_type: str = None) -> str:
        """Generate component ID for a node."""
        module_path = self._get_module_path()
        if receiver_type:
            # For methods: module_path.ReceiverType.MethodName
            return f"{module_path}.{receiver_type}.{name}"
        return f"{module_path}.{name}" if module_path else name

    def _is_exported(self, name: str) -> bool:
        """Check if a Go identifier is exported (starts with uppercase)."""
        return bool(name) and name[0].isupper()

    def _analyze(self):
        """Parse and analyze the Go file."""
        try:
            go_lang_capsule = tree_sitter_go.language()
            go_language = Language(go_lang_capsule)
            parser = Parser(go_language)

            tree = parser.parse(bytes(self.content, "utf8"))
            root = tree.root_node
            lines = self.content.splitlines()

            # First pass: extract package name and imports
            self._extract_package_info(root)

            # Second pass: extract nodes (functions, methods, types)
            self._extract_nodes(root, lines)

            # Pass 2.5: build type context (struct fields, function signatures)
            self._build_type_context(root)

            # Third pass: extract call relationships (with type resolution)
            self._extract_call_relationships(root)

        except Exception as e:
            logger.error(f"Error parsing Go file {self.file_path}: {e}")

    def _extract_package_info(self, node):
        """Extract package name and import statements."""
        if node.type == "package_clause":
            for child in node.children:
                if child.type == "package_identifier":
                    self._package_name = child.text.decode()
                    break

        elif node.type == "import_declaration":
            self._extract_import(node)

        for child in node.children:
            self._extract_package_info(child)

    def _extract_import(self, node):
        """Extract import statement."""
        # Handle: import "fmt" or import alias "pkg"
        import_spec = None
        for child in node.children:
            if child.type == "import_spec":
                import_spec = child
                break

        if import_spec:
            alias = None
            path = None

            for child in import_spec.children:
                if child.type == "package_identifier":
                    alias = child.text.decode()
                elif child.type == "interpreted_string_literal":
                    # Remove quotes
                    path = child.text.decode().strip('"')

            if path:
                # If no alias, use last part of path
                if not alias:
                    alias = path.split('/')[-1]
                self._import_map[alias] = path

    def _extract_nodes(self, node, lines: List[str], depth: int = 0):
        """Extract function, method, struct, interface nodes."""
        if depth > 100:
            return

        node_type = None
        node_name = None
        receiver_type = None
        docstring = ""

        # Get preceding docstring (Go comments)
        docstring = self._get_preceding_docstring(node, lines)

        # Function declaration: func Name()
        if node.type == "function_declaration":
            node_type = "function"
            name_node = self._find_child_by_type(node, "identifier")
            node_name = name_node.text.decode() if name_node else None

        # Method declaration: func (r *Receiver) Name()
        elif node.type == "method_declaration":
            node_type = "method"
            name_node = self._find_child_by_type(node, "field_identifier")
            node_name = name_node.text.decode() if name_node else None

            receiver_type = self._extract_method_receiver_type(node)

        # Type declaration: type Name struct/interface
        elif node.type == "type_declaration":
            for child in node.children:
                if child.type == "type_spec":
                    name_node = self._find_child_by_type(child, "type_identifier")
                    node_name = name_node.text.decode() if name_node else None

                    # Check what kind of type
                    type_node = self._find_child_by_type(child, "struct_type")
                    if type_node:
                        node_type = "struct"
                    else:
                        type_node = self._find_child_by_type(child, "interface_type")
                        if type_node:
                            node_type = "interface"

                    if node_type and node_name:
                        self._create_type_node(node_name, node_type, node, lines, docstring)
                    break

        # Create function/method node
        if node_type in ("function", "method") and node_name:
            component_id = self._get_component_id(node_name, receiver_type)
            relative_path = self._get_relative_path()

            # Extract parameters
            parameters = self._extract_parameters(node)

            display_name = node_name
            if receiver_type:
                display_name = f"{receiver_type}.{node_name}"

            # Safely extract source code
            start_line = node.start_point[0] if node.start_point else 0
            end_line = node.end_point[0] if node.end_point else start_line
            source_code = "\n".join(lines[start_line:end_line+1]) if lines else ""

            node_obj = Node(
                id=component_id,
                name=node_name,
                component_type=node_type,
                file_path=str(self.file_path),
                relative_path=relative_path,
                source_code=source_code,
                start_line=start_line + 1,
                end_line=end_line + 1,
                has_docstring=bool(docstring),
                docstring=docstring,
                parameters=parameters,
                node_type=node_type,
                base_classes=None,
                class_name=receiver_type,
                display_name=f"{node_type} {display_name}",
                component_id=component_id,
                is_exported=self._is_exported(node_name)
            )

            # Check return types for error
            return_types = self._extract_return_types_from_func(node)
            if any(self._normalize_type_name(t) == "error" for t in return_types):
                node_obj.returns_error = True

            # Scan function body for concurrency/error patterns
            self._analyze_function_body(node, node_obj)

            self.nodes.append(node_obj)
            self._top_level_nodes[node_name] = node_obj
            if receiver_type:
                self._top_level_nodes[f"{receiver_type}.{node_name}"] = node_obj

        # Recursively process children
        for child in node.children:
            self._extract_nodes(child, lines, depth + 1)

    def _create_type_node(self, name: str, node_type: str, node, lines: List[str], docstring: str):
        """Create a node for struct or interface type."""
        component_id = self._get_component_id(name)
        relative_path = self._get_relative_path()

        # Safely extract source code
        start_line = node.start_point[0] if node.start_point else 0
        end_line = node.end_point[0] if node.end_point else start_line
        source_code = "\n".join(lines[start_line:end_line+1]) if lines else ""

        node_obj = Node(
            id=component_id,
            name=name,
            component_type=node_type,
            file_path=str(self.file_path),
            relative_path=relative_path,
            source_code=source_code,
            start_line=start_line + 1,
            end_line=end_line + 1,
            has_docstring=bool(docstring),
            docstring=docstring,
            parameters=None,
            node_type=node_type,
            base_classes=None,
            class_name=None,
            display_name=f"{node_type} {name}",
            component_id=component_id,
            is_exported=self._is_exported(name)
        )
        self.nodes.append(node_obj)
        self._top_level_nodes[name] = node_obj

    def _analyze_function_body(self, func_node, node_obj: Node):
        """Scan function body for concurrency, error handling, and control flow patterns."""
        body = self._find_child_by_type(func_node, "block")
        if not body:
            return
        self._scan_body_patterns(body, node_obj)

    def _scan_body_patterns(self, node, node_obj: Node, depth: int = 0):
        """Recursively scan AST for patterns."""
        if depth > 50:
            return
        if node.type == "go_statement":
            node_obj.spawns_goroutines = True
        elif node.type == "select_statement":
            node_obj.uses_select = True
        elif node.type in ("send_statement", "receive_statement"):
            node_obj.uses_channels = True
        elif node.type == "defer_statement":
            node_obj.has_defers = True
        elif node.type == "call_expression":
            func_child = node.children[0] if node.children else None
            if func_child and func_child.type == "identifier" and func_child.text.decode() == "panic":
                node_obj.has_panic = True
        elif node.type == "channel_type":
            node_obj.uses_channels = True
        for child in node.children:
            self._scan_body_patterns(child, node_obj, depth + 1)

    # ── Type resolution infrastructure ──

    def _build_type_context(self, root):
        """Extract struct field types, function signatures, and interface/struct method sets."""
        for child in root.children:
            if child.type == "type_declaration":
                self._extract_struct_field_types(child)
                self._extract_interface_method_sigs(child)
            elif child.type == "function_declaration":
                self._extract_func_signature(child)
            elif child.type == "method_declaration":
                self._extract_method_signature(child)
                self._track_struct_method(child)

    def _extract_struct_field_types(self, node):
        """Extract field names and types from struct declarations."""
        for child in node.children:
            if child.type != "type_spec":
                continue
            name_node = self._find_child_by_type(child, "type_identifier")
            struct_node = self._find_child_by_type(child, "struct_type")
            if not name_node or not struct_node:
                continue
            struct_name = name_node.text.decode()
            self._struct_fields[struct_name] = {}
            field_list = self._find_child_by_type(struct_node, "field_declaration_list")
            if not field_list:
                continue
            for field in field_list.children:
                if field.type != "field_declaration":
                    continue
                names = [c.text.decode() for c in field.children if c.type == "identifier"]
                type_node = None
                for c in field.children:
                    if c.type in ("type_identifier", "qualified_type", "pointer_type",
                                  "slice_type", "map_type", "chan_type",
                                  "interface_type", "function_type", "struct_type"):
                        type_node = c
                        break
                if type_node and names:
                    field_type = self._normalize_type_name(type_node.text.decode())
                    for name in names:
                        self._struct_fields[struct_name][name] = field_type

    def _extract_interface_method_sigs(self, type_decl_node):
        """Extract method signatures from interface declarations for satisfaction checking."""
        for child in type_decl_node.children:
            if child.type != "type_spec":
                continue
            name_node = self._find_child_by_type(child, "type_identifier")
            iface_node = self._find_child_by_type(child, "interface_type")
            if not name_node or not iface_node:
                continue
            iface_name = name_node.text.decode()
            self._interface_methods[iface_name] = set()
            for spec in iface_node.children:
                if spec.type in ("method_spec", "method_elem"):
                    method_name_node = self._find_child_by_type(spec, "field_identifier")
                    if method_name_node:
                        method_name = method_name_node.text.decode()
                        param_list = self._find_child_by_type(spec, "parameter_list")
                        param_count = 0
                        if param_list:
                            param_count = sum(1 for c in param_list.children if c.type == "parameter_declaration")
                        self._interface_methods[iface_name].add(f"{method_name}#{param_count}")

    def _track_struct_method(self, method_node):
        """Track method for struct method set (used for interface satisfaction)."""
        receiver_type = self._extract_method_receiver_type(method_node)
        name_node = self._find_child_by_type(method_node, "field_identifier")
        if not receiver_type or not name_node:
            return
        if receiver_type not in self._struct_methods:
            self._struct_methods[receiver_type] = set()
        method_name = name_node.text.decode()
        param_lists = [c for c in method_node.children if c.type == "parameter_list"]
        param_count = 0
        if len(param_lists) >= 2:
            param_count = sum(1 for c in param_lists[1].children if c.type == "parameter_declaration")
        self._struct_methods[receiver_type].add(f"{method_name}#{param_count}")

    def _extract_func_signature(self, node):
        """Extract function parameter types and return types."""
        name_node = self._find_child_by_type(node, "identifier")
        if not name_node:
            return
        func_name = name_node.text.decode()
        params = self._extract_param_types_from_func(node)
        returns = self._extract_return_types_from_func(node)
        self._func_signatures[func_name] = {"params": params, "returns": returns}

    def _extract_method_signature(self, node):
        """Extract method parameter types and return types."""
        name_node = self._find_child_by_type(node, "field_identifier")
        receiver_type = self._extract_method_receiver_type(node)
        if not name_node:
            return
        method_name = name_node.text.decode()
        key = f"{receiver_type}.{method_name}" if receiver_type else method_name
        param_lists = [c for c in node.children if c.type == "parameter_list"]
        params = {}
        if len(param_lists) >= 2:
            for child in param_lists[1].children:
                if child.type == "parameter_declaration":
                    p_names, p_type = self._extract_param_name_and_type(child)
                    if p_type:
                        for pn in p_names:
                            params[pn] = p_type
        returns = self._extract_return_types_from_func(node)
        self._func_signatures[key] = {"params": params, "returns": returns}

    def _extract_param_types_from_func(self, func_node) -> Dict[str, str]:
        """Extract parameter name-to-type mapping from a function node."""
        params = {}
        start_idx = 0
        if func_node.type == "method_declaration":
            for i, child in enumerate(func_node.children):
                if child.type == "parameter_list":
                    start_idx = i + 1
                    break
        for child in func_node.children[start_idx:]:
            if child.type == "parameter_list":
                for param in child.children:
                    if param.type == "parameter_declaration":
                        p_names, p_type = self._extract_param_name_and_type(param)
                        if p_type:
                            for pn in p_names:
                                params[pn] = p_type
                break
        return params

    def _extract_param_name_and_type(self, param_node) -> Tuple[List[str], Optional[str]]:
        """Extract parameter names and their type from a parameter_declaration."""
        names = []
        param_type = None
        for child in param_node.children:
            if child.type == "identifier":
                names.append(child.text.decode())
            elif child.type in ("type_identifier", "qualified_type", "pointer_type",
                                "slice_type", "map_type", "chan_type", "interface_type"):
                param_type = self._normalize_type_name(child.text.decode())
        return names, param_type

    def _extract_return_types_from_func(self, func_node) -> List[str]:
        """Extract return types from a function/method declaration."""
        types = []
        param_lists = [i for i, c in enumerate(func_node.children) if c.type == "parameter_list"]
        if not param_lists:
            return types
        last_param_idx = param_lists[-1]
        for child in func_node.children[last_param_idx + 1:]:
            if child.type == "block":
                break
            if child.type in ("type_identifier", "qualified_type", "pointer_type",
                              "slice_type", "map_type"):
                types.append(self._normalize_type_name(child.text.decode()))
            elif child.type == "parameter_list":
                for pc in child.children:
                    if pc.type == "parameter_declaration":
                        for pcc in pc.children:
                            if pcc.type in ("type_identifier", "qualified_type", "pointer_type"):
                                types.append(self._normalize_type_name(pcc.text.decode()))
                    elif pc.type in ("type_identifier", "qualified_type", "pointer_type"):
                        types.append(self._normalize_type_name(pc.text.decode()))
        return types

    def _normalize_type_name(self, type_text: str) -> str:
        """Normalize a Go type to its base type name (strip *, [], package prefix)."""
        t = type_text.strip()
        while t.startswith("*"):
            t = t[1:].strip()
        while t.startswith("[]"):
            t = t[2:].strip()
        if "." in t:
            t = t.split(".")[-1]
        return t

    def _build_function_scope(self, func_node):
        """Build variable type scope for a function/method body."""
        self._current_scope_vars = {}
        # Add parameter types to scope
        func_key = self._current_function
        if self._current_method_receiver:
            func_key = f"{self._current_method_receiver}.{self._current_function}"
        sig = self._func_signatures.get(func_key) or self._func_signatures.get(self._current_function)
        if sig:
            for param_name, param_type in sig.get("params", {}).items():
                self._current_scope_vars[param_name] = param_type
        # Add receiver variable
        if self._current_receiver_var and self._current_method_receiver:
            self._current_scope_vars[self._current_receiver_var] = self._current_method_receiver
        # Walk body for variable declarations
        body = self._find_child_by_type(func_node, "block")
        if body:
            self._walk_for_var_types(body)

    def _walk_for_var_types(self, node, depth: int = 0):
        """Walk AST nodes to find variable declarations and infer their types."""
        if depth > 50:
            return
        if node.type == "short_var_declaration":
            self._process_short_var_decl(node)
        elif node.type == "var_declaration":
            self._process_var_decl(node)
        for child in node.children:
            self._walk_for_var_types(child, depth + 1)

    def _process_short_var_decl(self, node):
        """Process `x := expr` to extract variable types."""
        left = None
        right = None
        for child in node.children:
            if child.type == "expression_list":
                if left is None:
                    left = child
                else:
                    right = child
        if not left or not right:
            return
        left_names = [c.text.decode() for c in left.children if c.type == "identifier"]
        right_exprs = [c for c in right.children if c.type != ","]
        for i, name in enumerate(left_names):
            if i < len(right_exprs):
                inferred = self._infer_type_from_expr(right_exprs[i])
                if inferred:
                    self._current_scope_vars[name] = inferred

    def _process_var_decl(self, node):
        """Process `var x Type` declarations."""
        for child in node.children:
            if child.type != "var_spec":
                continue
            names = []
            var_type = None
            for c in child.children:
                if c.type == "identifier":
                    names.append(c.text.decode())
                elif c.type in ("type_identifier", "qualified_type", "pointer_type",
                                "slice_type", "map_type"):
                    var_type = self._normalize_type_name(c.text.decode())
            if var_type:
                for name in names:
                    self._current_scope_vars[name] = var_type

    def _infer_type_from_expr(self, expr) -> Optional[str]:
        """Infer type from a single expression (composite literal, &T{}, call, type assertion)."""
        # Composite literal: Type{...}
        if expr.type == "composite_literal":
            type_node = expr.children[0] if expr.children else None
            if type_node and type_node.type in ("type_identifier", "qualified_type"):
                return self._normalize_type_name(type_node.text.decode())
        # Address-of composite: &Type{...}
        if expr.type == "unary_expression" and len(expr.children) >= 2:
            if expr.children[0].type == "&":
                inner = expr.children[1]
                if inner.type == "composite_literal" and inner.children:
                    type_node = inner.children[0]
                    if type_node.type in ("type_identifier", "qualified_type"):
                        return self._normalize_type_name(type_node.text.decode())
        # Call expression: NewService() or pkg.New()
        if expr.type == "call_expression" and expr.children:
            func_node = expr.children[0]
            func_name = None
            if func_node.type == "identifier":
                func_name = func_node.text.decode()
            elif func_node.type == "selector_expression":
                field = self._find_child_by_type(func_node, "field_identifier")
                if field:
                    func_name = field.text.decode()
            if func_name:
                sig = self._func_signatures.get(func_name)
                if sig and sig.get("returns"):
                    return sig["returns"][0]
                # Heuristic: NewFoo() -> Foo
                if func_name.startswith("New") and len(func_name) > 3:
                    return func_name[3:]
        # Type assertion: x.(Type)
        if expr.type == "type_assertion_expression":
            for child in expr.children:
                if child.type in ("type_identifier", "qualified_type", "pointer_type"):
                    return self._normalize_type_name(child.text.decode())
        return None

    def _resolve_receiver_type(self, var_name: str) -> Optional[str]:
        """Resolve a variable name to its actual Go type using scope + struct fields."""
        # 1. Check current scope variables (params + locals)
        if var_name in self._current_scope_vars:
            return self._current_scope_vars[var_name]
        # 2. Check struct fields for method receiver access (e.g., h.svc in func (h *Handler))
        if self._current_method_receiver and self._current_method_receiver in self._struct_fields:
            fields = self._struct_fields[self._current_method_receiver]
            if var_name in fields:
                return fields[var_name]
        return None

    def _resolve_selector_chain_type(self, selector_node) -> Optional[str]:
        """Resolve chained selector like h.svc to its final type for h.svc.DoWork()."""
        parts = []
        current = selector_node
        while current and current.type == "selector_expression":
            field = self._find_child_by_type(current, "field_identifier")
            if field:
                parts.insert(0, field.text.decode())
                current = current.children[0]
            else:
                break
        if not (current and current.type == "identifier"):
            return None
        root_var = current.text.decode()
        current_type = self._resolve_receiver_type(root_var)
        if not current_type:
            return None
        # Chain through struct fields: h -> Handler, .svc -> Service, etc.
        for field_name in parts:
            if current_type in self._struct_fields:
                field_type = self._struct_fields[current_type].get(field_name)
                if field_type:
                    current_type = field_type
                else:
                    return None
            else:
                return None
        return current_type

    def _extract_receiver_var_name(self, method_node) -> Optional[str]:
        """Extract the receiver variable name (e.g., 'h' from 'func (h *Handler)')."""
        receiver_node = self._find_child_by_type(method_node, "parameter_list")
        if not receiver_node:
            return None
        for child in receiver_node.children:
            if child.type == "parameter_declaration":
                for c in child.children:
                    if c.type == "identifier":
                        return c.text.decode()
        return None

    def _extract_call_relationships(self, node, depth: int = 0):
        """Extract function call relationships."""
        if depth > 100:
            return

        # Track current function context and build variable type scope
        if node.type == "function_declaration":
            name_node = self._find_child_by_type(node, "identifier")
            if name_node:
                self._current_function = name_node.text.decode()
                self._current_method_receiver = None
                self._current_receiver_var = None
                self._build_function_scope(node)

        elif node.type == "method_declaration":
            name_node = self._find_child_by_type(node, "field_identifier")
            if name_node:
                self._current_function = name_node.text.decode()
                self._current_method_receiver = self._extract_method_receiver_type(node)
                self._current_receiver_var = self._extract_receiver_var_name(node)
                self._build_function_scope(node)

        # Handle call expressions
        if node.type == "call_expression":
            self._process_call_expression(node)

        # Handle struct embedding (inheritance-like)
        elif node.type == "struct_type":
            self._process_struct_embedding(node)

        # Handle interface embedding
        elif node.type == "interface_type":
            self._process_interface_embedding(node)

        # Recursively process children
        for child in node.children:
            self._extract_call_relationships(child, depth + 1)

        # Reset context when leaving function
        if node.type in ("function_declaration", "method_declaration"):
            self._current_function = None
            self._current_method_receiver = None
            self._current_receiver_var = None
            self._current_scope_vars = {}

    def _process_call_expression(self, node):
        """Process a call expression and extract the callee."""
        if not self._current_function:
            return

        # Get the function/method being called
        func_node = node.children[0] if node.children else None
        if not func_node:
            return

        callee_name = None
        receiver_type = None

        # Direct call: funcName()
        if func_node.type == "identifier":
            callee_name = func_node.text.decode()

        # Method call: receiver.Method() or pkg.Func()
        elif func_node.type == "selector_expression":
            operand = func_node.children[0] if func_node.children else None
            field = self._find_child_by_type(func_node, "field_identifier")

            if field:
                callee_name = field.text.decode()

            if operand and callee_name:
                if operand.type == "identifier":
                    op_name = operand.text.decode()
                    if op_name in self._import_map:
                        callee_name = f"{op_name}.{callee_name}"
                    else:
                        # Resolve receiver variable to its actual type
                        resolved = self._resolve_receiver_type(op_name)
                        receiver_type = resolved if resolved else op_name
                elif operand.type == "selector_expression":
                    # Chained selector: a.b.Method() - resolve chain type
                    resolved = self._resolve_selector_chain_type(operand)
                    if resolved:
                        receiver_type = resolved
                    else:
                        selector_name = self._get_full_selector_name(operand)
                        if selector_name:
                            callee_name = f"{selector_name}.{callee_name}"

        if not callee_name or self._is_builtin(callee_name):
            return

        caller_id = self._get_component_id(
            self._current_function,
            self._current_method_receiver
        )

        # Build callee ID using type-resolved receiver
        callee_id = callee_name
        is_resolved = False
        if receiver_type:
            short_key = f"{receiver_type}.{callee_name}"
            if short_key in self._top_level_nodes:
                callee_id = self._top_level_nodes[short_key].id
                is_resolved = True
            else:
                callee_id = short_key
        else:
            if callee_name in self._top_level_nodes:
                callee_id = self._top_level_nodes[callee_name].id
                is_resolved = True

        self.call_relationships.append(CallRelationship(
            caller=caller_id,
            callee=callee_id,
            call_line=node.start_point[0] + 1,
            is_resolved=is_resolved
        ))

    def _process_struct_embedding(self, node):
        """Process struct type for embedded structs (inheritance-like)."""
        containing_type = self._find_containing_type_name(node)
        if not containing_type:
            return

        for child in node.children:
            if child.type == "field_declaration_list":
                for field in child.children:
                    if field.type == "field_declaration":
                        # Embedded struct: just a type, no name
                        names = [c for c in field.children if c.type == "identifier"]
                        types = [c for c in field.children if c.type == "type_identifier"]

                        # If no name but has type, it's embedded
                        if types and not names:
                            embedded_type = types[0].text.decode()
                            if not self._is_primitive(embedded_type):
                                caller_id = self._get_component_id(containing_type)
                                self.call_relationships.append(CallRelationship(
                                    caller=caller_id,
                                    callee=embedded_type,
                                    call_line=node.start_point[0] + 1,
                                    is_resolved=False,
                                    relationship_type="embeds"
                                ))

    def _process_interface_embedding(self, node):
        """Process interface type for embedded interfaces."""
        containing_type = self._find_containing_type_name(node)
        if not containing_type:
            return

        for child in node.children:
            if child.type in ("method_spec", "method_elem"):
                # Check if it's just a type (embedded interface)
                has_name = any(c.type == "field_identifier" for c in child.children)
                type_ids = [c for c in child.children if c.type == "type_identifier"]

                if type_ids and not has_name:
                    embedded_type = type_ids[0].text.decode()
                    if not self._is_primitive(embedded_type):
                        caller_id = self._get_component_id(containing_type)
                        self.call_relationships.append(CallRelationship(
                            caller=caller_id,
                            callee=embedded_type,
                            call_line=node.start_point[0] + 1,
                            is_resolved=False,
                            relationship_type="embeds"
                        ))

    def _find_containing_type_name(self, node) -> Optional[str]:
        """Find the containing struct/interface name."""
        current = node.parent
        while current:
            if current.type == "type_spec":
                name_node = self._find_child_by_type(current, "type_identifier")
                return name_node.text.decode() if name_node else None
            current = current.parent
        return None

    def _get_full_selector_name(self, node) -> str:
        """Get full name from a selector expression."""
        parts = []
        current = node
        while current and current.type == "selector_expression":
            field = self._find_child_by_type(current, "field_identifier")
            if field:
                parts.insert(0, field.text.decode())
                current = current.children[0]
            else:
                break

        if current and current.type == "identifier":
            parts.insert(0, current.text.decode())

        return ".".join(parts)

    def _find_child_by_type(self, node, child_type: str):
        """Find first child of a specific type."""
        for child in node.children:
            if child.type == child_type:
                return child
        return None

    def _extract_method_receiver_type(self, method_node) -> Optional[str]:
        """Extract receiver type from a method declaration, including pointer receivers."""
        receiver_node = self._find_child_by_type(method_node, "parameter_list")
        if not receiver_node:
            return None

        for child in receiver_node.children:
            if child.type != "parameter_declaration":
                continue
            receiver_type = self._extract_receiver_type_from_declaration(child)
            if receiver_type:
                return receiver_type
        return None

    def _extract_receiver_type_from_declaration(self, parameter_node) -> Optional[str]:
        """Extract receiver type from a parameter_declaration node."""
        for child in reversed(parameter_node.children):
            if child.type in {"identifier", ","}:
                continue
            text = child.text.decode() if child.text else ""
            receiver_type = self._normalize_receiver_type(text)
            if receiver_type:
                return receiver_type

        # Fallback: parse raw declaration text, e.g. "p *ProductWrapper"
        raw_text = parameter_node.text.decode() if parameter_node.text else ""
        return self._normalize_receiver_type(raw_text)

    def _normalize_receiver_type(self, text: str) -> Optional[str]:
        """Normalize receiver type text to a stable component ID segment."""
        if not text:
            return None

        type_text = text.strip()
        if not type_text:
            return None

        # parameter_declaration fallback can include parameter names.
        if " " in type_text:
            type_text = type_text.split()[-1]

        while type_text.startswith("(") and type_text.endswith(")") and len(type_text) > 2:
            type_text = type_text[1:-1].strip()

        while type_text.startswith("*"):
            type_text = type_text[1:].strip()

        while type_text.startswith("[]"):
            type_text = type_text[2:].strip()

        # Generic receiver instantiation, e.g. Receiver[T]
        if "[" in type_text:
            type_text = type_text.split("[", 1)[0]

        # Strip package qualifier, e.g. pkg.Receiver
        if "." in type_text:
            type_text = type_text.split(".")[-1]

        type_text = type_text.strip().strip(",")
        return type_text or None

    def _get_preceding_docstring(self, node, lines: List[str]) -> str:
        """Extract Go comment preceding a node."""
        if node.start_point[0] == 0:
            return ""

        # Check lines directly before the node
        start_line = node.start_point[0]
        doc_lines = []

        for i in range(start_line - 1, max(0, start_line - 20), -1):
            if i >= len(lines):
                continue
            line = lines[i].strip()

            if line.startswith("//"):
                doc_lines.insert(0, line[2:].strip())
            elif line == "":
                if doc_lines:
                    break  # End of comment block
            else:
                break  # Non-comment, non-empty line

        return "\n".join(doc_lines) if doc_lines else ""

    def _extract_parameters(self, node) -> Optional[List[str]]:
        """Extract function/method parameters."""
        params = []

        # For methods, skip the receiver parameter list
        start_idx = 0
        if node.type == "method_declaration":
            for i, child in enumerate(node.children):
                if child.type == "parameter_list":
                    start_idx = i + 1
                    break

        # Find the main parameter list
        for child in node.children[start_idx:]:
            if child.type == "parameter_list":
                for param in child.children:
                    if param.type == "parameter_declaration":
                        # Get parameter names
                        names = []
                        param_type = None

                        for pchild in param.children:
                            if pchild.type == "identifier":
                                names.append(pchild.text.decode())
                            elif pchild.type in ("type_identifier", "qualified_type",
                                                  "pointer_type", "slice_type", "map_type",
                                                  "chan_type"):
                                param_type = pchild.text.decode()

                        for name in names:
                            if param_type:
                                params.append(f"{name} {param_type}")
                            else:
                                params.append(name)

        return params if params else None

    def _is_primitive(self, type_name: str) -> bool:
        """Check if type is a Go primitive or built-in."""
        if not type_name:
            return True
        # Remove pointer prefix
        clean_name = type_name.lstrip("*").lstrip("[]").lstrip("map[").split("]")[0]
        clean_name = clean_name.split(".")[0]  # Handle pkg.Type
        return clean_name.lower() in {p.lower() for p in GO_PRIMITIVES}

    def _is_builtin(self, name: str) -> bool:
        """Check if name is a Go built-in function."""
        if not name:
            return True
        # Remove package prefix if any
        base_name = name.split(".")[-1]
        return base_name in GO_BUILTINS


def analyze_go_file(file_path: str, content: str, repo_path: str = None) -> Tuple[List[Node], List[CallRelationship], Dict[str, Set[str]], Dict[str, Set[str]]]:
    """
    Analyze a Go file and extract nodes, call relationships, and type information.

    Args:
        file_path: Path to the Go file
        content: Content of the Go file
        repo_path: Optional path to the repository root

    Returns:
        Tuple of (nodes, call_relationships, interface_methods, struct_methods)
    """
    analyzer = TreeSitterGoAnalyzer(file_path, content, repo_path)
    return analyzer.nodes, analyzer.call_relationships, analyzer._interface_methods, analyzer._struct_methods
