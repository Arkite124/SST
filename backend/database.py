import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

# PostgreSQL 연결 설정

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# SQLAlchemy 엔진 생성
engine = create_engine(DATABASE_URL, echo=True)

def init_db():
    return engine

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_words(db : Session = None) -> list[str]:
    """DB에서 단어 목록 가져오기"""
    if db is None:
        db = SessionLocal()
        should_close = True
    else:
        should_close = False

    try:
        result = db.execute(text("SELECT word FROM voca_labels WHERE LENGTH(word) >= 2"))
        words = [row[0] for row in result.fetchall()]
        return words
    except Exception as e:
        print(f"⚠️ DB 단어 로드 실패: {e}")
        return []
    finally:
        if should_close:
            db.close()

# 세션 생성
engine = init_db()
SessionLocal = sessionmaker(bind=engine)
