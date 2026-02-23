"""
FastAPI wrapper for the resume AI engine.
Exposes /health, /analyze, /recommend, /skills endpoints.
Run: uvicorn api:app --host 0.0.0.0 --port 8000
"""

import os
import sys
import io
import requests as http_requests
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict

# Add parent dir to path so imports work
sys.path.insert(0, os.path.dirname(__file__))

from resume_engine import analyze_resume
from skill_extractor import extract_skills, extract_skills_with_domains
from domain_model import predict_domain, predict_domain_vector
from scorer import score_student_vs_job, rank_jobs_for_student
from suggestion_engine import generate_suggestions
from resume_parser import parse_resume_fields

app = FastAPI(title="SkillSync AI Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request / Response Models ---

class AnalyzeRequest(BaseModel):
    resume_text: str

class RecommendRequest(BaseModel):
    resume_text: str
    jobs: List[dict]
    profile_completeness: Optional[float] = 100.0

class SkillsRequest(BaseModel):
    text: str


# --- Endpoints ---

@app.get("/health")
def health():
    return {"status": "ok", "service": "SkillSync AI Engine"}


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    """Full resume analysis: skills, domain, suggestions."""
    if not req.resume_text or len(req.resume_text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Resume text too short")

    try:
        # Core analysis
        analysis = analyze_resume(req.resume_text)

        # Domain prediction with vector
        domain, confidence, domain_scores = predict_domain(req.resume_text)
        domain_vector = predict_domain_vector(req.resume_text)

        # Skills with domain grouping
        skills_by_domain = extract_skills_with_domains(req.resume_text)

        # Suggestions
        suggestions = generate_suggestions(req.resume_text)

        return {
            "skills": analysis.get("skills", []),
            "skillsByDomain": skills_by_domain,
            "domain": domain,
            "confidence": round(confidence, 4),
            "domainScores": domain_scores,
            "domainVector": domain_vector,
            "suggestions": suggestions,
            "analysis": analysis,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommend")
def recommend(req: RecommendRequest):
    """Rank jobs for a student based on resume match."""
    if not req.resume_text or len(req.resume_text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Resume text too short")
    if not req.jobs:
        raise HTTPException(status_code=400, detail="No jobs provided")

    try:
        rankings = rank_jobs_for_student(
            req.resume_text,
            req.jobs,
            profile_completeness=req.profile_completeness,
        )
        return {"rankings": rankings, "total": len(rankings)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# ─── Request Models ───────────────────────────────────────────────────────

class ParseResumeUrlRequest(BaseModel):
    resume_url: str


@app.post("/skills")
def skills(req: SkillsRequest):
    """Extract skills from arbitrary text."""
    if not req.text:
        raise HTTPException(status_code=400, detail="Text is required")

    try:
        flat_skills = extract_skills(req.text)
        grouped = extract_skills_with_domains(req.text)
        return {"skills": flat_skills, "byDomain": grouped}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# ─── Helper: Extract text from PDF bytes ─────────────────────────────────

def _extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    import PyPDF2
    reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text


# ─── Helper: Run full AI analysis on text ────────────────────────────────

def _run_ai_analysis(text: str) -> dict:
    try:
        skills_flat   = extract_skills(text)
        skills_by_dom = extract_skills_with_domains(text)
        domain, confidence, domain_scores = predict_domain(text)
        suggestions   = generate_suggestions(text)
        return {
            "skills":     skills_flat,
            "skillsByDomain": skills_by_dom,
            "domain":     domain,
            "confidence": round(confidence, 4),
            "domainScores": domain_scores,
            "suggestions": suggestions,
        }
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────
#  POST /parse-resume-url
#  Called by Node backend after uploading PDF to Cloudinary.
#  Downloads the PDF from the given URL, extracts text + structured
#  fields, runs AI analysis, and returns everything.
# ─────────────────────────────────────────────────────────────────────────

@app.post("/parse-resume-url")
def parse_resume_url(req: ParseResumeUrlRequest):
    """Download PDF from URL, extract text, parse fields, run AI."""
    if not req.resume_url:
        raise HTTPException(status_code=400, detail="resume_url is required")

    # 1. Download PDF
    try:
        resp = http_requests.get(req.resume_url, timeout=20)
        resp.raise_for_status()
        pdf_bytes = resp.content
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to download PDF: {str(e)}")

    # 2. Extract text
    try:
        text = _extract_text_from_pdf_bytes(pdf_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF text extraction failed: {str(e)}")

    if len(text.strip()) < 20:
        raise HTTPException(status_code=422, detail="Extracted text too short — PDF may be scanned/image-only")

    # 3. Parse structured fields
    fields = parse_resume_fields(text)

    # 4. AI analysis
    analysis = _run_ai_analysis(text)
    fields["skills"] = analysis.get("skills", [])

    return {"fields": fields, "analysis": analysis}


# ─────────────────────────────────────────────────────────────────────────
#  POST /parse-resume  (multipart file upload alternative)
#  Accepts a PDF file directly via form upload.
# ─────────────────────────────────────────────────────────────────────────

@app.post("/parse-resume")
async def parse_resume_file(file: UploadFile = File(...)):
    """Accept PDF file upload, extract text, parse fields, run AI."""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    pdf_bytes = await file.read()

    try:
        text = _extract_text_from_pdf_bytes(pdf_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF text extraction failed: {str(e)}")

    if len(text.strip()) < 20:
        raise HTTPException(status_code=422, detail="Extracted text too short — PDF may be scanned/image-only")

    fields = parse_resume_fields(text)
    analysis = _run_ai_analysis(text)
    fields["skills"] = analysis.get("skills", [])

    return {"fields": fields, "analysis": analysis}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("AI_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

