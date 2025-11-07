# 📘 Backend README

## 📂 프로젝트 구조
```
 main.py                  # FastAPI 실행 진입점
 ┣app/
 ┣ __init__.py
 ┣ cert.pem                 # SSL 인증서 (개발/테스트용)
 ┣ key.pem                  # SSL 키 (개발/테스트용)
 ┣ routes/                  # API 라우터 모음
 ┃ ┣ admin_dashboard/       # 관리자 대시보드 API
 ┃ ┣ customer_center/       # 고객센터 및 구독 API
 ┃ ┣ customer_dashboard/    # 고객 대시보드 API
 ┃ ┣ edit_user/             # 사용자 정보 수정 및 조회
 ┃ ┣ forum/                 # 부모/학생 포럼 API
 ┃ ┣ login/                 # 로그인/회원가입/소셜 로그인 API
 ┃ ┗ writings/              # 활동(일기/글쓰기 등) 관련 API
```

---
## 🛠️ 주요 라우터
- **로그인/회원가입 (`/login/...`)**
  - 이메일 로그인 / 회원가입
  - 소셜 로그인 (Google, Kakao, Naver)
  - 최초 회원가입 시 추가정보 입력 API  

- **회원 관리 (`/users/...`)**
  - 사용자 정보 수정 (`edit_user.py`)
  - 사용자 검색 (`find_user.py`)
  - 중복 체크 (`check_duplicate.py`)

- **대시보드**
  - `/dashboard/admin` → 관리자 전용 API
  - `/dashboard/customer` → 고객 전용 API

- **고객센터 & 구독 (`/customer_center/...`)**
  - 고객 문의 등록 및 조회
  - 구독/결제 관리 API

- **포럼 (`/community/...`)**
  - `/community/parent` → 부모 전용 포럼
  - `/community/student` → 학생 전용 포럼

- **활동 기록 (`/writings/...`)**
  - 일기, 글쓰기 등 학습 활동 데이터 API
---

## ⚙️ 실행 방법

### 1) 가상환경 및 패키지 설치
```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2) 서버 실행
로컬 개발 환경:
```bash
uvicorn main:app --reload
```

배포 환경(HTTPS 인증서 사용):
```bash
python main.py
```
(`USE_HTTPS=True` 환경 변수로 HTTPS 모드 활성화)
-> 현재는 False
---

## 🔑 주요 설정

### ✅ CORS
- React 개발 환경 (`http://localhost:3000`, `http://localhost:5173`)  
- 배포용 프론트엔드 도메인  
- 쿠키 인증 허용 (`allow_credentials=True`)

### ✅ SessionMiddleware
- `SessionMiddleware` 적용  
- `SECRET_KEY` 기반 세션 관리  

### ✅ 글로벌 예외 핸들러
- 모든 미처리 예외를 `500 Internal Server Error`로 JSON 응답  

---

## 📡 주요 엔드포인트 예시
- `/login/...` → 로그인/회원가입/소셜 로그인
- `/users/...` → 사용자 정보 관리
- `/community/parent` → 부모 커뮤니티
- `/community/student` → 학생 커뮤니티
- `/dashboard/admin` → 관리자 대시보드
- `/dashboard/customer` → 고객 대시보드
- `/customer_center/...` → 고객센터/구독
- `/writings/...` → 학습 활동 기록

---

✅ 이 README는 실제 프로젝트 구조와 `main.py` 설정을 기준으로 작성된 **백엔드 전용 실행 가이드**입니다.
