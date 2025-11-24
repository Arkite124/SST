from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from ai_recommBook_logic.book_recommend import run_book_recommendation
from ai_common.gpu_start import get_device_cuda

device = get_device_cuda()


def get_book_router(model):
    router = APIRouter()

    # 책 1개 단위 모델
    class BookItem(BaseModel):
        title: str
        sentiment: str

    # 전체 요청 Body
    class BookRecommendRequest(BaseModel):
        books: List[BookItem]

    @router.post("/book-recommend")
    def book_recommend_ml(request: BookRecommendRequest):
        # run_book_recommendation()에 바로 전달
        recommend_list = run_book_recommendation(
            book_list=[{"title": b.title, "sentiment": b.sentiment} for b in request.books],
            model=model
        )

        # 결과 포맷 정리
        results = []
        for rec in recommend_list:
            results.append({
                "title": rec.get("title", "정보 없음"),
                "author": rec.get("author", "정보 없음"),
                "description": rec.get("description", "정보 없음"),
                "isbn": rec.get("isbn", "정보 없음"),
                "image": rec.get("image", "정보 없음"),
                "link": rec.get("link", "정보 없음"),
                "sim": round(rec.get("sim", 0.0), 4)
            })
        return results

    return router
