import os
import time
import requests
import functools
from typing import List
from dotenv import load_dotenv
import torch
from sentence_transformers import SentenceTransformer, util

from backend.Ai.ai_common.gpu_start import get_device_cuda

load_dotenv()

DEVICE = get_device_cuda()
CTX_MODEL_NAME = "snunlp/KR-SBERT-V40K-klueNLI-augSTS"
model = SentenceTransformer(CTX_MODEL_NAME, device=DEVICE)


API_KEY = os.getenv("DICTIONARY_KEY")

# -----------------------------
# 1) 문장 단위 분리
# -----------------------------
def split_into_sentences(text: str) -> List[str]:
    sentences = re.split(r'(?<=[.!?])\s*', text)
    return [s.strip() for s in sentences if s.strip()]

# 단어가 존재하는 첫문장 -> 단어가 포함된 모든 문장을 찾아서 합침
def get_sentence_for_word(text: str, word: str) -> str:
    sentences = split_into_sentences(text)
    matched_sentences = [s for s in sentences if word in s]
    if matched_sentences:
        return ' '.join(matched_sentences)  # 모든 매칭 문장을 합침

    return text

# -----------------------------
# 2) 정의 추출 (POS 포함, 재귀적)
# -----------------------------
import re

def extract_definitions_from_items(items, pos=None):
    defs = []
    if isinstance(items, dict):
        definition = items.get("definition", "")
        if definition:
            definition = re.sub(r"<!\[CDATA\[|\]\]>", "", definition)
            definition = re.sub(r"<[^>]+>", "", definition).strip()
            if definition:
                defs.append((definition, pos))

        # 하위 구조 탐색 (재귀)
        for v in items.values():
            if isinstance(v, (dict, list)):
                defs.extend(extract_definitions_from_items(v, pos))

    elif isinstance(items, list):
        for s in items:
            # 리스트의 각 요소도 dict일 가능성 있음
            defs.extend(extract_definitions_from_items(s, pos))
    return defs


