from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import datetime

from app.routes.login.login import get_current_user
from data.postgresDB import SessionLocal
from models import Users, UserTests

# -------------------------------
# ✅ Pydantic 모델 정의
# -------------------------------
class QuestionHistoryItem(BaseModel):
    questionNumber: int
    question: str
    choices: List[str]
    userAnswer: str
    correctAnswer: str
    isCorrect: bool
    ageLevel: int

class SessionSaveRequest(BaseModel):
    user_id: int
    test_type: str
    questions: List[QuestionHistoryItem]
    total_questions: int
    correct_count: int

user_test_state = {}
# -------------------------------
# ✅ 라우터 정의
# -------------------------------
router = APIRouter()
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/save")
async def save_session(
        request: SessionSaveRequest,
        user:Users=Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if not user:
        raise HTTPException(status_code=401, detail="로그아웃 되었습니다. 로그인 해주세요")
    try:
        question_data = []
        user_answers_data = []

        for q in request.questions:
            question_data.append({
                "question_id": q.questionNumber,
                "question": q.question,
                "choices": q.choices,
                "age_level": q.age_level or None
            })
            user_answers_data.append({
                "question_id": q.questionNumber,
                "user_answer": q.userAnswer
            })

        session_record = UserTests(
            user_id=user.id,
            test_type=request.test_type,
            taken_at=datetime.datetime.now(),
            questions=question_data,
            user_answers=user_answers_data,
            total_score=request.correct_count,
        )

        db.add(session_record)
        db.commit()
        db.refresh(session_record)

        user_test_state[request.user_id] = {"consecutive_correct": 0, "consecutive_wrong": 0}

        return {
            "status": "success",
            "message": "세션이 성공적으로 저장되었습니다.",
            "session_id": session_record.id,
            "total_questions": request.total_questions,
            "correct_count": request.correct_count,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"세션 저장 실패: {str(e)}")

@router.get("/history")
async def get_session_history(user:Users=Depends(get_current_user), limit: int = 10, db: Session = Depends(get_db)):
    if not user:
        raise HTTPException(status_code=401, detail="로그아웃 되었습니다. 로그인 해주세요")

    sessions = (
        db.query(UserTests)
        .filter(UserTests.user_id == user.id)
        .order_by(UserTests.taken_at.desc())
        .limit(limit)
        .all()
    )

    completed_sessions = []
    for session in sessions:
        if session.questions and isinstance(session.questions, list) and len(session.questions) >= 10:
            completed_sessions.append({
                "session_id": session.id,
                "taken_at": session.taken_at.isoformat(),
                "test_type": session.test_type,
                "total_questions": len(session.questions),
                "correct_count": session.total_score,
                "accuracy": round((session.total_score / len(session.questions)) * 100, 1),
                "questions": session.questions,
            })

    return {
        "user_id": user.id,
        "sessions": completed_sessions,
        "total_sessions": len(completed_sessions),
    }

@router.get("/{session_id}")
async def get_session_detail(
        session_id: int,
        db: Session = Depends(get_db)
):
    session = db.query(UserTests).filter(UserTests.id == session_id).first()

    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")

    user = db.query(Users).filter(Users.id == session.user_id).first()

    return {
        "session_id": session.id,
        "user_name": user.name if user else "Unknown",
        "taken_at": session.taken_at.isoformat(),
        "total_questions": len(session.questions) if session.questions else 0,
        "correct_count": session.total_score,
        "accuracy": round((session.total_score / len(session.questions)) * 100, 1) if session.questions else 0,
        "questions": session.questions
    }
