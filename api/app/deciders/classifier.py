"""A genuinely trained classifier -- TF-IDF over char+word n-grams feeding a
multinomial logistic regression. This is the arm that needs labeled data
before it works at all; everything else in this benchmark needs zero."""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline


def build_pipeline() -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)),
        ("clf", LogisticRegression(max_iter=1000, C=2.0)),
    ])


def train(train_examples: list[dict]) -> Pipeline:
    pipeline = build_pipeline()
    texts = [e["text"] for e in train_examples]
    labels = [e["label"] for e in train_examples]
    pipeline.fit(texts, labels)
    return pipeline


def predict(pipeline: Pipeline, text: str) -> str:
    return pipeline.predict([text])[0]
