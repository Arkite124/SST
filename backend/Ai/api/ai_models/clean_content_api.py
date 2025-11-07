from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # 현재 파일 위치
Model_DIR = os.path.join(BASE_DIR, "../../../models.py")           # data 폴더 경로

from backend.Ai.db.pg_connect import get_session
from models import DailyWritings

router = APIRouter()

# 요청 body 정의
class SpellCheckRequest(BaseModel):
    text: str

# API 엔드포인트
@router.post("/spell_check/{content_id}")
def spell_check_api(content_id:int):
    with get_session() as db:
        writing = db.query(DailyWritings).filter(DailyWritings.id == content_id).first()
        if not writing:
            raise HTTPException(status_code=404, detail="해당 글이 존재하지 않습니다.")

    content = writing.content
    from backend.Ai.ai_common.clean_contents import safe_spell_check
    cleaned_content = safe_spell_check(content)

    return {"content": content, "cleaned_content": cleaned_content}
