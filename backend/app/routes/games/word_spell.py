# 📁 routes/word_spell.py
import traceback
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from data.postgresDB import SessionLocal
from models import Users   # ✅ 사용자 모델 import
from app.routes.login.login import get_current_user

router = APIRouter(prefix="/wordspell", tags=["word_spell"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 🔥 요청/응답 모델
class StartGameRequest(BaseModel):
    game_id: str
    difficulty: str = "medium"   # ✅ user_id 제거

class StartGameResponse(BaseModel):
    game_id: str
    message: str
    difficulty: str
    first_initial: Optional[str] = None
    first_definition: Optional[str] = None

class SubmitAnswerRequest(BaseModel):
    game_id: str
    answer: str
    used_problems: Optional[List[str]] = []   # ✅ user_id 제거

class SubmitAnswerResponse(BaseModel):
    correct: bool
    result: Optional[str] = None
    finished: bool
    next_initial: Optional[str] = None
    next_definition: Optional[str] = None
    score: Optional[int] = None
    message: Optional[str] = None

# 🔥 전역 변수
word_spell_game = None

def set_word_spell_game(game_instance):
    global word_spell_game
    word_spell_game = game_instance
    print("✅ WordSpellGame 라우터에 설정 완료")

# 🔹 게임 시작
@router.post("/start", response_model=StartGameResponse)
def start_game(
    request: StartGameRequest,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user)   # ✅ 인증된 사용자
):
    if word_spell_game is None:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="게임이 초기화되지 않았습니다")

    try:
        word_spell_game.db = db

        # 🔥 게임 생성
        result = word_spell_game.create_game(request.game_id, request.difficulty)

        # ✅ 게임 정보에 user_id 저장
        if request.game_id in word_spell_game.games:
            word_spell_game.games[request.game_id]['user_id'] = user.id
        print(result)
        first_problem = result.get("problem", {})

        return StartGameResponse(
            game_id=request.game_id,
            message=result.get("message", "게임 시작"),
            difficulty=request.difficulty,
            first_initial=first_problem.get("initial", ""),
            first_definition=first_problem.get("definition", "")
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"게임 시작 실패: {str(e)}")

# 🔹 정답 제출
@router.post("/submit", response_model=SubmitAnswerResponse)
def submit_answer(
    req: SubmitAnswerRequest,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user)   # ✅ 인증된 사용자
):
    if user is None:
        raise HTTPException(status_code=401, detail="유저가 인증되지 않았습니다.")
    if word_spell_game is None:
        raise HTTPException(status_code=500, detail="게임이 초기화되지 않았습니다")

    try:
        word_spell_game.db = db

        result = word_spell_game.submit_answer(
            req.game_id,
            req.answer,
            user_id=user.id
        )

        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        # 🔥 게임 종료
        if result["finished"]:
            return SubmitAnswerResponse(
                correct=result.get("correct", False),
                result=result["result"],
                finished=True,
                score=result["score"],
                message=result["message"]
            )

        # 🔥 다음 문제
        next_problem = result["next_problem"]
        return SubmitAnswerResponse(
            correct=result.get("correct", False),
            result=result["result"],
            finished=False,
            next_initial=next_problem["initial"],
            next_definition=next_problem["definition"],
            score=result.get("score", 0),
            message=result["result"]
        )

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"정답 제출 실패: {str(e)}")
