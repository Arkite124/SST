# AI Word Analysis Module

이 프로젝트는 **사용자 작성 글을 정제 및 단어 분석**하고,  
**유사 단어 추천**, **사전적 정의 매칭**, **DB 저장**, **책 추천** 등을 수행하는 AI 모듈입니다.

---

## 프로젝트 구조
```
Ai/
├── ai_common                      # AI 공통 유틸리티 및 환경 설정
│   ├── __init__.py
│   └── gpu_start.py               # GPU(CUDA) 초기화 및 디바이스 설정
├── ai_recommBook_logic            # 도서 추천 관련 로직
│   ├── __init__.py
│   ├── book_recommend.py          # SBERT 기반 도서 임베딩/추천
│   └── save_embbading_book.py     # 도서 임베딩 저장 처리
├── ai_words_logic                 # 문장 분석 및 단어 의미 연산 관련 모듈
│   ├── __init__.py
│   ├── clean_contents.py          # 맞춤법 교정 및 텍스트 정제
│   ├── main.py                    # 단어 분석 결과 확인용 메인 로직 (entry point)
│   ├── word_analysis.py           # 단어별 빈도, 품사별 카운트 등 분석
│   ├── word_dictionary.py         # 사전 정의 기반 의미 추출
│   └── word_similarity.py         # 문맥 기반 유사 단어 계산
├── api
│   ├── __init__.py
│   ├── ai_models
│   │   ├── __init__.py
│   │   ├── book_api.py            # 도서 추천 api
│   │   ├── clean_content_api.py   # 문장 정제 api
│   │   ├── output_api.py          # 문장 분석 결과 api
│   │   └── sentence_model_api.py  # 유사어 매칭 및 사전적 정의 도출 api
│   └── app
│       ├── __init__.py
│       └── main.py
├── cuda_test.py                   # CUDA 환경 테스트 스크립트
├── data                           # 데이터 및 모델 저장소
│   ├── book_embeddings_naver.pt   # 네이버 도서 api 임베딩 벡터 (PyTorch)
│   ├── output_kids_words/         # 기준단어-유사 단어 학습 결과 저장 모델 디렉토리
│   ├── similar_words.csv          # 유사단어 목록 메타데이터 CSV
│   └── similar_words.pkl          # 유사단어 목록 피클 버전
└── db                             # 데이터베이스 관련 모듈
    ├── __init__.py
    ├── pg_connect.py              # PostgreSQL 직접 연결
    ├── pg_insert_similar_words.py # CSV 기반 유사단어 DB 삽입 스크립트
    └── postgresdb.py              # 세션 관리 + DB 초기화



```
---

## 설치 가이드

### CUDA 및 PyTorch 설치 (직접 설치 시)
CUDA 관련 문제로 자동 설치가 곤란할 경우, 아래 명령어로 수동 설치합니다.

```bash
python.exe -m pip install --upgrade pip
pip install torch==2.1.2+cu121 torchvision==0.16.2+cu121 torchaudio==2.1.2+cu121 --index-url https://download.pytorch.org/whl/cu121
````
### 필수 설치 항목
항목	설명
```
requirements.txt	모든 Python 의존성 패키지 포함
```
```bash
pip install -r requirements.txt
```
---

## 실행 순서: 유사어 추천

### 선행 실행 코드

모델 실행 및 학습 전, 아래 스크립트를 실행하여 DB에 단어 데이터를 사전 삽입합니다.

```bash
python backend/Ai/db/pg_insert_similar_words.py
```
(※ .csv 파일 데이터를 데이터베이스에 적재합니다.)

## 사용 요령

### 글 정제

입력된 원문 텍스트를 맞춤법 검사 및 정제합니다.

python
```
cleaned_text = safe_spell_check(original_text)
```
### 단어 분석 (TTR, 빈도 등)

python
```
analysis = extract_tokens(cleaned_text)  #글 분석 결과 리스트
combined_counter = analysis['counter_nouns'] + analysis['counter_verbs']
```

 상위 N개 단어 가져오기
```
top_words = combined_counter.most_common(n)
```
counter_nouns: 명사 빈도
counter_verbs: 동사 빈도

TTR (Type Token Ratio): 어휘 다양도 분석 포함

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
### 유사 단어 추천

기준 단어(word_base)와 가장 유사한 단어를 상위 topk개 추출합니다.
(현재는 3개)
```
candidates = similar_fn(word_base, topk=3)
```

### 의미(사전적 정의) 추출

주어진 정제 문장(cleaned_text)과 단어(w)를 기반으로 가장 적합한 사전적 정의를 반환합니다.

python
```
s_def, s_score = get_best_definition(cleaned_text, w, model, threshold=0.25)
```
s_def: 사전적 정의

s_score: 문장과의 유사도 점수

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
## 구성 요약

### 파일	역할

1. pg_insert_similar_words.py	CSV 단어 데이터를 DB에 삽입
2. ai_words_logic.py	단어 분석 및 의미 추출 로직
3. ai_common/gpu_start.py	GPU 장치 설정 및 모델 로드 관리
4. ai_common/utils.py	텍스트 정제 및 전처리 유틸리티

## 주요 기능 요약

### 기능	설명
```
 텍스트 정제	맞춤법 교정 및 불필요한 기호 제거
 단어 분석	품사별 빈도, TTR 계산
 DB 저장	사용자별 단어 사용 내역 기록
 유사 단어 추천	의미적으로 가까운 단어 추천
 사전 정의 매칭	문맥에 맞는 사전 정의 자동 선택
