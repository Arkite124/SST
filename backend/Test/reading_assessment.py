from kiwipiepy import Kiwi
from sqlalchemy.orm import Session
from sqlalchemy import text
import random, torch, re, os, json
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from peft import PeftModel, PeftConfig

BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # 현재 파일 위치
filepath = os.path.join(BASE_DIR, "data/labeled_fairytale.json")

class ReadingAssessment:
    # 클래스 변수로 모델 로드 (모든 인스턴스가 공유)
    _model = None
    _tokenizer = None
    _device = None
    _model_loaded = False

    @classmethod
    def _load_model(cls):
        """모델을 한 번만 로드 (클래스 메서드)"""
        if cls._model_loaded:
            return

        MODEL_DIR = "eunchea/t5_fairytale_read"
        cls._device = "cuda" if torch.cuda.is_available() else "cpu"

        try:
            config = PeftConfig.from_pretrained(MODEL_DIR)
            base = AutoModelForSeq2SeqLM.from_pretrained(config.base_model_name_or_path)
            cls._model = PeftModel.from_pretrained(base, MODEL_DIR).to(cls._device)
            cls._tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
            cls._model.eval()
            cls._model_loaded = True
            print("✅ T5 LoRA 모델 로드 완료")
        except Exception as e:
            print(f"⚠️ T5 모델 로드 실패: {e}")
            print("🔄 기본 T5 모델을 사용합니다...")

            try:
                # LoRA 없이 기본 T5 모델만 로드
                from transformers import T5ForConditionalGeneration, T5Tokenizer

                base_model = "psyche/KoT5-summarization"  # 또는 "google/mt5-small"
                cls._model = T5ForConditionalGeneration.from_pretrained(base_model).to(cls._device)
                cls._tokenizer = T5Tokenizer.from_pretrained(base_model)
                cls._model.eval()
                cls._model_loaded = True
                print(f"✅ 기본 T5 모델 로드 완료: {base_model}")
            except Exception as e2:
                print(f"❌ 기본 T5 모델 로드도 실패: {e2}")
                cls._model = None
                cls._tokenizer = None

    def __init__(self, db_session: Session = None):
        """
        Args:
            db_session: DB 세션 (임베딩 기반 오답 생성용)
        """
        # 모델이 아직 로드되지 않았다면 로드
        if not self.__class__._model_loaded:
            self.__class__._load_model()
        self.db = db_session
        self.kiwi = Kiwi()

    def clean_question(self, text: str) -> str:
        """질문 문장을 자연스럽게 다듬는 간단한 후처리"""
        q = text.strip()

        # 1️⃣ 불필요한 반복 구문 제거
        q = re.sub(r"(누가|무엇이)\s+\1", r"\1", q)

        # 2️⃣ '~된 것은 누구일까요?' → '~되었나요?' 형태로 변환
        q = re.sub(r"된 것은 누구입니까[?？]?", "되었나요?", q)
        q = re.sub(r"된 것은 누구일까요[?？]?", "되었나요?", q)

        # 3️⃣ '누가 .* 누구(입니까|일까요)' → '누가 .* 했나요?'
        q = re.sub(r"누가\s+(.+)\s+누구(입니까|일까요)\??", r"누가 \1 했나요?", q)

        # 4️⃣ 어미 보정: 물음표가 없으면 붙이기
        if not q.endswith("?"):
            q += "?"

        # 5️⃣ '~가', '~은' 같은 조사가 없을 때 최소한의 형태 보정
        if not re.search(r"[가-힣]{1,3}(가|이|은|는|를|을)", q):
            q = re.sub(r"(누가|무엇이|어디서|언제|왜|어떻게)", r"\1는", q)

        # 6️⃣ 마지막 마무리 공백 정리
        q = re.sub(r"\s+", " ", q).strip()

        return q

    def _extract_nouns_from_paragraph(self, paragraph: str) -> list[str]:
        """Kiwi를 사용해 문단에서 명사 추출"""
        result = self.kiwi.analyze(paragraph)
        nouns = []

        for token in result[0][0]:
            # 일반명사(NNG), 고유명사(NNP)만 추출
            if token.tag in ['NNG', 'NNP'] and len(token.form) >= 2:
                nouns.append(token.form)

        return list(set(nouns))  # 중복 제거

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

    # 🔹 후보 필터링 로직
    def _is_valid_distractor(self, word: str, answer: str) -> bool:
        word = word.strip()
        # 1️⃣ 길이 제한
        if len(word) < 2 or len(word) > 5:
            return False
        # 2️⃣ 정답과 부분적으로 2글자 이상 겹치면 제외
        for i in range(len(answer) - 1):
            sub = answer[i:i + 2]
            if sub in word:
                return False
        # 3️⃣ 한글 외 문자 포함 시 제외
        if not re.fullmatch(r"[가-힣]+", word):
            return False
        # 4️⃣ 정답과 동일하면 제외
        if word == answer:
            return False
        return True

    def _generate_distractors_from_list(
            self,
            correct_answer: str,
            candidate_words: list[str],
            max_count: int = 3
    ) -> list[str]:
        """후보 단어 리스트에서 오답 생성 (필터링 + 정렬)"""
        # 필터링
        filtered = [w for w in candidate_words if self._is_valid_distractor(w, correct_answer)]

        # 중복 제거
        filtered = list(dict.fromkeys(filtered))

        # 간단한 유사도 계산 (문자열 기반)
        def simple_similarity(word1, word2):
            return sum(a == b for a, b in zip(word1, word2)) / max(len(word1), len(word2))

        # 유사도 기반 정렬
        filtered.sort(key=lambda w: simple_similarity(w, correct_answer), reverse=True)

        return filtered[:max_count]

    def _generate_distractors(
            self,
            correct_answer: str,
            paragraph: str,
            db_words: list[str] = None,
            age_level: int = 7
    ) -> list[str]:
        """오답 선택지 생성 (임베딩 유사도 기반)"""
        distractors = []

        # 1순위: DB 임베딩 유사도
        if self.db:
            similar_words = self._find_similar_words_from_db(correct_answer, limit=10)
            distractors.extend(self._generate_distractors_from_list(correct_answer, similar_words, 5))

        # 2순위: db_words 리스트에서 선택
        if len(distractors) < 3 and db_words:
            remaining = self._generate_distractors_from_list(correct_answer, db_words, 5)
            distractors.extend(remaining)

        # 3순위: 같은 문단의 명사
        if len(distractors) < 3:
            paragraph_nouns = self._extract_nouns_from_paragraph(paragraph)
            remaining = self._generate_distractors_from_list(correct_answer, paragraph_nouns, 3)
            distractors.extend(remaining)

        # 4순위: DB에서 같은 난이도 랜덤
        if len(distractors) < 3 and self.db:
            try:
                query = text("""
                            SELECT word FROM voca_labels
                            WHERE assigned_age BETWEEN :min_age AND :max_age
                            AND word != :correct_answer
                            AND LENGTH(word) >= 2
                            ORDER BY RANDOM()
                            LIMIT 10
                        """)

                result = self.db.execute(
                    query,
                    {
                        "min_age": age_level - 1,
                        "max_age": age_level + 1,
                        "correct_answer": correct_answer
                    }
                )

                random_words = [row[0] for row in result.fetchall()]
                remaining = self._generate_distractors_from_list(correct_answer, random_words, 5)
                distractors.extend(remaining)

            except Exception as e:
                print(f"⚠️ DB 랜덤 검색 실패: {e}")

        # 최종 중복 제거
        distractors = list(dict.fromkeys(distractors))
        return distractors[:3]

    def _parse_t5_output(self, raw_output: str) -> dict:
        """T5 모델 출력 파싱"""
        question, answer = None, None

        if "답:" in raw_output or "정답:" in raw_output:
            try:
                # "답:" 또는 "정답:" 기준으로 분리
                if "정답:" in raw_output:
                    parts = raw_output.split("정답:", 1)
                else:
                    parts = raw_output.split("답:", 1)

                question_part = parts[0].strip()

                # "질문:" 또는 "Q:" 제거
                for prefix in ["질문:", "Q:", "질문 :", "Q :"]:
                    if question_part.startswith(prefix):
                        question_part = question_part.replace(prefix, "", 1).strip()

                # 물음표까지가 질문
                if '?' in question_part:
                    question = question_part.split('?')[0].strip() + '?'
                else:
                    question = question_part

                # 정답 부분
                answer = parts[1].strip()

            except Exception as e:
                print(f"⚠️ T5 출력 파싱 실패: {e}")
                question = raw_output.strip()
                answer = None
        else:
            # 파싱 패턴이 없으면 전체를 질문으로 처리
            question = raw_output.strip()
            answer = None

        return {"question": question, "answer": answer}

    def create_question_from_qna(
            self,
            paragraph: str,
            qna_result: dict,
            age_level: int = 7
    ) -> dict:
        """
        QnA를 4지선다 형식으로 변환

        Args:
            paragraph: 원본 문단
            qna_result: generate_qna_from_paragraph의 결과
            age_level: 난이도

        Returns:
            dict: 4지선다 문제
        """
        question = qna_result.get("question")
        correct_answer = qna_result.get("answer")
        distractors = qna_result.get("distractors", [])
        choices = qna_result.get("choices", [])

        if not question or not correct_answer:
            raise ValueError("질문 또는 정답이 없습니다.")

        # choices가 이미 있으면 그대로 사용
        if not choices or len(choices) < 4:
            # choices가 없으면 새로 생성
            if len(distractors) < 3:
                # 오답이 부족하면 문단에서 추출
                nouns = self._extract_nouns_from_paragraph(paragraph)
                for n in nouns:
                    if self._is_valid_distractor(n, correct_answer) and n not in distractors:
                        distractors.append(n)
                        if len(distractors) >= 3:
                            break

            choices = [correct_answer] + distractors[:3]
            random.shuffle(choices)

        return {
            'type': 'reading_comprehension',
            'age_level': age_level,
            'context': paragraph,
            'question': question,
            'choices': choices,
            'correct_answer': correct_answer,
            'correct_index': choices.index(correct_answer) if correct_answer in choices else 0
        }

    def verify_answer(self, question_data: dict, user_choice_index: int) -> dict:
        """답안 검증"""
        is_correct = (user_choice_index == question_data.get('correct_index', -1))

        return {
            'correct': is_correct,
            'age_level': question_data.get('age_level', 0),
            'correct_answer': question_data.get('correct_answer', ''),
            'user_answer': question_data.get('choices', [])[user_choice_index] if user_choice_index < len(question_data.get('choices', [])) else ''
        }

    def generate_qna_from_paragraph(self, age: int, paragraph: str, db_words: list[str] = None) -> dict:
        """
        T5 모델로 QnA 생성 + 오답 생성

        Args:
            age: 난이도 (연령)
            paragraph: 문단
            db_words: DB에서 가져온 단어 리스트 (오답 후보용)

        Returns:
            dict: {question, answer, distractors, choices}
        """
        if not self.__class__._model or not self.__class__._tokenizer:
            return {"error": "모델이 로드되지 않았습니다.", "question": "", "answer": "", "distractors": [], "choices": []}

        # T5 모델 실행
        prompt = f"문단을 읽고 {age}세 수준의 질문과 정답을 만들어 주세요.\n\n문단: {paragraph}"
        inputs = self.__class__._tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=512
        ).to(self.__class__._device)

        with torch.no_grad():
            outputs = self.__class__._model.generate(
                **inputs,
                max_new_tokens=128,
                temperature=0.9,
                top_p=0.9,
                do_sample=True,
                num_return_sequences=1
            )

        result = self.__class__._tokenizer.decode(outputs[0], skip_special_tokens=True)

        # 파싱
        answer_patterns = [r"정답\s*[:：]\s*", r"답\s*[:：]\s*", r"Answer\s*[:：]\s*"]
        question, answer = result, ""

        for pattern in answer_patterns:
            if re.search(pattern, result):
                parts = re.split(pattern, result, maxsplit=1)
                question = parts[0].strip()
                answer = parts[1].strip() if len(parts) > 1 else ""
                break

        # 질문 정리
        question = re.sub(r"^(질문\s*[:：]\s*)", "", question).strip()
        question = self.clean_question(question)

        # 정답이 없으면 오답도 생성 불가
        if not answer:
            return {
                "question": question,
                "answer": answer,
                "distractors": [],
                "choices": []
            }

        # 오답 생성
        distractors = self._generate_distractors(answer, paragraph, db_words, age)

        # 선택지 생성
        all_choices = list(set(distractors + [answer]))
        random.shuffle(all_choices)

        return {
            "question": question,
            "answer": answer,
            "distractors": distractors,
            "choices": all_choices
        }


    # def load_json_files(self) -> list[dict]:
    #     """JSON 파일들을 로드"""
    #     json_files = []
    #
    #     if not os.path.exists(JSON_DATA_PATH):
    #         print(f"⚠️ JSON 데이터 경로가 존재하지 않습니다: {JSON_DATA_PATH}")
    #         return []
    #
    #     for filename in os.listdir(JSON_DATA_PATH):
    #         if filename.endswith('.json'):
    #             filepath = os.path.join(JSON_DATA_PATH, filename)
    #             try:
    #                 with open(filepath, 'r', encoding='utf-8') as f:
    #                     data = json.load(f)
    #                     # 리스트로 감싸져 있는 경우 처리
    #                     if isinstance(data, list):
    #                         json_files.extend(data)
    #                     else:
    #                         json_files.append(data)
    #             except Exception as e:
    #                 print(f"⚠️ JSON 로드 실패 ({filename}): {e}")
    #
    #     return json_files

    def load_json_file(self) -> list[dict]:
        """단일 JSON 파일(labeled_fairytale.json) 로드"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # 리스트로 감싸져 있는 경우 처리
                if isinstance(data, list):
                    return data
                else:
                    return [data]
        except Exception as e:
            print(f"⚠️ JSON 로드 실패 ({filepath}): {e}")
            return []

    @staticmethod
    def create_paragraph_from_sentences(labeled_text: list[dict], index: int) -> tuple[str, int]:
        """
        labeled_text에서 연속된 3개 문장을 이어붙여 문단 생성

        Args:
            labeled_text: [{"sentence": "...", "difficulty": 7}, ...]
            index: 선택된 문장의 인덱스

        Returns:
            (paragraph, avg_difficulty)
        """
        if not labeled_text or index >= len(labeled_text):
            return "", 7

        # 현재 문장 앞뒤로 1개씩 (총 3개)
        start_idx = max(0, index - 1)
        end_idx = min(len(labeled_text), index + 2)

        selected_sentences = labeled_text[start_idx:end_idx]

        def clean_sentence(s):
            s = str(s).strip()
            # 1. 문장 맨 앞의 숫자와 마침표/괄호, 공백 제거 (예: "1. 문장" -> "문장")
            s = re.sub(r'^\s*[\d\.\)]+\s*', '', s)
            # 2. 불필요한 공백 정리
            s = re.sub(r'\s+', ' ', s)

            # 3. 🎯 핵심 수정: 문장 끝이 마침표, 물음표, 느낌표로 끝나지 않으면 마침표를 추가
            if not re.search(r'[.?!]$', s):
                s += '.'

            return s.strip()

        cleaned_sentences = [clean_sentence(item["sentence"]) for item in selected_sentences]

        # 문장들을 이어붙이기
        paragraph = " ".join(cleaned_sentences)

        # 평균 난이도 계산
        difficulties = [item.get("difficulty", 7) for item in selected_sentences]
        avg_difficulty = int(sum(difficulties) / len(difficulties))

        return paragraph, avg_difficulty


    def generate_random_paragraphs(self, num_paragraphs: int = 10) -> list[tuple[str, int]]:
        """
        JSON 파일에서 랜덤으로 문단 생성

        Args:
            num_paragraphs: 생성할 문단 개수

        Returns:
            [(paragraph, difficulty), ...]
        """
        all_data = self.load_json_file()

        if not all_data:
            raise ValueError("JSON 데이터를 찾을 수 없습니다.")

        # labeled_text가 있는 객체만 필터링
        valid_objects = [obj for obj in all_data if "labeled_text" in obj and obj["labeled_text"]]

        if len(valid_objects) < num_paragraphs:
            print(f"⚠️ 요청한 개수({num_paragraphs})보다 적은 데이터({len(valid_objects)})만 있습니다.")
            num_paragraphs = len(valid_objects)

        # 랜덤으로 객체 선택
        selected_objects = random.sample(valid_objects, num_paragraphs)

        paragraphs = []
        for obj in selected_objects:
            labeled_text = obj["labeled_text"]

            # labeled_text 내에서 랜덤하게 하나 선택
            if len(labeled_text) >= 3:
                # 앞뒤로 1개씩 가져올 수 있는 인덱스 선택
                valid_indices = range(1, len(labeled_text) - 1)
                if valid_indices:
                    random_index = random.choice(list(valid_indices))
                else:
                    random_index = 0
            else:
                random_index = 0

            paragraph, difficulty = self.create_paragraph_from_sentences(labeled_text, random_index)
            paragraphs.append((paragraph, difficulty))

        return paragraphs


if __name__ == '__main__':
    assessment = ReadingAssessment()
    try:
        # ... 문단 생성 로직 ...
        paragraphs = assessment.generate_random_paragraphs(num_paragraphs=1)
        if paragraphs:
            paragraph, difficulty = paragraphs[0]
            # ...
            qna_result = assessment.generate_qna_from_paragraph(age=difficulty, paragraph=paragraph)
            # ...
            question_data = assessment.create_question_from_qna(paragraph, qna_result)

            print("\n--- ❗ 최종 Question 객체 확인 ❗ ---")
            import json

            # ⚠️ 이 출력에서 'choices' 배열이 4개의 항목을 포함하고 있는지 확인해야 합니다.
            print(json.dumps(question_data, ensure_ascii=False, indent=4))
        else:
            print("\n⚠️ 문단 생성 실패: JSON 파일 로드 문제일 수 있습니다.")
    except Exception as e:
        print(f"\n❌ 문제 생성 로직 실행 중 오류 발생: {e}")