import logging
import os
import re
from dataclasses import dataclass
from typing import List, Optional
from pathlib import Path

from tree_sitter import Parser
from tree_sitter_language_pack import get_language

from codeindex.analyzer.models.core import Node, CallRelationship

logger = logging.getLogger(__name__)

_IDENTIFIER_RE = re.compile(r"^[a-zA-Z_$][a-zA-Z0-9_$]*$")


@dataclass
class ScriptBlock:
    content: str
    lang: str
    is_setup: bool
    start_line: int


class TreeSitterVueAnalyzer:

    VUE_BUILTINS = {
        "slot", "component", "transition", "transition-group",
        "keep-alive", "teleport", "suspense",
    }

    VUE_REACTIVITY_FNS = {
        "ref", "reactive", "computed", "readonly",
        "shallowRef", "shallowReactive", "toRef", "toRefs",
    }

    VUE_MACROS = {"defineProps", "defineEmits", "defineExpose", "defineSlots", "defineModel", "withDefaults"}

    def __init__(self, file_path: str, content: str, repo_path: str = None):
        self.file_path = Path(file_path)
        self.content = content
        self.repo_path = repo_path or ""
        self.nodes: List[Node] = []
        self.call_relationships: List[CallRelationship] = []

        try:
            self.vue_language = get_language("vue")
            self.parser = Parser(self.vue_language)
        except Exception as e:
            logger.error(f"Failed to initialize Vue parser: {e}")
            self.parser = None
            self.tree = None
            return

        try:
            self.tree = self.parser.parse(bytes(content, "utf8"))
        except Exception as e:
            logger.error(f"Failed to parse Vue content for {file_path}: {e}")
            self.tree = None

    def _extract_script_block(self) -> Optional[ScriptBlock]:
        if self.tree is None:
            return None

        root = self.tree.root_node
        for child in root.children:
            if child.type == "script_element":
                start_tag = None
                raw_text = None
                for sub in child.children:
                    if sub.type == "start_tag":
                        start_tag = sub
                    elif sub.type == "raw_text":
                        raw_text = sub

                if raw_text is None:
                    return None

                is_setup = False
                lang = ""
                if start_tag:
                    for attr in start_tag.children:
                        if attr.type == "attribute":
                            attr_name = None
                            attr_value = None
                            for attr_child in attr.children:
                                if attr_child.type == "attribute_name":
                                    attr_name = attr_child.text.decode("utf8")
                                elif attr_child.type == "quoted_attribute_value":
                                    for v in attr_child.children:
                                        if v.type == "attribute_value":
                                            attr_value = v.text.decode("utf8")
                            if attr_name == "setup":
                                is_setup = True
                            elif attr_name == "lang" and attr_value:
                                lang = attr_value

                content = raw_text.text.decode("utf8")
                if content.startswith("\n"):
                    content = content[1:]
                    start_line = raw_text.start_point[0] + 1
                else:
                    start_line = raw_text.start_point[0]

                return ScriptBlock(
                    content=content,
                    lang=lang,
                    is_setup=is_setup,
                    start_line=start_line,
                )
        return None

    def _extract_template_node(self):
        if self.tree is None:
            return None

        root = self.tree.root_node
        for child in root.children:
            if child.type == "template_element":
                return child
        return None

    def analyze(self) -> None:
        if self.tree is None:
            return

        script_block = self._extract_script_block()
        template_node = self._extract_template_node()

        # Nothing to analyze if there's no script and no template
        if not script_block and not template_node:
            return

        component_id = self._get_module_path()

        # Stage 1: Analyze script block with existing TS/JS analyzer
        if script_block and script_block.content.strip():
            self._analyze_script(script_block)

        # Stage 2: Analyze template for component refs, events, bindings
        if template_node:
            self._analyze_template(template_node, component_id)

        # Create top-level vue_component node
        self._create_component_node(component_id)

        # Post-process: enrich Vue-specific metadata
        self._enrich_vue_metadata()

    def _analyze_script(self, script_block: ScriptBlock) -> None:
        use_ts = script_block.lang in ("ts", "tsx")

        if use_ts:
            from codeindex.analyzer.languages.typescript import TreeSitterTSAnalyzer
            synthetic_path = str(self.file_path).replace(".vue", ".ts")
            sub_analyzer = TreeSitterTSAnalyzer(
                synthetic_path, script_block.content, self.repo_path
            )
        else:
            from codeindex.analyzer.languages.javascript import TreeSitterJSAnalyzer
            synthetic_path = str(self.file_path).replace(".vue", ".js")
            sub_analyzer = TreeSitterJSAnalyzer(
                synthetic_path, script_block.content, self.repo_path
            )

        sub_analyzer.analyze()

        # Fix line offsets and file paths — map back to original .vue file
        offset = script_block.start_line
        original_path = str(self.file_path)
        try:
            original_rel_path = os.path.relpath(original_path, self.repo_path)
        except ValueError:
            original_rel_path = original_path

        for node in sub_analyzer.nodes:
            node.start_line += offset
            node.end_line += offset
            node.file_path = original_path
            node.relative_path = original_rel_path
        for rel in sub_analyzer.call_relationships:
            if rel.call_line is not None:
                rel.call_line += offset

        self.nodes.extend(sub_analyzer.nodes)
        self.call_relationships.extend(sub_analyzer.call_relationships)

    def _get_module_path(self) -> str:
        try:
            rel_path = os.path.relpath(str(self.file_path), self.repo_path)
        except ValueError:
            rel_path = str(self.file_path)
        if rel_path.endswith(".vue"):
            rel_path = rel_path[:-4]
        return rel_path.replace("/", ".").replace("\\", ".")

    def _create_component_node(self, component_id: str) -> None:
        try:
            rel_path = os.path.relpath(str(self.file_path), self.repo_path)
        except ValueError:
            rel_path = str(self.file_path)
        self.nodes.insert(
            0,
            Node(
                id=component_id,
                name=self.file_path.stem,
                component_type="vue_component",
                file_path=str(self.file_path),
                relative_path=rel_path,
                source_code=self.content,
                start_line=1,
                end_line=self.content.count("\n") + 1,
                component_id=component_id,
            ),
        )

    def _analyze_template(self, template_node, component_id: str) -> None:
        stack = [template_node]
        while stack:
            node = stack.pop()

            if node.type in ("element", "self_closing_tag"):
                self._extract_template_element(node, component_id)
            elif node.type == "interpolation":
                self._extract_interpolation(node, component_id)

            for child in node.children:
                stack.append(child)

    def _extract_template_element(self, node, component_id: str) -> None:
        if node.type == "self_closing_tag":
            tag_node = node
        else:
            # For element nodes, only process start_tag.
            # self_closing_tag children are handled when popped from stack directly.
            tag_node = None
            for child in node.children:
                if child.type == "start_tag":
                    tag_node = child
                    break

        if tag_node is None:
            return

        tag_name = None
        for child in tag_node.children:
            if child.type == "tag_name":
                tag_name = child.text.decode("utf8")
                break

        if not tag_name:
            return

        # Component reference: PascalCase tag that isn't a built-in
        if tag_name[0].isupper() and tag_name.lower() not in self.VUE_BUILTINS:
            self.call_relationships.append(
                CallRelationship(
                    caller=component_id,
                    callee=tag_name,
                    call_line=tag_node.start_point[0] + 1,
                    relationship_type="uses_component",
                )
            )

        # Directive attributes: @event and :binding
        for child in tag_node.children:
            if child.type == "directive_attribute":
                self._extract_directive(child, component_id)

    def _extract_directive(self, node, component_id: str) -> None:
        directive_name = None
        value = None

        for child in node.children:
            if child.type == "directive_name":
                directive_name = child.text.decode("utf8")
            elif child.type == "quoted_attribute_value":
                for v in child.children:
                    if v.type == "attribute_value":
                        value = v.text.decode("utf8")

        if not directive_name or not value:
            return

        # Simple identifier check: no spaces, dots, parens, brackets, operators
        is_simple_identifier = bool(_IDENTIFIER_RE.match(value))

        if directive_name == "@" and is_simple_identifier:
            # Event handler: @click="handleClick"
            self.call_relationships.append(
                CallRelationship(
                    caller=component_id,
                    callee=value,
                    call_line=node.start_point[0] + 1,
                    relationship_type="calls",
                )
            )
        elif directive_name == ":" and is_simple_identifier:
            # Prop binding: :title="pageTitle"
            self.call_relationships.append(
                CallRelationship(
                    caller=component_id,
                    callee=value,
                    call_line=node.start_point[0] + 1,
                    relationship_type="references",
                )
            )

    def _extract_interpolation(self, node, component_id: str) -> None:
        for child in node.children:
            if child.type == "raw_text":
                text = child.text.decode("utf8").strip()
                if _IDENTIFIER_RE.match(text):
                    self.call_relationships.append(
                        CallRelationship(
                            caller=component_id,
                            callee=text,
                            call_line=child.start_point[0] + 1,
                            relationship_type="references",
                        )
                    )

    def _enrich_vue_metadata(self) -> None:
        # Build lookup of callee names per node for reactivity detection
        node_callees = {}
        for rel in self.call_relationships:
            if rel.caller not in node_callees:
                node_callees[rel.caller] = set()
            node_callees[rel.caller].add(rel.callee)

        for node in self.nodes:
            if node.component_type == "vue_component":
                continue

            # Detect Vue macros (defineProps, defineEmits, etc.)
            if node.name in self.VUE_MACROS:
                if node.name == "defineProps":
                    node.component_type = "vue_props"
                elif node.name == "defineEmits":
                    node.component_type = "vue_emits"

            # Detect reactivity wrappers on variables
            if node.component_type == "variable" and node.id in node_callees:
                callees = node_callees[node.id]
                for callee in callees:
                    callee_name = callee.split(".")[-1]
                    if callee_name in self.VUE_REACTIVITY_FNS:
                        node.node_type = callee_name
                        break


def analyze_vue_file(
    file_path: str, content: str, repo_path: str = None
) -> tuple[List[Node], List[CallRelationship]]:
    try:
        logger.debug(f"Vue analysis for {file_path}")
        analyzer = TreeSitterVueAnalyzer(file_path, content, repo_path)
        analyzer.analyze()
        logger.debug(
            f"Found {len(analyzer.nodes)} nodes, {len(analyzer.call_relationships)} relationships"
        )
        return analyzer.nodes, analyzer.call_relationships
    except Exception as e:
        logger.error(f"Error in Vue analysis for {file_path}: {e}", exc_info=True)
        return [], []
