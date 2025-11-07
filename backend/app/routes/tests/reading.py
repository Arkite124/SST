# backend/routers/read.py
import warnings, json, os, random, threading
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text, update

from database import get_db_words, get_db
from models import UserTests
from Test.reading_assessment import ReadingAssessment

warnings.filterwarnings("ignore", category=FutureWarning, module="torch.nn.utils.weight_norm")

_READING_ASSESSMENT_INSTANCE = None

def set_reading_assessment(instance):
    """main.py에서 ReadingAssessment 인스턴스를 주입하는 함수"""
    global _READING_ASSESSMENT_INSTANCE
    _READING_ASSESSMENT_INSTANCE = instance

router = APIRouter()

game_cache = {}
cache_lock = threading.Lock()

# ---------------------------
# 🔹 요청/응답 스키마 정의
# ---------------------------
class ReadRequest(BaseModel):
    user_id: int
    paragraph: str
    age_level: int | None = None
    mode: str = "qna"  # "qna", "comprehension", "auto"

class ReadResponse(BaseModel):
    mode: str
    qna: dict | None = None
    comprehension: dict | None = None
    error: str | None = None

class VerifyRequest(BaseModel):
    user_id: int
    question_data: dict
    user_choice_index: int

class VerifyResponse(BaseModel):
    correct: bool
    age_level: int
    correct_answer: str
    user_answer: str

class GameStartRequest(BaseModel):
    num_questions: int = 1
    age_level: int = 7

class QuestionData(BaseModel):
    question_id: int
    paragraph: str
    question: str
    choices: list[str]
    correct_answer: str
    correct_index: int
    age_level: int

class GameStartResponse(BaseModel):
    total_questions: int
    questions: list[QuestionData]

class EndGameRequest(BaseModel):
    user_id: int
    test_type: str = "reading"
    question_history: list[dict]

def get_user_age_level(db: Session, user_id: int) -> int:
    """
    user_id 기준으로 vocabulary_age 가져오기
    """
    try:
        result = db.execute(
            text("SELECT vocabulary_age FROM users WHERE id = :user_id"),
            {"user_id": user_id}
        ).first()
        if result and result[0]:
            return int(result[0])
        else:
            return 7  # 기본값
    except Exception as e:
        print(f"⚠️ 사용자 연령 조회 실패: {e}")
        return 7


