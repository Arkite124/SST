import uuid
from datetime import datetime
from typing import Callable, Optional

from db.postgresDB import get_session
from db.models import DailyWritings, Outputs, UserWordUsage
from ai_common.clean_contents import safe_spell_check
from ai_words_logic.word_analyze import extract_tokens
from ai_words_logic.word_dictionary import get_best_definition, get_sentence_for_word
from sentence_transformers import SentenceTransformer


def analyze_and_store_full(
    content_id: int,
    similar_fn: Optional[Callable] = None,
    model: Optional[SentenceTransformer] = None,
    top_n: int = 5,
    topk_similar: int = 3
):
    """
    글 정제 + 단어 분석 + Outputs 저장 + UserWordUsage 저장
    분석 결과를 Outputs.analysis_result에 JSON 형태로 저장
    """
    with get_session() as db:
        # 1️⃣ 글 가져오기
        writing = db.query(DailyWritings).filter(DailyWritings.id == content_id).first()
        if not writing:
            raise ValueError(f"content_id={content_id} 글이 없습니다.")

        # 2️⃣ 글 정제
        clean_text = safe_spell_check(writing.content)
        writing.cleaned_content = clean_text
        db.commit()
        db.refresh(writing)

        # 3️⃣ 토큰 분석
        analysis = extract_tokens(clean_text)
        combined_counter = analysis["counter_nouns"] + analysis["counter_verbs"] + analysis["counter_adjectives"]
        top_words = combined_counter.most_common(top_n)

        words_list = []
        for word, freq in top_words:
            sentence = get_sentence_for_word(clean_text, word)
            defs = get_best_definition([(sentence, word)], model, threshold=0.25) if model else []
            definition, score = defs[0] if defs and defs[0] else (None, 0.0)

            # 4️⃣ 유사 단어 분석
            similar_words = []
            if similar_fn:
                try:
                    sim_candidates = similar_fn(word, topk=topk_similar)
                    for w, s in sim_candidates:
                        if s >= 0.6:
                            sim_sentence = get_sentence_for_word(clean_text, w)
                            sim_defs = get_best_definition([(sim_sentence, w)], model, threshold=0.25) if model else []
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

        # 5️⃣ Outputs 저장 (JSON 형태)
        outputs_id = str(uuid.uuid4())
        output = Outputs(
            outputs_id=outputs_id,
            user_id=writing.user_id,
            content_id=content_id,
            analysis_result={
                "summary": {
                    "avg_sentence_len": analysis["avg_sentence_len"],
                    "ttr": analysis["ttr"],
                    "repeat_desc": analysis["repeat_desc"]
                },
                "words_list": words_list
            },
            timestamp=datetime.now()
        )
        db.add(output)
        db.flush()

        # 6️⃣ UserWordUsage 저장
        counter_target = {**analysis["counter_nouns"], **analysis["counter_verbs"], **analysis["counter_adjectives"]}
        for word in counter_target.keys():
            usage = UserWordUsage(
                outputs_id=outputs_id,
                user_id=writing.user_id,
                content_id=content_id,
                word=word,
                category='daily'
            )
            db.add(usage)

        db.commit()
        print(f"✅ Outputs + UserWordUsage 저장 완료 (outputs_id={outputs_id})")

        return outputs_id, output.analysis_result
