"""
Unit tests for Tree-sitter AST parsing and structure-aware code chunking.
"""
from app.parsing.chunker import code_chunker
from app.parsing.treesitter import parser_service


def test_python_parsing_and_chunking():
    sample_code = '''def calculate_total(items, tax_rate=0.05):
    """Calculates invoice total with tax."""
    subtotal = sum(item["price"] for item in items)
    return subtotal * (1 + tax_rate)

class InvoiceManager:
    def __init__(self, currency="USD"):
        self.currency = currency

    def generate(self, customer_id):
        return f"Invoice for {customer_id}"
'''

    chunks = code_chunker.chunk_file(sample_code, "src/billing.py", "python")

    assert len(chunks) >= 2
    symbols = [c.symbol_name for c in chunks if c.symbol_name]
    assert "calculate_total" in symbols
    assert any("InvoiceManager" in str(s) or "generate" in str(s) for s in symbols)

    # Validate line numbers
    for c in chunks:
        assert c.start_line >= 1
        assert c.end_line >= c.start_line
        assert "src/billing.py" in c.context_header
        assert len(c.content_hash) == 64
