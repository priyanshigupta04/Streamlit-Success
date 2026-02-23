from utils.file_parser import parse_resume
from utils.text_cleaner import clean_text
from utils.section_extractor import extract_sections
from skill_extractor import extract_skills
from domain_model import predict_domain
from similarity_engine import SimilarityEngine
from suggestion_engine import generate_suggestions
from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv
load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"))
db = client["resume_platform"]
collection = db["resume_analysis"]
sim_engine = SimilarityEngine()




def analyze_resume(resume_file, jd_text, user_id="123"):

    # Step 1: Extract text
    resume_text = resume_file
    
    # Step 2: Clean text
    cleaned_resume = clean_text(resume_text)
    cleaned_jd = clean_text(jd_text)

    # Step 3: Section extraction
    sections = extract_sections(cleaned_resume)

    # Step 4: Skill extraction
    resume_skills = extract_skills(cleaned_resume)
    jd_skills = extract_skills(cleaned_jd)

    # Step 5: Domain prediction (Multi-domain scoring)
    resume_domain, resume_confidence, resume_domain_scores = predict_domain(cleaned_resume)
    jd_domain, jd_confidence, jd_domain_scores = predict_domain(cleaned_jd)


    domain_match = resume_domain == jd_domain

    # Step 6: Semantic similarity
    semantic_score = float(sim_engine.compute_similarity(cleaned_resume, cleaned_jd))

    # Step 7: Skill match
    matched_skills = list(set(resume_skills) & set(jd_skills))
    missing_skills = list(set(jd_skills) - set(resume_skills))
    skill_score = float((len(matched_skills) / max(len(jd_skills),1)) * 100)

    # Step 8: Final weighted score (now uses domain alignment)
    domain_score = 100 if domain_match else 50

    final_score = (
        0.4 * semantic_score +
        0.4 * skill_score +
        0.2 * domain_score
    )

    # Step 9: Suggestions
    suggestions = generate_suggestions(skill_score, semantic_score, missing_skills)

    # Step 10: Create MongoDB document
    result_document = {
        "user_id": user_id,

        "resume_domain": resume_domain,
        "resume_domain_confidence": round(resume_confidence * 100, 2),

        "jd_domain": jd_domain,
        "jd_domain_confidence": round(jd_confidence * 100, 2),

        "resume_domain_scores": resume_domain_scores,
        "jd_domain_scores": jd_domain_scores,

        "domain_match": resume_domain == jd_domain,

        "semantic_score": round(semantic_score, 2),
        "skill_score": round(skill_score, 2),
        "final_score": round(float(final_score), 2),

        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "suggestions": suggestions,
    }


    # Step 11: Insert into MongoDB
    collection.insert_one(result_document)

    # Step 12: Console output - Only show key metrics
    print("\n" + "="*50)
    print("📊 ANALYSIS RESULTS")
    print("="*50)
    print(f"Final Score: {result_document['final_score']}%")
    print(f"Semantic Score: {result_document['semantic_score']}%")
    print(f"Skill Score: {result_document['skill_score']}%")
    
    if missing_skills:
        print(f"\n❌ Missing Skills ({len(missing_skills)}):")
        print(f"   {', '.join(missing_skills)}")
    else:
        print("\n✅ No missing skills detected!")
    print("="*50 + "\n")

    return result_document
