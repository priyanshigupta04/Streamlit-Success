import re


def extract_sections(text):
    # Very simple heuristic-based section extractor
    headers = re.split(r"\n(?=[A-Z][A-Za-z ]{1,40}:?\n)", text)
    return [h.strip() for h in headers if h.strip()]
