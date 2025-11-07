import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # 현재 파일 위치
Model_DIR = os.path.join(BASE_DIR, "../../../models.py")           # data 폴더 경로

from fastapi import APIRouter, HTTPException
from backend.Ai.db.pg_connect import get_session

from models import DailyWritings, Outputs
from backend.Ai.ai_words_logic.word_analyze import extract_tokens


router = APIRouter()


@router.post("/analyze/{content_id}")
def analyze_only(content_id:int):
    with get_session() as db:
        writing = db.query(DailyWritings).filter(DailyWritings.id == content_id).first()
        if not writing:
            raise HTTPException(status_code=404, detail="해당 글이 존재하지 않습니다.")

        # DB에 저장된 글 내용 가져오기
        text = writing.cleaned_content or writing.content
        analysis = extract_tokens(text)

        # 결과 JSON으로 반환 (백엔드가 이걸 받아서 DB에 저장)
        return {
            "content_id": content_id,
            "user_id": writing.user_id,
            "analysis_result": {
                "avg_sentence_len": analysis["avg_sentence_len"],
                "ttr": analysis["ttr"],
                "repeat_desc": analysis["repeat_desc"],
            },
            "counter_nouns": analysis["counter_nouns"],
            "counter_verbs": analysis["counter_verbs"],
            "counter_adjectives": analysis["counter_adjectives"]
        }