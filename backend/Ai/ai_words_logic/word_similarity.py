import os
import time
import ast
import torch
from sentence_transformers import SentenceTransformer, util
from ai_common.gpu_start import get_device_cuda

# -----------------------------
# 설정
# -----------------------------
HUGGINGFACE_MODEL_ID = "cath1616/similar_word_corse_fine_tunig_model"
EMB_PATH = "/data/corpus_embeddings.pt"

model = None
device = None


# -----------------------------
# 1. 허깅페이스 모델 로드
# -----------------------------
def ensure_model_loaded():
    global model, device
    if model is not None:
        return model, device

    device = get_device_cuda()

    print(f"[Info] 허깅페이스 모델 로드 중... ({HUGGINGFACE_MODEL_ID})")
    model = SentenceTransformer(HUGGINGFACE_MODEL_ID, device=device)
    print(f"[Info] 허깅페이스 모델 로드 완료 ({device})")

    return model, device


# -----------------------------
# 2. 임베딩 캐시 저장/로드
# -----------------------------
def save_corpus_embeddings(corpus_words, device_param, path=EMB_PATH):
    """단어 리스트 → 임베딩 캐시 생성 및 저장"""
    m, d = ensure_model_loaded()

    with torch.inference_mode():
        corpus_emb = m.encode(
            corpus_words,
            convert_to_tensor=True,
            normalize_embeddings=True,
            batch_size=128,
            show_progress_bar=True,
            device=device_param,
        ).cpu()

    os.makedirs(os.path.dirname(path), exist_ok=True)
    torch.save({"corpus_words": corpus_words, "corpus_emb": corpus_emb}, path)
    print(f"[Info] 임베딩 캐시 저장 완료: {path}")
    return corpus_emb


def load_corpus_embeddings(path=EMB_PATH):
    if not os.path.exists(path):
        raise FileNotFoundError(f"[Error] '{path}' 임베딩 파일이 없습니다.")
    data = torch.load(path, map_location="cpu")
    print(f"[Info] 임베딩 캐시 로드 완료: {path}")
    return data["corpus_words"], data["corpus_emb"]


# -----------------------------
# 3. 검색 함수 빌더
# -----------------------------
def build_search_function(corpus_words, corpus_emb, device_param="cpu"):
    m, d = ensure_model_loaded()
    corpus_emb = corpus_emb.to(device_param)

    def similar_words(query_word, topk=10, exclude_self=True):
        """문맥 기반 유사어 검색 (기준 단어 제외 + 중복 제거)"""
        with torch.inference_mode():
            q_emb = m.encode(
                [query_word],
                convert_to_tensor=True,
                normalize_embeddings=True,
                device=device_param
            )
            sims = util.cos_sim(q_emb, corpus_emb)[0]

            if exclude_self and query_word in corpus_words:
                sims[corpus_words.index(query_word)] = -1e9

            vals, idxs = torch.topk(sims, min(topk, len(corpus_words)))
            results = [(corpus_words[i], float(vals[j])) for j, i in enumerate(idxs)]

            # 기준단어 제외 + 중복 제거
            seen = set()
            filtered = []
            for w, s in results:
                if w not in seen and w != query_word:
                    filtered.append((w, s))
                    seen.add(w)
            return filtered

    return similar_words


# -----------------------------
# 4. 메인 로더
# -----------------------------
def load_model_and_corpus(emb_path=EMB_PATH, force_rebuild=False):
    """허깅페이스 모델 + 로컬 캐시 임베딩 불러오기"""
    m, d = ensure_model_loaded()

    # 임베딩 캐시 없으면 생성
    if not os.path.exists(emb_path) or force_rebuild:
        print("[Info] 임베딩 캐시가 없습니다. 새로 생성합니다...")

        # 이 부분은 필요 단어 리스트 지정
        corpus_words = [
            "사과", "배", "포도", "딸기", "바나나", "과일", "음식",
            "공부", "학교", "교실", "선생님", "학생", "친구", "놀이",
            "기쁨", "행복", "사랑", "감정", "마음", "웃음", "눈물"
        ]

        save_corpus_embeddings(corpus_words, d, emb_path)
        corpus_words, corpus_emb = corpus_words, torch.load(emb_path)["corpus_emb"]
    else:
        corpus_words, corpus_emb = load_corpus_embeddings(emb_path)

    similar_fn = build_search_function(corpus_words, corpus_emb, d)
    return similar_fn


# -----------------------------
# 5. 테스트
# -----------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("🔹 허깅페이스 모델 기반 유사어 추천 테스트")
    print("=" * 60)

    similar_fn = load_model_and_corpus()
    word_base = "사과"

    start_time = time.time()
    candidates = similar_fn(word_base, topk=5)
    end_time = time.time()

    print(f"\n🔍 '{word_base}' 유사어 추천:")
    for w, score in candidates:
        print(f"  - {w:<10s} ({score:.4f})")

    print(f"\n⏱ 계산 시간: {end_time - start_time:.4f}초")
