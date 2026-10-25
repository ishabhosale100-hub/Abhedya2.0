import re
import os
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter
import joblib

router = APIRouter(prefix="/api/casting", tags=["Casting Shield"])

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "casting_classifier.joblib")

class CastingAnalysisRequest(BaseModel):
    message: str
    context: Optional[str] = None
    author_contact: Optional[str] = None

# Red flag category patterns
RED_FLAG_PATTERNS = {
    "private_media": [
        r"\b(?:bikini|lingerie|underwear|unclothed|semi-nude|topless|bare|private photos|private clip|compromise|body video|send pictures in bed)\b",
        r"(?:बिकिनी|अंतर्वस्त्र|नग्न फोटो|प्रायव्हेट फोटो|शरीराचे फोटो|कम्प्रोमाईज)"
    ],
    "secrecy_isolation": [
        r"\b(?:keep this secret|don't tell anyone|confidential between us|don't tell your parents|isolated farmhouse|private room|late night hotel|come alone|no friends allowed)\b",
        r"(?:कुणाला सांगू नका|गुपित ठेवा|एकटीच ये|हॉटेल रूममध्ये भेटू|फार्महाऊसवर ऑडिशन|घरच्यांना सांगू नको|रात को अकेले आओ)"
    ],
    "coercion_shortcuts": [
        r"\b(?:lead role guaranteed|instant stardom|shortcut to bollywood|if you cooperate|sleep with producer|casting couch|adjust a little|guaranteed selection)\b",
        r"(?:गॅरंटीड रोल|अॅडजस्ट करावे लागेल|प्रोड्युसरला खूश कर|रातोरात स्टार|सिलेक्ट पक्का)"
    ],
    "suspicious_fees": [
        r"\b(?:registration fee|audition charge|security deposit|refundable fee|pay upfront|processing fee|portfolio advance|gpay|phonepe to this number)\b",
        r"(?:रजिस्ट्रेशन फी|ऑडिशन फी|पैसे पाठवा|डिपॉझिट भरा|अॅडव्हान्स द्या)"
    ],
    "urgency_pressure": [
        r"\b(?:offer expires tonight|decide in 10 minutes|last chance|lose the role forever|immediate confirmation required)\b",
        r"(?:आजच निर्णय घ्या|१० मिनिटांत सांगा|शेवटची संधी|आता नाही तर कधीच नाही)"
    ],
    "suspicious_links": [
        r"https?://(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|cutt\.ly)/[a-zA-Z0-9]+",
        r"https?://[^\s]+\.(?:xyz|top|work|click|ru|buzz)/[^\s]*"
    ]
}

def analyze_casting_rules(message: str, context: Optional[str] = "") -> Dict[str, Any]:
    trimmed = message.strip()
    words = trimmed.split()

    # Ambiguity check for extremely short or context-less messages
    if len(words) < 4:
        return {
            "risk_level": "unclear",
            "category": "unclear",
            "matched_phrases": [],
            "explanation": "The provided text is too short or ambiguous to evaluate reliably without additional context.",
            "suggested_actions": ["pause", "verify"]
        }

    combined_text = f"{trimmed} {context or ''}".lower()
    matched_flags: List[Dict[str, str]] = []

    for category, patterns in RED_FLAG_PATTERNS.items():
        for pat in patterns:
            matches = re.finditer(pat, combined_text, re.IGNORECASE)
            for m in matches:
                matched_flags.append({
                    "category": category,
                    "phrase": m.group(0)
                })

    # Evaluate Risk Level & Explanations
    categories_found = set(f["category"] for f in matched_flags)
    explanation_parts = []
    actions = ["pause", "verify", "consult"]

    if "private_media" in categories_found or "coercion_shortcuts" in categories_found:
        risk_level = "critical"
        explanation_parts.append("Critical Alert: Message requests private/unclothed imagery or implies coercive conditions tied to role casting.")
        actions.extend(["noPrivateContent", "preserve"])
    elif "secrecy_isolation" in categories_found and ("suspicious_fees" in categories_found or "urgency_pressure" in categories_found):
        risk_level = "high"
        explanation_parts.append("High Risk: Message exerts secrecy pressure and demands suspicious upfront fees or extreme urgency.")
        actions.extend(["noFees", "publicVenue", "preserve"])
    elif len(categories_found) >= 2:
        risk_level = "high"
        explanation_parts.append("High Risk: Multiple distinct red flags identified across communication patterns.")
        actions.extend(["preserve"])
    elif len(categories_found) == 1:
        risk_level = "medium"
        cat = list(categories_found)[0]
        if cat == "suspicious_fees":
            explanation_parts.append("Caution: Legitimate productions do not charge upfront audition or registration fees.")
            actions.append("noFees")
        elif cat == "secrecy_isolation":
            explanation_parts.append("Caution: Demands for secret meetings or isolated locations pose significant safety concerns.")
            actions.append("publicVenue")
        else:
            explanation_parts.append(f"Caution: Warning signal detected regarding {cat.replace('_', ' ')}.")
    else:
        # Check if it has typical professional audition tokens
        prof_tokens = ["audition", "script", "venue", "casting", "monologue", "character", "rehearsal", "director"]
        has_prof = any(t in combined_text for t in prof_tokens)
        if has_prof:
            risk_level = "low"
            explanation_parts.append("Professional Framing: Message uses standard casting terminology without detected red flag patterns.")
        else:
            risk_level = "unclear"
            explanation_parts.append("Neutral or Unclear: Message does not contain identifiable casting red flags, but exercise customary verification.")

    return {
        "risk_level": risk_level,
        "matched_phrases": [f["phrase"] for f in matched_flags],
        "explanation": " ".join(explanation_parts),
        "suggested_actions": list(dict.fromkeys(actions))
    }

@router.post("/analyze")
async def analyze_message(payload: CastingAnalysisRequest):
    result = analyze_casting_rules(payload.message, payload.context)

    # Check ML classifier fallback / integration
    ml_status = "Rules-Only Fallback (Active)"
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            pred = model.predict([payload.message])[0]
            ml_status = f"Trained Model Active (Prediction: {pred})"
        except Exception:
            pass

    return {
        **result,
        "ml_status": ml_status,
        "future_scope": {
            "title": "Audition Video & Camera Screening (Future Scope)",
            "notice": "Future Scope Architecture: Real-time video screening requires explicit multi-party consent frameworks and specialized models. ABHEDYA does not perform covert camera monitoring or unverified video surveillance."
        }
    }
