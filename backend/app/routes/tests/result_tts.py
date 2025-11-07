from sqlalchemy.orm import Session
import uuid,os

from starlette.responses import FileResponse

from app.routes.login.login import get_current_user
from data.postgresDB import SessionLocal
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from MeloTTS.melo.api import TTS
from models import Users, UserTests

# 적응형 평가 결과 (React 시각화용)
# melo TTS 초기화 (한 번만 로드)
try:
    tts_engine = TTS(language='KR')
    TTS_AVAILABLE = True
except Exception as e:
    print(f"⚠️ TTS 로드 실패: {e}")
    TTS_AVAILABLE = False


router=APIRouter()
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
DEFAULT_VOCABULARY_AGE=4

@router.get("/result/{user_id}")
async def get_test_result(
    user: Users = Depends(get_current_user),
    test_type: str = Query("vocab", enum=["vocab", "reading"]),
    db: Session = Depends(get_db)
):
    if not user:
        return {
            "message": "사용자를 찾을 수 없습니다.",
            "ages": [],
            "accuracy": [],
            "question_nums": [],
            "difficulty_levels": []
        }

    # DB에서 기록 가져오기
    query = db.query(UserTests).filter(UserTests.user_id == user.id)
    if test_type == "reading":
        query = query.filter(UserTests.test_type == "reading")
    history = query.order_by(UserTests.taken_at).all()

    if not history:
        return {
            "message": "아직 평가 기록이 없습니다.",
            "ages": [],
            "accuracy": [],
            "question_nums": [],
            "difficulty_levels": []
        }

    # 나이별 정확도 계산
    age_stats = {}
    for record in history:
        age = record.questions[0].get('age_level') if record.questions else 4

        if age not in age_stats:
            age_stats[age] = {'correct': 0, 'total': 0}

        age_stats[age]['total'] += 1
        if record.total_score > 0:
            age_stats[age]['correct'] += 1

    ages = sorted(age_stats.keys())
    accuracy = [
        round(age_stats[age]['correct'] / age_stats[age]['total'] * 100, 1)
        for age in ages
    ]

    question_nums = list(range(1, len(history) + 1))
    difficulty_levels = [
        record.questions[0].get('age_level') if record.questions else 4
        for record in history
    ]

    return {
        "current_vocabulary_age": user.vocabulary_age or DEFAULT_VOCABULARY_AGE,
        "ages": ages,
        "accuracy": accuracy,
        "question_nums": question_nums,
        "difficulty_levels": difficulty_levels,
        "total_questions": len(history)
    }

@router.get("/tts")
def tts(text: str = Query(...), unit: str = Query("word"), background_tasks: BackgroundTasks = None):
    if not TTS_AVAILABLE:
        raise HTTPException(status_code=503, detail="TTS 엔진 사용 불가")

    if not text:
        return {"error": "text query required"}

    # 임시 mp3 파일 경로
    filename = f"temp_{uuid.uuid4().hex}.mp3"

    # 음성 파일 생성
    try:
        tts_engine.tts_to_file(text, speaker_id=0, output_path=filename)
    except Exception as e:
        return {"error": f"TTS 변환 실패: {str(e)}"}

    # 파일 전송 후 삭제하도록 백그라운드 태스크 추가
    def cleanup():
        try:
            if os.path.exists(filename):
                os.remove(filename)
                print(f"✓ 임시 파일 삭제: {filename}")
        except Exception as e:
            print(f"⚠ 파일 삭제 실패: {e}")

    if background_tasks:
        background_tasks.add_task(cleanup)

    # mp3 파일 반환
    return FileResponse(
        filename,
        media_type="audio/mpeg",
        filename=f"tts_{unit}.mp3",
        background=background_tasks
    )
