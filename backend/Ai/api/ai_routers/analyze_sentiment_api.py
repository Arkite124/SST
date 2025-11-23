from fastapi import APIRouter, HTTPException
from db.postgresDB import SessionLocal
from db.models import ReadingLogs
from typing import Optional
from pydantic import BaseModel
from ai_recommBook_logic.analyze_sentiment import analyze_sentiment

def get_sentiment_router(model_bundle):
    router = APIRouter()

    # 외부 JSON 요청 Body
    class SentimentRequest(BaseModel):
        reading_log_id: int = None
        content: str
        user_id: Optional[int] = None
        book_title: Optional[str] = None

    @router.post("/analyze-sentiment")
    def analyze_readinglog_sentiment(request: SentimentRequest):

        if not request.content:
            raise HTTPException(status_code=400, detail="content가 비어있습니다.")

        sentiment_result = analyze_sentiment(request.content, model_bundle)

        return {
            "reading_log_id": request.reading_log_id,
            "user_id": request.user_id,
            "book_title": request.book_title,
            "sentiment_result": sentiment_result
        }

    return router
