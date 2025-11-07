// src/redux/store.js
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage";
import {
    persistReducer,
    persistStore,
    FLUSH,
    REHYDRATE,
    PAUSE,
    PERSIST,
    PURGE,
    REGISTER,
} from "redux-persist";

// ✅ 슬라이스들
import chainReducer from "./slices/chainSlice.js";
import spellReducer from "./slices/spellSlice.js";
import puzzleReducer from "./slices/puzzleSlice.js";
import authReducer from "./slices/authSlice.js";
import audioReducer from "./slices/audioSlice.js";
import readingReducer from "./slices/ReadingSlice.js";
import vocabularyReducer from "./slices/vocabularySlice.js";
import parentReducer from "./slices/parentSlice.js";
import userBanReducer from "./slices/userBanSlice.js";
// ✅ rootReducer
const rootReducer = combineReducers({
    chain: chainReducer,   // 끝말잇기
    spell: spellReducer,   // 초성퀴즈
    puzzle: puzzleReducer, // 문장퍼즐
    auth: authReducer,     // 인증
    audio: audioReducer,    //오디오 리듀서
    reading: readingReducer, //문해력 테스트
    vocabulary: vocabularyReducer, //어휘력 테스트
    parent:parentReducer,
    userBans:userBanReducer,
});

// ✅ persistConfig (auth만 저장)
const persistConfig = {
    key: "root",
    storage,
    whitelist: ["auth"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// ✅ store 생성
export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [
                    FLUSH,
                    REHYDRATE,
                    PAUSE,
                    PERSIST,
                    PURGE,
                    REGISTER,
                    "puzzle/generatePuzzle/fulfilled", // 퍼즐 예외 추가
                ],
                ignoredPaths: [
                    "puzzle.sourceBlocks",
                    "puzzle.answerBlocks", // 퍼즐 직렬화 제외
                ],
            },
        }),
    devTools: import.meta.env.DEV, // 개발 환경에서만 DevTools
});

export const persistor = persistStore(store);
