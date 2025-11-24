from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import torch.nn.functional as F

from ai_common.gpu_start import get_device_cuda


def analyze_sentiment(text: str, model_bundle: dict):
    tokenizer = model_bundle["tokenizer"]
    model = model_bundle["model"]
    device = next(model.parameters()).device

    if not text or not text.strip():
        return {"sentiment": "neutral", "confidence": 0.5}

    inputs = tokenizer(text, return_tensors='pt', truncation=True, padding=True, max_length=512)
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    probs = F.softmax(outputs.logits, dim=1)
    labels = ['negative', 'neutral', 'positive']
    pred_idx = torch.argmax(probs, dim=1).item()

    return {
        "sentiment": labels[pred_idx],
        "confidence": round(float(probs[0][pred_idx]), 4),
        "detail": {labels[i]: round(float(probs[0][i]), 4) for i in range(3)}
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
