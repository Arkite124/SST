// src/store/slices/audioSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// 🔊 TTS 재생 Thunk
export const playTTS = createAsyncThunk(
    "audio/playTTS",
    async ({ text, unit = "sentence" }, { getState, dispatch }) => {
        try {
            const { audio } = getState().audio;

            // 기존 오디오 정지
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }

            // 빈칸 치환
            const cleanedText = text.replace(/_+/g, "빈칸");
            const local = "http://localhost:8000";
            const res = await fetch(
                `${local}/test/tts?text=${encodeURIComponent(cleanedText)}&unit=${unit}`
            );

            if (!res.ok) throw new Error(`TTS 요청 실패: ${res.status}`);

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const newAudio = new Audio(url);

            // 이벤트 핸들러
            newAudio.onended = () => {
                URL.revokeObjectURL(url);
                dispatch(stopAudio());
            };

            newAudio.onerror = (err) => {
                console.error("오디오 재생 에러:", err);
                URL.revokeObjectURL(url);
                dispatch(stopAudio());
            };

            await newAudio.play();

            return newAudio;
        } catch (err) {
            console.error("TTS 실패:", err);
            throw err;
        }
    }
);

const audioSlice = createSlice({
    name: "audio",
    initialState: {
        audio: null,
        currentText: false,
    },
    reducers: {
        startAudio: (state, action) => {
            state.isPlaying = true;
            state.currentText = action.payload; // 단순 텍스트만 저장
        },
        stopAudio: (state) => {
            state.isPlaying = false;
            state.currentText = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(playTTS.fulfilled, (state, action) => {
                state.audio = action.payload;
                state.isPlaying = true;
            })
            .addCase(playTTS.rejected, (state) => {
                state.audio = null;
                state.isPlaying = false;
            });
    },
});

export const { stopAudio, startAudio } = audioSlice.actions;
export default audioSlice.reducer;
