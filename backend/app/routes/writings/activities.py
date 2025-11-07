import os
from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from numba.core.types import unknown
from sqlalchemy.orm import Session
from sqlalchemy import select, literal
from sqlalchemy.sql import union_all
from models import DailyWritings as DailyWriting, ReadingLogs, Users
from app.routes.login.login import get_current_user
from app.routes.writings.activities_base_model import *
from data.postgresDB import SessionLocal
from dotenv import load_dotenv
from datetime import datetime
from Ai.ai_common.clean_contents import safe_spell_check
import requests

from app.routes.writings.activities_base_model import DailyWritingListResponse, ReadingLogWithBook, \
    ReadingLogUpdate

load_dotenv()
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")
router = APIRouter(prefix="/activities", tags=["activities"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------------------
# 전체 활동 리스트
# ---------------------------
def get_offset(page: int, size: int) -> int:
    return (page - 1) * size

CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")
KOREAN_DICT_KEY = os.getenv("KOREAN_DICT_KEY")  # 국립국어원 인증키
# 국어원 대사전 api 불러오기
SEARCH_URL = "https://stdict.korean.go.kr/api/search.do"
VIEW_URL = "https://stdict.korean.go.kr/api/view.do"
def fetch_book_from_naver(title: str):
    url = "https://openapi.naver.com/v1/search/book.json"
    headers = {
        "X-Naver-Client-Id": CLIENT_ID,
        "X-Naver-Client-Secret": CLIENT_SECRET,
    }
    params = {"query": title, "display": 1}

    res = requests.get(url, headers=headers, params=params)

    # 1. HTTP 에러 처리
    if res.status_code != 200:
        print(f"네이버 API 호출 실패: {res.status_code}, {res.text}")
        return None

    data = res.json()

    # 2. items 키 유무 확인
    items = data.get("items", [])
    if not items:
        print(f"⚠️ 검색 결과 없음: {title}")
        return None

    # 3. 정상 반환
    return items[0]

@router.get("/list", response_model=List[ActivityItem])
def get_all_activities(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(5, ge=1, le=20),
):
    if not current_user:
        raise HTTPException(401, "잘못된 접근입니다.")

    user_id = current_user.id
    offset = get_offset(page, size)

    # DailyWriting 쿼리
    daily_stmt = (
        select(
            DailyWriting.id.label("id"),
            DailyWriting.title.label("title"),
            DailyWriting.content.label("text"),
            DailyWriting.created_at.label("created_at"),
            literal("생활글쓰기(일기)").label("category")
        )
        .where(DailyWriting.user_id == user_id)
    )

    # ReadingLogs 쿼리
    reading_stmt = (
        select(
            ReadingLogs.id.label("id"),
            ReadingLogs.book_title.label("title"),
            ReadingLogs.content.label("text"),
            ReadingLogs.created_at.label("created_at"),
            literal("독후감").label("category")
        )
        .where(ReadingLogs.user_id == user_id)
    )

    # UNION ALL + 정렬 + 페이징
    union_stmt = union_all(daily_stmt, reading_stmt).alias("activities")
    stmt = (
        select(
            union_stmt.c.id,
            union_stmt.c.title,
            union_stmt.c.text,
            union_stmt.c.created_at,
            union_stmt.c.category,
        )
        .order_by(union_stmt.c.created_at.desc())
        .offset(offset)
        .limit(size)
    )

    rows = db.execute(stmt).all()

    return [
        ActivityItem(
            id=row.id,
            title=row.title,
            text=row.text,
            created_at=row.created_at,
            category=row.category
        )
        for row in rows
    ]

# ---------------------------
# ✅ DailyWriting 라우터
# ---------------------------
@router.get("/list/daily_writing", response_model=DailyWritingListResponse)
def daily_list(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(5, ge=1, le=20),
):
    if not current_user:
        raise HTTPException(status_code=401, detail={"message": "로그인이 필요합니다."})

    user_id = current_user.id
    offset = get_offset(page, size)

    total = db.query(DailyWriting).filter(DailyWriting.user_id == user_id).count()
    items = (
        db.query(DailyWriting)
        .filter(DailyWriting.user_id == user_id)
        .order_by(DailyWriting.created_at.desc())
        .offset(offset)
        .limit(size)
        .all()
    )

    return {"total": total, "page": page, "size": size, "items": items}

@router.get("/list/daily_writing/{list_id}", response_model=DailyWritingRead)
def daily_detail(list_id: int, current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail={"message":"로그인이 필요합니다."})
    user_id = current_user.id
    writing = db.query(DailyWriting).filter(DailyWriting.id == list_id, DailyWriting.user_id == user_id).first()
    if not writing:
        raise HTTPException(404, "내역이 없거나 잘못된 접근입니다.")
    return writing

@router.post("/list/daily_writing", response_model=DailyWritingRead)
def daily_create(request: DailyWritingCreate, current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail={"message":"로그인이 필요합니다."})
    user_id = current_user.id
    if request.content in (" ", "\n", None):
        raise HTTPException(status_code=400, detail={"message": "내용을 입력해 주세요."})
    clean_contents=safe_spell_check(request.content)
    print(request)
    writing = DailyWriting(
        title=request.title,
        content=request.content,
        cleaned_content=clean_contents,
        mood=request.mood,
        user_id=user_id,
        attachment_url=request.attachment_url,
        created_at=datetime.now(),
    )
    db.add(writing)
    db.commit()
    db.refresh(writing)
    # 해당 함수(단어 분석, 저장 함수)
    return writing

@router.patch("/list/daily_writing/{list_id}", response_model=DailyWritingRead)
def daily_patch(list_id: int, request: DailyWritingUpdate, current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail={"message":"로그인이 필요합니다."})
    user_id = current_user.id
    writing = db.query(DailyWriting).filter(DailyWriting.id == list_id, DailyWriting.user_id == user_id).first()
    if not writing:
        raise HTTPException(404, "해당 일기는 존재하지 않습니다.")
    if writing.id != request.id:
        raise HTTPException(status_code=401, detail={"message": "잘못된 요청입니다."})
    if request.content in (" ", "\n", None):
        raise HTTPException(status_code=400, detail={"message": "내용을 입력해 주세요."})
    if request.content == writing.content:
        raise HTTPException(status_code=400, detail={"message": "수정된 내용이 없습니다!"})
    if writing.content != request.content:
        writing.content = request.content
        writing.cleaned_content = safe_spell_check(request.content)
    db.commit()
    db.refresh(writing)
    return writing

@router.delete("/list/daily_writing/{list_id}")
def daily_delete(list_id: int, current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail={"message":"로그인이 필요합니다."})
    user_id = current_user.id
    writing = db.query(DailyWriting).filter(DailyWriting.id == list_id, DailyWriting.user_id == user_id).first()
    if not writing:
        raise HTTPException(404, "해당 일기는 존재하지 않습니다.")
    db.delete(writing)
    db.commit()
    return {"삭제상태": "성공", "message": "삭제가 성공적으로 처리되었습니다."}

# ---------------------------
# ✅ ReadingLogs 라우터
# ---------------------------
class ReadingLogListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[ReadingLogWithBook]
@router.get("/list/reading_logs", response_model=ReadingLogListResponse)
def get_reading_logs_with_books(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user),
    page: int = Query(1, ge=1),
    size: int = Query(5, ge=1, le=20),
):
    if not current_user:
        raise HTTPException(status_code=401, detail={"message": "로그인이 필요합니다."})

    user_id = current_user.id
    offset = get_offset(page, size)

    # ✅ 전체 개수
    total = db.query(ReadingLogs).filter(ReadingLogs.user_id == user_id).count()

    # ✅ 현재 페이지 데이터
    logs = (
        db.query(ReadingLogs)
        .filter(ReadingLogs.user_id == user_id)
        .order_by(ReadingLogs.created_at.desc())
        .offset(offset)
        .limit(size)
        .all()
    )

    results = []
    for log in logs:
        book_info = fetch_book_from_naver(log.book_title)
        results.append(
            ReadingLogWithBook(
                id=log.id,
                book_title=log.book_title,
                author=log.author,
                publisher=log.publisher,
                created_at=log.created_at,
                cleaned_content=log.cleaned_content,
                unknown_sentence=log.unknown_sentence,
                content=log.content,
                image=book_info.get("image") if book_info else None,
                link=book_info.get("link") if book_info else None,
                description=book_info.get("description") if book_info else None,
            )
        )

    return {"total": total, "page": page, "size": size, "items": results}


@router.get("/list/reading_logs/{log_id}", response_model=ReadingLogWithBook)
def get_reading_log(
    log_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail={"message": "로그인이 필요합니다."})
    log = (
        db.query(ReadingLogs)
        .filter(ReadingLogs.id == log_id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="해당 독후감이 존재하지 않습니다.")
    # ✅ 네이버 책 정보 가져오기 (목록과 동일한 방식)
    book_info = fetch_book_from_naver(log.book_title)

    return ReadingLogWithBook(
        id=log.id,
        book_title=log.book_title,
        author=log.author,
        publisher=log.publisher,
        created_at=log.created_at,
        content=log.content,
        cleaned_content=log.cleaned_content,
        unknown_sentence=log.unknown_sentence,
        image=book_info.get("image") if book_info else None,
        link=book_info.get("link") if book_info else None,
        description=book_info.get("description") if book_info else None,
    )

@router.get("/list/reading_logs/search", response_model=List[ReadingLogWithBook])
def search_reading_log(words:str,db: Session = Depends(get_db), current_user: Users = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail={"message":"로그인이 필요합니다."})
    return db.query(ReadingLogs).filter(ReadingLogs.book_title.like(words)).all()

@router.post("/list/reading_logs", response_model=ReadingLogWithBook)
def create_reading_log(request: ReadingLogCreate, current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail={"message":"로그인이 필요합니다."})
    user_id = current_user.id
    if request.content in (" ", "\n", None):
        raise HTTPException(status_code=400, detail={"message": "내용을 입력해 주세요."})
    if request.book_title in (" ", "\n", None):
        raise HTTPException(status_code=400, detail={"message": "책의 제목을 입력해 주세요."})
    clean_contents=safe_spell_check(request.content)
    # API 호출
    # resp_sentiment=resp.json
    # sentiment=resp_sentiment["sentiment"]
    new_log = ReadingLogs(
        book_title=request.book_title,
        author=request.author,
        publisher=request.publisher,
        content=request.content,
        cleaned_content=clean_contents,
        unknown_sentence=request.unknown_sentence,
        user_id=user_id,
        created_at=datetime.now(),
        # sentiment=sentiment,
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log


@router.patch("/list/reading_logs/{log_id}", response_model=ReadingLogWithBook)
def update_reading_log(
        log_id: int,
        request: ReadingLogUpdate,
        current_user: Users = Depends(get_current_user),
        db: Session = Depends(get_db),
):
    # ✅ 인증 확인
    if not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    # ✅ 해당 유저의 독서록 찾기
    log = (
        db.query(ReadingLogs)
        .filter(ReadingLogs.id == log_id, ReadingLogs.user_id == current_user.id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="해당 독후감이 존재하지 않습니다.")
    cleaned_contents = log.cleaned_content
    # ✅ 요청 데이터 검증
    if not request.content or not request.content.strip():
        raise HTTPException(status_code=400, detail="내용을 입력해 주세요.")
    if request.content == log.content:
        raise HTTPException(status_code=400, detail="수정된 내용이 없습니다!")
    if request.content and request.content != log.content:
        cleaned_contents = safe_spell_check(request.content)
    # 업데이트할 필드 목록
    update_fields = {
        "book_title": request.book_title,
        "author": request.author,
        "publisher": request.publisher,
        "content": request.content,
        "unknown_sentence": request.unknown_sentence,
        "cleaned_content": cleaned_contents,
    }

    # ✅ 변경된 값만 반영
    for field, value in update_fields.items():
        if value is not None:
            setattr(log, field, value)

    # ✅ 교정 로직은 content가 변경된 경우에만 실행


    log.updated_at = datetime.now()

    db.commit()
    db.refresh(log)
    return log

@router.delete("/list/reading_logs/{log_id}")
def delete_reading_log(log_id: int, current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail={"message":"로그인이 필요합니다."})
    user_id = current_user.id
    log = db.query(ReadingLogs).filter(ReadingLogs.id == log_id, ReadingLogs.user_id == user_id).first()
    if not log:
        raise HTTPException(status_code=404, detail={"message": "해당 독후감이 존재하지 않습니다."})
    db.delete(log)
    db.commit()
    return {"삭제상태": "성공", "message": "삭제가 성공적으로 처리되었습니다."}


@router.get("/wordsearch")
async def word_search(query: str = Query(..., description="검색할 단어")):
    """
    국립국어원 표준국어대사전 검색 + 상세정보 (예문, 유사어 포함)
    """
    # 1️⃣ 검색 API 호출
    params = {
        "key": KOREAN_DICT_KEY,
        "type_search": "search",  # 일반 검색
        "req_type": "json",       # JSON 응답
        "q": query
    }

    async with httpx.AsyncClient() as client:
        res = await client.get(SEARCH_URL, params=params)
    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail=res.text)

    data = res.json()
    items = data.get("channel", {}).get("item", [])

    results = []

    # 2️⃣ 각 단어 상세정보 조회 (예문/유사어)
    async with httpx.AsyncClient() as client:
        for item in items:
            target_code = item.get("target_code")
            detail_params = {
                "key": KOREAN_DICT_KEY,
                "q": target_code,
                "req_type": "json"
            }
            detail_res = await client.get(VIEW_URL, params=detail_params)

            if not detail_res.text.strip():
                results.append({
                    "word": item.get("word"),
                    "origin": item.get("origin"),
                    "pos": item.get("pos"),
                    "definition": item.get("sense", {}).get("definition"),
                    "link": item.get("sense", {}).get("link"),
                    "examples": [],
                    "similar_words": []
                })
                continue
            try:
                detail_data = detail_res.json()
            except Exception:
                raise HTTPException(
                    status_code=500,
                    detail=f"view.do JSONDecodeError: {detail_res.text[:200]}"
                )

            word_info = detail_data.get("channel", {}).get("item", [])[0] if detail_data.get("channel", {}).get("item") else {}

            # 예문 수집
            examples = []
            for sense in word_info.get("sense", []):
                if "example_info" in sense:
                    for ex in sense["example_info"]:
                        examples.append(ex.get("example", ""))

            # 유사어 수집
            similar_words = []
            for sense in word_info.get("sense", []):
                if "rel_info" in sense:
                    for rel in sense["rel_info"]:
                        if rel.get("type") == "유의어":
                            similar_words.append(rel.get("word"))

            # 최종 결과 합치기
            results.append({
                "word": item.get("word"),
                "origin": item.get("origin"),
                "pos": item.get("pos"),
                "definition": item.get("sense", {}).get("definition"),
                "link": item.get("link"),
                "examples": examples,
                "similar_words": similar_words
            })
    return {"results": results}