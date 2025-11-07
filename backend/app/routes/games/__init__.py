from fastapi import APIRouter
from app.routes.games import sentence_puzzle, word_chain, word_spell

game_router=APIRouter(prefix="/games", tags=["games"])
game_router.include_router(sentence_puzzle.router)
game_router.include_router(word_spell.router)
game_router.include_router(word_chain.router)