# -----------------------------
# 3) 정의 수집 (API + 캐시)
# -----------------------------
@functools.lru_cache(maxsize=1024)
def get_definitions(word: str):
    word = str(word).strip()
    if not word:
        return []

    API_URL = "https://stdict.korean.go.kr/api/search.do"
    params = {"key": API_KEY, "q": word, "req_type": "json"}

    try:
        response = requests.get(API_URL, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
    except Exception:
        return []

    channel = data.get("channel", {})
    items = channel.get("item", [])
    if isinstance(items, dict):
        items = [items]

    defs = []
    for item in items:
        pos = item.get("pos", "알 수 없음")
        sense_list = item.get("sense", [])
        defs.extend(extract_definitions_from_items(sense_list,pos))

    # 중복 제거
    seen = set()
    unique_defs = []
    for d, p in defs:
        if d not in seen:
            seen.add(d)
            unique_defs.append((d, p))
    return unique_defs

# -----------------------------
# 4) 정의 필터링 + 특수 대명사 shortcut
# -----------------------------
special_keywords = {
    "집": ["건물","거주","주거","살다","집안"],
    "나": ["자기","일인칭", "말하는 이","본인","상대","관계"],
    "너": ["상대","말하는 이","본인"],
    "우리": ["집단","사람","관계"],
    "저": ["본인","말하는 이"]
}
base_keywords = ["사람","관계","자신","상대","행동","말","친구","음식","쌀","가정"]

def filter_definition_by_keywords(defs_with_pos, word=None):
    keywords = base_keywords.copy()
    if word in special_keywords:
        keywords += special_keywords[word]

    filtered = [d for d,_ in defs_with_pos if any(k in d for k in keywords)]
    if not filtered:
        filtered = [d for d,_ in defs_with_pos]

    shortcut = word in ["나","너","우리","저","너희","당신"]
    return filtered, shortcut

# -----------------------------
# 5) 문맥 기반 정의 선택 + POS 가중치 강화
# -----------------------------
def get_best_definition(sentence_word_pairs: List[tuple], model: SentenceTransformer,
                        threshold: float = 0.0,
                        pos_weights: dict = None,
                        pos_priority: list = None,
                        alpha: float = 0.5,
                        exclude_pos: list = None):
    """
    pos_weights: POS별 가중치 (더하기)
    pos_priority: 우선순위로 필터링 ["동사","대명사","명사"]
    alpha: POS 가중치를 cosine score에 곱해 합산
    """
    if pos_weights is None:
        pos_weights = {"대명사":0.8, "동사":0.5, "명사":0.5}
    if pos_priority is None:
        pos_priority = ["동사","대명사","명사"]
    if exclude_pos is None:
        exclude_pos = []
        # exclude_pos = ["접사", "접두사", "접미사"]
    results = []

    # 1단계: 각 단어의 정의 수집 및 전처리
    processed_data = []
    for sentence, word in sentence_word_pairs:
        defs_with_pos = get_definitions(word)
        if not defs_with_pos:
            results.append((None, 0.0))
            continue

        # print(f"원본 정의 개수: {len(defs_with_pos)}")

        filtered_by_exclude = [(d, p) for d, p in defs_with_pos if p not in exclude_pos]
        # print(f"제외할 품사: {exclude_pos}")
        # print(f"필터링 후 정의 개수: {len(filtered_by_exclude)}")
        if filtered_by_exclude:  # 제외 후 남은 게 있으면 사용
            defs_with_pos = filtered_by_exclude

        # POS 우선순위 필터링
        filtered_defs = []
        for p in pos_priority:
            for d, pos_tag in defs_with_pos:
                if pos_tag == p:
                    filtered_defs.append((d,pos_tag))
        if not filtered_defs:
            filtered_defs = defs_with_pos

        # shortcut 처리
        if word in ["나","너","우리","저","너희","당신"]:
            results.append((filtered_defs[0][0], 1.0))
            continue

        definitions = [d for d,_ in filtered_defs]

        processed_data.append({
            'sentence': sentence,
            'word': word,
            'definitions': definitions,
            'filtered_defs': filtered_defs,
            'result_idx': len(results)
        })

        results.append(None)  # placeholder

    if not processed_data:
        return results

    # 2단계: 모든 문장을 한번에 encoding
    all_sentences = [item['sentence'] for item in processed_data]
    sentence_embs = model.encode(all_sentences, convert_to_tensor=True,
                                 normalize_embeddings=True, batch_size=32)

    # 3단계: 모든 정의를 한번에 encoding
    all_definitions = []
    definition_map = []  # (data_idx, def_start, def_end)

    for data_idx, item in enumerate(processed_data):
        start = len(all_definitions)
        all_definitions.extend(item['definitions'])
        end = len(all_definitions)
        definition_map.append((data_idx, start, end))

    def_embs = model.encode(all_definitions, convert_to_tensor=True, normalize_embeddings=True, batch_size=32)  # 속도 향상을 위해 batch사이즈 추가
    # sentence_emb = model.encode([sentence_for_word], convert_to_tensor=True, normalize_embeddings=True, batch_size=8)#속도 향상을 위해 batch사이즈 추가
    # scores = util.cos_sim(def_embs, sentence_emb).squeeze(1)

    # 4단계: 각 (문장, 단어) 쌍에 대해 최적 정의 선택
    for data_idx, def_start, def_end in definition_map:
        item = processed_data[data_idx]

        # 해당 단어의 정의 embeddings
        word_def_embs = def_embs[def_start:def_end]
        # 해당 문장 embedding
        sent_emb = sentence_embs[data_idx].unsqueeze(0)

        scores = util.cos_sim(word_def_embs, sent_emb).squeeze(1)

        # POS 가중치 더하기 (alpha 곱해서 cosine에 반영)
        pos_dict = {d:p for d,p in item['filtered_defs']}
        for i,d in enumerate(item['definitions']):
            pos_tag = pos_dict.get(d)
            if pos_tag in pos_weights:
                scores[i] += torch.tensor(pos_weights[pos_tag]*alpha, dtype=scores.dtype)

        best_idx = int(torch.argmax(scores))
        best_score = float(scores[best_idx])

        if best_score < threshold:
            result = (item['definitions'][0], max(best_score, 0.0))
        else:
            result = (item['definitions'][best_idx], best_score)

        results[item['result_idx']] = result

    return results

# -----------------------------
# 6) 테스트
# -----------------------------
if __name__=="__main__":
    model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    sentence_word_pairs = [
        ("귀가 먹었다는 건 이런건가. 귀가 잘 들리지 않는 사람을 보고 귀가 먹었다고 한다...", "먹다"),
        # ("나는 집에 빨리 가서 밥을 먹었다. 다 먹고 학교 가야겠다. 갈 수 있으면 좋겠다. 그럴 수 있으면....", "먹다"),
        ("나는 집에 빨리 가서 밥을 먹었다. 다 먹고 학교 가야겠다. 갈 수 있으면 좋겠다. 그럴 수 있으면....", "집")
    ]

    start_time = time.time()

    # 배치로 한번에 처리
    results = get_best_definition(sentence_word_pairs, model)

    # 결과 출력

    for i, ((sentence, word), (definition, score)) in enumerate(zip(sentence_word_pairs, results), 1):
        print(f"\n[테스트 {i}]")
        print(f"문장: {sentence}")
        print(f"단어: {word}")
        print(f"선택된 정의: {definition}")
        print(f"점수: {score:.4f}")
    end_time = time.time()
    print(f"\n>>계산 시간: {end_time - start_time:.4f}초")
