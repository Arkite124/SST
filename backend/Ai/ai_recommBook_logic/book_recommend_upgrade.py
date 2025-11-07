import os
import re
import torch
import requests
from sentence_transformers import SentenceTransformer
from backend.Ai.ai_common.gpu_start import get_device_cuda
from backend.Ai.db.pg_connect import get_book_titles  # sentiment 포함해서 가져오기

# ---------------------------
# 환경 변수 / 설정
# ---------------------------
device = get_device_cuda()
model_name = "snunlp/KR-SBERT-V40K-klueNLI-augSTS"
MODEL = SentenceTransformer(model_name, device=device)
EMBEDDING_PATH = "../data/book_embeddings_naver.pt"
CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")
NAVER_URL = "https://openapi.naver.com/v1/search/book.json"

# ---------------------------
# 네이버 API에서 책 정보 가져오기
# ---------------------------
def fetch_book_from_naver(title):
    headers = {"X-Naver-Client-Id": CLIENT_ID, "X-Naver-Client-Secret": CLIENT_SECRET}
    params = {"query": title, "display": 1}
    try:
        resp = requests.get(NAVER_URL, headers=headers, params=params, timeout=10)
        resp.raise_for_status()
        items = resp.json().get("items", [])
        if not items:
            return None
        it = items[0]
        return {
            "title": re.sub(r"<[^>]+>", "", it.get("title", "")),
            "author": re.sub(r"\s*,\s*", ", ", it.get("author", "")) or "정보 없음",
            "isbn": it.get("isbn", "정보 없음").split()[0],
            "description": re.sub(r"<[^>]+>", "", it.get("description", "")) or "정보 없음",
            "image": it.get("image", "정보 없음"),
            "link": it.get("link", None),
            "source": "naver"
        }
    except Exception as e:
        print(f"[NAVER ERROR] {title}: {e}")
        return None

# ---------------------------
# 사용자 벡터 계산 (감정 기반 가중치 포함)
# ---------------------------
def compute_user_vector(all_books, embeddings_tensor, read_titles_with_sentiment, model):
    """
    read_titles_with_sentiment: [(title, author, sentiment), ...]
    """
    if not read_titles_with_sentiment:
        return None

    title2idx = {b["title"]: i for i, b in enumerate(all_books)}
    weighted_vecs, total_weight = [], 0.0

    for i, (t, _, sentiment) in enumerate(read_titles_with_sentiment):
        # 최신순 가중치
        recency_w = max(1.0 - 0.2 * i, 0.2)

        # 감정 기반 가중치
        if sentiment == "positive":
            sentiment_w = 1.2
        elif sentiment == "neutral":
            sentiment_w = 1.0
        elif sentiment == "negative":
            sentiment_w = 0.6
        else:
            sentiment_w = 1.0  # null 처리

        w = recency_w * sentiment_w

        idx = title2idx.get(t)
        if idx is not None and idx < embeddings_tensor.size(0):
            weighted_vecs.append(embeddings_tensor[idx].to(device) * w)
            total_weight += w
        else:
            # .pt에 없는 책은 네이버 API 검색 후 임베딩
            info = fetch_book_from_naver(t)
            if info:
                new_emb = model.encode([info["title"] + " " + info["description"]],
                                       convert_to_tensor=True).to(device)
                embeddings_tensor = torch.cat([embeddings_tensor, new_emb])
                all_books.append(info)
                weighted_vecs.append(new_emb[0] * w)
                total_weight += w
                # .pt 파일 갱신
                torch.save({"books": all_books, "embeddings": embeddings_tensor.cpu()}, EMBEDDING_PATH)

    return sum(weighted_vecs) / total_weight if weighted_vecs else None

# ---------------------------
# 추천 결과 계산
# ---------------------------
def get_recommendations(all_books, embeddings_tensor, user_vec, read_titles_with_sentiment, top_n=15, sim_threshold=0.6):
    read_titles_set = {t for t, _, _ in read_titles_with_sentiment}

    if user_vec is None:
        # 읽은 책 제외 + 제목 중복 제거
        seen_titles = set()
        valid_books = []
        for b in all_books:
            t = b["title"]
            if t not in read_titles_set and t not in seen_titles:
                valid_books.append(b)
                seen_titles.add(t)
        sampled = valid_books[:top_n] if len(valid_books) >= top_n else valid_books
        return [(all_books.index(b), 0.0) for b in sampled]

    embeddings_tensor = embeddings_tensor.to(device)
    cos_sim = torch.nn.functional.cosine_similarity(user_vec.unsqueeze(0), embeddings_tensor, dim=1).cpu().numpy()

    # 읽은 책 제외 + 제목 중복 제거
    seen_titles = set()
    valid_indices = []
    for i, b in enumerate(all_books):
        t = b["title"]
        if t not in read_titles_set and t not in seen_titles and i < len(embeddings_tensor):
            valid_indices.append(i)
            seen_titles.add(t)

    filtered_indices = [i for i in valid_indices if cos_sim[i] >= sim_threshold]

    if len(filtered_indices) < top_n:
        remaining_needed = top_n - len(filtered_indices)
        remaining_sorted = sorted(
            [i for i in valid_indices if i not in filtered_indices],
            key=lambda i: cos_sim[i], reverse=True
        )
        filtered_indices.extend(remaining_sorted[:remaining_needed])

    # 유사도 순으로 top_n
    sorted_indices = sorted(filtered_indices, key=lambda i: cos_sim[i], reverse=True)[:top_n]

    return [(i, float(cos_sim[i])) for i in sorted_indices]

# ---------------------------
# 추천 실행
# ---------------------------
def run_book_recommendation(user_id=1, model=None, embedding_path=EMBEDDING_PATH):
    if model is None:
        model = SentenceTransformer(model_name, device=device)

    if not os.path.exists(embedding_path):
        raise FileNotFoundError(f"{embedding_path} 존재하지 않습니다. 임베딩 파일을 먼저 만들어주세요.")

    data = torch.load(embedding_path, map_location=device)
    all_books = data["books"]
    embeddings_tensor = data["embeddings"]

    # sentiment 포함해서 DB에서 읽은 책 가져오기
    read_titles_with_sentiment = get_book_titles(user_id)

    user_vec = compute_user_vector(all_books, embeddings_tensor, read_titles_with_sentiment, model)
    rec_indices = get_recommendations(all_books, embeddings_tensor, user_vec, read_titles_with_sentiment)

    final_books = []
    for idx, sim in rec_indices:
        if idx >= len(all_books):
            continue
        book = all_books[idx].copy()
        book["sim"] = sim
        final_books.append(book)

    return final_books

# ---------------------------
# main
# ---------------------------
if __name__ == "__main__":
    recs = run_book_recommendation(user_id=1, model=MODEL)

    print("\n" + "=" * 80)
    print("📚 감정 기반 추천 도서 목록")
    print("=" * 80)
    for idx, book in enumerate(recs, 1):
        print(f"\n{idx}. 📖 {book.get('title', '정보 없음')}")
        print(f"    저자: {book.get('author', '정보 없음')}")
        print(f"    ISBN: {book.get('isbn', '정보 없음')}")
        print(f"    설명: {book.get('description', '정보 없음')}")
        print(f"    이미지: {book.get('image', '정보 없음')}")
        print(f"    링크: {book.get('link', '정보 없음')}")
        print(f"    유사도: {book.get('sim', 0.0):.3f}")
    print("\n" + "=" * 80)
