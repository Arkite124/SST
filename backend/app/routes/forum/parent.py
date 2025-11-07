from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import aliased,joinedload
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.routes.forum.student import ReadingForumPostRead
from app.routes.login.login import profile_data, get_current_user
from data.postgresDB import SessionLocal
from models import ParentForumPosts as ParentForumPost, Users
from pydantic import BaseModel, Field
from dotenv import load_dotenv
load_dotenv()  # .env 파일 자동 로드

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class UserNickname(BaseModel):
    id:int
    nickname: str

    class Config:
        from_attributes = True

# ✅ 글 생성 요청용
class ParentForumPostCreate(BaseModel):
    user_id: int
    parent_id: Optional[int] = None
    title: str
    content: str
    category: Optional[str] = None
    is_important: Optional[bool] = False

# ✅ 글 수정 요청용
class ParentForumPostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    is_important: Optional[bool] = None

# ✅ 글 조회 응답용 (User 정보까지 포함)
class ParentForumPostRead(BaseModel):
    id: int
    parent_id: Optional[int] = None
    title: str
    content: str
    category: Optional[str]
    is_important: bool
    created_at: datetime
    updated_at: datetime
    children: List["ParentForumPostRead"] = Field(default_factory=list)  # ✅ 안전한 기본값
    user: UserNickname
    comment_count: int = 0

    class Config:
        from_attributes = True

# ForwardRef 갱신
ParentForumPostRead.model_rebuild()

@router.get("/posts", response_model=list[ParentForumPostRead])
def get_posts(
    category:Optional[str] = None,
    page: int = Query(1, ge=1, description="페이지 번호"),
    size: int = Query(10, ge=1, le=20, description="한 페이지당 게시글 수"),
    db: Session = Depends(get_db)
):
    offset = (page - 1) * size
    comment = aliased(ParentForumPost)

    subq = (
        db.query(
            ParentForumPost.id.label("post_id"),
            func.count(comment.id).label("comment_count")
        )
        .outerjoin(comment, comment.parent_id == ParentForumPost.id)
        .filter(ParentForumPost.parent_id == None)
        .group_by(ParentForumPost.id)
        .subquery()
    )

    query = (
        db.query(ParentForumPost, subq.c.comment_count)
        .join(subq, subq.c.post_id == ParentForumPost.id)
        # 🔥 수정된 where 절
        .filter(ParentForumPost.parent_id == None)  # 부모 글만 가져오기
        .filter(ParentForumPost.category == category if category else True)  # 카테고리 조건이 있으면 적용
        .options(joinedload(ParentForumPost.user))  # ✅ 유저 닉네임 미리 로딩
        .order_by(ParentForumPost.created_at.desc())
        .offset(offset)
        .limit(size)
    )

    results = query.all()

    response = []
    for post, comment_count in results:
        response.append(
            ParentForumPostRead(
                id=post.id,
                title=post.title,
                parent_id=post.parent_id,
                content=post.content,
                category=post.category,
                is_important=post.is_important,
                created_at=post.created_at,
                updated_at=post.updated_at,
                comment_count=comment_count,
                user=post.user   # ✅ UserNickname 모델로 자동 직렬화
            )
        )
    return response

@router.get("/posts/{post_id}",response_model=ParentForumPostRead)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(ParentForumPost).filter(ParentForumPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail={"성공여부":False,"이유":"존재하지 않는 게시물입니다."})
    return post
@router.get("/posts/search",response_model=list[ReadingForumPostRead])
def search_parents_posts(word: str, db: Session = Depends(get_db)):
    posts_title = db.query(ParentForumPost).filter(ParentForumPost.title.contains(word)).filter(ParentForumPost.parent_id is None).all()
    posts_contents=db.query(ParentForumPost).filter(ParentForumPost.content.contains(word)).filter(ParentForumPost.parent_id is None).all()
    results=posts_title + posts_contents
    results.sort(key=lambda r: r.created_at, reverse=True)
    # 결과 합치기 (중복 제거 필요하면 set 사용)
    result = posts_title + posts_contents
    # created_at 기준 최신순 정렬
    result.sort(key=lambda x: x.created_at, reverse=True)
    # id기준 중복 제거
    unique_result = {item.id: item for item in result}.values()
    return sorted(unique_result, key=lambda x: x.created_at, reverse=True)

