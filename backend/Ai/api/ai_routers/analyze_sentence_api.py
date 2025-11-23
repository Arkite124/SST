from ai_common.clean_contents import safe_spell_check
from ai_words_logic.word_analyze import extract_tokens
from ai_words_logic.word_dictionary import get_best_definition, get_sentence_for_word
from db.postgresDB import SessionLocal
from typing import Callable
from fastapi import APIRouter, Depends
from db.models import DailyWritings, ReadingLogs
from pydantic import BaseModel
from typing import Callable, Optional
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session


def get_sentence_router(similar_fn: Callable, model: SentenceTransformer):
    router = APIRouter()

    # 선택적 외부 JSON 요청 Body
    class AnalyzeRequest(BaseModel):
        content: str
        user_id: Optional[int] = None
        title: Optional[str] = None
        book_title: Optional[str] = None
        # 단어 분석 공통 함수

    def analyze_text(content: str, top_n=5, topk_similar=3):
        cleaned_content = safe_spell_check(content)
        analysis = extract_tokens(cleaned_content)
        combined_counter = analysis["counter_nouns"] + analysis["counter_verbs"] + analysis["counter_adjectives"]
        top_words = combined_counter.most_common(top_n)

        words_list = []
        for word, freq in top_words:
            sentence = get_sentence_for_word(cleaned_content, word)
            defs = get_best_definition([(sentence, word)], model, threshold=0.25)
            definition, score = defs[0] if defs and defs[0] else (None, 0.0)

            similar_words = []
            if similar_fn:
                try:
                    sim_candidates = similar_fn(word, topk=topk_similar)
                    for w, s in sim_candidates:
                        if s >= 0.6:
                            sim_sentence = get_sentence_for_word(cleaned_content, w)
                            sim_defs = get_best_definition([(sim_sentence, w)], model, threshold=0.25)
                            sim_def, sim_score = sim_defs[0] if sim_defs and sim_defs[0] else (None, 0.0)
                            similar_words.append({
                                "word": w,
                                "score": round(s, 4),
                                "definition": sim_def,
                                "definition_score": round(sim_score, 3)
                            })
                except Exception as e:
                    similar_words.append({"error": str(e)})

            words_list.append({
                "base_word": word,
                "freq": freq,
                "definition": definition,
                "definition_score": round(score, 3),
                "similar_words": similar_words
            })

        return {"cleaned_content": cleaned_content, "words_list": words_list}

        # 외부 JSON POST API

    @router.post("/analyze-text")
    def analyze_external(request: AnalyzeRequest):
        result = analyze_text(request.content)
        return {
            "user_id": request.user_id,
            "content": request.content,
            **result
        }

    return router

