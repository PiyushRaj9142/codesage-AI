"""
Tree-sitter AST parsing service.
Supports Python, JavaScript, TypeScript, Java, and Go with symbol extraction and import discovery.
"""
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from tree_sitter import Language, Parser
import tree_sitter_python as tspython
import tree_sitter_javascript as tsjs
import tree_sitter_typescript as tsts
import tree_sitter_java as tsjava
import tree_sitter_go as tsgo


@dataclass
class ParsedSymbol:
    name: str
    symbol_type: str  # function, class, method, route, interface
    start_line: int   # 1-indexed
    end_line: int     # 1-indexed
    docstring: Optional[str] = None
    parameters: Optional[List[str]] = None
    parent_symbol: Optional[str] = None


@dataclass
class ParsedImport:
    source_path: str
    symbol_name: Optional[str] = None


class TreeSitterParserService:
    def __init__(self):
        self._parsers: Dict[str, Parser] = {}
        self._init_languages()

    def _init_languages(self):
        try:
            self._parsers["python"] = Parser(Language(tspython.language()))
        except Exception:
            pass

        try:
            self._parsers["javascript"] = Parser(Language(tsjs.language()))
        except Exception:
            pass

        try:
            self._parsers["typescript"] = Parser(Language(tsts.language_typescript()))
        except Exception:
            pass

        try:
            self._parsers["java"] = Parser(Language(tsjava.language()))
        except Exception:
            pass

        try:
            self._parsers["go"] = Parser(Language(tsgo.language()))
        except Exception:
            pass

    def parse_file(self, content: str, language: str) -> Tuple[List[ParsedSymbol], List[ParsedImport]]:
        """Parses source code and extracts high-level symbols and imported dependencies."""
        symbols: List[ParsedSymbol] = []
        imports: List[ParsedImport] = []

        parser = self._parsers.get(language.lower())
        if not parser:
            # Fallback regex-based symbol detection for unsupported formats
            return self._fallback_parse(content), []

        try:
            tree = parser.parse(content.encode("utf-8"))
            root = tree.root_node

            if language == "python":
                self._traverse_python(root, symbols, imports, content)
            elif language in {"javascript", "typescript"}:
                self._traverse_js_ts(root, symbols, imports, content)
            elif language == "java":
                self._traverse_java(root, symbols, imports, content)
            elif language == "go":
                self._traverse_go(root, symbols, imports, content)
            else:
                symbols = self._fallback_parse(content)
        except Exception:
            symbols = self._fallback_parse(content)

        return symbols, imports

    def _traverse_python(self, node, symbols: List[ParsedSymbol], imports: List[ParsedImport], content: str, parent: Optional[str] = None):
        """Walks Python AST extracting classes, functions, routes, and imports."""
        if node.type in {"function_definition", "async_function_definition"}:
            name_node = node.child_by_field_name("name")
            name = name_node.text.decode("utf-8") if name_node else "anonymous"
            s_type = "method" if parent else "function"
            
            # Detect decorators for routes (e.g., @app.get, @router.post)
            for child in node.children:
                if child.type == "decorator":
                    dec_text = child.text.decode("utf-8")
                    if any(verb in dec_text.lower() for verb in ["get", "post", "put", "delete", "route"]):
                        s_type = "route"
                        break

            symbols.append(ParsedSymbol(
                name=name,
                symbol_type=s_type,
                start_line=node.start_point.row + 1,
                end_line=node.end_point.row + 1,
                parent_symbol=parent
            ))

        elif node.type == "class_definition":
            name_node = node.child_by_field_name("name")
            name = name_node.text.decode("utf-8") if name_node else "anonymous"
            symbols.append(ParsedSymbol(
                name=name,
                symbol_type="class",
                start_line=node.start_point.row + 1,
                end_line=node.end_point.row + 1
            ))
            # Traverse children with parent name
            for child in node.children:
                self._traverse_python(child, symbols, imports, content, parent=name)
            return

        elif node.type in {"import_statement", "import_from_statement"}:
            import_text = node.text.decode("utf-8")
            if "from" in import_text:
                parts = import_text.split()
                if len(parts) >= 2:
                    mod = parts[1]
                    imports.append(ParsedImport(source_path=mod))
            else:
                parts = import_text.replace("import", "").split(",")
                for p in parts:
                    clean = p.strip().split(" as ")[0].strip()
                    if clean:
                        imports.append(ParsedImport(source_path=clean))

        for child in node.children:
            self._traverse_python(child, symbols, imports, content, parent=parent)

    def _traverse_js_ts(self, node, symbols: List[ParsedSymbol], imports: List[ParsedImport], content: str, parent: Optional[str] = None):
        """Walks JavaScript and TypeScript AST."""
        if node.type in {"function_declaration", "method_definition", "arrow_function", "function"}:
            name_node = node.child_by_field_name("name")
            name = name_node.text.decode("utf-8") if name_node else "anonymous"
            symbols.append(ParsedSymbol(
                name=name,
                symbol_type="method" if parent else "function",
                start_line=node.start_point.row + 1,
                end_line=node.end_point.row + 1,
                parent_symbol=parent
            ))
        elif node.type in {"class_declaration", "interface_declaration"}:
            name_node = node.child_by_field_name("name")
            name = name_node.text.decode("utf-8") if name_node else "anonymous"
            symbols.append(ParsedSymbol(
                name=name,
                symbol_type="class" if node.type == "class_declaration" else "interface",
                start_line=node.start_point.row + 1,
                end_line=node.end_point.row + 1
            ))
            for child in node.children:
                self._traverse_js_ts(child, symbols, imports, content, parent=name)
            return
        elif node.type == "import_statement":
            source_node = node.child_by_field_name("source")
            if source_node:
                raw_path = source_node.text.decode("utf-8").strip("\"'")
                imports.append(ParsedImport(source_path=raw_path))

        for child in node.children:
            self._traverse_js_ts(child, symbols, imports, content, parent=parent)

    def _traverse_java(self, node, symbols: List[ParsedSymbol], imports: List[ParsedImport], content: str, parent: Optional[str] = None):
        """Walks Java AST."""
        if node.type == "method_declaration":
            name_node = node.child_by_field_name("name")
            name = name_node.text.decode("utf-8") if name_node else "method"
            symbols.append(ParsedSymbol(
                name=name,
                symbol_type="method",
                start_line=node.start_point.row + 1,
                end_line=node.end_point.row + 1,
                parent_symbol=parent
            ))
        elif node.type in {"class_declaration", "interface_declaration"}:
            name_node = node.child_by_field_name("name")
            name = name_node.text.decode("utf-8") if name_node else "Class"
            symbols.append(ParsedSymbol(
                name=name,
                symbol_type="class" if node.type == "class_declaration" else "interface",
                start_line=node.start_point.row + 1,
                end_line=node.end_point.row + 1
            ))
            for child in node.children:
                self._traverse_java(child, symbols, imports, content, parent=name)
            return
        elif node.type == "import_declaration":
            text = node.text.decode("utf-8").replace("import", "").replace(";", "").strip()
            imports.append(ParsedImport(source_path=text))

        for child in node.children:
            self._traverse_java(child, symbols, imports, content, parent=parent)

    def _traverse_go(self, node, symbols: List[ParsedSymbol], imports: List[ParsedImport], content: str):
        """Walks Go AST."""
        if node.type == "function_declaration":
            name_node = node.child_by_field_name("name")
            name = name_node.text.decode("utf-8") if name_node else "func"
            symbols.append(ParsedSymbol(
                name=name,
                symbol_type="function",
                start_line=node.start_point.row + 1,
                end_line=node.end_point.row + 1
            ))
        elif node.type == "method_declaration":
            name_node = node.child_by_field_name("name")
            name = name_node.text.decode("utf-8") if name_node else "method"
            symbols.append(ParsedSymbol(
                name=name,
                symbol_type="method",
                start_line=node.start_point.row + 1,
                end_line=node.end_point.row + 1
            ))
        elif node.type == "type_declaration":
            symbols.append(ParsedSymbol(
                name=node.text.decode("utf-8")[:30],
                symbol_type="type",
                start_line=node.start_point.row + 1,
                end_line=node.end_point.row + 1
            ))
        elif node.type == "import_declaration":
            for child in node.children:
                if child.type == "import_spec":
                    path_node = child.child_by_field_name("path")
                    if path_node:
                        imports.append(ParsedImport(source_path=path_node.text.decode("utf-8").strip("\"'")))

        for child in node.children:
            self._traverse_go(child, symbols, imports, content)

    def _fallback_parse(self, content: str) -> List[ParsedSymbol]:
        """Line-based fallback symbol extraction using regex patterns."""
        symbols = []
        lines = content.splitlines()
        for idx, line in enumerate(lines):
            line_str = line.strip()
            if line_str.startswith("# ") or line_str.startswith("## "):
                symbols.append(ParsedSymbol(
                    name=line_str.lstrip("#").strip(),
                    symbol_type="heading",
                    start_line=idx + 1,
                    end_line=idx + 1
                ))
            elif line_str.startswith("def ") or line_str.startswith("function ") or line_str.startswith("func "):
                parts = line_str.split("(")
                name = parts[0].split()[-1] if parts else "symbol"
                symbols.append(ParsedSymbol(
                    name=name,
                    symbol_type="function",
                    start_line=idx + 1,
                    end_line=min(idx + 30, len(lines))
                ))
        return symbols


parser_service = TreeSitterParserService()
