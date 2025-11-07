# routes/word_chain.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from data.postgresDB import SessionLocal
from models import Users   # ✅ 사용자 모델 import
from app.routes.login.login import get_current_user

router = APIRouter(prefix="/wordchain", tags=["word_chain"])

# Request/Response Models
class StartGameRequest(BaseModel):
    difficulty: str = "medium"   # ✅ user_id 제거

class StartGameResponse(BaseModel):
    game_id: str
    message: str
    difficulty: str
    first_word: Optional[str] = None
    first_definition: Optional[str] = None
    computer_starts: bool

class MoveRequest(BaseModel):
    game_id: str
    word: str


class MoveResponse(BaseModel):
    success: bool
    message: str
    game_over: bool = False
    winner: Optional[str] = None
    user_word: Optional[str] = None
    user_definition: Optional[str] = None
    computer_word: Optional[str] = None
    computer_definition: Optional[str] = None
    chisa_message: str = ""
    dueum_message: str = ""
    dueum_applied: bool = False
    reason: Optional[str] = None
    score: Optional[int] = None

class HistoryResponse(BaseModel):
    history: List[str]


# 🔥 전역 변수 하나로 통일
word_chain_game = None

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def set_word_chain_game(game_instance):
    """게임 인스턴스 설정 (main.py에서 호출)"""
    global word_chain_game
    word_chain_game = game_instance
    print("✅ WordChainGame 라우터에 설정 완료")


# 게임 시작
@router.post("/start", response_model=StartGameResponse)
async def start_game(
    request: StartGameRequest,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user)   # ✅ user 주입
):
    if word_chain_game is None:
        raise HTTPException(status_code=500, detail="게임이 초기화되지 않았습니다")

    try:
        # 🔥 DB 세션을 게임에 설정
        word_chain_game.db = db

        # 🔥 게임 ID 생성
        game_id = str(word_chain_game.get_game_count() + 1)

        # 🔥 게임 생성 (create_game이 모든 초기화를 처리)
        result = word_chain_game.create_game(game_id, request.difficulty)

        # ✅ 게임 정보에 user_id 저장
        if game_id in word_chain_game.games:
            word_chain_game.games[game_id]['user_id'] = user.id

        return StartGameResponse(
            game_id=game_id,
            message=result['message'],
            difficulty=request.difficulty,
            first_word=result.get('first_word'),
            first_definition=result.get('first_definition'),
            computer_starts=result.get('computer_starts', False)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"게임 시작 실패: {str(e)}")


# 사용자 단어 입력
@router.post("/move", response_model=MoveResponse)
async def make_move(
    request: MoveRequest,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user)   # ✅ user 주입
):
    if word_chain_game is None:
        raise HTTPException(status_code=500, detail="게임이 초기화되지 않았습니다")

    try:
        word_chain_game.db = db
        result = word_chain_game.make_move(
            request.game_id,
            request.word
        )
        return MoveResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/restart")
async def restart_game(game_id: str):
    """게임 재시작"""
    if word_chain_game is None:
        raise HTTPException(status_code=500, detail="게임이 초기화되지 않았습니다")

    try:
        word_chain_game.restart_game(game_id)
        return {"message": "게임을 다시 시작합니다."}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{game_id}/history", response_model=HistoryResponse)
async def get_history(game_id: str):
    """게임 히스토리 조회"""
    if word_chain_game is None:
        raise HTTPException(status_code=500, detail="게임이 초기화되지 않았습니다")

    try:
        history = word_chain_game.get_history(game_id)
        return HistoryResponse(history=history)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{game_id}")
async def end_game(game_id: str):
    """게임 종료"""
    if word_chain_game is None:
        raise HTTPException(status_code=500, detail="게임이 초기화되지 않았습니다")
    try:
        word_chain_game.delete_game(game_id)
        return {"message": "게임이 종료되었습니다"}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))