from fastapi import APIRouter, HTTPException
from backend.Ai.db.postgresdb import SessionLocal
from backend.models import ReadingLogs
from backend.Ai.ai_recommBook_logic.analyze_sentiment import analyze_sentiment

def get_sentiment_router(model_bundle):
    router = APIRouter()

    @router.post("/analyze-sentiment/{reading_log_id}")
    def analyze_readinglog_sentiment(reading_log_id: int):
        with SessionLocal() as session:
            log = session.query(ReadingLogs).filter(ReadingLogs.id == reading_log_id).first()
            if not log or not log.content:
                raise HTTPException(status_code=404, detail=f"ID {reading_log_id} 글이 없거나 content가 비어있습니다.")

            result = analyze_sentiment(log.content, model_bundle)
            return {
                "reading_log_id": reading_log_id,
                "user_id": log.user_id,
                "book_title": log.book_title,
                "sentiment_result": result
            }

    return router
