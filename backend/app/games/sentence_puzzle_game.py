# game/sentence_puzzle_game.py (10문제 단위 저장 - 틀린 문제도 포함)
import os
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
# print("+++", os.path.join(os.path.dirname(__file__), 'data', 'pickle', 'processed_sentences.pkl'))
from sqlalchemy.orm import Session
from .train_embedding import FairytalePuzzleGenerator
from models import UserGames

class SentencePuzzleGame:
    def __init__(self, data_path: str = './data/pickle/processed_sentences.pkl', db: Session = None):
        try:
            self.puzzle_generator = FairytalePuzzleGenerator(data_path=data_path)
            self.storage = {}  # 개별 퍼즐 저장소
            self.game_sessions = {}  # 10문제 단위 게임 세션
            self.db = db
            print("✅ 문장 퍼즐 생성기 초기화 완료")
        except Exception as e:
            print(f"❌ 문장 퍼즐 생성기 초기화 실패: {e}")
            self.puzzle_generator = None
    def _get_or_create_session(self, user_id: int, age: int) -> str:
        """현재 진행중인 세션 찾기 또는 새 세션 생성"""
        # 해당 유저의 진행중인 세션 찾기
        for session_id, session in self.game_sessions.items():
            if (session['user_id'] == user_id and
                    not session['completed'] and
                    session['total_puzzles'] < 10):  # total_puzzles로 변경
                return session_id

        # 새 세션 생성
        session_id = f"{user_id}_{datetime.now().timestamp()}"
        self.game_sessions[session_id] = {
            'user_id': user_id,
            'initial_age': age,  # 첫 문제의 난이도로 고정
            'current_age': age,
            'puzzles_solved': 0,  # 맞춘 문제 수
            'total_puzzles': 0,  # 시도한 총 문제 수
            'total_score': 0,
            'completed': False,
            'started_at': datetime.now()
        }
        return session_id

    def generate_puzzle(self, age: int, user_id: int) -> Dict[str, Any]:
        """퍼즐 생성"""
        if not self.puzzle_generator:
            raise Exception("퍼즐 생성기가 초기화되지 않았습니다")

        puzzle = self.puzzle_generator.generate_puzzle(age=age)

        if not puzzle:
            raise Exception("해당 조건에 맞는 퍼즐을 생성할 수 없습니다")

        puzzle_id = str(puzzle['puzzle_id'])

        # 세션 찾기/생성
        session_id = self._get_or_create_session(user_id, age)

        # 퍼즐 정보 저장
        self.storage[puzzle_id] = {
            'user_id': user_id,
            'session_id': session_id,
            'original_sentence': puzzle['original_sentence'],
            'age': puzzle['age'],
            'created_at': datetime.now(),
            'attempts': 0,
            'hints_used': 0,
            'processed': False,  # 처리 여부 (맞췄든 틀렸든)
            'solved': False,  # 정답 여부
            'score': 0,
            'max_attempts': 2  # 최대 시도 횟수
        }

        session = self.game_sessions[session_id]
        return {
            'puzzle_id': puzzle_id,
            'age': puzzle['age'],
            'title': puzzle['title'],
            'pieces': puzzle['pieces'],
            'word_count': puzzle['word_count'],
            'metadata': puzzle['metadata'],
            'session_progress': f"{session['total_puzzles']}/10"  # 진행 상황
        }

    def verify_answer(
            self,
            puzzle_id: str,
            user_answer: str
    ) -> Dict[str, Any]:
        """답안 검증 및 결과 처리"""
        if not self.puzzle_generator:
            raise Exception("퍼즐 생성기가 초기화되지 않았습니다")

        if puzzle_id not in self.storage:
            raise ValueError(f"퍼즐을 찾을 수 없습니다: {puzzle_id}")

        puzzle_info = self.storage[puzzle_id]

        # 이미 처리된 퍼즐인지 확인
        if puzzle_info['processed']:
            session_id = puzzle_info['session_id']
            session = self.game_sessions[session_id]
            return {
                'passed': False,
                'similarity': 0.0,
                'exact_match': False,
                'message': "이미 처리된 퍼즐입니다. 다음 문제를 진행하세요.",
                'user_sentence': user_answer,
                'original_sentence': None,
                'session_progress': f"{session['total_puzzles']}/10"
            }

        original_sentence = puzzle_info['original_sentence']
        puzzle_info['attempts'] += 1

        # 1. 완전 일치 확인
        is_exact_match = original_sentence.strip() == user_answer.strip()

        if is_exact_match:
            # 점수 계산
            base_score = 100
            hint_penalty = puzzle_info['hints_used'] * 10
            attempt_penalty = max(0, (puzzle_info['attempts'] - 1) * 5)
            final_score = max(0, base_score - hint_penalty - attempt_penalty)

            puzzle_info['solved'] = True
            puzzle_info['score'] = final_score
            puzzle_info['processed'] = True  # 처리 완료

            # 세션에 추가
            self._add_to_session(puzzle_info, success=True)

            # 세션 상태 확인
            session_id = puzzle_info['session_id']
            session = self.game_sessions[session_id]

            response = {
                'passed': True,
                'similarity': 1.0,
                'exact_match': True,
                'message': "완벽합니다! 정확히 맞췄어요! 🎉",
                'score': final_score,
                'feedback': "완벽합니다! 정확히 맞췄어요! 🎉",
                'user_sentence': user_answer,
                'original_sentence': original_sentence,
                'session_progress': f"{session['total_puzzles']}/10",
                'session_complete': session['total_puzzles'] >= 10
            }

            # 10문제 완료시 DB 저장
            if session['total_puzzles'] >= 10:
                self._save_session_to_db(session_id)
                response['final_score'] = session['total_score']
                response[
                    'final_message'] = f"10문제 완료! 총점: {session['total_score']} (맞춘 문제: {session['puzzles_solved']}개)"

            return response

        # 2. 단어 검증 로직
        original_words_list = original_sentence.strip().split()
        user_words_list = user_answer.strip().split()

        original_words_set = set(original_words_list)
        user_words_set = set(user_words_list)

        # 최대 시도 횟수 초과 체크
        if puzzle_info['attempts'] >= puzzle_info['max_attempts']:
            puzzle_info['processed'] = True  # 처리 완료 (실패)
            puzzle_info['solved'] = False
            puzzle_info['score'] = 0

            # 세션에 추가 (실패한 문제도 추가)
            self._add_to_session(puzzle_info, success=False)

            session_id = puzzle_info['session_id']
            session = self.game_sessions[session_id]

            response = {
                'passed': False,
                'similarity': 0.0,
                'exact_match': False,
                'message': f"최대 시도 횟수({puzzle_info['max_attempts']}회)를 초과했습니다. 정답: {original_sentence}",
                'user_sentence': user_answer,
                'original_sentence': original_sentence,
                'session_progress': f"{session['total_puzzles']}/10",
                'session_complete': session['total_puzzles'] >= 10
            }

            # 10문제 완료시 DB 저장
            if session['total_puzzles'] >= 10:
                self._save_session_to_db(session_id)
                response['final_score'] = session['total_score']
                response[
                    'final_message'] = f"10문제 완료! 총점: {session['total_score']} (맞춘 문제: {session['puzzles_solved']}개)"

            return response

        if original_words_set != user_words_set:
            missing_words = original_words_set - user_words_set
            extra_words = user_words_set - original_words_set

            feedback = "단어가 잘못되었습니다."
            if missing_words:
                feedback += f" 빠진 단어: {', '.join(missing_words)}"
            if extra_words:
                feedback += f" 추가된 단어: {', '.join(extra_words)}"

            feedback += f" (시도: {puzzle_info['attempts']}/{puzzle_info['max_attempts']})"

            return {
                'passed': False,
                'similarity': 0.0,
                'exact_match': False,
                'message': feedback,
                'user_sentence': user_answer,
                'original_sentence': original_sentence if puzzle_info['attempts'] >= 2 else None
            }

        # 3. 문장 끝맺음 체크
        ending_correct = self._check_sentence_ending(original_words_list, user_words_list)

        if not ending_correct:
            return {
                'passed': False,
                'similarity': 0.0,
                'exact_match': False,
                'message': f"문장의 끝맺음이 다릅니다. 마지막 단어들의 순서를 확인해보세요. ({puzzle_info['attempts']}/{puzzle_info['max_attempts']})",
                'user_sentence': user_answer,
                'original_sentence': original_sentence if puzzle_info['attempts'] >= 2 else None
            }

        # 4. 위치/순서 유사도 계산
        position_similarity = self._calculate_position_similarity(original_words_list, user_words_list)
        sequence_similarity = self._calculate_sequence_similarity(original_words_list, user_words_list)

        # 5. 최종 판정
        is_correct = (position_similarity >= 0.95 and
                      sequence_similarity >= 0.90 and
                      ending_correct)

        if is_correct:
            base_score = 100
            hint_penalty = puzzle_info['hints_used'] * 10
            attempt_penalty = max(0, (puzzle_info['attempts'] - 1) * 5)
            position_penalty = int((1.0 - position_similarity) * 20)
            final_score = max(0, base_score - hint_penalty - attempt_penalty - position_penalty)

            puzzle_info['solved'] = True
            puzzle_info['score'] = final_score
            puzzle_info['processed'] = True  # 처리 완료

            feedback = f"정답입니다! (위치: {position_similarity * 100:.0f}%, 순서: {sequence_similarity * 100:.0f}%)"

            # 세션에 추가
            self._add_to_session(puzzle_info, success=True)

            # 세션 상태 확인
            session_id = puzzle_info['session_id']
            session = self.game_sessions[session_id]

            response = {
                'passed': True,
                'similarity': position_similarity,
                'exact_match': False,
                'message': feedback,
                'score': final_score,
                'feedback': feedback,
                'user_sentence': user_answer,
                'original_sentence': original_sentence,
                'session_progress': f"{session['total_puzzles']}/10",
                'session_complete': session['total_puzzles'] >= 10
            }

            # 10문제 완료시 DB 저장
            if session['total_puzzles'] >= 10:
                self._save_session_to_db(session_id)
                response['final_score'] = session['total_score']
                response[
                    'final_message'] = f"10문제 완료! 총점: {session['total_score']} (맞춘 문제: {session['puzzles_solved']}개)"

            return response
        else:
            if position_similarity < 0.95:
                feedback = f"단어 위치가 많이 다릅니다. (위치 일치도: {position_similarity * 100:.0f}%) (시도: {puzzle_info['attempts']}/{puzzle_info['max_attempts']})"
            else:
                feedback = f"단어 순서를 다시 확인해보세요. (순서 일치도: {sequence_similarity * 100:.0f}%) (시도: {puzzle_info['attempts']}/{puzzle_info['max_attempts']})"

            return {
                'passed': False,
                'similarity': position_similarity,
                'exact_match': False,
                'message': feedback,
                'user_sentence': user_answer,
                'original_sentence': original_sentence if puzzle_info['attempts'] >= 2 else None
            }

    def _add_to_session(self, puzzle_info: Dict[str, Any], success: bool):
        """세션에 퍼즐 결과 추가 (성공/실패 모두 포함)"""
        session_id = puzzle_info['session_id']
        if session_id not in self.game_sessions:
            return

        session = self.game_sessions[session_id]

        # 총 시도 문제 수 증가
        session['total_puzzles'] += 1

        # 성공한 경우에만 점수 추가 및 맞춘 문제 수 증가
        if success:
            session['puzzles_solved'] += 1
            session['total_score'] += puzzle_info['score']

        # 현재 난이도 업데이트
        session['current_age'] = puzzle_info['age']

    def _save_session_to_db(self, session_id: str):
        """10문제 완료시 DB에 저장"""
        if session_id not in self.game_sessions:
            return

        session = self.game_sessions[session_id]

        if not self.db or session['completed']:
            return

        try:
            # word_history에는 최종 난이도와 맞춘 개수만 저장
            word_history = {
                'final_difficulty': session['current_age'],  # 마지막 문제의 난이도
                'puzzles_solved': session['puzzles_solved']  # 실제로 맞춘 문제 수
            }

            user_game = UserGames(
                user_id=session['user_id'],
                game_type='sentence_completion',
                difficulty=str(session['initial_age']),  # 시작 난이도
                score=round(session['total_score'] / 10),  # 총점
                word_history=word_history
            )
            self.db.add(user_game)
            self.db.commit()

            session['completed'] = True
            print(
                f"✅ 10문제 세션 결과 저장 완료 (user_id={session['user_id']}, 맞춘 문제: {session['puzzles_solved']}/10, 총점: {session['total_score']})")

        except Exception as e:
            self.db.rollback()
            print(f"❌ 세션 결과 저장 실패: {e}")

    def get_hint(self, puzzle_id: str) -> Dict[str, Any]:
        """힌트 제공"""
        if puzzle_id not in self.storage:
            raise ValueError(f"퍼즐을 찾을 수 없습니다: {puzzle_id}")

        puzzle_info = self.storage[puzzle_id]

        if puzzle_info['processed']:
            return {
                'hints': [{
                    'type': 'already_processed',
                    'message': '이미 처리된 퍼즐입니다.'
                }],
                'hints_used': puzzle_info['hints_used'],
                'max_hints': 3
            }

        original_sentence = puzzle_info['original_sentence']
        original_words = original_sentence.strip().split()

        max_hints = 3
        hints_used = puzzle_info['hints_used']

        if hints_used >= max_hints:
            return {
                'hints': [{
                    'type': 'max_reached',
                    'message': '더 이상 힌트를 사용할 수 없습니다.'
                }],
                'hints_used': hints_used,
                'max_hints': max_hints
            }

        hints = []

        if hints_used == 0:
            hints.append({
                'type': 'first_word',
                'message': f"첫 단어는 '{original_words[0]}'입니다."
            })
        elif hints_used == 1:
            hints.append({
                'type': 'last_word',
                'message': f"마지막 단어는 '{original_words[-1]}'입니다."
            })
        elif hints_used == 2:
            mid_index = len(original_words) // 2
            hints.append({
                'type': 'middle_word',
                'message': f"{mid_index + 1}번째 단어는 '{original_words[mid_index]}'입니다."
            })

        puzzle_info['hints_used'] += 1

        return {
            'hints': hints,
            'hints_used': puzzle_info['hints_used'],
            'max_hints': max_hints
        }

    def skip_puzzle(self, puzzle_id: str) -> Dict[str, Any]:
        """현재 문제 건너뛰기 (0점 처리)"""
        if puzzle_id not in self.storage:
            raise ValueError(f"퍼즐을 찾을 수 없습니다: {puzzle_id}")

        puzzle_info = self.storage[puzzle_id]

        if puzzle_info['processed']:
            return {
                'message': '이미 처리된 퍼즐입니다.',
                'session_progress': None
            }

        # 건너뛴 문제는 0점 처리
        puzzle_info['processed'] = True
        puzzle_info['solved'] = False
        puzzle_info['score'] = 0

        # 세션에 추가 (실패로 처리)
        self._add_to_session(puzzle_info, success=False)

        session_id = puzzle_info['session_id']
        session = self.game_sessions[session_id]

        response = {
            'message': '문제를 건너뛰었습니다.',
            'original_sentence': puzzle_info['original_sentence'],
            'session_progress': f"{session['total_puzzles']}/10",
            'session_complete': session['total_puzzles'] >= 10
        }

        # 10문제 완료시 DB 저장
        if session['total_puzzles'] >= 10:
            self._save_session_to_db(session_id)
            response['final_score'] = session['total_score']
            response['final_message'] = f"10문제 완료! 총점: {session['total_score']} (맞춘 문제: {session['puzzles_solved']}개)"

        return response

    def get_user_session_status(self, user_id: int) -> Dict[str, Any]:
        """사용자의 현재 세션 상태"""
        for session_id, session in self.game_sessions.items():
            if session['user_id'] == user_id and not session['completed']:
                return {
                    'in_progress': True,
                    'total_puzzles': session['total_puzzles'],
                    'puzzles_solved': session['puzzles_solved'],
                    'current_score': session['total_score'],
                    'initial_age': session['initial_age'],
                    'current_age': session['current_age']
                }

        return {
            'in_progress': False,
            'message': '진행 중인 게임이 없습니다.'
        }

    def cleanup_old_sessions(self, hours: int = 24):
        """오래된 세션 정리"""
        cutoff_time = datetime.now() - timedelta(hours=hours)

        # 오래된 퍼즐 삭제
        puzzles_to_remove = [
            puzzle_id for puzzle_id, info in self.storage.items()
            if info['created_at'] < cutoff_time
        ]

        for puzzle_id in puzzles_to_remove:
            del self.storage[puzzle_id]

        # 오래된 세션 삭제
        sessions_to_remove = [
            session_id for session_id, session in self.game_sessions.items()
            if session['started_at'] < cutoff_time
        ]

        for session_id in sessions_to_remove:
            del self.game_sessions[session_id]

        if puzzles_to_remove or sessions_to_remove:
            print(f"✅ {len(puzzles_to_remove)}개 퍼즐, {len(sessions_to_remove)}개 세션 정리")

    # Helper 메서드들
    def _check_sentence_ending(self, original_words: List[str], user_words: List[str]) -> bool:
        """문장 끝맺음 체크"""
        if len(original_words) == 0 or len(user_words) == 0:
            return False

        if original_words[-1] != user_words[-1]:
            return False

        if len(original_words) >= 2 and len(user_words) >= 2:
            if original_words[-2] != user_words[-2]:
                return False

        return True

    def _calculate_position_similarity(self, original_words: List[str], user_words: List[str]) -> float:
        """위치 기반 유사도 계산"""
        if len(original_words) != len(user_words):
            return 0.0

        correct_positions = sum(1 for i, word in enumerate(original_words)
                                if i < len(user_words) and word == user_words[i])

        return correct_positions / len(original_words)

    def _calculate_sequence_similarity(self, original_words: List[str], user_words: List[str]) -> float:
        """순서 기반 유사도 계산 (LCS)"""
        if len(original_words) != len(user_words):
            return 0.0

        m, n = len(original_words), len(user_words)
        dp = [[0] * (n + 1) for _ in range(m + 1)]

        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if original_words[i - 1] == user_words[j - 1]:
                    dp[i][j] = dp[i - 1][j - 1] + 1
                else:
                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

        lcs_length = dp[m][n]
        return lcs_length / len(original_words)

    def get_puzzle_count(self) -> int:
        return len(self.storage)

    def is_ready(self) -> bool:
        return self.puzzle_generator is not None