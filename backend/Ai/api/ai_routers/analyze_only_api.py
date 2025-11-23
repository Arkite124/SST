import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # 현재 파일 위치
Model_DIR = os.path.join(BASE_DIR, "../../../models.py")           # data 폴더 경로

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.pg_connect import get_session

from db.models import DailyWritings, Outputs
from ai_words_logic.word_analyze import extract_tokens


router = APIRouter()
# 요청 Body 정의
class AnalyzeRequest(BaseModel):
    cleaned_content: str
    user_id: int # 외부 DB 유저 id 필요시

@router.post("/analyze-result")
def analyze_only(request: AnalyzeRequest):
    text = request.cleaned_content
    if not text:
        raise HTTPException(status_code=400, detail="내용이 비어있습니다.")

    analysis = extract_tokens(text)

    return {
        "user_id": request.user_id,
        "analysis_result": {
            "avg_sentence_len": analysis["avg_sentence_len"],
            "ttr": analysis["ttr"],
            "repeat_desc": analysis["repeat_desc"],
        },
        "counter_nouns": analysis["counter_nouns"],
        "counter_verbs": analysis["counter_verbs"],
        "counter_adjectives": analysis["counter_adjectives"]
    }