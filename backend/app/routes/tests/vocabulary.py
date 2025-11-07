from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import update
from Test.vocabulary_assessment import VocabularyAssessment
from app.routes.login.login import get_current_user
from data.postgresDB import SessionLocal
from models import Users, UserTests
import threading

DEFAULT_VOCABULARY_AGE = 4

router = APIRouter()


# ---------------------------
# 🔹 Pydantic 모델
# ---------------------------
class QuestionRequest(BaseModel):
    user_id: int
    age_level: Optional[int] = None
    num_questions: int = 10  # ✅ 생성할 문제 개수


class QuestionData(BaseModel):
    question_id: int
    question: str
    blank_sentence: str
    choices: list[str]
    correct_answer: str
    correct_index: int
    age_level: int


class GameStartResponse(BaseModel):
    total_questions: int
    questions: list[QuestionData]


class VerifyRequest(BaseModel):
    user_id: int
    question_data: dict
    user_choice_index: int


class VerifyResponse(BaseModel):
    correct: bool
    age_level: int
    correct_answer: str
    user_answer: str

class EndGameRequest(BaseModel):
    user_id: int
    test_type: str = "vocabulary"
    question_history: list[dict]

# ---------------------------
# 🔹 캐시 및 동기화
# ---------------------------
game_cache = {}
cache_lock = threading.Lock()


# ---------------------------
# 🔹 DB 세션
# ---------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------
# 🔹 게임 시작 (문제 10개 미리 생성)
# ---------------------------
@router.post("/start", response_model=GameStartResponse)
def start_vocab_game(request: QuestionRequest, db: Session = Depends(get_db)):
    """
    어휘력 게임 시작: 10개 문제를 미리 생성

    Args:
        user_id: 사용자 ID
        age_level: 난이도 (기본값: 사용자의 vocabulary_age)
        num_questions: 생성할 문제 개수 (기본값: 10)

    Returns:
        GameStartResponse: 생성된 모든 문제 리스트
    """
    user_id = request.user_id
    age_level = request.age_level or DEFAULT_VOCABULARY_AGE
    num_questions = request.num_questions

    # 사용자 vocabulary_age 가져오기
    user = db.query(Users).filter(Users.id == user_id).first()
    if user and user.vocabulary_age:
        age_level = user.vocabulary_age

    vocab_obj = VocabularyAssessment(db_session=db)

    try:
        # ✅ 미리 10개 문제 생성
        questions = []
        for idx in range(1, num_questions + 1):
            question_data = vocab_obj.generate_fill_in_blank_question(age_level=age_level)

            if "error" in question_data:
                raise HTTPException(status_code=500, detail=question_data["error"])

            questions.append(QuestionData(
                question_id=idx,
                question=question_data["question"],
                blank_sentence=question_data["blank_sentence"],
                choices=question_data["choices"],
                correct_answer=question_data["correct_answer"],
                correct_index=question_data["correct_index"],
                age_level=question_data["age_level"]
            ))

        # ✅ 캐시에 저장
        with cache_lock:
            game_cache[user_id] = {
                "questions": questions,
                "current_index": 0,
                "consecutive_correct": 0,
                "consecutive_wrong": 0
            }

        return GameStartResponse(
            total_questions=len(questions),
            questions=questions
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"문제 생성 실패: {str(e)}")


# ---------------------------
# 🔹 답안 검증
# ---------------------------
@router.post("/verify", response_model=VerifyResponse)
def verify_vocab_answer(request: VerifyRequest, db: Session = Depends(get_db)):
    user_id = request.user_id

    with cache_lock:
        if user_id not in game_cache:
            raise HTTPException(status_code=400, detail="게임이 시작되지 않았습니다.")
        state = game_cache[user_id]

    question_data = request.question_data
    user_choice_index = request.user_choice_index
    choices = question_data.get("choices", [])
    correct_index = question_data.get("correct_index", 0)

    if not (0 <= user_choice_index < len(choices)):
        raise HTTPException(status_code=400, detail="user_choice_index 범위 오류")

    is_correct = user_choice_index == correct_index

    # 🔹 유저 선택 기록 캐시에 저장
    state.setdefault("user_answers", []).append({
        "question_id": question_data.get("question_id"),
        "user_choice_index": user_choice_index,
        "correct_index": correct_index
    })

    # 사용자 DB 정보 가져오기
    user = db.query(Users).filter(Users.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자 없음")

    current_age = user.vocabulary_age or DEFAULT_VOCABULARY_AGE

    # 연속 정답/오답 상태 유지
    if is_correct:
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

    return VerifyResponse(
        correct=is_correct,
        age_level=question_data.get("age_level", DEFAULT_VOCABULARY_AGE),
        correct_answer=question_data.get("correct_answer"),
        user_answer=choices[user_choice_index]
    )


# ---------------------------
# 🔹 게임 종료
# ---------------------------
@router.post("/end")
def end_vocab_game(request: EndGameRequest, db: Session = Depends(get_db)):
    user_id = request.user_id
    test_type = request.test_type
    question_history = request.question_history

    if not question_history:
        raise HTTPException(status_code=400, detail="질문 기록이 없습니다.")

    # 질문과 유저 답안 분리
    questions = [
        {
            "question_id": q.get("question_id"),
            "question": q.get("question"),
            "blank_sentence": q.get("blank_sentence", ""),
            "choices": q.get("choices"),
            "age_level": q.get("age_level", 4)
        }
        for q in question_history
    ]

    user_answers = [
        {
            "question_id": q.get("question_id"),
            "userAnswer": q.get("userAnswer") or "",
            "isCorrect": q.get("isCorrect", False)
        }
        for q in question_history
    ]

    # 총 점수 계산
    total_score = sum(1 for ans in user_answers if ans.get("isCorrect"))

    try:
        # 기존 기록이 있으면 업데이트, 없으면 생성
        new_test = UserTests(
            user_id=user_id,
            test_type=test_type,
            questions=questions,
            user_answers=user_answers,
            total_score=total_score,
        )
        db.add(new_test)
        db.commit()
        db.refresh(new_test)

        # 캐시 제거
        with cache_lock:
            game_cache.pop(user_id, None)

        return {"message": "게임 종료", "total_score": total_score}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"user_test 업데이트 실패: {str(e)}")