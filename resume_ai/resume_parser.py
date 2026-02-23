"""
resume_parser.py
Extracts structured fields from raw resume text using regex patterns.
Returns: name, email, phone, github, linkedin, cgpa, branch,
         projects (list), certifications (list)
"""

import re
from typing import Dict, List, Any


# ─── Helpers ───────────────────────────────────────────────────────────────

def _first(pattern: str, text: str, flags: int = re.IGNORECASE) -> str:
    m = re.search(pattern, text, flags)
    return m.group(1).strip() if m else ''


def _all(pattern: str, text: str, flags: int = re.IGNORECASE) -> List[str]:
    return [m.strip() for m in re.findall(pattern, text, flags)]


# ─── Individual Extractors ─────────────────────────────────────────────────

def extract_email(text: str) -> str:
    m = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', text)
    return m.group(0) if m else ''


def extract_phone(text: str) -> str:
    # Matches Indian/international formats like +91-9876543210, 9876543210, (123) 456-7890
    m = re.search(
        r'(?:\+?\d{1,3}[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}',
        text
    )
    return m.group(0).strip() if m else ''


def extract_github(text: str) -> str:
    m = re.search(r'https?://(?:www\.)?github\.com/[\w\-]+(?:/[\w\-]+)?', text, re.IGNORECASE)
    return m.group(0) if m else ''


def extract_linkedin(text: str) -> str:
    m = re.search(r'https?://(?:www\.)?linkedin\.com/in/[\w\-]+/?', text, re.IGNORECASE)
    return m.group(0) if m else ''


def extract_cgpa(text: str) -> str:
    # Matches patterns like "CGPA: 8.5", "GPA: 3.8", "8.5/10", "3.8/4.0"
    m = re.search(
        r'(?:cgpa|gpa|cpi)\s*[:\s]*([0-9]\.[0-9]{1,2})|([0-9]\.[0-9]{1,2})\s*/\s*(?:10|4(?:\.0)?)',
        text, re.IGNORECASE
    )
    if m:
        return (m.group(1) or m.group(2)).strip()
    return ''


def extract_branch(text: str) -> str:
    # Common branch keywords
    branches = [
        r'computer\s*science(?:\s*(?:and|&)\s*engineering)?',
        r'information\s*technology',
        r'electronics?\s*(?:and|&)\s*(?:communication|telecommunication)',
        r'electrical\s*(?:and|&)?\s*electronics?',
        r'mechanical\s*engineering',
        r'civil\s*engineering',
        r'chemical\s*engineering',
        r'biotechnology',
        r'artificial\s*intelligence(?:\s*(?:and|&)\s*machine\s*learning)?',
        r'data\s*science',
        r'cybersecurity',
        r'\bCSE\b',
        r'\bIT\b',
        r'\bEEE\b',
        r'\bECE\b',
        r'\bME\b',
        r'\bAI\s*/\s*ML\b',
    ]
    for pat in branches:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m.group(0).strip()
    return ''


def extract_name_heuristic(text: str) -> str:
    """
    Heuristic: first non-empty line that looks like a human name
    (2-4 words, only letters and spaces, not a common header keyword).
    """
    SKIP = {
        'resume', 'curriculum vitae', 'cv', 'name', 'profile', 'summary',
        'education', 'skills', 'experience', 'projects', 'contact',
        'objective', 'achievements', 'certifications',
    }
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        words = line.split()
        if 2 <= len(words) <= 4 and all(w.replace('.', '').isalpha() for w in words):
            if line.lower() not in SKIP:
                return line
    return ''


def extract_projects(text: str) -> List[str]:
    """
    Find a 'Projects' section and extract bullet/dash/numbered items.
    Returns up to 10 project titles.
    """
    # Locate the section
    m = re.search(
        r'(?:PROJECTS?|PROJECT\s*EXPERIENCE|ACADEMIC\s*PROJECTS?)[:\s]*\n(.*?)(?:\n(?:[A-Z][A-Z\s]+:?|\Z))',
        text, re.IGNORECASE | re.DOTALL
    )
    if not m:
        return []

    section = m.group(1)
    # Extract lines that start with a bullet or dash or number
    items = re.findall(r'(?:^|\n)\s*(?:[\-\•\*]|\d+[\).])\s*(.+)', section)
    # Also capture bold-ish project names (Title Case lines without leading bullet)
    if not items:
        items = re.findall(r'(?:^|\n)\s*([A-Z][^\n]{5,60})', section)

    return [i.strip() for i in items[:10] if i.strip()]


def extract_certifications(text: str) -> List[str]:
    """
    Find a 'Certifications' / 'Certificates' section and extract entries.
    Returns up to 10 names.
    """
    m = re.search(
        r'(?:CERTIFICATIONS?|CERTIFICATES?|COURSES?)[:\s]*\n(.*?)(?:\n(?:[A-Z][A-Z\s]+:?|\Z))',
        text, re.IGNORECASE | re.DOTALL
    )
    if not m:
        return []

    section = m.group(1)
    items = re.findall(r'(?:^|\n)\s*(?:[\-\•\*]|\d+[\).])\s*(.+)', section)
    if not items:
        items = re.findall(r'(?:^|\n)\s*([A-Z][^\n]{5,80})', section)

    return [i.strip() for i in items[:10] if i.strip()]


# ─── Master Parser ─────────────────────────────────────────────────────────

def parse_resume_fields(text: str) -> Dict[str, Any]:
    """
    Given raw resume text, returns a dict of all extracted structured fields.
    """
    return {
        'resumeText':     text,
        'name':           extract_name_heuristic(text),
        'email':          extract_email(text),
        'contact':        extract_phone(text),
        'github':         extract_github(text),
        'linkedin':       extract_linkedin(text),
        'cgpa':           extract_cgpa(text),
        'branch':         extract_branch(text),
        'projects':       extract_projects(text),
        'certifications': extract_certifications(text),
    }
