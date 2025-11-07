import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import json

# CSV 읽기
df = pd.read_csv("../data/similar_words.csv")

# PostgreSQL 배열 형식으로 변환
# def to_pg_array(s):
#     # ['벗', '단짝'] → {"벗","단짝"}

# 문자열 리스트 변환
def to_list(s):
    return [item.strip().strip("'") for item in s.strip("[]").split(",")]

df['similar_words'] = df['similar_words'].apply(to_list)


# PostgreSQL 연결
conn = psycopg2.connect(
    host="localhost",
    dbname="postgres",
    user="postgres",
    password=1234
)
cur = conn.cursor()

# JSONB 컬럼에 맞게 json.dumps로 변환
records = [(row.base_word, json.dumps(row.similar_words)) for row in df.itertuples(index=False)]

# INSERT
execute_values(
    cur,
    "INSERT INTO similar_words (base_word, similar_words) VALUES %s",
    records
)

conn.commit()
cur.close()
conn.close()
