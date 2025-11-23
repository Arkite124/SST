#  AI Word Analysis & Recommendation Module

이 프로젝트는 **사용자 작성 글을 정제하고 단어를 분석**하며,  
**유사 단어 추천**, **사전적 정의 매칭**, **DB 저장**, **도서 추천** 등을 수행하는 AI 모듈입니다.

---

## 프로젝트 구조

```
Ai/
├── ai_common                      # AI 공통 유틸리티 및 환경 설정
│   ├── gpu_start.py               # GPU(CUDA) 초기화 및 디바이스 설정
│
├── ai_recommBook_logic            # 도서 추천 관련 로직
│   ├── book_recommend.py          # SBERT 기반 도서 임베딩 및 추천
│   └── save_embbading_book.py     # 도서 임베딩 저장 처리
│
├── ai_words_logic                 # 문장 분석 및 단어 의미 연산 관련 모듈
│   ├── clean_contents.py          # 맞춤법 교정 및 텍스트 정제
│   ├── main.py                    # 단어 분석 결과 실행용 entry point
│   ├── word_analysis.py           # 단어별 빈도, 품사별 카운트 등 분석
│   ├── word_dictionary.py         # 사전 정의 기반 의미 추출
│   └── word_similarity.py         # 문맥 기반 유사 단어 계산 및 모델 학습
│
├── api
│   ├── ai_routers
│   │   ├── book_api.py            # 도서 추천 API
│   │   ├── clean_content_api.py   # 문장 정제 API
│   │   ├── output_api.py          # 분석 결과 API
│   │   └── sentence_model_api.py  # 유사어 매칭 및 정의 반환 API
│   └── app/main.py                # FastAPI 서버 entry point
│
├── data                           # 데이터 및 모델 저장소
│   ├── book_embeddings_naver.pt   # 네이버 도서 임베딩 벡터
│   ├── output_kids_words/         # 유사어 학습 결과 저장 모델
│   ├── similar_words.csv          # 유사단어 목록 CSV
│   └── similar_words.pkl          # 유사단어 목록 Pickle
│
└── db                             # 데이터베이스 관련 모듈
    ├── pg_connect.py              # PostgreSQL 연결
    ├── pg_insert_similar_words.py # CSV 기반 DB 삽입
    └── postgresdb.py              # 세션 관리 및 초기화
```

---

## 설치 가이드

### 필수 환경
- Python 3.11
- CUDA 지원 GPU (선택)
- PostgreSQL

### CUDA 및 PyTorch 수동 설치 예시
```bash
python -m pip install --upgrade pip
pip install torch==2.1.2+cu121 torchvision==0.16.2+cu121 torchaudio==2.1.2+cu121 --index-url https://download.pytorch.org/whl/cu121
```

### 패키지 설치
```bash
pip install -r requirements.txt
```

---

## AI 모델 구성

