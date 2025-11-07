import random, re, os, json
from kiwipiepy import Kiwi
from sqlalchemy.orm import Session
from sqlalchemy import text

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
filepath = os.path.join(BASE_DIR, "data/labeled_fairytale.json")

class VocabularyAssessment:
    def __init__(self, db_session: Session = None):
        self.db = db_session
        self.kiwi = Kiwi()

    def load_json_file(self) -> list[dict]:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data if isinstance(data, list) else [data]
        except Exception as e:
            print(f"⚠️ JSON 로드 실패 ({filepath}): {e}")
            return []

    def _extract_nouns_from_paragraph(self, paragraph: str) -> list[str]:
        result = self.kiwi.analyze(paragraph)
        nouns = [token.form for token in result[0][0] if token.tag in ['NNG', 'NNP'] and len(token.form) >= 2]
        return list(set(nouns))

    def _find_similar_words_from_db(self, correct_answer: str, limit: int = 10) -> list[str]:
        """DB에서 임베딩 유사도 기반으로 유사 단어 찾기"""
        if not self.db:
            return []

        try:
            # voca_labels 테이블 내에서 임베딩 유사도 계산
            query = text("""
                        SELECT v2.word, 1 - (v1.embedding <=> v2.embedding) AS similarity
                        FROM voca_labels v1
                        JOIN voca_labels v2 ON v1.word != v2.word
                        WHERE v1.word = :correct_answer
                        -- 🎯 유사도가 0.5 이하인 단어만 선택 (거리 >= 0.5)
                        AND (v1.embedding <=> v2.embedding) >= 0.5 
                        ORDER BY 
                            -- 🎯 거리가 가장 먼(유사도가 가장 낮은) 단어부터 정렬
                            v1.embedding <=> v2.embedding DESC
                        LIMIT :limit
                    """)

            result = self.db.execute(
                query,
                {"correct_answer": correct_answer, "limit": limit}
            )

            similar_words = [row[0] for row in result.fetchall()]
            return similar_words

        except Exception as e:
            print(f"⚠️ DB 유사도 검색 실패: {e}")
            return []

    def _is_valid_distractor(self, word: str, answer: str) -> bool:
        word = word.strip()
        # 1️⃣ 길이 제한 완화
        if len(word) < 2:
            return False

        # 2️⃣ 정답과 3글자 이상 겹치면 제외
        for i in range(len(answer) - 2):
            if answer[i:i + 2] in word:
                return False

        # 3️⃣ 한글만 허용 (기존)
        if not re.fullmatch(r"[가-힣]+", word):
            return False

        # 4️⃣ 정답과 같으면 제외
        if word == answer:
            return False
        return True

    def _generate_distractors(self, correct_word: str, sentence: str, age_level: int = 7) -> list[str]:
        distractors = []

        # 1️⃣ DB 임베딩 유사도 기반
        db_words = self._find_similar_words_from_db(correct_word, limit=10)
        distractors.extend([w for w in db_words if self._is_valid_distractor(w, correct_word)])

        # 2️⃣ 문장 명사 기반
        if len(distractors) < 3:
            nouns = self._extract_nouns_from_paragraph(sentence)
            for n in nouns:
                if self._is_valid_distractor(n, correct_word) and n not in distractors:
                    distractors.append(n)
                    if len(distractors) >= 3:
                        break

        # 3️⃣ 같은 난이도 DB 단어 랜덤
        if len(distractors) < 3 and self.db:
            try:
                query = text("""
                    SELECT word FROM voca_labels
                    WHERE assigned_age BETWEEN :min_age AND :max_age
                    AND word != :correct_word
                    AND LENGTH(word) >= 2
                    ORDER BY RANDOM()
                    LIMIT 10
                """)
                result = self.db.execute(query, {"min_age": age_level-1, "max_age": age_level+1, "correct_word": correct_word})
                random_words = [row[0] for row in result.fetchall()]
                for w in random_words:
                    if self._is_valid_distractor(w, correct_word) and w not in distractors:
                        distractors.append(w)
                        if len(distractors) >= 3:
                            break
            except Exception as e:
                print(f"⚠️ DB 랜덤 검색 실패: {e}")

        # 최종 3개 제한
        return distractors[:3]

    def generate_fill_in_blank_question(self, age_level: int = 7) -> dict:
        data = self.load_json_file()
        candidate_sentences = [s["sentence"] for obj in data for s in obj.get("labeled_text", []) if s.get("difficulty", 7) == age_level]
        if not candidate_sentences:
            candidate_sentences = [s["sentence"] for obj in data for s in obj.get("labeled_text", [])]

        sentence = random.choice(candidate_sentences).strip()
        words = sentence.split()
        blank_idx = random.randint(0, len(words)-1)
        correct_word = words[blank_idx]
        words[blank_idx] = "_____"
        blank_sentence = " ".join(words)

        distractors = self._generate_distractors(correct_word, sentence, age_level)
        choices = distractors + [correct_word]
        random.shuffle(choices)

        return {
            "type": "fill_in_blank",
            "age_level": age_level,
            "sentence": sentence,
            "question": "다음 빈 칸에 알맞는 단어를 고르세요.",
            "blank_sentence": blank_sentence,
            "choices": choices,
            "correct_answer": correct_word,
            "correct_index": choices.index(correct_word)
        }

# 테스트
if __name__ == "__main__":
    assessment = VocabularyAssessment()
    q = assessment.generate_fill_in_blank_question(age_level=7)
    import json
    print(json.dumps(q, ensure_ascii=False, indent=4))
