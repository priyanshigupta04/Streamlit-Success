import re
from skill_taxonomy import get_alias_map, get_domain_for_skill

_ALIAS_MAP = get_alias_map()


def extract_skills(text):
    """Extract skills from text using the full taxonomy with alias resolution."""
    text_lower = text.lower()
    found = {}
    for alias, canonical in _ALIAS_MAP.items():
        pattern = r"\b" + re.escape(alias) + r"\b"
        if re.search(pattern, text_lower):
            found[canonical] = get_domain_for_skill(canonical)
    return sorted(found.keys())


def extract_skills_with_domains(text):
    """Extract skills and group them by domain."""
    text_lower = text.lower()
    domain_skills = {}
    for alias, canonical in _ALIAS_MAP.items():
        pattern = r"\b" + re.escape(alias) + r"\b"
        if re.search(pattern, text_lower):
            domain = get_domain_for_skill(canonical) or "Other"
            if domain not in domain_skills:
                domain_skills[domain] = set()
            domain_skills[domain].add(canonical)

    # Convert sets to sorted lists
    return {d: sorted(list(s)) for d, s in domain_skills.items()}
