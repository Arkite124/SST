import os
from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from numba.core.types import unknown
from sqlalchemy.orm import Session
from sqlalchemy import select, literal
from sqlalchemy.sql import union_all
from models import DailyWritings as DailyWriting, ReadingLogs, Users, UserWordUsage, Outputs
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
api_url=os.getenv("API_URL")
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

@router.get(
    "/list",
    response_model=List[ActivityItem],
    summary="전체 활동 통합 조회 (일기 + 독후감)",
    description="""
사용자의 전체 활동(일기 + 독후감)을 최신순으로 가져옵니다.

- DailyWriting + ReadingLogs 를 UNION ALL로 결합
- 최신순 정렬
- 페이징(page, size) 가능

### 응답 예시
```json
[
  {
    "id": 12,
    "title": "아침에 학교 갔다",
    "text": "오늘은 날씨가 좋았다...",
    "created_at": "2025-01-01T10:00:00",
    "category": "생활글쓰기(일기)"
  }
]
"""
)
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
@router.get(
    "/list/daily_writing",
    response_model=DailyWritingListResponse,
    summary="일기 목록 조회",
    description="""
사용자의 일기 목록을 최신순으로 조회합니다.

- 페이징 지원
- total / page / size / items 형태로 반환

### 응답 예시
```json
{
  "total": 15,
  "page": 1,
  "size": 5,
  "items": [
    {
      "id": 3,
      "title": "오늘 밥이 맛있었다",
      "content": "점심에 불고기를 먹었다",
      "created_at": "2025-01-01T12:00:00"
    }
  ]
}
"""
)
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

@router.get(
    "/list/daily_writing/{list_id}",
    response_model=DailyWritingRead,
    summary="일기 상세 조회",
    description="""
특정 일기의 상세 정보를 조회합니다.

- 로그인된 사용자 본인의 일기만 조회 가능
"""
)
def daily_detail(list_id: int, current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail={"message": "로그인이 필요합니다."})

    writing = (
        db.query(DailyWriting)
        .filter(DailyWriting.id == list_id, DailyWriting.user_id == current_user.id)
        .first()
    )
    if not writing:
        raise HTTPException(404, "내역이 없거나 잘못된 접근입니다.")

    # UserWordUsage 조회
    word_usage = (
        db.query(UserWordUsage)
        .filter(
            UserWordUsage.user_id == current_user.id,
            UserWordUsage.category == "daily",
            UserWordUsage.content_id == list_id
        )
        .first()
    )

    # 분석 결과가 있다면 words_list 추가
    words_list = word_usage.analysis_result if word_usage else []

    #  데이터를 반환할 때 words_list 직접 추가
    return {
        **writing.__dict__,
        "words_list": words_list
    }

