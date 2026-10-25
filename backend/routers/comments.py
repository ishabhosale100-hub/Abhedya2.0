import re
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter
import joblib

router = APIRouter(prefix="/api/comments", tags=["Comment Safety"])

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "comment_classifier.joblib")

class CommentAnalysisRequest(BaseModel):
    text: str
    author_id: Optional[str] = None
    preserve_text_in_vault: Optional[bool] = False

# Demo In-memory store for repeated behavior tracking (keyed by author_id)
INCIDENT_HISTORY: Dict[str, List[Dict[str, Any]]] = {}

# Priority Rule Engine Patterns across English, Hindi, Marathi & Romanized
PATTERNS = {
    "threat": [
        # English
        r"\b(?:kill|murder|hunt down|acid attack|slit|destroy you|ruin your life|die|end your life|shoot you)\b",
        # Hindi / Romanized Hindi
        r"(?:mar dalunga|jaan se maar|jaan le lunga|acid phek|barbaad kar dunga|tujhe chhodunga nahi|chhat se fek|khatam kar dunga|goli maar)",
        # Devanagari Hindi
        r"(?:मार डालूंगा|जान से मार|बर्बाद कर दूंगा|गोली मार|खत्म कर दूंगा|एसिड फेंक)",
        # Marathi / Romanized Marathi
        r"(?:tula samplaven|tula maren|jiv ghein|tula baghun ghein|tuzha kanta kadhto|tukde karen)",
        # Devanagari Marathi
        r"(?:तुला संपवेन|तुला मारेन|जीव घेईन|तुला बघून घेईन|तुकडे करेन|तुझा काटा काढतो)"
    ],
    "pii": [
        # Phone numbers (Indian formats, international)
        r"(?:\+?91[\s-]?)?[6-9]\d{9}\b",
        r"\b\d{5}[\s-]?\d{5}\b",
        # Emails
        r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+",
        # Doxxing phrases
        r"\b(?:doxx|leak your phone|leak your address|here is her number|her address is|stay at|lives in flat|ghar ka pata|phone number leak)\b",
        r"(?:घर का पता|फोन नंबर लीक|पत्ता व्हायरल|मोबाईल नंबर व्हायरल|येथे राहते)"
    ],
    "sexual": [
        r"\b(?:slut|whore|nude|send nudes|strip|sex video|porn|bitch|bastard|randi|chutiya|bhadwe|saali|kamini)\b",
        r"(?:रांड|वेश्या|भडवा|चुत्या|छिनाल|नग्न फोटो|सेक्सी बाई|झवाड्या)"
    ],
    "harassment": [
        r"\b(?:stop posting|ugly|disgusting|nobody likes you|loser|delete your account|worthless|freak|fraud)\b",
        r"(?:pichha nahi chodunga|stalk|watching you everywhere|tu kiti faltu|bikhari|bevkoof|gawar)",
        r"(?:तुला लाज वाटत नाही|नालायक|मूर्ख|अक्कल नाही|माकडीण|फालतू)"
    ]
}

def evaluate_rules(text: str) -> Dict[str, Any]:
    text_lower = text.lower()
    matched_signals = []
    category = "safe"
    risk_level = "low"

    # 1. Critical Threats Check (Highest Priority)
    for pattern in PATTERNS["threat"]:
        match = re.search(pattern, text_lower, re.IGNORECASE)
        if match:
            matched_signals.append(f"Direct Threat: '{match.group(0)}'")
            category = "threat"
            risk_level = "critical"
            break

    # 2. Personal Information Exposure / Doxxing
    for pattern in PATTERNS["pii"]:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            matched_signals.append(f"PII Signal / Contact Exposure: '{match.group(0)}'")
            if risk_level != "critical":
                category = "pii"
                risk_level = "high"
            break

    # 3. Sexual / Vulgar Harassment
    if risk_level not in ["critical", "high"]:
        for pattern in PATTERNS["sexual"]:
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                matched_signals.append(f"Vulgar / Sexual Harassment: '{match.group(0)}'")
                category = "sexual"
                risk_level = "high"
                break

    # 4. General Harassment / Abuse
    if risk_level == "low":
        for pattern in PATTERNS["harassment"]:
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                matched_signals.append(f"Harassment Pattern: '{match.group(0)}'")
                category = "harassment"
                risk_level = "medium"
                break

    # Suggested Actions based on evaluated risk
    actions = []
    if risk_level == "critical":
        actions = ["legal", "preserve", "block", "report"]
    elif risk_level == "high":
        actions = ["report", "block", "preserve"]
    elif risk_level == "medium":
        actions = ["report", "block", "ignore"]
    else:
        actions = ["ignore"]

    return {
        "category": category,
        "risk_level": risk_level,
        "matched_signals": matched_signals,
        "suggested_actions": actions,
        "engine": "Multilingual Rule Engine (Active Baseline)"
    }

@router.post("/analyze")
async def analyze_comment(payload: CommentAnalysisRequest):
    text = payload.text.strip()
    author = payload.author_id.strip() if payload.author_id else "anonymous"

    if not text:
        return {
            "category": "safe",
            "risk_level": "low",
            "matched_signals": [],
            "suggested_actions": ["ignore"],
            "engine": "Multilingual Rule Engine (Active Baseline)",
            "history": None
        }

    # Execute Rule Engine
    rule_result = evaluate_rules(text)

    # Check if a trained ML model exists (Replaceable ML Pipeline)
    ml_prediction = None
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            pred = model.predict([text])[0]
            ml_prediction = pred
            # Note: Serious threats and PII rules ALWAYS take precedence over generic ML
            if rule_result["risk_level"] not in ["critical", "high"] and pred != "safe":
                rule_result["category"] = pred
                rule_result["risk_level"] = "medium"
                rule_result["engine"] = "Trained ML Model + Rule Engine"
        except Exception as e:
            print(f"ML load failed, falling back to rules: {e}")

    # Track repeated behavior for author ID
    author_history = INCIDENT_HISTORY.get(author, [])
    if rule_result["risk_level"] != "low":
        incident_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "category": rule_result["category"],
            "risk_level": rule_result["risk_level"],
            # Store raw text only if explicitly requested by user
            "text": text if payload.preserve_text_in_vault else None
        }
        author_history.append(incident_entry)
        INCIDENT_HISTORY[author] = author_history

    # Determine progression trend
    severity_order = {"low": 1, "medium": 2, "high": 3, "critical": 4}
    trend = "Stable"
    if len(author_history) > 1:
        prev = severity_order.get(author_history[-2]["risk_level"], 1)
        curr = severity_order.get(rule_result["risk_level"], 1)
        if curr > prev:
            trend = "Escalating"
        elif curr < prev:
            trend = "De-escalating"

    return {
        **rule_result,
        "ml_model_status": "Loaded" if os.path.exists(MODEL_PATH) else "Rules-Only Fallback (Model Training Ready)",
        "author_id": author,
        "repeated_incidents_count": len(author_history),
        "severity_trend": trend,
        "incident_timeline": author_history[-5:] if author != "anonymous" else []
    }
