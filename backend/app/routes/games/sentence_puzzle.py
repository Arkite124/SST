# routes/sentence_puzzle.py (10문제 세션 - 틀린 문제도 카운트)
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from data.postgresDB import SessionLocal
from models import Users
from ..login.login import get_current_user
from ...games.sentence_puzzle_game import SentencePuzzleGame

router = APIRouter(prefix="/puzzle", tags=["sentence_puzzle"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Request/Response Models
class GeneratePuzzleRequest(BaseModel):
    age: int
    user_id : int

class GeneratePuzzleResponse(BaseModel):
    puzzle_id: str
    age: int
    title: str
    pieces: List[Dict[str, Any]]
    word_count: int
    metadata: Dict[str, Any]
    session_progress: Optional[str] = None  # ✅ 기본값 허용 # "3/10" 형식

class SubmitAnswerRequest(BaseModel):
    puzzle_id: str
    user_answer: str   # ✅ user_id 제거

class SubmitAnswerResponse(BaseModel):
    passed: bool
    similarity: float
    exact_match: bool
    message: str
    user_sentence: str
    score: Optional[int] = None
    feedback: Optional[str] = None
    original_sentence: Optional[str] = None
    session_progress: Optional[str] = None
    session_complete: Optional[bool] = None
    final_score: Optional[int] = None
    final_message: Optional[str] = None


class SkipPuzzleRequest(BaseModel):
    puzzle_id: str


class SkipPuzzleResponse(BaseModel):
    message: str
    original_sentence: str
    session_progress: Optional[str] = None
    session_complete: Optional[bool] = None
    final_score: Optional[int] = None
    final_message: Optional[str] = None


class GetHintRequest(BaseModel):
    puzzle_id: str


class GetHintResponse(BaseModel):
    hints: List[Dict[str, str]]
    hints_used: int
    max_hints: int


class SessionStatusResponse(BaseModel):
    in_progress: bool
    total_puzzles: Optional[int] = None
    puzzles_solved: Optional[int] = None
    current_score: Optional[int] = None
    initial_age: Optional[int] = None
    current_age: Optional[int] = None
    message: Optional[str] = None

# 게임 인스턴스
puzzle_game = None

def set_puzzle_game(game):
    global puzzle_game
    puzzle_game = game


@router.post("/generate", response_model=GeneratePuzzleResponse)
async def generate_puzzle(
    request: GeneratePuzzleRequest,
    user: Users = Depends(get_current_user)
):
    """퍼즐 생성 - 자동으로 10문제 세션에 포함"""
    if not user:
        raise HTTPException(status_code=401, detail="로그인 하셔야 합니다.")
    if not puzzle_game:
        raise HTTPException(status_code=503, detail="게임 서비스를 사용할 수 없습니다")
    if not puzzle_game.is_ready():
        raise HTTPException(status_code=503, detail="퍼즐 생성기가 준비되지 않았습니다")
    user_id=user.id
    try:
        puzzle = puzzle_game.generate_puzzle(
            age=request.age,
            user_id=user_id
        )
        return GeneratePuzzleResponse(**puzzle)
    except ValueError as e:
        import traceback
        print("❌ ValueError 발생:", request.age, traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"잘못된 요청: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"퍼즐 생성 실패: {str(e)}")


@router.post("/submit", response_model=SubmitAnswerResponse)
async def submit_answer(
    request: SubmitAnswerRequest,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user)   # ✅ 로그인 사용자
):
    """답안 제출 - 3번 틀리면 자동으로 다음 문제로, 10문제 완료시 DB 저장"""
    if not puzzle_game:
        raise HTTPException(status_code=503, detail="게임 서비스를 사용할 수 없습니다")

    if not puzzle_game.is_ready():
        raise HTTPException(status_code=503, detail="퍼즐 생성기가 준비되지 않았습니다")

    if not request.user_answer or not request.user_answer.strip():
        raise HTTPException(status_code=400, detail="답안을 입력해주세요")

    try:
        puzzle_game.db = db
        result = puzzle_game.verify_answer(
            puzzle_id=request.puzzle_id,
            user_answer=request.user_answer
        )
        return SubmitAnswerResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=f"퍼즐을 찾을 수 없습니다: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"답안 검증 실패: {str(e)}")

@router.post("/skip", response_model=SkipPuzzleResponse)
async def skip_puzzle(
    request: SkipPuzzleRequest,
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user)
):
    """현재 문제 건너뛰기 (0점 처리)"""
    if not puzzle_game:
        raise HTTPException(status_code=503, detail="게임 서비스를 사용할 수 없습니다")

    if not puzzle_game.is_ready():
        raise HTTPException(status_code=503, detail="퍼즐 생성기가 준비되지 않았습니다")

    try:
        puzzle_game.db = db
        result = puzzle_game.skip_puzzle(puzzle_id=request.puzzle_id, user_id=user.id)
        return SkipPuzzleResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=f"퍼즐을 찾을 수 없습니다: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"건너뛰기 실패: {str(e)}")


@router.post("/hint", response_model=GetHintResponse)
async def get_hint(request: GetHintRequest):
    """힌트 제공"""
    if not puzzle_game:
        raise HTTPException(status_code=503, detail="게임 서비스를 사용할 수 없습니다")

    if not puzzle_game.is_ready():
        raise HTTPException(status_code=503, detail="퍼즐 생성기가 준비되지 않았습니다")

    try:
        result = puzzle_game.get_hint(puzzle_id=request.puzzle_id)
        return GetHintResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=f"퍼즐을 찾을 수 없습니다: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"힌트 제공 실패: {str(e)}")


@router.get("/session/status", response_model=SessionStatusResponse)
async def get_session_status(user: Users = Depends(get_current_user)):
    """현재 진행중인 세션 상태 확인"""
    if not puzzle_game:
        raise HTTPException(status_code=503, detail="게임 서비스를 사용할 수 없습니다")

    try:
        status = puzzle_game.get_user_session_status(user_id=user.id)  # ✅ user.id 사용
        return SessionStatusResponse(**status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"세션 상태 조회 실패: {str(e)}")


@router.get("/status")
async def get_status():
    """게임 전체 상태 확인"""
    if not puzzle_game:
        return {"ready": False, "message": "게임이 초기화되지 않았습니다"}

    return {
        "ready": puzzle_game.is_ready(),
        "puzzle_count": puzzle_game.get_puzzle_count() if puzzle_game.is_ready() else 0,
        "active_sessions": len(puzzle_game.game_sessions) if hasattr(puzzle_game, 'game_sessions') else 0
    }


@router.post("/cleanup")
async def cleanup_old_sessions():
    """오래된 세션과 퍼즐 정리 (관리자용)"""
    if not puzzle_game:
        raise HTTPException(status_code=503, detail="게임 서비스를 사용할 수 없습니다")
    try:
        puzzle_game.cleanup_old_sessions(hours=24)
        return {"message": "오래된 세션과 퍼즐이 정리되었습니다"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"정리 실패: {str(e)}")
