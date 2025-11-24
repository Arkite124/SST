import os
import re
import torch
import requests
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from time import sleep

load_dotenv()

# =========================
# 환경 변수 / 설정
# =========================
MODEL_NAME = "snunlp/KR-SBERT-V40K-klueNLI-augSTS"
EMBEDDING_PATH = "/data/book_embeddings_naver.pt"
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")
NAVER_URL = "https://openapi.naver.com/v1/search/book.json"

# =========================
# 네이버 API에서 책 정보 가져오기
# =========================
def fetch_books_by_query(query, display=100):
    headers = {"X-Naver-Client-Id": NAVER_CLIENT_ID, "X-Naver-Client-Secret": NAVER_CLIENT_SECRET}
    params = {"query": query, "display": display}
    try:
        resp = requests.get(NAVER_URL, headers=headers, params=params, timeout=10)
        resp.raise_for_status()
        items = resp.json().get("items", [])
        books = []
        for it in items:
            books.append({
                "title": re.sub(r"<[^>]+>", "", it.get("title", "")).strip(),
                "author": re.sub(r"\s*,\s*", ", ", it.get("author", "").strip()) or "정보 없음",
                "description": re.sub(r"<[^>]+>", "", it.get("description", "").strip()) or "내용 없음",
                "isbn": it.get("isbn", "").strip() or "정보 없음",
                "image": it.get("image", "").strip() or "정보 없음",
                "link": it.get("link", None)
            })
        return books
    except Exception as e:
        print(f"[NAVER ERROR] {query}: {e}")
        return []

# =========================
# 임베딩 생성 및 저장 (중복 title 제거)
# =========================
def create_embeddings(queries):
    model = SentenceTransformer(MODEL_NAME)
    all_books = []
    embeddings = []
    seen_titles = set()

    for query in queries:
        books = fetch_books_by_query(query, display=100)
        for b in books:
            title = b["title"]
            if title in seen_titles:
                continue  # 중복 제목 스킵
            seen_titles.add(title)
            text = title + " " + b["description"]
            emb = model.encode([text], convert_to_tensor=True)
            all_books.append(b)
            embeddings.append(emb[0].cpu())
        sleep(0.2)  # 네이버 API rate limit 대비

    if embeddings:
        embeddings_tensor = torch.stack(embeddings)
        torch.save({"books": all_books, "embeddings": embeddings_tensor}, EMBEDDING_PATH)
        print(f"[INFO] {len(all_books)}권 임베딩 완료 및 저장: {EMBEDDING_PATH}")
    else:
        print(" 임베딩할 책이 없습니다.")

# =========================
# main
# =========================
if __name__ == "__main__":
    queries = ["유아 동화", "어린이 도서", "아동 동화", "유아 교육", "어린이 소설", "아동 소설"]
    create_embeddings(queries)
