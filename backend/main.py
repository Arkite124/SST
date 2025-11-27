from fastapi import FastAPI, Request
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import JSONResponse

import traceback
import logging
import os
import uvicorn
from dotenv import load_dotenv

# 게임 관련
from app.games.sentence_puzzle_game import SentencePuzzleGame
from app.games.word_chain_game import WordChainGame
from app.games.word_spell_game import InitialQuizGame
from app.routes.admin import admin_router
from app.routes.games import game_router, sentence_puzzle, word_chain, word_spell

# 라우터 관련
from app.routes.customer_center.subscription import router as subscription
from app.routes.customer_center.customer_support import router as customer_support
from app.routes.customer_dashboard.parent_dashboard import router as parent_dashboard
from app.routes.customer_dashboard.parent_login import router as parent_login
from app.routes.customer_dashboard.child_dashboad import router as child_dashboard
from app.routes.edit_user.find_user import router as find_user
from app.routes.edit_user.check_duplicate import router as check_duplicate
from app.routes.edit_user.edit_user import router as edit_user
from app.routes.forum.parent import router as parent
from app.routes.forum.student import router as readings
from app.routes.login import auth_router
from app.routes.tests import test_router
from app.routes.writings.activities import router as activities
from app.subscription.billiing_scheduler import start_scheduler

# 테스트 / 평가 관련
from Test.vocabulary_assessment import VocabularyAssessment
from Test.reading_assessment import ReadingAssessment

import models
from database import init_db

load_dotenv()

app = FastAPI()

engine = init_db()

# ✅ CORS 설정
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://3.37.88.179",
    "http://3.37.88.179",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "super-secret-key"),  # 랜덤 문자열로 교체
    max_age=1800,  # 30분
)

# 모든 테이블 자동 생성
models.Base.metadata.create_all(bind=engine)
print("테이블 생성 완료")

# ✅ 라우터 통합
app.include_router(auth_router)
app.include_router(customer_support)
app.include_router(edit_user, prefix="/users", tags=["user"])
app.include_router(parent)
app.include_router(readings, prefix="/communities/student", tags=["community_reading"])
app.include_router(check_duplicate)
app.include_router(find_user, prefix="/find_user", tags=["find_user"])
app.include_router(activities)
app.include_router(subscription)
app.include_router(admin_router)
app.include_router(parent_dashboard)
app.include_router(child_dashboard)
app.include_router(game_router)
app.include_router(test_router, prefix="/test", tags=["test"])
app.include_router(parent_login)

# ✅ 로깅
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# ---------------------------------------------------
# 🚀 앱 시작 시 데이터 초기화
# ---------------------------------------------------
@app.on_event("startup")
async def startup_event():
    korean_api_key = os.getenv("KOREAN_BASIC_KEY")
    start_scheduler()
    print("FastAPI + APScheduler 자동결제 시스템 시작")
    # 게임 초기화
    puzzle_game = SentencePuzzleGame(data_path="app/games/data/pickle/processed_sentences.pkl")
    sentence_puzzle.set_puzzle_game(puzzle_game)

    word_chain_game = WordChainGame(api_key=korean_api_key)
    word_chain.set_word_chain_game(word_chain_game)

    word_spell_game = InitialQuizGame(api_key=korean_api_key)
    word_spell.set_word_spell_game(word_spell_game)

    app.state.puzzle_game = puzzle_game
    app.state.word_chain_game = word_chain_game
    app.state.word_spell_game = word_spell_game

    print("게임 초기화 완료 (한 번만 실행됨)")
    print("서버 시작: 최소 데이터 로딩 중...")

    try:

        print("어휘력 평가 시스템 초기화 중...")
        vocab = VocabularyAssessment()

        print("문해력 평가 시스템 초기화 중...")
        reading = ReadingAssessment()

        #  FastAPI 전역 state 저장
        app.state.vocab = vocab
        app.state.reading = reading

        from app.routes.tests.result_tts import TTS_AVAILABLE
        print("TTS 엔진 로딩" if TTS_AVAILABLE else "TTS 엔진 사용 불가 - 음성 기능 비활성화")

    except Exception as e:
        print(f"초기화 실패: {e}")
        raise

# ---------------------------------------------------
#  전역 예외 핸들러
# ---------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_trace = traceback.format_exc()
    logger.exception("Unhandled error occurred")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "trace": error_trace},
    )

# ---------------------------------------------------
# 실행 진입점
# ---------------------------------------------------
if __name__ == "__main__":
    # Docker 내부에서는 실행하지 않음
    if os.getenv("RUN_ENV") == "docker":
        print("Docker 환경에서는 nginx가 통제한다.")
    else:
        # 로컬 개발 환경에서만 HTTPS 여부에 따라 실행
        use_https = os.getenv("USE_HTTPS", "false").lower() == "true"
        if use_https:
            uvicorn.run(
                "main:app",
                host="0.0.0.0",
                port=8000,
                reload=True,
                ssl_keyfile="key.pem",
                ssl_certfile="cert.pem"
            )
        else:
            uvicorn.run(
                "main:app",
                host="0.0.0.0",
                port=8000,
                reload=True
            )