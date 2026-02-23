import pandas as pd
import joblib
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

MODELS_PATH = "models"
DATA_PATH = "data/labeled_resumes.csv"

BASE_DIR = os.path.dirname(__file__)
MODEL_FILE = os.path.join(BASE_DIR, "models/domain_classifier.pkl")
VECTORIZER_FILE = os.path.join(BASE_DIR, "models/tfidf_vectorizer.pkl")

# Load model globally (efficient)
model = None
vectorizer = None


def train_domain_model():
    data = pd.read_csv(DATA_PATH)

    # Use TF-IDF with better parameters for domain classification
    vectorizer = TfidfVectorizer(
            max_features=6000,
            ngram_range=(1, 2),
            stop_words='english'
        )
    X = vectorizer.fit_transform(data['resume_text'])
    y = data['domain']

    # Use Logistic Regression with higher max_iter and class_weight
    model = LogisticRegression(
        max_iter=1000,
        class_weight='balanced',  # Handle imbalanced classes
        solver='lbfgs'             # Better solver for multi-class
    )
    model.fit(X, y)

    os.makedirs(MODELS_PATH, exist_ok=True)

    joblib.dump(model, MODEL_FILE)
    joblib.dump(vectorizer, VECTORIZER_FILE)

    print("Model trained successfully!")


def load_model():
    global model, vectorizer

    if model is None or vectorizer is None:
        model = joblib.load(MODEL_FILE)
        vectorizer = joblib.load(VECTORIZER_FILE)


def predict_domain(text):
    load_model()

    if len(text.strip().split()) < 5:
        return "Insufficient Text", 0.5, {"Insufficient Text": 100.0}

    text_vector = vectorizer.transform([text])
    probabilities = model.predict_proba(text_vector)[0]
    classes = model.classes_

    domain_scores = {}
    for domain, prob in zip(classes, probabilities):
        domain_scores[domain] = round(float(prob * 100), 2)

    best_domain = max(domain_scores, key=domain_scores.get)
    confidence = domain_scores[best_domain] / 100

    return best_domain, confidence, domain_scores




if __name__ == "__main__":
    train_domain_model()


def predict_domain_vector(text):
    """Return a dict of {domain: probability} for all classes."""
    load_model()

    if len(text.strip().split()) < 5:
        return {}

    text_vector = vectorizer.transform([text])
    probabilities = model.predict_proba(text_vector)[0]
    classes = model.classes_

    return {domain: round(float(prob), 4) for domain, prob in zip(classes, probabilities)}
