# Resume Recommendation System - Complete Architecture

## 📋 Executive Summary

**Resume Recommendation** is an intelligent job-matching system that scores student resumes against job descriptions using **NLP, ML, and domain knowledge**. It provides:
- **Match Score (0-100)**: How well a resume fits a job
- **Score Breakdown**: Component-wise analysis (semantic, skill, domain, profile)
- **Skill Gap Analysis**: Missing skills compared to job requirements
- **Smart Suggestions**: Actionable recommendations to improve match

---

## 🏗️ System Architecture: 5-Stage Pipeline

### STAGE 1: Text Extraction & Cleaning

#### Resume Parser (`resume_parser.py`)
**Input:** Resume PDF file

**Process:**
```
PDF File
  ↓ PyPDF2
Extract Raw Text (all text from PDF)
  ↓ Regex Extraction
Extract Structured Fields:
  - Email (pattern: user@domain.com)
  - Phone (pattern: +91-XXXXXXXXXX or (XXX) XXX-XXXX)
  - GitHub URL (https://github.com/username)
  - LinkedIn URL (https://linkedin.com/in/username)
  - CGPA (pattern: "CGPA: 8.5/10")
  - Branch (CSE, IT, ECE, Mech, etc.)
  - Projects, Certifications (listed sections)
```

**Why This Matters:**
- Isolates key profile information
- Prepares structured data for matching
- Enables profile completeness scoring

#### Text Cleaner (`utils/text_cleaner.py`)
**Input:** Raw extracted text

**Process:**
```
Raw Resume Text
  ↓
Lowercase conversion
Remove extra whitespace
Remove special characters (keep important ones)
Expand contractions ("don't" → "do not")
Remove Stop words (the, a, an)
Lemmatization (running → run, played → play)
  ↓
Cleaned Resume Text (ready for NLP)
```

#### Section Extractor (`utils/section_extractor.py`)
**Input:** Cleaned text

**Process:**
```
Identify Sections:
- EDUCATION: College name, degree, CGPA
- EXPERIENCE: Company, role, duration
- SKILLS: Technical skills listed
- PROJECTS: Project names and descriptions
- CERTIFICATIONS: Certificates earned
  ↓
Output: Structured sections for detailed analysis
```

---

### STAGE 2: Feature Engineering

#### Skill Extractor (`skill_extractor.py`)
**Input:** Cleaned resume text

**Components:**
1. **Skill Taxonomy** (`skill_taxonomy.py`): 200+ skills across 8 domains
   - Software Development (Python, Java, React, etc.)
   - Data Science & AI (ML, TensorFlow, NLP, etc.)
   - Cloud & DevOps (AWS, Docker, Kubernetes, etc.)
   - Databases (SQL, MongoDB, etc.)
   - And 4 more...

2. **Alias Resolution**: Multiple names for same skill
   ```
   "Python" aliases: ["python3", "python2", "py"]
   "React" aliases: ["reactjs", "react.js"]
   "Node.js" aliases: ["nodejs", "node"]
   ```

3. **Skill Extraction Algorithm**:
   ```
   For each skill in taxonomy:
     Create regex pattern with word boundaries
     Search for pattern in resume text (case-insensitive)
     If found, add to skill list
   Return: Sorted list of detected skills
   ```

**Output:**
```python
{
  "Python": detected,
  "JavaScript": detected,
  "React": detected,
  "AWS": detected,
  ...
}
```

#### Skill Domain Mapper
**Input:** Extracted skills

**Process:**
```
Map each skill to domain:
- Python → Software Development
- TensorFlow → Data Science & AI
- Docker → Cloud & DevOps
  ↓
Output: Skills grouped by domain
{
  "Software Development": ["Python", "JavaScript", "React"],
  "Data Science & AI": ["TensorFlow", "Pandas"],
  ...
}
```

#### Profile Completeness Score
**Input:** User profile data

**Criteria:**
```
Has Email? +15 pts
Has Phone? +15 pts
Has GitHub URL? +10 pts
Has Projects? +20 pts
Has Work Experience? +20 pts
Has Skills Listed? +10 pts
Has CGPA? +10 pts
  ↓
Total: 0-100 scale
```

---

### STAGE 3: Intelligent Matching (Core Engine)