# ---------------------------
# 🔹 게임 시작 엔드포인트
# ---------------------------
@router.post("/start", response_model=GameStartResponse)
def start_reading_game(request: GameStartRequest, user_id: int, db: Session = Depends(get_db)):
    """
    읽기 게임 시작: 랜덤 10개 문단에서 문제 생성

    Args:
        num_questions: 생성할 문제 개수 (기본값: 10)
        age_level: 기본 난이도 (문단에서 계산된 난이도를 우선 사용)

    Returns:
        GameStartResponse: 생성된 모든 문제 리스트
    """
    assessment = ReadingAssessment(db_session=db)

    try:

        # DB 단어 로드
        try:
            db_words = get_db_words(db)
        except Exception as e:
            print(f"⚠️ DB 단어 로드 실패: {e}")
            db_words = []

        # 랜덤 문단 생성
        paragraphs = assessment.generate_random_paragraphs(request.num_questions)
        # 4. 각 문단마다 문제 생성
        questions = []
        for idx, (paragraph, difficulty) in enumerate(paragraphs, start=1):
            qna_result = assessment.generate_qna_from_paragraph(age=difficulty, paragraph=paragraph, db_words=db_words)
            q = assessment.create_question_from_qna(paragraph, qna_result, age_level=difficulty)
            questions.append(QuestionData(
                question_id=idx,
                paragraph=q['context'],
                question=q['question'],
                choices=q['choices'],
                correct_answer=q['correct_answer'],
                correct_index=q['correct_index'],
                age_level=q['age_level']
            ))

            # 캐시에 저장
        with cache_lock:
            game_cache[user_id] = {"questions": questions, "current_index": len(questions)}

        return {"questions": questions, "total_questions": len(questions)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------
# 🔹 통합 엔드포인트
# ---------------------------
@router.post("/generate", response_model=ReadResponse)
def generate_reading_question(request: ReadRequest, db: Session = Depends(get_db), user_id: int = 0):
    """
    문단을 입력받아 QnA 또는 문해력 문제를 생성합니다.
    mode:
      - 'qna': T5 LoRA 기반 질문/정답 생성
      - 'comprehension': 형태소 기반 문해력 문제 생성
      - 'auto': 두 결과를 모두 반환
    """
    user_id = request.user_id
    assessment = ReadingAssessment(db_session=db)

    with cache_lock:
        if user_id not in game_cache:
            raise HTTPException(status_code=400, detail="게임이 시작되지 않았습니다.")
        state = game_cache[user_id]

    current_index = state["current_index"]
    questions = state["questions"]

    if current_index >= 10:
        raise HTTPException(status_code=400, detail="총 10문제 도달: 게임 종료")

    # DB 단어 가져오기
    try:
        db_words = get_db_words(db)
    except:
        db_words = []

    # 1문제 생성
    paragraph, difficulty = assessment.generate_random_paragraphs(1)[0]
    qna_result = assessment.generate_qna_from_paragraph(age=difficulty, paragraph=paragraph, db_words=db_words)
    q = assessment.create_question_from_qna(paragraph, qna_result, age_level=difficulty)
    new_question = QuestionData(
        question_id=current_index + 1,
        paragraph=q['context'],
        question=q['question'],
        choices=q['choices'],
        correct_answer=q['correct_answer'],
        correct_index=q['correct_index'],
        age_level=q['age_level']
    )

    # 캐시에 추가
    with cache_lock:
        state["questions"].append(new_question)
        state["current_index"] += 1

    return new_question

# ---------------------------
# 🔹 답안 검증 엔드포인트
# ---------------------------

@router.post("/verify", response_model=VerifyResponse)
def verify_answer(request: VerifyRequest):
    """4지선다 문제의 답안을 검증합니다."""

    try:
        # 정답 여부 확인 (자료형 맞춤)
        question_data = request.question_data
        user_choice_index = request.user_choice_index

        # 안전하게 범위 체크
        choices = question_data.get("choices", [])
        if not (0 <= user_choice_index < len(choices)):
            raise HTTPException(status_code=400, detail="user_choice_index 범위 오류")

        correct_index = int(question_data.get("correct_index", 0))
        is_correct = user_choice_index == correct_index

        result = {
            "correct": is_correct,
            "age_level": question_data.get("age_level", 7),
            "correct_answer": question_data.get("correct_answer", ""),
            "user_answer": choices[user_choice_index]
        }

        return VerifyResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"답안 검증 실패: {str(e)}")

@router.post("/end")
def end_game(request: EndGameRequest, db: Session = Depends(get_db)):
    """게임 종료 후 기록 저장"""
    try:
        user_id = request.user_id
        test_type = request.test_type
        question_history = request.question_history

        # 필수 체크
        for q in question_history:
            if q.get("question_id") is None or q.get("question") is None or not q.get("choices"):
                raise HTTPException(status_code=400, detail=f"잘못된 question_history 데이터: {q}")
            if q.get("userAnswer") is None:
                q["userAnswer"] = ""

        total_score = sum(1 for q in question_history if q.get("isCorrect"))

        new_test = UserTests(
            user_id=user_id,
            test_type=test_type,
            questions=[{
                "question_id": q["question_id"],
                "question": q["question"],
                "choices": q["choices"],
                "age_level": q.get("age_level", 7)
            } for q in question_history],
            user_answers=[{
                "question_id": q["question_id"],
                "user_answer": q["userAnswer"]
            } for q in question_history],
            total_score=total_score
        )

        db.add(new_test)
        db.commit()
        db.refresh(new_test)

        return {"message": "테스트 종료", "total_score": total_score}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"user_test 업데이트 실패: {str(e)}")