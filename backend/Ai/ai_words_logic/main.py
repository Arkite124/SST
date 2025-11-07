import os
from pathlib import Path
import sys
from dotenv import load_dotenv
import time

from backend.Ai.ai_common.gpu_start import get_device_cuda

current_dir = Path(__file__).resolve().parent
models_dir = current_dir.parent.parent  # ../../
sys.path.append(str(models_dir))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from models import DailyWritings, UserWordUsage
from word_analyze import extract_tokens, safe_spell_check
from word_dictionary import get_best_definition, get_sentence_for_word
from word_similarity import load_model_and_corpus, run_training

from sentence_transformers import SentenceTransformer

# 디바이스, ST 모델, 유사어 함수

DEVICE = get_device_cuda()
CTX_MODEL_NAME = "snunlp/KR-SBERT-V40K-klueNLI-augSTS"
# CTX_MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
model = SentenceTransformer(CTX_MODEL_NAME, device=DEVICE)

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
engine = create_engine(DB_URL)

def ensure_similar_fn():
    try:
        return load_model_and_corpus()
    except FileNotFoundError:
        print("[Info] 임베딩 없음, 학습 시작...")
        return run_training(5)


similar_fn = ensure_similar_fn()




# -----------------------------
# 1) DB 불러오기 + cleaned_content 업데이트
# -----------------------------
def process_and_store_daily_writing(user_id: int, id: int):
    with Session(engine) as session:
        # 1) 글 불러오기
        writing = session.get(DailyWritings, id)
        if not writing:
            print(f"Writing id={id} 없음")
            return

        # 2) cleaned_content 업데이트
        cleaned_text = safe_spell_check(writing.content)
        writing.cleaned_content = cleaned_text
        session.commit()
        print(f"cleaned_content 업데이트 완료: id={writing.id}")

        # 3) 단어 분석
        analysis = extract_tokens(cleaned_text)
        combined_counter = analysis['counter_nouns'] + analysis['counter_verbs'] + analysis['counter_adjective']
        top_words = combined_counter.most_common(3)

        # 4) UserWordUsage에 저장
        for word, freq in combined_counter.items():
            usage = UserWordUsage(
                # outputs_id=None,  # Outputs에 연계하려면 실제 Outputs outputs_id 넣기
                user_id=user_id,
                content_id=writing.id,
                word=word,
                category='daily'
            )
            session.add(usage)
        session.commit()

        print(f" 단어 사용 기록 저장 완료: {len(combined_counter)}개")

        # 단어가 포함된 문장들을 합쳐서 단어와 쌍으로 튜플리스트 생성
        sentence_word_pairs = [
            (get_sentence_for_word(cleaned_text, word), word) for word, freq in top_words
        ]
        definitions_results = get_best_definition(
            sentence_word_pairs,
            model,
            threshold=0.25
        ) # 배치로 정의 가져오기

        # 5) top_words 출력
        print("\n📌 Top 3 단어 + 사전 의미 + 유사어")
        for i, ((word, freq), (definition, score)) in enumerate(zip(top_words, definitions_results), 1):
            print(f"\n{i}위. {word} ({freq}회)")
            if definition:
                print(f"'{word}' 의미 (score={score:.3f}): {definition}")
            else:
                print(f"'{word}' 의미: 찾을 수 없음 (score={score:.3f})")

            # 유사어 처리
            print("유사한 단어들:")
            try:
                candidates = similar_fn(word, topk=2)
                for w, s in candidates:
                    if s >= 0.7:
                        # 유사어도 미리 문장 추출
                        sim_sentence = get_sentence_for_word(cleaned_text, w)
                        s_def, s_score = get_best_definition(
                            [(sim_sentence, w)],
                            model,
                            threshold=0.25
                        )[0]  # 결과가 리스트이므로 [0]으로 첫 번째 요소 추출
                        print(f"  {w} (cos={s:.4f}) -> {s_def} (def_score={s_score:.3f})")
            except Exception as e:
                print(f"  (유사어 검색 중 오류: {e})")

# -----------------------------
# main
# -----------------------------
#
if __name__ == "__main__":
    start_time = time.time()
    process_and_store_daily_writing(user_id=1, id=1)
    end_time = time.time()
    print(f"\n>>추천 계산 시간: {end_time - start_time:.4f}초")