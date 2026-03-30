import re
from skill_taxonomy import get_alias_map, get_domain_for_skill

_ALIAS_MAP = get_alias_map()


def _compile_alias_pattern(alias: str):
    """Build a robust regex for aliases, including symbol-heavy skills."""
    escaped = re.escape(alias)

    # Single-letter skills are highly ambiguous. Keep strict guards.
    if alias == 'c':
        return re.compile(r'(?<!\w)c(?![\w+#])')
    if alias == 'r':
        return re.compile(r'(?<!\w)r(?!\w)')

    # Generic token boundary that still works for symbols like c++, c#, .net, node.js
    return re.compile(rf'(?<!\w){escaped}(?!\w)')


_ALIASES_WITH_PATTERNS = [
    (alias, canonical, _compile_alias_pattern(alias))
    for alias, canonical in _ALIAS_MAP.items()
]


def extract_skills(text):
    """Extract skills from text using the full taxonomy with alias resolution."""
    if not text:
        return []

    text_lower = text.lower()
    found = {}
    for alias, canonical, pattern in _ALIASES_WITH_PATTERNS:
        if pattern.search(text_lower):
            found[canonical] = get_domain_for_skill(canonical)

    return sorted(found.keys())


def extract_skills_with_domains(text):
    """Extract skills and group them by domain."""
    if not text:
        return {}

    text_lower = text.lower()
    domain_skills = {}
    for alias, canonical, pattern in _ALIASES_WITH_PATTERNS:
        if pattern.search(text_lower):
            domain = get_domain_for_skill(canonical) or "Other"
            if domain not in domain_skills:
                domain_skills[domain] = set()
            domain_skills[domain].add(canonical)

    # Convert sets to sorted lists
    return {d: sorted(list(s)) for d, s in domain_skills.items()}
