import os

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class SimilarityEngine:
    def __init__(self):
        backend = str(os.getenv("SIMILARITY_BACKEND", "tfidf")).strip().lower()
        # Default to TF-IDF to keep memory usage low on small Render instances.
        self.backend = "transformer" if backend in {"transformer", "sentence-transformer", "sbert"} else "tfidf"
        self.model = None

        if self.backend == "transformer":
            try:
                from sentence_transformers import SentenceTransformer

                model_name = os.getenv("MODEL_NAME", "all-MiniLM-L6-v2")
                self.model = SentenceTransformer(model_name)
            except Exception:
                # If transformer backend fails (OOM/dependency/model download), gracefully degrade.
                self.backend = "tfidf"

    def compute_similarity(self, resume_text, jd_text):
        resume_text = str(resume_text or "").strip()
        jd_text = str(jd_text or "").strip()
        if not resume_text or not jd_text:
            return 0.0

        if self.backend == "transformer" and self.model is not None:
            resume_emb = self.model.encode([resume_text])
            jd_emb = self.model.encode([jd_text])
            similarity = cosine_similarity(resume_emb, jd_emb)[0][0]
            return round(float(similarity) * 100, 2)

        # Lightweight lexical similarity for constrained environments.
        vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=3000)
        matrix = vectorizer.fit_transform([resume_text, jd_text])
        similarity = cosine_similarity(matrix[0:1], matrix[1:2])[0][0]
        return round(similarity * 100, 2)

