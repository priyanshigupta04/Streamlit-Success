from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


class SimilarityEngine:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')

    def compute_similarity(self, resume_text, jd_text):
        resume_emb = self.model.encode([resume_text])
        jd_emb = self.model.encode([jd_text])

        similarity = cosine_similarity(resume_emb, jd_emb)[0][0]
        return round(similarity * 100, 2)

