# FastAPI 라우터 예제
from fastapi import APIRouter
from backend.data.postgresDB import SessionLocal
from backend.Ai.ai_recommBook_logic.book_recommend import run_book_recommendation
from backend.Ai.ai_common.gpu_start import get_device_cuda

device = get_device_cuda()

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_unknown_sentence_router(model):
    router = APIRouter()

    @router.get("/book-ml")
    def book_recommend_ml(user_id: int = 1):
        recommend_list = run_book_recommendation(user_id=user_id, model=model)
        results = []
        for book in recommend_list:
            results.append({
                "title": book.get("title", "정보 없음"),
                "author": book.get("author", "정보 없음"),
                "description": book.get("description", "정보 없음"),
                "isbn": book.get("isbn", "정보 없음"),
                "image": book.get("image", "정보 없음"),
                "link": book.get("link", "정보 없음"),
                "sim": round(book.get("sim", 0.0), 3)
            })
        return results

    return router