#### 3.1 Semantic Similarity (`similarity_engine.py`)
**What it does:** Understands meaning beyond keywords

**Technology:** SentenceTransformers (`all-MiniLM-L6-v2`)
- Converts text into embeddings (dense vectors of 384 dimensions)
- Captures semantic meaning of resume and job description
- Compares using cosine similarity

**Process:**
```
Resume Text:
"Developed React applications with REST APIs"
  ↓ SentenceTransformers
Resume Embedding: [0.25, 0.18, 0.92, ..., -0.15]  (384 dims)

Job Description:
"Looking for React developer to build web apps"
  ↓ SentenceTransformers
Job Embedding: [0.27, 0.19, 0.88, ..., -0.14]  (384 dims)

Cosine Similarity = (dot product) / (norm_a * norm_b)
                  = 0.87 → 87%
```

**Why it works:**
- Understands context ("frontend developer" ≈ "web engineer")
- Handles synonyms ("application" ≈ "software")
- Semantic score: 0-100 ✅

#### 3.2 Skill Overlap Analysis (`scorer.py`)
**What it does:** Calculates skill match percentage

**Algorithm:** Jaccard Similarity
```
Resume Skills: {Python, JavaScript, React, SQL, AWS}
Required Skills: {Python, JavaScript, React, Angular, AWS, GCP}

Intersection: {Python, JavaScript, React, AWS} = 4 skills
Union: {Python, JavaScript, React, SQL, AWS, Angular, GCP} = 7 skills

Jaccard = 4 / 7 = 0.571 → 57.1%

Also tracks:
- Matched Skills: [Python, JavaScript, React, AWS]
- Missing Skills: [Angular, GCP]
```

**Output:**
- Skill Match Score: 0-100 ✅
- Matched Skills list
- Missing Skills list

#### 3.3 Domain Classification (`domain_model.py`)
**What it does:** Predicts resume domain and matches against job domain

**ML Model:**
- **Vectorizer:** TF-IDF (Term Frequency-Inverse Document Frequency)
  - Converts text to numeric features
  - Weights important domain-specific terms higher
  - `max_features=6000, ngram_range=(1,2)`

- **Classifier:** Logistic Regression (Multi-class)
  - Trained on labeled resume data
  - Outputs probability per domain
  - Handles imbalanced classes with `class_weight='balanced'`

**Domains:**
- Software Development
- Data Science & AI
- DevOps & Cloud
- Frontend Development
- Backend Development
- Full Stack Development

**Process:**
```
Resume Text
  ↓ TF-IDF Vectorizer
Numeric Feature Vector [0.23, 0.45, ..., 0.12]
  ↓ Logistic Regression Model
Domain Predictions:
{
  "Software Development": 0.78,    ← 78% confidence
  "Full Stack Dev": 0.15,          ← 15% confidence
  "Frontend Dev": 0.05,            ← 5% confidence
  ...
}

Job Domain: "Full Stack Development"

Domain Match Score:
If resume domain == job domain: 100
Else partial match: 50
Else no match: 25
```

**Output:** Domain Match Score: 0-100 ✅

---

### STAGE 4: Score Aggregation (`scorer.py`)

**Weighted Multi-Component Scoring System:**

```
FINAL SCORE = 
  (Semantic Similarity × 40%) +
  (Skill Overlap × 35%) +
  (Domain Match × 15%) +
  (Profile Completeness × 10%)
```

**Example Calculation:**
```
Semantic Score: 78 × 0.40 = 31.2
Skill Score: 65 × 0.35 = 22.75
Domain Score: 85 × 0.15 = 12.75
Profile Score: 90 × 0.10 = 9.0
                            ------
FINAL SCORE = 75.7 / 100
```

**Component Breakdown (returned to frontend):**
```json
{
  "overallScore": 75.7,
  "semantic": 78.0,
  "skillOverlap": 65.0,
  "domainMatch": 85.0,
  "profileCompleteness": 90.0,
  "matchedSkills": ["Python", "JavaScript", "React"],
  "missingSkills": ["AWS", "Docker"]
}
```

---

### STAGE 5: Recommendations & Insights (`suggestion_engine.py`)

**Smart Suggestion Logic:**

