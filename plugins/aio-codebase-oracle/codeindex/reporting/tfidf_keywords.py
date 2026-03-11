import re
import logging
from typing import Dict
from codeindex.analyzer.models.core import Node

logger = logging.getLogger(__name__)

CODE_STOPWORDS = {
    'self', 'cls', 'def', 'class', 'return', 'import', 'from', 'if', 'else',
    'elif', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'in',
    'not', 'and', 'or', 'is', 'none', 'true', 'false', 'pass', 'break',
    'continue', 'raise', 'yield', 'lambda', 'global', 'nonlocal', 'assert',
    'del', 'print', 'len', 'str', 'int', 'float', 'list', 'dict', 'set',
    'tuple', 'bool', 'type', 'var', 'let', 'const', 'function', 'new',
    'this', 'null', 'undefined', 'void', 'public', 'private', 'protected',
    'static', 'final', 'abstract', 'interface', 'extends', 'implements',
    'override', 'super', 'throw', 'throws', 'catch', 'switch', 'case',
    'default', 'do', 'goto', 'package', 'string', 'object', 'array',
    'args', 'kwargs', 'param', 'params', 'init', 'main', 'test', 'get', 'set',
}


def _tokenize_code(source: str) -> str:
    """Extract identifiers from source code and split camelCase/snake_case."""
    # Extract identifiers (words that look like variable/function names)
    identifiers = re.findall(r'[a-zA-Z_][a-zA-Z0-9_]*', source)

    tokens = []
    for ident in identifiers:
        # Split camelCase
        parts = re.sub(r'([A-Z])', r' \1', ident).split()
        # Split snake_case
        for part in parts:
            sub_parts = part.split('_')
            for sp in sub_parts:
                sp_lower = sp.lower().strip()
                if len(sp_lower) > 1 and sp_lower not in CODE_STOPWORDS:
                    tokens.append(sp_lower)

    return ' '.join(tokens)


def compute_tfidf_keywords(components: Dict[str, Node]) -> None:
    """Compute TF-IDF keywords for each component and annotate in-place."""
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
    except ImportError:
        logger.warning("scikit-learn not installed, skipping TF-IDF")
        return

    # Build corpus
    component_ids = []
    corpus = []
    for comp_id, node in components.items():
        if node.source_code:
            tokens = _tokenize_code(node.source_code)
            if tokens.strip():
                component_ids.append(comp_id)
                corpus.append(tokens)

    if len(corpus) < 2:
        # Need at least 2 documents for meaningful TF-IDF
        if corpus:
            # Single doc: just extract most frequent tokens
            tokens = corpus[0].split()
            from collections import Counter
            counts = Counter(tokens)
            top_5 = counts.most_common(5)
            components[component_ids[0]].tfidf_keywords = [(w, 1.0) for w, _ in top_5]
        return

    vectorizer = TfidfVectorizer(max_features=5000, min_df=1, max_df=0.9)
    tfidf_matrix = vectorizer.fit_transform(corpus)
    feature_names = vectorizer.get_feature_names_out()

    for idx, comp_id in enumerate(component_ids):
        row = tfidf_matrix[idx].toarray().flatten()
        # Get top 5 keywords with score > 0
        top_indices = row.argsort()[-5:][::-1]
        keywords = []
        for i in top_indices:
            if row[i] > 0:
                keywords.append((feature_names[i], round(float(row[i]), 4)))
        components[comp_id].tfidf_keywords = keywords
