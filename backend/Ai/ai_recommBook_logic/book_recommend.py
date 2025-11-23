import os
import re
import torch
import requests
from sentence_transformers import SentenceTransformer
from ai_common.gpu_start import get_device_cuda
from db.pg_connect import get_book_titles  # (필요시 sentiment도 함께 가져오기)

# ---------------------------
# 환경 변수 / 기본 설정
# ---------------------------
device = get_device_cuda()
model_name = "snunlp/KR-SBERT-V40K-klueNLI-augSTS"
MODEL = SentenceTransformer(model_name, device=device)
EMBEDDING_PATH = "/data/book_embeddings_naver.pt"
CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")
NAVER_URL = "https://openapi.naver.com/v1/search/book.json"


# ---------------------------
# 유틸 함수: 텍스트 정리
# ---------------------------
def clean_text(text: str) -> str:
    return re.sub(r"<[^>]+>", "", (text or "").strip())


# ---------------------------
# 네이버 API: 책 정보 1건 검색
# ---------------------------
def fetch_book_from_naver(title: str):
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
            "title": clean_text(it.get("title", "")),
            "author": clean_text(it.get("author", "")) or "정보 없음",
            "isbn": it.get("isbn", "정보 없음").split()[0],
            "description": clean_text(it.get("description", "")) or "정보 없음",
            "image": it.get("image", "정보 없음"),
            "link": it.get("link", None),
            "source": "naver"
        }
    except Exception as e:
        print(f"[NAVER ERROR] {title}: {e}")
        return None


# ---------------------------
# 읽은 책 필터링
# ---------------------------
def filter_unread_books(all_books, read_titles):
    seen_titles, valid_indices = set(), []
    for i, b in enumerate(all_books):
        t = b["title"]
        if t not in read_titles and t not in seen_titles:
            valid_indices.append(i)
            seen_titles.add(t)
    return valid_indices


# ---------------------------
# 사용자 벡터 계산 (책별 감정 가중 포함)
# ---------------------------
def compute_user_vector(all_books, embeddings_tensor, book_list, model):
    """
    book_list: [{"title": str, "sentiment": str}, ...]
    감정별 가중치를 반영한 사용자 벡터 계산
    """
    if not book_list:
        return None, all_books, embeddings_tensor

    title2idx = {b["title"]: i for i, b in enumerate(all_books)}
    weighted_vecs, total_weight = [], 0.0
    new_books, new_embeds = [], []

    # 감정별 가중치 설정
    sentiment_weight = {"positive": 1.2, "neutral": 1.0, "negative": 0.6}

    for i, book in enumerate(book_list):
        t = book["title"]
        s = book.get("sentiment", "neutral").lower()
        recency_w = max(1.0 - 0.2 * i, 0.2)
        sentiment_w = sentiment_weight.get(s, 1.0)
        w = recency_w * sentiment_w

        idx = title2idx.get(t)
        if idx is not None and idx < embeddings_tensor.size(0):
            weighted_vecs.append(embeddings_tensor[idx].to(device) * w)
            total_weight += w
        else:
            info = fetch_book_from_naver(t)
            if info:
                new_emb = model.encode(
                    [info["title"] + " " + info["description"]],
                    convert_to_tensor=True
                ).to(device)
                new_books.append(info)
                new_embeds.append(new_emb)
                weighted_vecs.append(new_emb[0] * w)
                total_weight += w

    if new_books:
        embeddings_tensor = torch.cat([embeddings_tensor] + new_embeds)
        all_books = all_books + new_books
        torch.save({"books": all_books, "embeddings": embeddings_tensor.cpu()}, EMBEDDING_PATH)

    user_vec = sum(weighted_vecs) / total_weight if weighted_vecs else None
    return user_vec, all_books, embeddings_tensor


# ---------------------------
# 추천 결과 계산
# ---------------------------
def get_recommendations(all_books, embeddings_tensor, user_vec, titles, top_n=15, sim_threshold=0.6):
    read_titles_set = set(titles)
    if user_vec is None:
        valid_indices = filter_unread_books(all_books, read_titles_set)
        return [(i, 0.0) for i in valid_indices[:top_n]]

    embeddings_tensor = embeddings_tensor.to(device)
    cos_sim = torch.nn.functional.cosine_similarity(user_vec.unsqueeze(0), embeddings_tensor, dim=1).cpu().numpy()
    valid_indices = [i for i in filter_unread_books(all_books, read_titles_set) if i < len(cos_sim)]

    filtered_indices = [i for i in valid_indices if cos_sim[i] >= sim_threshold]
    if len(filtered_indices) < top_n:
        remaining_needed = top_n - len(filtered_indices)
        remaining_sorted = sorted(
            [i for i in valid_indices if i not in filtered_indices],
            key=lambda i: cos_sim[i], reverse=True
        )
        filtered_indices.extend(remaining_sorted[:remaining_needed])

    sorted_indices = sorted(filtered_indices, key=lambda i: cos_sim[i], reverse=True)[:top_n]
    return [(i, float(cos_sim[i])) for i in sorted_indices]


# ---------------------------
# 추천 실행 (여러 감정/책 지원)
# ---------------------------
def run_book_recommendation(book_list, model=None, embedding_path=EMBEDDING_PATH):
    """
    book_list: [{"title": str, "sentiment": str}, ...]
    """
    if model is None:
        model = SentenceTransformer(model_name, device=device)

    if not os.path.exists(embedding_path):
        raise FileNotFoundError(f"{embedding_path} 존재하지 않습니다. 임베딩 파일을 먼저 만들어주세요.")

    data = torch.load(embedding_path, map_location=device)
    all_books = data["books"]
    embeddings_tensor = data["embeddings"]

    # 사용자 벡터 계산
    user_vec, all_books, embeddings_tensor = compute_user_vector(all_books, embeddings_tensor, book_list, model)

    # 제목 리스트만 추출
    titles = [b["title"] for b in book_list]

    rec_indices = get_recommendations(all_books, embeddings_tensor, user_vec, titles)

    final_books = []
    for idx, sim in rec_indices:
        if idx >= len(all_books):
            continue
        book = all_books[idx].copy()
        book["sim"] = sim
        final_books.append(book)

    return final_books


# ---------------------------
# main (테스트)
# ---------------------------
if __name__ == "__main__":
    book_list = [
        {"title": "데미안", "sentiment": "neutral"},
        {"title": "어린 왕자", "sentiment": "positive"},
        {"title": "나미야 잡화점의 기적", "sentiment": "negative"}
    ]

    recs = run_book_recommendation(book_list, model=MODEL)

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