@router.post("/posts", response_model=ParentForumPostCreate)
def create_post(
    request: ParentForumPostCreate,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not user:
        raise HTTPException(status_code=401,detail={"message":"사용 권한이 없습니다."})
    new_post = ParentForumPost(
        user_id=user.id,
        title=request.title,
        content=request.content,
        category=request.category,
        is_important=request.is_important,
        parent_id=request.parent_id
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

@router.patch("/posts/{post_id}", response_model=ParentForumPostUpdate)
def update_post(
    request: ParentForumPostUpdate,
    post_id: int,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id=user.id
    post = db.query(ParentForumPost).filter(ParentForumPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail={"성공여부": False, "이유": "존재하지 않는 게시물입니다."})
    updated = False
    if not user_id == post.user_id:
        raise HTTPException(status_code=401,detail="다른유저의 게시글 편집 금지")
    if request.title is not None:
        post.title = request.title
        updated = True
    if request.content is not None:
        post.content = request.content
        updated = True
    if request.category is not None:
        post.category = request.category
        updated = True
    if request.is_important is not None:
        post.is_important = request.is_important
        updated = True

    if updated:
        post.updated_at = datetime.now()
        db.commit()
        db.refresh(post)
        return post
    return {"로그": "수정될 것이 없거나 실패했습니다."}

# ✅ 댓글 생성
@router.post("/comments", response_model=ParentForumPostRead)
def create_comment(
    parent_id: int,   # 어떤 부모글의 댓글인지
    request: ParentForumPostCreate,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id=user.id
    parent_post = db.query(ParentForumPost).filter(ParentForumPost.id == parent_id).first()
    if not parent_post:
        raise HTTPException(status_code=404, detail="부모글이 존재하지 않습니다.")
    if not request.user_id==user_id:
        raise HTTPException(status_code=401,detail="유저 확인 바랍니다.")
    new_comment = ParentForumPost(
        user_id=request.user_id,
        title=request.title,          # 댓글도 제목 가능하게
        content=request.content,
        parent_id=parent_id,          # ✅ 부모글 ID 연결
        category=parent_post.category # 부모글 카테고리 따라감
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment


# ✅ 특정 부모글의 댓글 리스트 조회
@router.get("/comments/{parent_id}", response_model=list[ParentForumPostRead])
def get_comments(
    parent_id: int,
    db: Session = Depends(get_db)
):
    comments = (
        db.query(ParentForumPost)
        .filter(ParentForumPost.parent_id == parent_id)
        .order_by(ParentForumPost.created_at.asc())
        .all()
    )
    return comments

# ✅ 댓글 수정
@router.patch("/comments/{comment_id}", response_model=ParentForumPostUpdate)
def update_comment(
    comment_id: int,
    request: ParentForumPostUpdate,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = db.query(ParentForumPost).filter(ParentForumPost.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="존재하지 않는 댓글입니다.")
    if not user.id==request.user_id:
        raise HTTPException(status_code=401,detail="잘못된 접근입니다.")
    if request.content:
        comment.content = request.content
        comment.updated_at = datetime.now()

    db.commit()
    db.refresh(comment)
    return comment

# ✅ 댓글 삭제
@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = db.query(ParentForumPost).filter(ParentForumPost.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="존재하지 않는 댓글입니다.")
    if not user.id==comment.user_id:
        raise HTTPException(status_code=401,detail="잘못된 접근입니다.")
    db.delete(comment)
    db.commit()
    return {"성공여부": True}
@router.delete("/posts/{list_id}")
def delete_post(
    list_id: int,
    user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(ParentForumPost).filter(ParentForumPost.id == list_id).first()
    if not post:
        raise HTTPException(status_code=404, detail={"성공여부":False,"이유":"존재하지 않는 게시물입니다."})
    if not user.id==post.user_id:
        raise HTTPException(status_code=401,detail="잘못된 접근입니다.")
    db.delete(post)
    db.commit()
    return {"성공여부": True}