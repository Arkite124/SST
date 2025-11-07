from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import torch.nn.functional as F

def analyze_sentiment(text: str, model_bundle: dict):
    """
    model_bundle: {"tokenizer": tokenizer, "model": model}
    """
    tokenizer = model_bundle["tokenizer"]
    model = model_bundle["model"]

    if not text or not text.strip():
        return {"sentiment": "neutral", "confidence": 0.5}

    inputs = tokenizer(text, return_tensors='pt', truncation=True, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
    probs = F.softmax(outputs.logits, dim=1)
    labels = ['negative', 'neutral', 'positive']
    sentiment = labels[torch.argmax(probs)]
    confidence = float(probs[0][torch.argmax(probs)])
    return {
        "sentiment": sentiment,
        "confidence": round(confidence, 4),
        "detail": {labels[i]: float(probs[0][i]) for i in range(3)}
    }

# -------------------------
# 사용 예시
# -------------------------
if __name__ == "__main__":
    SENT_MODEL_NAME = "alsgyu/sentiment-analysis-fine-tuned-model"
    tokenizer = AutoTokenizer.from_pretrained(SENT_MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(SENT_MODEL_NAME)
    model_bundle = {"tokenizer": tokenizer, "model": model}

    text = "이 책은 정말 감동적이었어요!"
    result = analyze_sentiment(text, model_bundle)
    print(result)
