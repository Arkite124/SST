from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os

from ai_common.clean_contents import safe_spell_check

BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # 현재 파일 위치
Model_DIR = os.path.join(BASE_DIR, "../../../models.py")           # data 폴더 경로

from db.pg_connect import get_session
from db.models import DailyWritings, ReadingLogs

router = APIRouter()

# 요청 body 정의
class SpellCheckRequest(BaseModel):
    content: str


# API 엔드포인트
@router.post("/clean-content")
def spell_check_api(request: SpellCheckRequest):
    if not request.content:
        raise HTTPException(status_code=400, detail="text가 비어있습니다.")

    cleaned_content = safe_spell_check(request.content)

    return {
        "original_content": request.content,
        "cleaned_content": cleaned_content
    }
