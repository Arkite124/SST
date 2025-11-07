from backend.Ai.ai_common.clean_contents import safe_spell_check
from backend.Ai.ai_words_logic.word_analyze import extract_tokens
from backend.Ai.ai_words_logic.word_dictionary import get_best_definition, get_sentence_for_word
from backend.data.postgresDB import SessionLocal
from typing import Callable
from fastapi import APIRouter, Depends
from backend.models import DailyWritings, ReadingLogs
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session


def get_sentence_router(similar_fn: Callable, model: SentenceTransformer):
    router = APIRouter()

    # DB 세션 종속성
    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    @router.get("/daily-ml")
    def sentence_ml(content_id: int = 1, db: Session = Depends(get_db)):
        writing = db.query(DailyWritings).filter(DailyWritings.id == content_id).first()
        if not writing:
            return {"error": "Content not found"}

        # 정제된 내용 확보
        cleaned_content = writing.cleaned_content or safe_spell_check(writing.content)

        # 주요 파라미터
        top_n = 5         # 많이 쓴 단어 5개
        topk_similar = 5  # 유사어 5개

        # 단어 분석
        analysis = extract_tokens(cleaned_content)
        combined_counter = analysis["counter_nouns"] + analysis["counter_verbs"] + analysis["counter_adjective"]
        top_words = combined_counter.most_common(top_n)

        words_list = []

        for word, freq in top_words:
            # 해당 단어가 포함된 문장 추출
            sentence = get_sentence_for_word(cleaned_content, word)

            # 원 단어 정의 추출 (리스트 형태 인자 전달)
            defs = get_best_definition([(sentence, word)], model, threshold=0.25)
            if defs and defs[0]:
                definition, score = defs[0]
            else:
                definition, score = None, 0.0

            # 유사어 정의도 함께 수집
            similar_words = []
            if similar_fn:
                try:
                    sim_candidates = similar_fn(word, topk=topk_similar)
                    for w, s in sim_candidates:
                        if s >= 0.6:  # 최소 유사도 기준
                            sim_sentence = get_sentence_for_word(cleaned_content, w)
                            sim_defs = get_best_definition([(sim_sentence, w)], model, threshold=0.25)
                            if sim_defs and sim_defs[0]:
                                sim_def, sim_score = sim_defs[0]
                            else:
                                sim_def, sim_score = None, 0.0

                            similar_words.append({
                                "word": w,
                                "score": round(s, 4),
                                "definition": sim_def,
                                "definition_score": round(sim_score, 3)
                            })
                except Exception as e:
                    similar_words.append({"error": f"유사어 검색 오류: {str(e)}"})

            words_list.append({
                "base_word": word,
                "freq": freq,
                "definition": definition,
                "definition_score": round(score, 3),
                "similar_words": similar_words
            })

        return {
            "id": content_id,
            "title": writing.title,
            "content": writing.content,
            "cleaned_content": cleaned_content,
            "words_list": words_list
        }


    @router.get("/readlog-ml")
    def sentence_ml(readingLog_id: int = 1, db: Session = Depends(get_db)):
        writing = db.query(ReadingLogs).filter(ReadingLogs.id == readingLog_id).first()
        if not writing:
            return {"error": "Content not found"}

        # 정제된 내용 확보
        cleaned_content = writing.cleaned_content or safe_spell_check(writing.content)

        # 주요 파라미터
        top_n = 5         # 많이 쓴 단어 5개
        topk_similar = 5  # 유사어 5개

        # 단어 분석
        analysis = extract_tokens(cleaned_content)
        combined_counter = analysis["counter_nouns"] + analysis["counter_verbs"] + analysis["counter_adjective"]
        top_words = combined_counter.most_common(top_n)

        words_list = []

        for word, freq in top_words:
            # 해당 단어가 포함된 문장 추출
            sentence = get_sentence_for_word(cleaned_content, word)

            # 원 단어 정의 추출 (리스트 형태 인자 전달)
            defs = get_best_definition([(sentence, word)], model, threshold=0.25)
            if defs and defs[0]:
                definition, score = defs[0]
            else:
                definition, score = None, 0.0

            # 유사어 정의도 함께 수집
            similar_words = []
            if similar_fn:
                try:
                    sim_candidates = similar_fn(word, topk=topk_similar)
                    for w, s in sim_candidates:
                        if s >= 0.6:  # 최소 유사도 기준
                            sim_sentence = get_sentence_for_word(cleaned_content, w)
                            sim_defs = get_best_definition([(sim_sentence, w)], model, threshold=0.25)
                            if sim_defs and sim_defs[0]:
                                sim_def, sim_score = sim_defs[0]
                            else:
                                sim_def, sim_score = None, 0.0

                            similar_words.append({
                                "word": w,
                                "score": round(s, 4),
                                "definition": sim_def,
                                "definition_score": round(sim_score, 3)
                            })
                except Exception as e:
                    similar_words.append({"error": f"유사어 검색 오류: {str(e)}"})

            words_list.append({
                "base_word": word,
                "freq": freq,
                "definition": definition,
                "definition_score": round(score, 3),
                "similar_words": similar_words
            })

        return {
            "id": readingLog_id,
            "book_title": writing.book_title,
            "content": writing.content,
            "cleaned_content": cleaned_content,
            "words_list": words_list
        }

    @router.get("/unknown-sentence-ml")
    def sentence_ml(readingLog_id: int = 1, db: Session = Depends(get_db)):
        writing = db.query(ReadingLogs).filter(ReadingLogs.id == readingLog_id).first()
        if not writing:
            return {"error": "Content not found"}

        # 정제된 '모르는 문장' 데이터 확보
        cleaned_content = safe_spell_check(writing.unknown_sentence)

        # 주요 파라미터
        top_n = 3  # 많이 쓴 단어 5개
        topk_similar = 5  # 유사어 5개

        # 단어 분석
        analysis = extract_tokens(cleaned_content)
        combined_counter = analysis["counter_nouns"] + analysis["counter_verbs"] + analysis["counter_adjective"]
        top_words = combined_counter.most_common(top_n)

        words_list = []

        for word, freq in top_words:
            # 해당 단어가 포함된 문장 추출
            sentence = get_sentence_for_word(cleaned_content, word)

            # 원 단어 정의 추출 (리스트 형태 인자 전달)
            defs = get_best_definition([(sentence, word)], model, threshold=0.25)
            if defs and defs[0]:
                definition, score = defs[0]
            else:
                definition, score = None, 0.0

            # 유사어 정의도 함께 수집
            similar_words = []
            if similar_fn:
                try:
                    sim_candidates = similar_fn(word, topk=topk_similar)
                    for w, s in sim_candidates:
                        if s >= 0.6:  # 최소 유사도 기준
                            sim_sentence = get_sentence_for_word(cleaned_content, w)
                            sim_defs = get_best_definition([(sim_sentence, w)], model, threshold=0.25)
                            if sim_defs and sim_defs[0]:
                                sim_def, sim_score = sim_defs[0]
                            else:
                                sim_def, sim_score = None, 0.0

                            similar_words.append({
                                "word": w,
                                "score": round(s, 4),
                                "definition": sim_def,
                                "definition_score": round(sim_score, 3)
                            })
                except Exception as e:
                    similar_words.append({"error": f"유사어 검색 오류: {str(e)}"})

            words_list.append({
                "base_word": word,
                "freq": freq,
                "definition": definition,
                "definition_score": round(score, 3),
                "similar_words": similar_words
            })

        return {
            "id": readingLog_id,
            "book_title": writing.book_title,
            "content": writing.unknown_sentence,
            "cleaned_unknown_sentence": cleaned_content,
            "words_list": words_list
        }

    return router