```

---

## 도서 추천 모듈 사용법

이 모듈은 사용자의 **독서 이력(읽은 책 제목/저자)** 을 기반으로  
**줄거리 유사도(SBERT 임베딩)** 를 분석하여 **비슷한 도서를 추천**합니다.

---

### 사전 준비

도서 데이터셋을 임베딩하여 `.pt` 파일로 저장합니다.  

(해당 스크립트는 SBERT를 이용해 책의 줄거리 벡터를 생성합니다.)

```bash
python backend/Ai/ai_recommBook_logic/save_embbading_book.py
```
 결과물: backend/Ai/data/book_embeddings.pt

 참고 데이터: backend/Ai/data/kcisa_books.pkl


### 데이터베이스 준비
추천 기능은 사용자 독서 기록을 기반으로 작동합니다.
아래의 DB 테이블이 필요합니다.

테이블명	설명
```
reading_logs	사용자가 읽은 책 제목 및 저자 정보를 저장
```
 get_book_titles(user_id) 함수는 이 테이블로부터 데이터를 조회합니다.

### 실행 방법
아래 예시는 특정 유저의 독서 이력 기반 도서 추천 과정을 보여줍니다.

python
```
import torch
import pandas as pd
from backend.Ai.db.pg_connect import get_book_titles
from backend.Ai.ai_recommBook_logic.bookRecomm_sbert import recommend_books_auto_weight_with_precomputed

# 1. 유저의 독서 이력 불러오기
read_titles = get_book_titles(user_id)  
# → [(책제목, 저자), (책제목, 저자), ...]

# 2. 사전 임베딩 및 도서 데이터 불러오기
df = pd.read_pickle("backend/Ai/data/kcisa_books.pkl")
embeddings = torch.load("backend/Ai/data/book_embeddings.pt", map_location=device)

# 3. 도서 추천 실행
recommended_books = recommend_books_auto_weight_with_precomputed(
    df, embeddings, read_titles, top_n=5
)
```
### 함수 설명
```
함수명	설명
get_book_titles(user_id) : DB에서 특정 유저의 읽은 책 제목과 저자를 튜플 리스트 형태로 반환
recommend_books_auto_weight_with_precomputed(df, embeddings, read_titles, top_n) : 입력된 책 리스트(read_titles)를 기반으로, 줄거리 임베딩 유사도를 계산하여 가장 비슷한 도서 top_n개 추천
```

### 주요 입력 파라미터
```
파라미터	설명
df      	도서 메타데이터 (예: kcisa_books.pkl)
embeddings	사전 학습된 책 임베딩 벡터 (예: book_embeddings.pt)
read_titles	사용자가 읽은 책의 (제목, 저자) 튜플 리스트
top_n	        추천할 도서 개수 (기본값: 5)
```
### read_titles 예시 반환

python
```
[
  ("데미안", "헤르만 헤세"),
  ("연을 쫓는 아이", "할레드 호세이니"),
  ("나미야 잡화점의 기적", "히가시노 게이고"),
  ("7년의 밤", "정유정"),
  ("당신의 조각들", "김중혁")
]
```

### 작동 원리 요약

kcisa_books.pkl에 저장된 모든 도서 데이터를 로드

book_embeddings.pt의 SBERT 벡터를 이용해 각 책의 의미적 표현 비교

사용자가 읽은 책(reading_logs)과 유사한 줄거리 임베딩을 가진 책을 탐색

최상위 top_n개 결과를 반환

### 관련 파일

파일	역할
```
save_embbading_book.py	도서 데이터 임베딩 및 저장
bookRecomm_sbert.py	도서 추천 로직 (유사도 계산, 가중치 적용 등)
kcisa_books.pkl	        도서 메타데이터 (줄거리, 저자, 장르 등)
book_embeddings.pt	도서 임베딩 벡터 파일
pg_connect.py	DB 연결 및 ORM 처리
reading_logs (DB)	사용자 독서 이력 테이블
```
### 참고

SBERT(Sentence-BERT)를 이용한 문장 의미 임베딩 기반 유사도 계산

GPU 사용 시 torch.cuda.is_available()로 CUDA 인식 여부 확인

도서 추천 모델은 한 번 임베딩 생성 후 .pt 파일로 재사용 가능

top_n 값 조정으로 추천 다양성 제어 가능