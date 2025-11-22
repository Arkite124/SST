from fastapi import FastAPI
import os, sys
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sentence_transformers import SentenceTransformer


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))
sys.path.append(PROJECT_ROOT)

from ai_words_logic.word_similarity import load_model_and_corpus
from api.ai_routers.analyze_sentence_api import get_sentence_router
from api.ai_routers.book_recommend_api import get_book_router
from api.ai_routers.analyze_only_api import router as analyze_router
from api.ai_routers.clean_content_api import router as clean_content_router
from api.ai_routers.analyze_sentiment_api import get_sentiment_router

app = FastAPI(title="Sentence ML API")

# ==============================
# 1️⃣ 모델 로드 (앱 시작 시 1회만)
# ==============================
print("[INFO] 모델 로딩 중...")

#문장 분석 모델
similar_fn = load_model_and_corpus()
model_sentence = SentenceTransformer("snunlp/KR-SBERT-V40K-klueNLI-augSTS")

#감정 분석 모델
SENT_MODEL_NAME = "alsgyu/sentiment-analysis-fine-tuned-model"
tokenizer = AutoTokenizer.from_pretrained(SENT_MODEL_NAME)
model_sentiment = AutoModelForSequenceClassification.from_pretrained(SENT_MODEL_NAME)
model_bundle = {"tokenizer": tokenizer, "model": model_sentiment}

print("[INFO] 모델 로딩 완료")

# ==============================
# 라우터 등록
# ==============================
sentence_router = get_sentence_router(similar_fn, model_sentence)
book_router = get_book_router(model_sentence)
sentiment_router = get_sentiment_router(model_bundle)

app.include_router(sentence_router, prefix="/app")
app.include_router(book_router, prefix="/app")
app.include_router(sentiment_router, prefix="/app")
app.include_router(analyze_router, prefix="/app")
app.include_router(clean_content_router, prefix="/app")
