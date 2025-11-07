# pip install requests hgtk python-dotenv
import requests, hgtk, random, os
from dotenv import load_dotenv
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from models import UserGames

class InitialQuizGame:
    def __init__(self, api_key: str, db: Session = None):
        load_dotenv()
        self.api_key = os.getenv("KOREAN_BASIC_KEY")
        self.base_url = f'https://krdict.korean.go.kr/api/search?key={self.api_key}'
        self.blacklist = ['즘', '틱', '늄', '슘', '퓸', '늬', '뺌', '섯', '숍', '튼', '름', '늠', '쁨']
        self.games: Dict[str, dict] = {}
        self.db = db  # ✅ DB 세션 저장

    def _save_game_result(self, game_id: str, user_id: int):
        """게임 결과를 DB에 저장"""
        if not self.db:
            return

        game = self.games.get(game_id)
        if not game:
            return

        try:
            user_game = UserGames(
                user_id=user_id,
                game_type='word_spell',
                difficulty=game.get('difficulty', 'medium'),
                score=game['score'] * 10,
                word_history=None  # ✅ 초성퀴즈는 word_history 불필요
            )

            self.db.add(user_game)
            self.db.commit()
            print(f"✅ 초성퀴즈 결과 저장 완료 (user_id={user_id}, score={game['score']})")

        except Exception as e:
            self.db.rollback()
            print(f"❌ 초성퀴즈 결과 저장 실패: {e}")

    # ---------- 1️⃣ 단어 랜덤 추출 ----------
    def _get_random_word(self, difficulty: str = "medium") -> Optional[dict]:
        try:
            level_map = {
                "easy": "level1",
                "medium": "level2",
                "hard": "level3"
            }
            level = level_map.get(difficulty, "level2")

            # 임의의 초성 선택
            start_chars = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하']
            start_char = random.choice(start_chars)
            url = self.base_url + f'&part=word&pos=1&level={level}&q={start_char}*'

            response = requests.get(url, timeout=5)

            items = self._mid_return_all(response.text, '<item>', '</item>')

            candidates = []

            for w in items:
                word = self._mid_return(w, '<word>', '</word>')
                pos = self._mid_return(w, '<pos>', '</pos>')
                definition = self._mid_return(w, '<definition>', '</definition>')

                # 🔥 정의가 비어있지 않은지 확인
                if (pos == '명사' and
                        2 <= len(word) <= 4 and
                        word[-1] not in self.blacklist and
                        definition.strip()):  # 정의 확인
                    candidates.append((word, definition))

            if not candidates:
                return None

            word, definition = random.choice(candidates)
            return {"word": word, "definition": definition}

        except Exception as e:
            return None

    # ---------- 2️⃣ 초성 추출 ----------
    def _get_initials(self, word: str) -> str:
        """단어를 초성으로 변환"""
        try:
            initials = ''.join([
                hgtk.letter.decompose(ch)[0] if hgtk.checker.is_hangul(ch) else ch
                for ch in word
            ])
            return initials
        except Exception as e:
            return word

    # ---------- 3️⃣ 게임 생성 ----------
    def create_game(self, game_id: str, difficulty: str = "medium"):
        """게임 세션 생성"""

        problems = []
        used_initials = set()
        max_attempts = 50  # 최대 시도 횟수
        attempts = 0

        # 🔥 10개의 문제를 확실히 생성
        while len(problems) < 10 and attempts < max_attempts:
            attempts += 1
            data = self._get_random_word(difficulty)

            if data:
                initial = self._get_initials(data["word"])

                # 🔥 초성 중복 체크
                if initial and data["definition"].strip() and initial not in used_initials:
                    problems.append({
                        "initial": initial,
                        "definition": data["definition"],
                        "answer": data["word"]
                    })
                    used_initials.add(initial)  # 사용된 초성 기록

        self.games[game_id] = {
            "difficulty": difficulty,
            "problems": problems,
            "current": 0,
            "score": 0,
            "finished": False
        }

        first_problem = problems[0]

        return {
            "message": f"{difficulty} 단계 퀴즈 시작!",
            "total": len(problems),
            "problem": first_problem  # 🔥 이미 딕셔너리 형태로 반환
        }

    def get_game_count(self) -> int:
        return len(self.games)

    # ---------- 4️⃣ 정답 확인 ----------
    def submit_answer(self, game_id: str, user_input: str, user_id: int = None, exclude_initials: List[str] = None):
        """사용자 입력을 검증"""
        # exclude_initials는 현재 사용 안 함 (이미 게임 생성 시 중복 방지됨)
        result = None
        game = self.games.get(game_id)
        if not game or game["finished"]:
            return {"error": "게임이 존재하지 않거나 이미 종료됨"}

        current_index = game["current"]
        problem = game["problems"][current_index]
        correct = user_input.strip() == problem["answer"]

        if correct:
            game["score"] += 1
            result = "정답! 🎉"
            game["current"] += 1
        else :
            game["score"] += 0
            result = "오답!"
            game["current"] += 1

        if game["current"] >= len(game["problems"]):
            game["finished"] = True

            if user_id:  # ✅ user_id가 있으면 DB 저장
                self._save_game_result(game_id, user_id)

            return {
                "correct": correct,
                "result": result,
                "finished": True,
                "score": game["score"],
                "message": f"10문제 중 {game['score']}개 맞혔어요!"
            }

        next_problem = game["problems"][game["current"]]
        return {
            "correct": correct,
            "result": result,
            "finished": False,
            "score": game["score"],
            "next_problem": next_problem
        }

    # ---------- 5️⃣ 유틸 ----------
    @staticmethod
    def _mid_return(val: str, s: str, e: str) -> str:
        if s in val:
            val = val[val.find(s) + len(s):]
            if e in val:
                val = val[:val.find(e)]
        return val

    @staticmethod
    def _mid_return_all(val: str, s: str, e: str) -> List[str]:
        if s in val:
            tmp = val.split(s)
            result = []
            for part in tmp:
                if e in part:
                    result.append(part[:part.find(e)])
            return result
        return []