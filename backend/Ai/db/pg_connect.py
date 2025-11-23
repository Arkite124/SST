from pathlib import Path
import sys

from db.postgresDB import SessionLocal

current_dir = Path(__file__).resolve().parent
models_dir = current_dir.parent.parent  # ../../
sys.path.append(str(models_dir))


from pathlib import Path
import sys
import os
import uuid
from dotenv import load_dotenv
from datetime import datetime

import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from db.models import SimilarWords, ReadingLogs


# from ai_common.clean_contents import safe_spell_check
# from ai_words_logic.word_analyze import extract_tokens
# from db.models import SimilarWords, DailyWritings, UserWordUsage, Outputs, ReadingLogs  # Outputs 추가

current_dir = Path(__file__).resolve().parent
models_dir = current_dir.parent.parent  # ../../
sys.path.append(str(models_dir))

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")

if not DB_URL:
    raise ValueError("❌ DATABASE_URL 환경변수가 설정되어 있지 않습니다. .env 파일을 확인하세요.")

engine = create_engine(DB_URL, echo=False, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_session():
    """SessionLocal 인스턴스를 반환 (원격 DB 연결)"""
    return SessionLocal()

# ============================
# similar_words 추출 (모델 학습용)
# ============================
def extract_similar_words():
    with get_session() as db:
        rows = db.query(SimilarWords).all()
        data = []
        for row in rows:
            sims = row.similar_words if row.similar_words else []
            data.append({
                "base_word": row.base_word,
                "similar_words": sims
            })
        df = pd.DataFrame(data)
        return df



# ============================
# 글 정제
# ============================
def make_clean_content_orm(user_id: int, content_id: int):
    with get_session() as db:
        writing = db.query(DailyWritings).filter(
            DailyWritings.id == content_id,
            DailyWritings.user_id == user_id
        ).first()
        if not writing:
            print(f"user_id={user_id}, content_id={content_id} 글이 없습니다.")
            return

        clean_text = safe_spell_check(writing.content)
        writing.cleaned_content = clean_text
        db.commit()
        db.refresh(writing)
        print("cleaned_content 업데이트 완료.")
        return writing.cleaned_content

# ============================
# 분석 후 Outputs + UserWordUsage 저장
# ============================
def analyze_and_store_orm(content_id: int) -> str:
    with get_session() as db:
        writing = db.query(DailyWritings).filter(
            DailyWritings.id == content_id
        ).first()
        if not writing:
            raise ValueError(f"content_id={content_id} 글이 없습니다.")

        text = writing.cleaned_content or writing.content
        analysis = extract_tokens(text)
        user_id = writing.user_id

        outputs_id = str(uuid.uuid4())
        output = Outputs(
            outputs_id=outputs_id,
            user_id=user_id,
            content_id=content_id,
            analysis_result={
                "avg_sentence_len": analysis["avg_sentence_len"], #문장길이
                "ttr": analysis["ttr"], #어휘 다양성
                "repeat_desc": analysis["repeat_desc"] #반복도
            },
            timestamp=datetime.now()
        )
        db.add(output)
        db.flush()

        counter_target = {**analysis["counter_nouns"], **analysis["counter_verbs"]}
        for word in counter_target.keys():
            usage = UserWordUsage(
                outputs_id=outputs_id,
                user_id=user_id,
                content_id=content_id,
                word=word,
                category='daily'
            )
            db.add(usage)

        db.commit()
        print("Outputs + UserWordUsage 저장 완료.")
        return outputs_id

#==========================
# user_id인 책 제목과 저자 가져오기
#==========================
def get_book_titles(user_id: int) -> list[tuple[str, str, str]]:
    with get_session() as db:
        result = (
            db.query(ReadingLogs.book_title, ReadingLogs.author, ReadingLogs.sentiment)
            .filter(ReadingLogs.user_id == user_id)
            .order_by(ReadingLogs.created_at.desc())
            .all()
        )
    return result  # (title, author, sentiment) 그대로 반환



def get_book_titles_and_content(user_id: int) -> list[tuple[str, str]]:
    """
    사용자 ID 기준으로 읽은 책 제목과 감상문(content) 반환
    반환 형식: [(title1, content1), (title2, content2), ...]
    """
    with get_session() as db:  # context manager로 세션 가져오기
        result = (
            db.query(ReadingLogs.book_title, ReadingLogs.author, ReadingLogs.content)
            .filter(ReadingLogs.user_id == user_id)
            .order_by(ReadingLogs.created_at.desc())  # 최신순 정렬
            .all()
        )
    # 결과 그대로 튜플 리스트로 반환
    return result



def get_readinlog_sentiment(id: int) -> list[tuple[str, str]]:
    """
    사용자 ID 기준으로 읽은 책 제목과 감상문(content) 반환
    반환 형식: [(title1, content1), (title2, content2), ...]
    """
    with get_session() as db:  # context manager로 세션 가져오기
        result = (
            db.query(ReadingLogs.sentiment)
            .filter(ReadingLogs.id == id)
        )
    # 결과 그대로 튜플 리스트로 반환
    return result




# ============================
# Main 실행 예시
# ============================
def main():
    user_id = 1
    content_id = 1

    # 1) 글 정제
    make_clean_content_orm(user_id, content_id)

    # 2) 분석 후 저장
    analyze_and_store_orm(user_id, content_id)
