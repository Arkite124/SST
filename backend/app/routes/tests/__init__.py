from fastapi import APIRouter

from app.routes.tests import reading, vocabulary, verify, session_check, result_tts

test_router = APIRouter()
test_router.include_router(reading.router, prefix="/reading", tags=["reading"])
test_router.include_router(vocabulary.router, prefix="/vocabulary", tags=["vocabulary"])
test_router.include_router(verify.router, tags=["verify"])
test_router.include_router(session_check.router, prefix="/session", tags=["session_check"])
test_router.include_router(result_tts.router, tags=["result_tts"])