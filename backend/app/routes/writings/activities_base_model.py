from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ---------------------------
# ✅ Pydantic Schemas
# ---------------------------
#전체 리스트를 가져오기 위한 BaseModel
class ActivityItem(BaseModel):
    id: int
    title: Optional[str] = None
    text: Optional[str] = None
    created_at: datetime
    category: str

    class Config:
        from_attributes = True

class DailyWritingBase(BaseModel):
    id: Optional[int] = None
    title: str
    content: str
    mood:int
    words_list: Optional[List[dict]] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.now)  # 없을시 현재 시각 자동 입력
    attachment_url: Optional[str] = None
    cleaned_content: Optional[str] = None

class DailyWritingCreate(BaseModel):
    title: str
    content: str
    mood: int
    created_at: Optional[datetime] = Field(default_factory=datetime.now)  # 없을시 현재 시각 자동 입력
    attachment_url: Optional[str] = None
    cleaned_content: Optional[str] = None
    mood: Optional[int] = None

class DailyWritingUpdate(BaseModel):
    id: Optional[int] = None
    title: Optional[str] = None
    content: Optional[str] = None
    mood: Optional[int] = None

class DailyWritingRead(DailyWritingBase):
    id: int

    class Config:
        from_attributes = True

class DailyWritingListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[DailyWritingRead]
    class Config:
        from_attributes = True

class ReadingLogBase(BaseModel):
    book_title: str                    # nullable=False
    author: Optional[str] = None        # nullable=True
    publisher: Optional[str] = None     # nullable=True
    content: Optional[str] = None       # nullable=True
    cleaned_content: Optional[str] = None  # nullable=True
    sentiment: Optional[str] = None        # nullable=True
    unknown_sentence: Optional[str] = None # nullable=True
    image: Optional[str] = None        # ✅ Optional
    link: Optional[str] = None         # ✅ Optional
    description: Optional[str] = None  # ✅ Optional

class ReadingLogCreate(ReadingLogBase):
    pass

class ReadingLogUpdate(BaseModel):
    book_title: Optional[str] = None
    author: Optional[str] = None
    publisher: Optional[str] = None
    content: Optional[str] = None
    cleaned_content: Optional[str] = None
    sentiment: Optional[str] = None
    unknown_sentence: Optional[str] = None

class ReadingLogWithBook(BaseModel):
    id: int
    book_title: str
    author: Optional[str]
    publisher: Optional[str]
    created_at: datetime
    content: Optional[str]
    cleaned_content: Optional[str] = None  # nullable=True
    sentiment: Optional[str] = None        # nullable=True
    unknown_sentence: Optional[str] = None # nullable=True
    words_list: Optional[List[dict]] = None# nullable=True, 단어 리스트들
    # 네이버 API 데이터
    image: Optional[str] = None
    link: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True

class ReadingLogListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[ReadingLogWithBook]
    class Config:
        from_attributes = True