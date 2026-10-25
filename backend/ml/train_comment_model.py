"""
Comment Safety ML Model Trainer
Trains a character & word n-gram TF-IDF Logistic Regression classifier.
Saves model artifact to `comment_classifier.joblib`.
Note: The sample dataset is strictly a fictional demonstration template.
"""

import os
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report
import joblib

DATASET_PATH = os.path.join(os.path.dirname(__file__), "comment_dataset.csv")
MODEL_OUT_PATH = os.path.join(os.path.dirname(__file__), "comment_classifier.joblib")

def train():
    print(f"Loading demonstration dataset from: {DATASET_PATH}")
    df = pd.read_csv(DATASET_PATH)
    print(f"Loaded {len(df)} sample rows across classes: {df['label'].unique()}")

    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(ngram_range=(1, 3), analyzer='char_wb', min_df=1)),
        ('clf', LogisticRegression(max_iter=500, C=2.0))
    ])

    pipeline.fit(df['text'], df['label'])
    preds = pipeline.predict(df['text'])

    print("\n--- Model Training & Self-Evaluation Report ---")
    print(classification_report(df['label'], preds, zero_division=0))

    joblib.dump(pipeline, MODEL_OUT_PATH)
    print(f"Model saved successfully to: {MODEL_OUT_PATH}")

if __name__ == "__main__":
    train()
