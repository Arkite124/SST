import random, re, pickle,os
from torch import cuda
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

class FairytalePuzzleGenerator:
    def __init__(self, data_path='/data/pickle/processed_sentences.pkl',
                 model_name='jhgan/ko-sroberta-multitask',
                 device=None):
        self.data_path = data_path
        self.model_name = model_name
        self.device = device
        # 디바이스 설정
        self.device = 'cuda' if cuda.is_available() else 'cpu'
        print(f"사용 디바이스: {self.device}")

        # 데이터 로드
        with open(data_path, 'rb') as f:
            data = pickle.load(f)
            self.train_sentences = data['train']
            self.thresholds = data.get('thresholds', {})

        # 임베딩 모델 로드
        print("임베딩 모델 로드 중...")
        self.model = SentenceTransformer(model_name, device=self.device)
        print("✓ 모델 로드 완료!")

        # 나이별로 문장 그룹화
        self._group_by_age()

    def _group_by_age(self):
        self.sentences_by_age = {}
        for sent in self.train_sentences:
            age = sent.get('age')
            if age:
                if age not in self.sentences_by_age:
                    self.sentences_by_age[age] = []
                self.sentences_by_age[age].append(sent)

        print(f"\n나이별 문장 수:")
        for age in sorted(self.sentences_by_age.keys()):
            print(f"  {age}세: {len(self.sentences_by_age[age])}개")

    def _split_into_sentences(self, text):

        # 1. 명확한 문장 종결 패턴으로 분리
        # 마침표/느낌표/물음표 + 공백 + 대문자 or 따옴표
        sentences = re.split(r'(?<=[.!?"])\s+(?=[A-Z가-힣"\'])', text)

        # 2. 각 문장 정제
        clean_sentences = []
        for sent in sentences:
            sent = sent.strip()
            if not sent:
                continue
            # 따옴표로 시작하지 않고 끝에 마침표가 없으면 추가
            if sent and sent[-1] not in '.!?"':
                sent += '.'
            clean_sentences.append(sent)
        return clean_sentences

    def generate_puzzle(self, age=None, difficulty='medium'):
        # 나이 선택
        if age is None:
            age = random.choice(list(self.sentences_by_age.keys()))

        if age not in self.sentences_by_age:
            raise ValueError(f"{age}세 데이터가 없습니다.")

        # 나이와 난이도별 단어 수 범위 조정
        if age <= 6:
            min_words, max_words = 3, 6
        elif age <= 10:
            min_words, max_words = 6, 12
        else:
            min_words, max_words = 10, 18

        # 여러 시도
        for _ in range(100):
            sentence_data = random.choice(self.sentences_by_age[age])
            full_text = sentence_data['text']

            # 문장 분리
            sentences = self._split_into_sentences(full_text)

            # 조건에 맞는 단일 문장 찾기
            for sent in sentences:
                words = sent.split()
                word_count = len(words)

                if min_words <= word_count <= max_words:
                    pieces = [
                        {'id': i, 'word': word, 'position': i}
                        for i, word in enumerate(words)
                    ]
                    shuffled_pieces = pieces.copy()
                    random.shuffle(shuffled_pieces)

                    return {
                        'puzzle_id': hash(sent),
                        'age': age,
                        'original_sentence': sent,
                        'pieces': shuffled_pieces,
                        'word_count': word_count,
                        'title': sentence_data.get('title', ''),
                        'metadata': {
                            'type': sentence_data.get('type', ''),
                            'form': sentence_data.get('form', ''),
                        }
                    }

        # 못 찾은 경우: type이 'summary'인 것 중에서 찾기 (요약문은 더 짧음)
        summary_sentences = [s for s in self.sentences_by_age[age] if s.get('type') == 'summary']
        if summary_sentences:
            sentence_data = random.choice(summary_sentences)
            sent = sentence_data['text'].strip()
            if not sent[-1] in '.!?"':
                sent += '.'

            words = sent.split()
            pieces = [
                {'id': i, 'word': word, 'position': i}
                for i, word in enumerate(words)
            ]
            shuffled_pieces = pieces.copy()
            random.shuffle(shuffled_pieces)

            return {
                'puzzle_id': hash(sent),
                'age': age,
                'original_sentence': sent,
                'pieces': shuffled_pieces,
                'word_count': len(words),
                'title': sentence_data.get('title', ''),
                'metadata': sentence_data.get('metadata', {})
            }
        return None

    def calculate_similarity(self, sentence1: str, sentence2: str) -> float:
        """
        두 문장 간 의미적 유사도 계산

        Args:
            sentence1: 첫 번째 문장
            sentence2: 두 번째 문장

        Returns:
            코사인 유사도 (0~1 사이의 값)
        """
        try:
            # 임베딩 계산
            emb1 = self.model.encode(sentence1)
            emb2 = self.model.encode(sentence2)

            # 코사인 유사도 계산
            similarity = cosine_similarity([emb1], [emb2])[0][0]

            return float(similarity)
        except Exception as e:
            print(f"❌ 유사도 계산 오류: {e}")
            return 0.0