```python
IF skill_score < 60:
  "Add missing skills: " + top_5_missing_skills

IF semantic_score < 60:
  "Improve project descriptions using job-related keywords"
  "Highlight experience with similar technologies"

IF domain_match == False:
  "Consider transitioning to [target domain]"
  "Develop skills in [domain requirements]"

ELSE:
  "Resume is well optimized for this role!"
```

**Priority-Based Recommendations:**
1. **Critical** (Score < 50): Must add core skills
2. **High** (50-70): Focus on key missing skills
3. **Medium** (70-85): Nice-to-have improvements
4. **Low** (85+): Fine-tuning only

---

## 🔄 End-to-End Data Flow

```
1. Student uploads resume (PDF) + views job posting
                    ↓
2. Backend receives: POST /api/score-resume
   - resume_file (uploaded)
   - job_id (from database)
                    ↓
3. Python AI Service processes:
   - Parse resume → Extract skills, domain
   - Clean job description
   - Compute 4 match scores
   - Generate suggestions
   - Return result object
                    ↓
4. Backend stores result in MongoDB:
   collection: "resume_analysis"
   {
     studentId, jobId,
     overallScore, semantic, skillOverlap, domainMatch,
     matchedSkills, missingSkills,
     suggestions,
     timestamp
   }
                    ↓
5. Frontend displays to student:
   - Match score (visual gauge: 0-100)
   - Component breakdown (chart)
   - Matched skills (green)
   - Missing skills (red)
   - Actionable suggestions
   - "Apply" button (if score > threshold)
```

---

## 💾 MongoDB Storage Schema

### Collection: `resume_analysis`
```javascript
{
  _id: ObjectId,
  student_id: "user_123",
  job_id: "job_456",
  
  // Score components
  overallScore: 75.7,
  semantic: 78.0,
  skillOverlap: 65.0,
  domainMatch: 85.0,
  profileCompleteness: 90.0,
  
  // Skill analysis
  matchedSkills: ["Python", "React", "SQL"],
  missingSkills: ["AWS", "Docker"],
  
  // Domain prediction
  resumeDomain: "Full Stack Development",
  resumeDomainConfidence: 0.78,
  jobDomain: "Full Stack Development",
  
  // Recommendations
  suggestions: [
    "Add missing skills: AWS, Docker",
    "Improve project descriptions"
  ],
  
  // Metadata
  createdAt: ISODate("2026-04-02T10:30:00Z"),
  updatedAt: ISODate("2026-04-02T10:30:00Z")
}
```

---

## 🎨 Frontend Integration

### Student Dashboard Display
```
Job: "Senior React Developer @ TechCorp"

┌─────────────────────────────────────┐
│ ⭐ Match Score: 75.7 / 100         │
│                                      │
│ Semantic Fit:  ████████░░░  78%     │
│ Skill Match:   ██████░░░░░  65%     │
│ Domain Fit:    ████████░░░  85%     │
│ Profile Ready: █████████░░  90%     │
└─────────────────────────────────────┘

✅ You have these skills:
   • Python  • React  • SQL

❌ You're missing:
   • AWS  • Docker

💡 Recommendations:
   1. Learn Docker for containerization
   2. Get AWS certification
   3. Add cloud deployment projects

[Apply Now] [Skip] [Save]
```

---

## 🚀 Optimization & Performance

### Current Optimizations:
1. **Model Caching**: SentenceTransformers loaded once, reused
2. **Batch Processing**: Process 100 student-job pairs at once
3. **MongoDB Indexing**: Indexes on `student_id`, `job_id`, `createdAt`

### Recommended Improvements:

#### 1. Real-time Ranking
```
Current: Score one resume per job
Optimized: Rank ALL students against ONE job
  - Load job once
  - Compute embeddings once
  - Batch score all resumes
  - Return ranked list
```

#### 2. Incremental Model Updates
```
Current: TF-IDF model static
Optimized: Update model weekly with new resume data
  - Retrain domain classifier
  - Expand skill taxonomy
  - Adjust weights based on placement outcomes
```

#### 3. Caching Strategy
```
Cache layer (Redis):
- Store embeddings (expensive computation)
- Cache job descriptions
- Store frequently accessed results
- TTL: 24 hours
```