| 구분 | 모델 / 데이터 | 설명 |
|------|----------------|------|
| **문장 임베딩** | [snunlp/KR-SBERT-V40K-klueNLI-augSTS](https://huggingface.co/snunlp/KR-SBERT-V40K-klueNLI-augSTS) | 서울대 NLP팀의 한국어 SBERT 모델. 한국어 NLI + STS 데이터로 학습되어 문장 의미 비교에 최적화. |
| **감정 분석** | [alsgyu/sentiment-analysis-fine-tuned-model](https://huggingface.co/alsgyu/sentiment-analysis-fine-tuned-model) | 한국어 문장 감정 분류용 BERT 파인튜닝 모델 (긍정·부정·중립). |
| **유사어 추천 모델** | **output_kids_words/** | `KR-SBERT-V40K-klueNLI-augSTS`를 기반으로 어린이 글쓰기 코퍼스에 맞춰 파인튜닝된 **SentenceTransformer 커스텀 임베딩 모델**. 단어 간 의미 유사도 학습용. |

---

## 실행 순서: 유사어 추천 기능

### ① 데이터베이스 초기화
```bash
python Ai/db/pg_insert_similar_words.py
```

### ② 텍스트 정제
```python
cleaned_text = safe_spell_check(original_text)
```

### ③ 단어 분석 (TTR, 빈도 등)
```python
analysis = extract_tokens(cleaned_text)
top_words = analysis['counter_nouns'].most_common(5)
```

### ④ 유사어 추천

기준 단어(word_base)와 가장 유사한 단어를 상위 topk개 추출합니다.
(현재는 3개)

```python
candidates = similar_fn("행복", topk=3)
```
counter_nouns: 명사 빈도 counter_verbs: 동사 빈도

TTR (Type Token Ratio): 어휘 다양도 분석 포함

### ⑤ 의미(사전적 정의) 추출

단어가 존재하는 주어진 정제 문장(cleaned_text)과 단어(w)를 기반으로 가장 적합한 사전적 정의를 반환합니다.
```python
definition, score = get_best_definition(cleaned_text, "행복", model, threshold=0.25)
```
s_def: 사전적 정의

s_score: 문장과의 유사도 점수

---
### 단어 사용 기록 (DB 저장)
분석된 단어를 UserWordUsage 테이블에 저장합니다.

python
```
for word, freq in combined_counter.items():
    usage = UserWordUsage(
        user_id=user_id,
        content_id=writing.id,
        word=word,
        category='daily'
    )
    session.add(usage)
```

### 모델 로드 및 초기화

서버 실행 시 해당 함수를 전역 실행해 모델이 전역으로 로드 되도록 설정합니다.

해당 함수는 모델 파일이 없을 경우 모델을 자동 학습 후 로드합니다.

python
```
def ensure_similar_fn():
    try:
        return load_model_and_corpus()
    except FileNotFoundError:
        run_training(5)
        return load_model_and_corpus()

similar_fn = ensure_similar_fn()
```
---

## 주요 기능 요약

| 기능 | 설명 |
|------|------|
| **텍스트 정제** | 맞춤법 교정 및 불필요한 기호 제거 |
| **단어 분석** | 품사별 빈도, TTR(어휘 다양도) 계산 |
| **DB 저장** | 사용자별 단어 사용 내역 저장 |
| **유사어 추천** | 의미적으로 가까운 단어 추천 |
| **사전 정의 매칭** | 문맥에 맞는 사전 정의 자동 선택 |

### 파일	역할

1. pg_insert_similar_words.py	CSV 단어 데이터를 DB에 삽입
2. ai_words_logic.py	단어 분석 및 의미 추출 로직
3. ai_common/gpu_start.py	GPU 장치 설정 및 모델 로드 관리
4. ai_common/utils.py	텍스트 정제 및 전처리 유틸리티

---

## 도서 추천 모듈

이 모듈은 사용자의 **독서 이력(책 제목/저자)**과 독서 감상문을 기반으로 **SBERT 문장 임베딩 유사도**를 분석하여 **비슷한 도서를 추천**합니다.

### 사전 준비

도서 데이터셋을 임베딩하여 .pt 파일로 저장합니다.

(해당 스크립트는 SBERT를 이용해 책의 줄거리 벡터를 생성합니다.)
```bash
python Ai/ai_recommBook_logic/save_embbading_book.py
```
> 결과물: `Ai/data/book_embeddings.pt`


---

### 데이터베이스 테이블 예시
| 테이블명 | 설명 |
|-----------|------|
| `reading_logs` | 사용자가 읽은 책 제목 및 저자 정보 저장 |

---

### 실행 예시

아래 예시는 특정 유저의 독서 이력 기반 도서 추천 과정을 보여줍니다.
```python
import torch
import pandas as pd
from db.pg_connect import get_book_titles
from ai_recommBook_logic.book_recommend import recommend_books_auto_weight_with_precomputed

read_titles = get_book_titles(user_id)
df = pd.read_pickle("backend/Ai/data/kcisa_books.pkl")
embeddings = torch.load("backend/Ai/data/book_embeddings.pt", map_location=device)

recommended_books = recommend_books_auto_weight_with_precomputed(
    df, embeddings, read_titles, top_n=5
)
```

---

### 작동 원리
1. `네이버 도서 api` → 전체 도서 데이터 로드  
2. `book_embeddings.pt` → SBERT 임베딩 로드  
3. 사용자 독서 이력(`reading_logs`)과 유사도 계산  
4. 상위 `top_n` 유사 도서 반환  

---

## 참고 사항
- GPU 사용 시 `torch.cuda.is_available()`로 CUDA 인식 확인  
- 임베딩 모델은 재학습 없이 `.pt` 파일을 재사용 가능  
- `top_n` 값으로 추천 다양성 조절 가능  

---

## 요약

| 항목 | 설명 |
|------|------|
| **분석 대상** | 사용자 글쓰기, 독서록 |
| **핵심 기능** | 단어 분석, 유사어 추천, 사전 정의 매칭, 도서 추천 |
| **핵심 모델** | SBERT, Custom SentenceTransformer (output_kids_words) |
| **DB 연동** | PostgreSQL 기반 ORM |
| **주요 라이브러리** | `torch`, `sentence-transformers`, `pandas`, `tqdm`, `dotenv`, `xmltodict` |

---

**작성자 메모:**  
본 모듈은 "사용자 글의 어휘 패턴을 분석하고, 유사어 및 의미 확장 추천을 통해 언어적 다양성 피드백을 제공"하는 것을 목표로 합니다.
