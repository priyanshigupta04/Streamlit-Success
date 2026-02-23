"""
Scorer module — computes a weighted match score between a student resume and a job.
Weights: semantic similarity 40%, skill overlap 35%, domain match 15%, profile completeness 10%.
"""

from similarity_engine import SimilarityEngine
from skill_extractor import extract_skills
from domain_model import predict_domain, predict_domain_vector

_sim_engine = SimilarityEngine()


def _skill_overlap_score(resume_skills, job_skills):
    """Jaccard-style overlap between resume skills and required job skills."""
    if not job_skills:
        return 100.0
    resume_set = set(s.lower() for s in resume_skills)
    job_set = set(s.lower() for s in job_skills)

    if not job_set:
        return 100.0

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
            return round(prob * 100, 2)

    # Partial match - check if job_domain is substring of any predicted domain
    for domain, prob in domain_vector.items():
        if job_domain_lower in domain.lower() or domain.lower() in job_domain_lower:
            return round(prob * 100, 2)

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

    # 1. Semantic similarity (40%)
    semantic = _sim_engine.compute_similarity(resume_text, jd_text) if jd_text else 50.0

    # 2. Skill overlap (35%)
    resume_skills = extract_skills(resume_text)
    skill_score = _skill_overlap_score(resume_skills, required_skills)

    # 3. Domain match (15%)
    domain_score = _domain_match_score(resume_text, job_domain)

    # 4. Profile completeness (10%)
    profile_score = float(profile_completeness)

    # Weighted total
    overall = round(
        semantic * 0.40 +
        skill_score * 0.35 +
        domain_score * 0.15 +
        profile_score * 0.10,
        2
    )

    return {
        "overallScore": overall,
        "semantic": round(semantic, 2),
        "skillOverlap": round(skill_score, 2),
        "domainMatch": round(domain_score, 2),
        "profileCompleteness": round(profile_score, 2),
        "matchedSkills": sorted(set(s.lower() for s in resume_skills) & set(s.lower() for s in required_skills)),
        "missingSkills": sorted(set(s.lower() for s in required_skills) - set(s.lower() for s in resume_skills)),
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
