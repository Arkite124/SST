from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.routes.admin.admin_dashboard import get_db, get_current_admin
from models import ReadingLogs, DailyWritings, ReadingForumPosts, Users, ParentForumPosts
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/admin/users/posts", tags=["Admin User Posts"])
# -------------------------------
# 📘 검색 결과 Response Schema
# -------------------------------
class AdminUserSearchResult(BaseModel):
    id: int
    nickname: str
    email: Optional[str]

    class Config:
        from_attributes = True


# -------------------------------
# 📘 관리자용 닉네임 검색 기능
# -------------------------------
@router.get("/search", response_model=List[AdminUserSearchResult])
def search_user_by_nickname(
    nickname: str,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    if not current_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")

    # 부분 검색 (LIKE)
    results = (
        db.query(Users)
        .filter(Users.nickname.ilike(f"%{nickname}%"))
        .all()
    )

    if not results:
        return []  # 빈 배열 반환

    return results

# -------------------------------
# 📘 공통 Response Schema
# -------------------------------
class AdminPostItem(BaseModel):
    id: int
    user_id: int
    category: str
    title: Optional[str]
    content: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# -------------------------------
# 📘 특정 유저의 전체 글 가져오기
# -------------------------------
@router.get("/{user_id}", response_model=List[AdminPostItem])
def get_user_posts(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    if not current_admin:
        raise HTTPException(403, "권한이 없습니다.")

    # 유저 존재 여부 확인
    user = db.query(Users).filter(Users.id == user_id).first()
    if not user:
        raise HTTPException(404, "존재하지 않는 사용자입니다.")

    results = []

    # ---------------------- ReadingLogs ----------------------
    logs = db.query(ReadingLogs).filter(ReadingLogs.user_id == user_id).all()
    for log in logs:
        results.append(
            AdminPostItem(
                id=log.id,
                user_id=user_id,
                category="reading_logs",
                title=log.book_title,
                content=log.content,
                created_at=log.created_at
            )
        )

    # ---------------------- DailyWriting ----------------------
    writings = db.query(DailyWritings).filter(DailyWritings.user_id == user_id).all()
    for w in writings:
        results.append(
            AdminPostItem(
                id=w.id,
                user_id=user_id,
                category="daily_writings",
                title=w.title,
                content=w.content,
                created_at=w.created_at
            )
        )

    # ---------------------- Forum Posts ----------------------
    reading_posts = db.query(ReadingForumPosts).filter(ReadingForumPosts.user_id == user_id).all()
    for rp in reading_posts:
        results.append(
            AdminPostItem(
                id=rp.id,
                user_id=user_id,
                category="reading_forum_posts",
                title=rp.title,
                content=rp.content,
                created_at=rp.created_at
            )
        )
    parent_posts = db.query(ParentForumPosts).filter(ParentForumPosts.user_id == user_id).all()
    for pp in parent_posts:
        results.append(
            AdminPostItem(
                id=pp.id,
                user_id=user_id,
                category="parent_forum_posts",
                title=pp.title,
                content=pp.content,
                created_at=pp.created_at
            )
        )

    # 최신순 정렬
    results.sort(key=lambda x: x.created_at, reverse=True)
    return results


# -------------------------------
# 📘 관리자 글 삭제 기능
# -------------------------------
@router.delete("/{category}/{post_id}", response_model=dict)
def admin_delete_post(
    category: str,
    post_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    if not current_admin:
        raise HTTPException(403, "권한이 없습니다.")

    model_map = {
        "reading_logs": ReadingLogs,
        "daily_writings": DailyWritings,
        "reading_forum_posts": ReadingForumPosts,
        "parent_forum_posts": ParentForumPosts,
    }

    if category not in model_map:
        raise HTTPException(400, "잘못된 category 값입니다.")

    model = model_map[category]

    post = db.query(model).filter(model.id == post_id).first()
    if not post:
        raise HTTPException(404, "게시글을 찾을 수 없습니다.")

    db.delete(post)
    db.commit()

    return {"message": "게시글이 삭제되었습니다.", "post_id": post_id, "category": category}