@router.post(
    "/list/daily_writing",
    response_model=DailyWritingRead,
    summary="일기 작성",
    description="""
새로운 일기를 작성합니다.

기능:
- 외부 AI 서버(clean-content) 정제 처리
- 문장 분석(analyze-result)
- 단어 분석(analyze-text)
- Outputs, UserWordUsage 자동 저장

### 요청 예시
```json
{
  "title": "우리집 강아지",
  "content": "강아지가 너무 귀여웠다!",
  "mood": "happy"
}
"""
)
def daily_create(
    request: DailyWritingCreate,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail={"message": "로그인이 필요합니다."})

    user_id = current_user.id

    # 내용 비어있는지 체크
    if request.content in (" ", "\n", None):
        raise HTTPException(status_code=400, detail={"message": "내용을 입력해 주세요."})

    # ------------------------
    # 1) clean-content 호출
    # ------------------------
    try:
        response = requests.post(
            f"{api_url}/app/clean-content",
            json={"content": request.content},
            timeout=10
        )
        response.raise_for_status()
        clean_contents = response.json().get("cleaned_content", request.content)
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] 외부 API 요청 실패: {e}")
        raise HTTPException(status_code=502, detail={"message": "외부 텍스트 분석 서버 연결 실패"})

    # ------------------------
    # 2) daily_writing 저장(DB)
    # ------------------------
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

    # ------------------------
    # 3) 문장 전체 분석(analyze-result)
    # ------------------------
    try:
        response = requests.post(
            f"{api_url}/app/analyze-result",
            json={
                "user_id": current_user.id,
                "cleaned_content": clean_contents
            },
            timeout=10
        )
        response.raise_for_status()
        new_output = response.json()

    except requests.exceptions.RequestException as e:
        print(f"[ERROR] 외부 API 요청 실패: {e}")
        raise HTTPException(status_code=502, detail={"message": "외부 문장 분석 서버 연결 실패"})
    # Outputs 저장
    db_output = Outputs(
        user_id=current_user.id,
        category="daily",
        content_id=writing.id,
        analysis_result=new_output["analysis_result"]
    )
    db.add(db_output)
    db.commit()
    db.refresh(db_output)
    # ------------------------
    # 4) 단어 분석(analyze-text)
    # ------------------------
    try:
        response = requests.post(
            f"{api_url}/app/analyze-text",
            json={
                "title": request.title,
                "content": request.content,
                "user_id": current_user.id
            },
            timeout=10
        )
        response.raise_for_status()
        response_data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] 외부 API 요청 실패: {e}")
        raise HTTPException(status_code=502, detail={"message": "외부 단어 분석 서버 연결 실패"})
    # UserWordUsage 저장
    db.add(UserWordUsage(
        user_id=current_user.id,
        content_id=writing.id,
        analysis_result=response_data["words_list"],
        category="daily"
    ))
    db.commit()
    db.refresh(writing)
    return writing


@router.patch(
    "/list/daily_writing/{list_id}",
    response_model=DailyWritingRead,
    summary="일기 수정",
    description="""
일기 내용을 수정합니다.

- content 변경 시 clean-content 재적용
- 변경 내용이 없으면 오류

### 요청 예시
```json
{
  "id": 11,
  "content": "강아지가 오늘 더 귀여웠다!"
}
"""
)
def daily_patch(list_id: int, request: DailyWritingUpdate, current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail={"message":"로그인이 필요합니다."})
    user_id = current_user.id
    writing = db.query(DailyWriting).filter(DailyWriting.id == list_id, DailyWriting.user_id == user_id).first()
    if not writing:
        raise HTTPException(404, "해당 일기는 존재하지 않습니다.")
    if writing.id != list_id:
        raise HTTPException(status_code=401, detail={"message": "잘못된 요청입니다."})
    if request.content in (" ", "\n", None):
        raise HTTPException(status_code=400, detail={"message": "내용을 입력해 주세요."})
    if writing.content != request.content:
        # ------------------------
        # content 수정될 경우 clean-content 호출
        # ------------------------
        try:
            response = requests.post(
                f"{api_url}/app/clean-content",
                json={"content": request.content},
                timeout=10
            )
            response.raise_for_status()
            clean_contents = response.json().get("cleaned_content", request.content)
            writing.cleaned_content = clean_contents
        except requests.exceptions.RequestException as e:
            print(f"[ERROR] 외부 API 요청 실패: {e}")
            raise HTTPException(status_code=502, detail={"message": "외부 텍스트 분석 서버 연결 실패"})
    db.commit()
    db.refresh(writing)
    return writing

