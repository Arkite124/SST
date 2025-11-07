import requests
import random
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
import xml.etree.ElementTree as ET
from models import UserGames


class WordChainGame:
    def __init__(self, api_key: str, db: Session = None):
        self.api_key = api_key
        self.base_url = f'https://krdict.korean.go.kr/api/search?key={self.api_key}'
        self.blacklist = ['즘', '틱', '늄', '슘', '퓸', '늬', '뺌', '섯', '숍', '튼', '름', '늠', '쁨']

        self.games: Dict[str, Dict[str, Any]] = {}
        self.db = db

        # 난이도별 설정
        self.mistake_rates = {
            "easy": 0.9,  # 90% 확률로 쉬운 단어
            "medium": 0.8,  # 80% 확률로 쉬운 단어
            "hard": 0.7  # 70% 확률로 쉬운 단어
        }

    def create_game(self, game_id: str, difficulty: str = 'medium') -> dict:
        """새 게임 생성"""

        if game_id in self.games:
            del self.games[game_id]
            print(f"🗑️ 기존 게임 {game_id} 삭제")

        computer_starts = random.choice([True, False])

        first_word = None
        first_definition = None
        message = "게임을 시작합니다!"

        if computer_starts:
            first_word = self._get_random_word()
            if first_word:
                first_definition = self._get_word_definition(first_word)
                message = f"컴퓨터가 '{first_word}'로 시작합니다!"
            else:
                computer_starts = False
                message = "사용자가 먼저 시작합니다!"
        else:
            message = "사용자가 먼저 시작합니다!"

        self.games[game_id] = {
            'game_id': game_id,
            'difficulty': difficulty,
            'score': 0,
            'history': [first_word] if first_word else [],
            'game_over': False,
            'user_id': None,
            'last_word': first_word,  # ✅ sword → last_word
            'used_words': {first_word} if first_word else set(),
            'winner': None,
            'mistake_rate': self.mistake_rates.get(difficulty, 0.8)
        }

        print(f"✅ 새 게임 {game_id} 생성 완료 (games에 저장됨)")
        print(f"🔍 현재 게임 목록: {list(self.games.keys())}")

        return {
            'message': message,
            'first_word': first_word if computer_starts else None,
            'first_definition': first_definition if computer_starts else None,
            'computer_starts': computer_starts
        }

    def make_move(self, game_id: str, word: str, user_id: int = None) -> dict:
        """사용자의 단어 입력 처리"""

        if game_id not in self.games:
            raise Exception(f"게임 {game_id}를 찾을 수 없습니다")

        game = self.games[game_id]

        if game['game_over']:
            # 사용자가 패배할 때 입력한 단어도 last_word에 반영
            game['last_word'] = word
            return {
                'success': False,
                'message': '게임이 이미 종료되었습니다',
                'game_over': True,
                'score': game['score'],
            }

        if not user_id:
            user_id = game.get('user_id')

        # 1. 단어 유효성 검사 → 실패 시 패배
        if not self._is_valid_word(word):
            game['game_over'] = True
            game['winner'] = 'computer'

            if user_id and self.db:
                self._save_game_result(game_id, user_id, last_word=word)

            return {
                'success': False,
                'message': f"😢 패배! '{word}'는 사전에 없는 단어입니다",
                'game_over': True,
                'winner': 'computer',
                'score': game['score'],
                'reason': f"'{word}'는 사전에 없는 단어입니다"
            }

        # 2. 이미 사용된 단어인지 확인 → 실패 시 패배
        if word in game['used_words']:
            game['game_over'] = True
            game['winner'] = 'computer'

            if user_id and self.db:
                self._save_game_result(game_id, user_id)

            return {
                'success': False,
                'message': f"😢 패배! '{word}'는 이미 사용된 단어입니다",
                'game_over': True,
                'winner': 'computer',
                'score': game['score'],
                'reason': f"'{word}'는 이미 사용된 단어입니다"
            }

        # 3. 끝말잇기 규칙 확인 (두음법칙 + 경음화)
        # ✅ 항상 초기화
        dueum_applied = False
        chisa_applied = False
        dueum_message = ""
        chisa_message = ""

        if game['last_word']:
            last_char = game['last_word'][-1]
            first_char = word[0]

            # ✅ 두음법칙 체크
            dueum_applied = self._check_dueum(last_char, first_char)
            if dueum_applied:
                dueum_message = f"두음법칙 적용: '{last_char}' → '{first_char}'"

            # ✅ 경음화 체크
            chisa_applied = self._check_chisa(last_char, first_char)
            if chisa_applied:
                chisa_message = f"경음화 적용: '{last_char}' → '{first_char}'"

            # ✅ 규칙 위반 확인
            if not dueum_applied and not chisa_applied and last_char != first_char:
                game['game_over'] = True
                game['winner'] = 'computer'

                if user_id and self.db:
                    self._save_game_result(game_id, user_id)

                return {
                    'success': False,
                    'message': f"😢 패배! '{game['last_word']}'의 마지막 글자 '{last_char}'로 시작해야 합니다",
                    'game_over': True,
                    'winner': 'computer',
                    'score': game['score'],
                    'reason': f"'{game['last_word']}'의 마지막 글자 '{last_char}'로 시작해야 하는데 '{first_char}'로 시작했습니다"
                }

        # 4. 사용자 단어 처리
        user_definition = self._get_word_definition(word)
        game['history'].append(word)
        game['used_words'].add(word)
        game['score'] += 10

        # 5. 컴퓨터 차례
        computer_result = self._get_computer_word(
            word[-1],
            game['used_words'],
            mistake_rate=game['mistake_rate']
        )

        if not computer_result:
            # 컴퓨터가 단어를 찾지 못함 → 사용자 승리
            game['game_over'] = True
            game['winner'] = 'user'

            if user_id and self.db:
                self._save_game_result(game_id, user_id)

            return {
                'success': True,
                'message': '🎉 승리! 컴퓨터가 단어를 찾지 못했습니다',
                'game_over': True,
                'winner': 'user',
                'score': game['score'],
                'user_word': word,
                'user_definition': user_definition
            }

        # 컴퓨터 단어 처리
        computer_word = computer_result["word"]
        computer_definition = computer_result["definition"]
        game['history'].append(computer_word)
        game['used_words'].add(computer_word)
        game['last_word'] = computer_word

        return {
            'success': True,
            'message': '정답입니다!',
            'game_over': False,
            'score': game['score'],
            'user_word': word,
            'user_definition': user_definition,
            'computer_word': computer_word,
            'computer_definition': computer_definition,
            'dueum_message': dueum_message if dueum_applied else "",
            'chisa_message': chisa_message if chisa_applied else "",
            'dueum_applied': dueum_applied,
            'chisa_applied': chisa_applied
        }

    def _check_dueum(self, last_char: str, first_char: str) -> bool:
        """
        두음법칙 체크
        - 녀/뇨/뉴/니 → 여/요/유/이
        - 랴/려/례/료/류/리 → 야/여/예/요/유/이
        - 라/래/로/뢰/루/르 → 아/애/오/외/우/으
        """
        dueum_rules = {
            # ㄴ 두음법칙
            '녀': ['여'], '뇨': ['요'], '뉴': ['유'], '니': ['이'],

            # ㄹ 두음법칙 (ㄹ 뒤 ㅑ, ㅕ, ㅖ, ㅛ, ㅠ, ㅣ)
            '랴': ['야'], '려': ['여'], '례': ['예'],
            '료': ['요'], '류': ['유'], '리': ['이'],

            # ㄹ 두음법칙 (ㄹ 뒤 ㅏ, ㅐ, ㅓ, ㅔ, ㅗ, ㅚ, ㅜ, ㅡ)
            '라': ['아', '나'], '래': ['애', '내'],
            '로': ['오', '노'], '뢰': ['외', '뇌'],
            '루': ['우', '누'], '르': ['으', '느']
        }

        return first_char in dueum_rules.get(last_char, [])

    def _check_chisa(self, last_char: str, first_char: str) -> bool:
        """
        경음화 체크 (받침 ㄱ, ㄷ, ㅂ 뒤에서 ㄱ→ㄲ, ㄷ→ㄸ, ㅂ→ㅃ, ㅅ→ㅆ, ㅈ→ㅉ)
        """
        try:
            # 받침 추출
            last_char_code = ord(last_char) - 0xAC00
            if last_char_code < 0 or last_char_code > 11172:
                return False

            jongseong = last_char_code % 28

            # ㄱ, ㄷ, ㅂ 받침 (1, 7, 17)
            if jongseong not in [1, 7, 17]:
                return False

            # 첫 자음 추출
            first_char_code = ord(first_char) - 0xAC00
            if first_char_code < 0 or first_char_code > 11172:
                return False

            choseong = first_char_code // 588

            # 경음화 규칙: ㄱ, ㄷ, ㅂ, ㅅ, ㅈ이 경음으로 변할 수 있음
            # 평음: ㄱ=0, ㄷ=3, ㅂ=9, ㅅ=9, ㅈ=12
            if choseong in [0, 3, 9, 12]:  # ㄱ, ㄷ, ㅂ, ㅈ
                return True

            return False
        except:
            return False

    def _save_game_result(self, game_id: str, user_id: int, last_word: str = None):
        """게임 결과를 DB에 저장"""
        if not self.db or game_id not in self.games:
            return

        game = self.games[game_id]

        final_history = game['history'][:]

        # 마지막 단어를 반영 (패배 단어 포함)
        if last_word and (not final_history or final_history[-1] != last_word):
            final_history.append(last_word)
        elif game['last_word'] and (not final_history or final_history[-1] != game['last_word']):
            final_history.append(game['last_word'])

        word_history_data = {
            "words": final_history,
            "winner": game.get('winner')  # 'user', 'computer', or None
        }

        try:
            user_game = UserGames(
                user_id=user_id,
                game_type='word_chain',
                difficulty=game.get('difficulty', 'medium'),
                score=game['score'],
                word_history=word_history_data
            )

            self.db.add(user_game)
            self.db.commit()
            print(f"✅ 끝말잇기 결과 저장 완료 (user_id={user_id}, score={game['score']})")

        except Exception as e:
            self.db.rollback()
            print(f"❌ 끝말잇기 결과 저장 실패: {e}")

    def _is_valid_word(self, word: str) -> bool:
        """단어가 사전에 있는지 확인"""
        try:
            url = self.base_url + f'&part=word&pos=1&sort=popular&num=100&q={word}'
            response = requests.get(url, timeout=3)

            return '<word>' in response.text and 'pos>1<' not in response.text # pos>2< 이상은 동사/형용사
        except Exception as e:
            print(f"❌ 단어 유효성 검사 오류: {e}")
            return False

    def _get_word_definition(self, word: str) -> str:
        """단어 정의 가져오기"""
        try:
            url = self.base_url + '&part=word&pos=1&sort=popular&num=100&q=' + word
            response = requests.get(url, timeout=3)

            if '<definition>' in response.text:
                start = response.text.find('<definition>') + len('<definition>')
                end = response.text.find('</definition>')
                return response.text[start:end]
            return "정의 없음"
        except:
            return "정의 없음"

    def _get_random_word(self) -> Optional[str]:
        # 🔥 쉬운 글자들 중 랜덤 선택 (끝말잇기 하기 좋은 글자)
        chars = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차']
        start_char = random.choice(chars)

        try:
            url = f"{self.base_url}&part=word&pos=1&q={start_char}*"
            response = requests.get(url, timeout=3)

            words = []
            text = response.text
            while '<word>' in text:
                start = text.find('<word>') + len('<word>')
                end = text.find('</word>')
                word = text[start:end]

                if 2 <= len(word) <= 4 and word[-1] not in self.blacklist:
                    words.append(word)

                text = text[end + len('</word>'):]

            return random.choice(words) if words else None
        except:
            return None

    def _get_computer_word(self, start_char: str, used_words: set, mistake_rate: float) -> dict[str, str | Any] | None:
        """컴퓨터가 사용할 단어 찾기"""
        try:
            url = self.base_url + f'&part=word&pos=1&level=level1&q={start_char}*'
            response = requests.get(url, timeout=3)

            words = []
            text = response.text
            while '<word>' in text:
                start = text.find('<word>') + len('<word>')
                end = text.find('</word>')
                word = text[start:end]

                # 접두사/접미사 제거 & 검증
                if (2 <= len(word) <= 4 and
                        word not in used_words and
                        word[-1] not in self.blacklist and
                        not word.startswith(('*', '-')) and
                        not word.endswith(('*', '-'))):
                    words.append(word)

                text = text[end + len('</word>'):]

            if not words:
                # 두음법칙 적용 시도
                dueum_candidates = [w for w in words if self._check_dueum(start_char, w[0])]
                if dueum_candidates:
                    words = dueum_candidates

            if not words:
                return None

                # 난이도별 선택 (실수 확률)
            if random.random() < mistake_rate:
                easy_words = [w for w in words if w[-1] in ['가', '나', '다']]
                if easy_words:
                    chosen = random.choice(easy_words)
                    return {"word": chosen, "definition": self._get_word_definition(chosen)}

                # 일반 랜덤 선택
            chosen = random.choice(words)
            return {"word": chosen, "definition": self._get_word_definition(chosen)}

        except:
            return None

    def get_game_count(self) -> int:
        """현재 게임 수 반환"""
        return len(self.games)

    def restart_game(self, game_id: str):
        """게임 재시작"""
        if game_id in self.games:
            del self.games[game_id]

    def get_history(self, game_id: str) -> list:
        """게임 히스토리 조회"""
        if game_id not in self.games:
            raise Exception(f"게임 {game_id}를 찾을 수 없습니다")
        return self.games[game_id].get('history', [])

    def delete_game(self, game_id: str):
        """게임 삭제"""
        if game_id in self.games:
            del self.games[game_id]