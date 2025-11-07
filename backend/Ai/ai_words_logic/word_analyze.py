import time
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from kiwipiepy import Kiwi
from collections import Counter
import re
import warnings
warnings.filterwarnings("ignore")

# 맞춤법 검사기 모듈 가져오기
from Ai.ai_common.clean_contents import safe_spell_check


kiwi = Kiwi()

# -------- 설정 --------
_RE_KOREAN = re.compile(r"[^가-힣\s]")
_RE_SENT_SPLIT = re.compile(r"[.!?]+")

# 형태소 분석 및 통계
def extract_tokens(text: str):

    checked_sentence = safe_spell_check(text or "")
    text_clean = _RE_KOREAN.sub("", checked_sentence)

    # 문장 길이 계산
    sentences = [len(s.split()) for s in _RE_SENT_SPLIT.split(text_clean) if s.strip()]
    avg_sentence_len = (sum(sentences) / len(sentences)) if sentences else 0.0

    # Kiwi 형태소 분석
    analyzed = kiwi.analyze(checked_sentence)
    tokens = []
    if analyzed and analyzed[0][0]:
        for token in analyzed[0][0]:
            # form, tag, lemma 모두 저장
            tokens.append((token.form, token.tag, token.lemma))

    # 명사, 동사, 형용사 분리
    nouns = [lemma for form, tag, lemma in tokens if tag.startswith("NN")]
    verbs = [lemma for form, tag, lemma in tokens if tag.startswith("VV")]
    adjective = [lemma for form, tag, lemma in tokens if tag.startswith("VA")]

    # 빈도 계산
    counter_nouns = Counter(nouns)
    counter_verbs = Counter(verbs)
    counter_adjective = Counter(adjective)

    words_all = text_clean.split()
    counter_words = Counter(words_all)
    unique_words = list(dict.fromkeys(words_all))
    denom = len(words_all) if words_all else 0

    ttr = (len(set(unique_words)) / denom) if denom else 0.0
    repeat_ratio = (1 - (len(set(unique_words)) / denom)) if denom else 0.0

    if repeat_ratio < 0.2:
        repeat_desc = "다양한 어휘를 사용하는 편입니다!"
    elif repeat_ratio < 0.5:
        repeat_desc = "적당한 어휘를 사용하는 편입니다."
    else:
        repeat_desc = "반복이 많은 편입니다. 다른 어휘를 좀 더 사용해보세요."

    return {
        "checked_sentence": checked_sentence,
        "nouns": nouns,
        "verbs": verbs,
        "adjective": adjective,
        "pos": tokens,
        "counter_nouns": counter_nouns,
        "counter_verbs": counter_verbs,
        "counter_adjective": counter_adjective,
        "words": unique_words,
        "counter_words": counter_words,
        "avg_sentence_len": avg_sentence_len,
        "ttr": ttr,
        "repeat_desc": repeat_desc,
    }


# 실행 테스트
if __name__ == "__main__":
    text = "강아지가 집에 갔다. 밥도 먹었고 잠도 잤고 아무튼 이것저것 했다. 기분이 좋다. 하늘고 푸르고 예뻤다."
    start_time = time.time()
    result = extract_tokens(text)
    end_time = time.time()

    print("명사 목록:", result["nouns"])
    print("동사 목록:", result["verbs"])
    print("형용사 목록:", result["adjective"])
    print("명사 빈도:", dict(result["counter_nouns"]))

    print(f"\n>>계산 시간: {end_time - start_time:.4f}초")