@router.delete(
    "/list/daily_writing/{list_id}",
    summary="일기 삭제",
    description="특정 일기를 삭제합니다."
)
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
@router.get(
    "/list/reading_logs",
    response_model=ReadingLogListResponse,
    summary="독후감 목록 조회 (네이버 책 정보 포함)",
    description="""
독후감 목록을 최신순으로 조회합니다.

- 네이버 도서 검색 API 자동 호출
- 이미지 / 링크 / 설명 포함
- 페이징 지원
---
###응답 예시

```json
{
    "total": total, 
    "page": page, 
    "size": size, 
    "items": [
            {
            "id":1,
            "book_title":"강아지 풀",
            "author":"작가",
            "publisher":"출판사",
            "created_at":2025-11-25,
            "cleaned_content":"나는 강아지풀이 되고 싶어요.",
            "unknown_sentence":"강아지풀이 뭐에요?",
            "content":"나는 강아지풀이되고 싶어요.",
            "image":"https://images;w3w35/....",
            "link":"https://book.naver.com/bookdb/book_detail.nhn?bid=1234567890",
            "description":"이 책은 강아지 풀의 일대기를 담은 책으로...",
            },
    ]
}
"""
)
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
    word_usage = (
        db.query(UserWordUsage)
        .filter(
            UserWordUsage.user_id == current_user.id,
            UserWordUsage.category == "reading",
            UserWordUsage.content_id == log_id
        )
        .first()
    )
    words_list = word_usage.analysis_result if word_usage else []
    return ReadingLogWithBook(
        id=log.id,
        book_title=log.book_title,
        author=log.author,
        publisher=log.publisher,
        created_at=log.created_at,
        content=log.content,
        cleaned_content=log.cleaned_content,
        unknown_sentence=log.unknown_sentence,
        words_list=words_list,
        image=book_info.get("image") if book_info else None,
        link=book_info.get("link") if book_info else None,
        description=book_info.get("description") if book_info else None,
    )

@router.get(
    "/list/reading_logs/search",
    response_model=List[ReadingLogWithBook],
    summary="독후감 검색",
    description="책 제목(book_title)으로 독후감을 검색합니다."
)
def search_reading_log(words:str,db: Session = Depends(get_db),
                       current_user: Users = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail={"message":"로그인이 필요합니다."})
    return (db.query(ReadingLogs).filter(ReadingLogs.book_title.like(words))
            .filter(ReadingLogs.user_id==current_user.id).all())

