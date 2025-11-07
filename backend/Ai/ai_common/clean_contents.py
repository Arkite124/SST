from hanspell import spell_checker
from kiwipiepy import Kiwi

kiwi = Kiwi()

def safe_spell_check(text: str) -> str:
    spaced_sentence = kiwi.space(text)
    try:
        result = spell_checker.check(spaced_sentence)
        return result.checked
    except Exception:
        return spaced_sentence