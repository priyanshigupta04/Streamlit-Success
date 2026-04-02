"""
Scorer module — computes a weighted match score between a student resume and a job.
Weights: semantic similarity 40%, skill overlap 35%, domain match 15%, profile completeness 10%.
"""

from similarity_engine import SimilarityEngine
from skill_extractor import extract_skills
from domain_model import predict_domain_vector

_sim_engine = None


def _get_similarity_engine():
    global _sim_engine
    if _sim_engine is None:
        _sim_engine = SimilarityEngine()
    return _sim_engine


def _skill_overlap_score(resume_skills, job_skills):
    """Jaccard-style overlap between resume skills and required job skills."""
    if not job_skills or not isinstance(job_skills, list):
        # Neutral score when required skills are missing in job metadata.
        return 55.0
        
    resume_set = set(s.lower() for s in resume_skills if isinstance(s, str))
    job_set = set(s.lower() for s in job_skills if isinstance(s, str))

    if not job_set:
        return 55.0

    matched = resume_set & job_set
    return round((len(matched) / len(job_set)) * 100, 2)


def _domain_match_score(resume_text, job_domain):
    """How well the resume's predicted domain matches the job's domain."""
    if not job_domain:
        return 50.0

    domain_vector = predict_domain_vector(resume_text)
    if not domain_vector:
        return 50.0

    # Try exact match first (case-insensitive)
    job_domain_lower = job_domain.lower()
    for domain, prob in domain_vector.items():
        if domain.lower() == job_domain_lower:
            return round(float(prob) * 100, 2)

    # Partial match - check if job_domain is substring of any predicted domain
    for domain, prob in domain_vector.items():
        if job_domain_lower in domain.lower() or domain.lower() in job_domain_lower:
            return round(float(prob) * 100, 2)

    return 25.0


def score_student_vs_job(resume_text, job, profile_completeness=100):
    """
    Compute overall match score for a student against a single job.

    Args:
        resume_text: Student's resume text
        job: dict with keys: jdText, requiredSkills (list), domain (str)
        profile_completeness: 0-100 value for profile completion

    Returns:
        dict with overall score and component breakdown
    """
    jd_text = job.get("jdText", job.get("description", ""))
    required_skills = job.get("requiredSkills", [])
    job_domain = job.get("domain", "")
    sim_engine = _get_similarity_engine()

    # 1. Semantic similarity (40%)
    semantic = float(sim_engine.compute_similarity(resume_text, jd_text)) if jd_text else 50.0
    semantic = max(0.0, min(100.0, semantic))

    # 2. Skill overlap (35%)
    resume_skills = extract_skills(resume_text)
    skill_score = float(_skill_overlap_score(resume_skills, required_skills))

    # 3. Domain match (15%)
    domain_score = float(_domain_match_score(resume_text, job_domain))

    # 4. Profile completeness (10%)
    profile_score = float(profile_completeness)
    profile_score = max(0.0, min(100.0, profile_score))

    # Weighted total
    overall = float(round(
        semantic * 0.40 +
        skill_score * 0.35 +
        domain_score * 0.15 +
        profile_score * 0.10,
        2
    ))

    return {
        "overallScore": float(overall),
        "semantic": float(round(float(semantic), 2)),
        "skillOverlap": float(round(float(skill_score), 2)),
        "domainMatch": float(round(float(domain_score), 2)),
        "profileCompleteness": float(round(float(profile_score), 2)),
        "matchedSkills": sorted(set(s.lower() for s in resume_skills if isinstance(s, str)) & set(s.lower() for s in required_skills if isinstance(s, str))) if isinstance(required_skills, list) else [],
        "missingSkills": sorted(set(s.lower() for s in required_skills if isinstance(s, str)) - set(s.lower() for s in resume_skills if isinstance(s, str))) if isinstance(required_skills, list) else [],
    }


def rank_jobs_for_student(resume_text, jobs, profile_completeness=100, top_n=20):
    """
    Rank a list of jobs for a student by match score.

    Args:
        resume_text: Student's resume text
        jobs: list of job dicts
        profile_completeness: 0-100
        top_n: max results to return

    Returns:
        list of dicts sorted by overallScore descending
    """
    results = []
    for job in jobs:
        score_data = score_student_vs_job(resume_text, job, profile_completeness)
        score_data["jobId"] = str(job.get("_id", job.get("id", "")))
        score_data["title"] = job.get("title", "")
        score_data["company"] = job.get("company", "")
        results.append(score_data)

    results.sort(key=lambda x: x["overallScore"], reverse=True)
    return results[:top_n]