#### 4. Advanced Features
- **Behavioral Scoring**: Track which recommendations led to offers
- **Dynamic Weights**: Adjust weights based on job category
- **Experience Matching**: Compare years of experience vs job requirement
- **Location Scoring**: Consider job location vs student preference

---

## 🔐 Data Privacy & Security

1. **Resume Data**: Never stored in unencrypted format
2. **Score History**: Retained for 1 year only
3. **User Consent**: Explicit opt-in for analysis storage
4. **GDPR Compliance**: Right to deletion implemented

---

## 📊 Analytics & Reporting

### System-Level Metrics
- Average match score (all jobs)
- Match score distribution (histogram)
- Top missing skills (across all students)
- Domain hit rates (which domains getting matches)

### Student-Level Insights
- Improvement trajectory (score over time)
- Skill gap progress (skills learned)
- Application success rate (offers / applications)

### Recruiter Dashboard
- Average student quality per batch
- Most wanted skills
- Placement rate by domain

---

## 🛠️ Tech Stack Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Resume Parsing | PyPDF2 | Extract text from PDF |
| Text Processing | NLTK | Tokenization, lemmatization |
| NLP Embeddings | SentenceTransformers | Semantic matching |
| Similarity | scikit-learn | Cosine similarity computation |
| ML Classification | Logistic Regression | Domain prediction |
| Feature Vectorization | TF-IDF | Text to numeric conversion |
| Data Storage | MongoDB | Persist analysis results |
| Backend API | Flask/FastAPI | Expose scoring as HTTP endpoint |
| Frontend | React | Display results with visualizations |

---

## 🎯 Scoring Rationale

**Why these weights?**
```
Semantic (40%) - MOST IMPORTANT
  Why: Understanding context matters more than keyword matching
  Example: "API development" ≈ "REST services" semantically
  
Skill Overlap (35%) - CRITICAL
  Why: If you don't have required skills, semantic won't help
  Example: Job need DevOps skills, resume has only frontend
  
Domain Match (15%) - IMPORTANT
  Why: Domain alignment predicts success trajectory
  Example: Data Science resume → Data Science job = better fit
  
Profile Completeness (10%) - SUPPLEMENTARY
  Why: Complete profiles show engagement, but score is about match
  Example: Missing GitHub URL doesn't make you unqualified
```

---

## ✅ Quality Assurance

### Validation Checks
- Semantic score should not exceed 100
- Skill overlap accuracy: Manual review on 5% of results
- Domain predictions: Validated against labeled test set
- Final score within 0-100 range always

### Edge Cases Handled
- Empty resume → Score: 0, Suggestion: "Upload complete resume"
- Job with no skills listed → Default skill score: 55
- Resume in other language → Auto-translation + analysis
- Very short resume → Flag as incomplete, still score

---

## 🚀 Deployment

**Python Service** (`flask_app.py` or `api.py`):
```bash
python flask_app.py  # Runs on http://localhost:5001

Endpoints:
POST /api/score-resume
  Input: {resume_text, job_description, required_skills}
  Output: {score_breakdown, suggestions, matched_skills}
```

**Backend Integration** (Node.js calls Python service):
```javascript
// In documentController.js or similar
const response = await axios.post('http://localhost:5001/api/score-resume', {
  resume_text: studentResume,
  job_description: jobData.description,
  required_skills: jobData.requiredSkills
});
```

---

## 📈 Future Enhancements

1. **Computer Vision**: Parse resume formatting, visual clarity
2. **Video Analysis**: Analyze explanatory video submissions
3. **Experience Matching**: Deep learning to match years/levels
4. **Soft Skills Detection**: NLP for communication, leadership, etc.
5. **Real-time Updates**: Continuous model refinement
6. **A/B Testing**: Test different scoring weights, recommendations
7. **Feedback Loop**: Use placement outcomes to retrain models
8. **Explainability**: SHAP/LIME values for transparency

---

## 📝 Summary

The **Resume Recommendation System** is a 5-stage pipeline combining regex extraction, NLP embeddings, and machine learning to provide intelligent job matching. It balances semantic understanding with practical skill requirements, delivering actionable recommendations to improve student employability.

**Current State:** Functional MVP with rule-based suggestions  
**Ideal State:** Production-grade with continuous learning and explainability  
**Next Steps:** Gather placement outcome data to validate and improve recommendations
