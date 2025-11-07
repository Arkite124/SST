from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from enum import Enum
from pydantic import BaseModel
from app.routes.tests import vocabulary
from app.routes.tests import reading
from app.routes.login.login import get_current_user
from data.postgresDB import SessionLocal
from models import Users

DEFAULT_VOCABULARY_AGE=4
# -------------------------------
# ✅ Pydantic 모델 정의
# -------------------------------
class AnswerRequest(BaseModel):
    question_data: dict
    user_choice_index: int

class AnswerResponse(BaseModel):
    correct: bool
    age_level: int
    correct_answer: str
    user_answer: str

class TestType(str, Enum):
    vocabulary = "vocabulary"
    reading = "reading"
user_test_state = {}
# -------------------------------
# ✅ 라우터 정의
# -------------------------------
router = APIRouter(tags=["Verify"])
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
@router.post("/verify", response_model=AnswerResponse)
async def verify_answer(
    request: AnswerRequest,
    user:Users=Depends(get_current_user),
    test_type: TestType = Query(...),
    db: Session = Depends(get_db)
):
    if not user:
        raise HTTPException(status_code=401, detail="다시 로그인 해주세요.")
    user_id=user.id
    if test_type == TestType.vocabulary:
        obj = vocabulary
    else:
        obj = reading

    user = db.query(Users).filter(Users.id == user_id).first()
    # 사용자 상태 초기화
    if user_id not in user_test_state:
        user_test_state[user_id] = {}
    if test_type not in user_test_state[user_id]:
        user_test_state[user_id][test_type] = {
            "consecutive_correct": 0,
            "consecutive_wrong": 0,
        }

    current_age = user.vocabulary_age or DEFAULT_VOCABULARY_AGE
    state = user_test_state[user_id][test_type]

    try:
        result = obj.verify_answer(request.question_data, request.user_choice_index)

        if result["correct"]:
            state["consecutive_correct"] += 1
            state["consecutive_wrong"] = 0
            if state["consecutive_correct"] >= 2 and current_age < 13:
                user.vocabulary_age = current_age + 1
                db.commit()
                state["consecutive_correct"] = 0
        else:
            state["consecutive_wrong"] += 1
            state["consecutive_correct"] = 0
            if state["consecutive_wrong"] >= 2 and current_age > 4:
                user.vocabulary_age = current_age - 1
                db.commit()
                state["consecutive_wrong"] = 0

        return AnswerResponse(
            correct=result["correct"],
            age_level=result["age_level"],
            correct_answer=result["correct_answer"],
            user_answer=result["user_answer"],
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"답안 검증 실패: {str(e)}")
