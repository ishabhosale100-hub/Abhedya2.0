"""
Casting Shield ML Model Trainer
Trains a TF-IDF Logistic Regression classifier on audition/casting message patterns.
Saves model artifact to `casting_classifier.joblib`.
"""

import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report
import joblib

DATASET_PATH = os.path.join(os.path.dirname(__file__), "casting_dataset.csv")
MODEL_OUT_PATH = os.path.join(os.path.dirname(__file__), "casting_classifier.joblib")

def train():
    print(f"Loading dataset from: {DATASET_PATH}")
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"casting_dataset.csv not found at {DATASET_PATH}")

    df = pd.read_csv(DATASET_PATH)
    text_col = 'message_text' if 'message_text' in df.columns else 'message'
    label_col = 'primary_label' if 'primary_label' in df.columns else 'label'

    print(f"Loaded {len(df)} sample rows across classes:\n{df[label_col].value_counts()}")

    X = df[text_col].astype(str)
    y = df[label_col].astype(str)

    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(ngram_range=(1, 2), analyzer='word', min_df=1)),
        ('clf', LogisticRegression(max_iter=500, C=1.5))
    ])

    # Safely handle train/test split depending on dataset size
    try:
        # Attempt stratified split if dataset is large enough
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.25, random_state=42, stratify=y
        )
        pipeline.fit(X_train, y_train)
        preds = pipeline.predict(X_test)
        print("\n--- Held-Out Test Set Evaluation Report ---")
        print(classification_report(y_test, preds, zero_division=0))
    except ValueError as e:
        print(f"\n[Notice] Stratified split skipped due to small dataset size ({len(df)} rows): {e}")
        print("Training on full dataset directly for maximum utility.")

    # Fit on full dataset for production inference
    pipeline.fit(X, y)

    joblib.dump(pipeline, MODEL_OUT_PATH)
    print(f"Casting model successfully saved to: {MODEL_OUT_PATH}")

if __name__ == "__main__":
    train()