@router.post(
    "/list/reading_logs",
    response_model=ReadingLogWithBook,
    summary="독후감 작성",
    description="""
새로운 독후감을 작성합니다.

기능:
- clean-content (텍스트 정제)
- analyze-sentiment (감정 분석)
- analyze-result (문장 분석)
- analyze-text (단어 분석)
- Outputs + UserWordUsage 자동 저장

### 요청 예시
```json
{
  "book_title": "해리포터",
  "author": "J.K. Rowling",
  "publisher": "문학수첩",
  "content": "정말 재미있는 책이었다!",
  "unknown_sentence": "해그리드가 뭐야?"
}
"""
)
def create_reading_log(request: ReadingLogCreate, current_user: Users = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail={"message":"로그인이 필요합니다."})
    user_id = current_user.id
    if request.content in (" ", "\n", None):
        raise HTTPException(status_code=400, detail={"message": "내용을 입력해 주세요."})
    if request.book_title in (" ", "\n", None):
        raise HTTPException(status_code=400, detail={"message": "책의 제목을 입력해 주세요."})
    # clean_contents=safe_spell_check(request.content)
    # API 호출 구문
    try:
        response = requests.post(
            f"{api_url}/app/clean-content",
            json={"content": request.content},  # 외부 API가 받는 형식에 맞게 전달
            timeout=10
        )
        response.raise_for_status()  # 응답 코드가 200이 아니면 예외 발생
        clean_contents = response.json().get("cleaned_content", request.content)
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] 외부 API 요청 실패: {e}")
        raise HTTPException(status_code=502, detail={"message": "외부 텍스트 분석 서버 연결 실패"})
    try:
        response = requests.post(
            f"{api_url}/app/analyze-sentiment",
            json={"book_title":request.book_title,
            "content": request.content},  # 외부 API가 받는 형식에 맞게 전달
            timeout=10
        )
        response.raise_for_status()  # 응답 코드가 200이 아니면 예외 발생
        sentiment_value = response.json().get("sentiment")
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] 외부 API 요청 실패: {e}")
        raise HTTPException(status_code=502, detail={"message": "외부 감정 분석 서버 연결 실패"})
    new_log = ReadingLogs(
        book_title=request.book_title,
        author=request.author,
        publisher=request.publisher,
        content=request.content,
        cleaned_content=clean_contents,
        unknown_sentence=request.unknown_sentence,
        user_id=user_id,
        created_at=datetime.now(),
        sentiment=sentiment_value,
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    try:
        response = requests.post(
            f"{api_url}/app/analyze-result",
            json={"user_id":user_id,"cleaned_content":clean_contents},  # 외부 API가 받는 형식에 맞게 전달
            timeout=10
        )
        response.raise_for_status()  # 응답 코드가 200이 아니면 예외 발생
        new_output = response.json()
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] 외부 API 요청 실패: {e}")
        raise HTTPException(status_code=502, detail={"message": "외부 문장 분석 서버 연결 실패"})
    db_output = Outputs(
        user_id=current_user.id,
        category="reading",
        content_id=new_log.id,
        analysis_result=new_output["analysis_result"]
    )
    db.add(db_output)
    db.commit()
    db.refresh(db_output)
    try:
        response = requests.post(
            f"{api_url}/app/analyze-text",
            json={"book_title":request.book_title,"content": request.content,"user_id":current_user.id},  # 외부 API가 받는 형식에 맞게 전달
            timeout=10
        )
        response.raise_for_status()  # 응답 코드가 200이 아니면 예외 발생
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] 외부 API 요청 실패: {e}")
        raise HTTPException(status_code=502, detail={"message": "외부 문장 분석 서버 연결 실패"})
    response_data = response.json()
    db.add(UserWordUsage(
        user_id=user_id,
        content_id=new_log.id,      # or daily_id
        analysis_result=response_data["words_list"],
        category="reading"          # 동일하게
    ))
    db.commit()
    db.refresh(new_log)
    return new_log


@router.patch(
    "/list/reading_logs/{log_id}",
    response_model=ReadingLogWithBook,
    summary="독후감 수정",
    description="독후감 내용을 수정합니다. 변경된 값만 반영됩니다."
)
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
    if request.content == log.content or request.content==" ":
        raise HTTPException(status_code=400, detail="수정된 내용이 없습니다!")
    if request.content and request.content != log.content:
        # ------------------------
        # content 수정될 경우 clean-content 호출
        # ------------------------
        try:
            response = requests.post(
                f"{api_url}/app/clean-content",
                json={"content": request.content},
                timeout=10
            )
            response.raise_for_status()
            clean_contents = response.json().get("cleaned_content", request.content)
            log.cleaned_content = clean_contents
        except requests.exceptions.RequestException as e:
            print(f"[ERROR] 외부 API 요청 실패: {e}")
            raise HTTPException(status_code=502, detail={"message": "외부 문장 분석 서버 연결 실패"})
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

@router.delete(
    "/list/reading_logs/{log_id}",
    summary="독후감 삭제",
    description="특정 독후감을 삭제합니다."
)
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


@router.get(
    "/wordsearch",
    summary="국립국어원 표준국어대사전 검색",
    description="""
표준국어대사전 검색 + 상세정보(예문, 유의어) 조회 API.

- search.do → 단어 목록 조회
- view.do → 상세 정보 조회
- 예문(example_info)
- 유의어(rel_info:type=유의어)

### 요청 예시
GET /activities/wordsearch?query=학교

bash
코드 복사

### 응답 예시
```json
{
  "results": [
    {
      "word": "학교",
      "definition": "지식을 가르치고 배우는 기관",
      "examples": ["나는 학교에 간다."],
      "similar_words": ["학원", "교육기관"]
    }
  ]
}
"""
)
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