import os
import csv
import requests
import json
import ast
from tqdm import tqdm
from dotenv import load_dotenv

# -----------------------------
# 환경 설정
# -----------------------------
load_dotenv()
API_KEY = os.getenv("DICTIONARY_KEY")  # 표준국어대사전 Open API 키 필요
API_URL = "https://stdict.korean.go.kr/api/search.do"

INPUT_FILE = "similar_words.csv"       # 입력 파일 (base_word, similar_words)
OUTPUT_FILE = "filtered_words.csv"  # 결과 파일

# -----------------------------
# 사전 정의 존재 여부 확인 함수
# -----------------------------

def has_definition(word):
    url = f"https://stdict.korean.go.kr/api/search.do?key={API_KEY}&type_search=search&req_type=json&q={word}"
    try:
        res = requests.get(url, timeout=5)
        data = res.json()
        return data.get("channel", {}).get("total", 0) != 0
    except Exception:
        return False

def filter_words(input_file, output_file):
    results = []

    # 💡 utf-8-sig 로 BOM 제거
    with open(input_file, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    for row in tqdm(rows, desc="표준국어대사전 검사 중..."):
        base_word = row["base_word"].strip()
        similar_words = ast.literal_eval(row["similar_words"])

        # 기준 단어 사전 정의 확인
        if not has_definition(base_word):
            continue

        filtered_similars = [w for w in similar_words if has_definition(w)]

        if filtered_similars:
            results.append({
                "base_word": base_word,
                "similar_words": str(filtered_similars)
            })

    with open(output_file, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["base_word", "similar_words"])
        writer.writeheader()
        writer.writerows(results)

    print(f"\n필터 완료 {len(results)}개 단어가 남았습니다.")
    print(f" 저장 위치: {os.path.abspath(output_file)}")

if __name__ == "__main__":
    filter_words(INPUT_FILE, "filtered_words.csv")