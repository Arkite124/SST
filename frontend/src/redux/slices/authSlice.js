import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {login, getAuthUser, logoutUser} from "@/utils/auth.js";

// ✅ 세션 복원 thunk
export const fetchMeThunk = createAsyncThunk("auth/me", async (_, { rejectWithValue }) => {
    try {
        const user = await getAuthUser();
        return user;
    } catch (e) {
        return rejectWithValue(e.response?.data || { message: "세션 없음" });
    }
});
// ✅ 로그인 thunk
export const loginThunk = createAsyncThunk("auth/login", async (cred, { rejectWithValue }) => {
    try {
        const data = await login(cred); // 서버가 쿠키를 설정
        return data;
    } catch (e) {
        return rejectWithValue(e.response?.data || { message: "로그인 실패" });
    }
});

// 로그아웃
export const logoutThunk = createAsyncThunk("auth/logout", async (_, thunkAPI) => {
    try {
        return await logoutUser();
    } catch (error) {
        return thunkAPI.rejectWithValue("로그아웃 실패");
    }
});

const slice = createSlice({
    name: "auth",
    initialState: { user: null, status: "idle", error: null },
    reducers: {
        clearSession(state) {
            state.user = null;
            state.status = "idle";
            state.error = null;
        },
    },
    extraReducers: (b) => {
        b
            .addCase(loginThunk.pending, (s) => {
                s.status = "loading";
                s.error = null;
            })
            .addCase(loginThunk.fulfilled, (s) => {
                s.status = "succeeded";
            })
            .addCase(loginThunk.rejected, (s, a) => {
                s.status = "failed";
                s.error = a.payload?.message || "로그인 실패";
            })
            // ✅ 백엔드 응답 구조 맞춤: { user: {...} }
            .addCase(fetchMeThunk.fulfilled, (s, a) => {
                s.user = a.payload?.user || null;
                s.status = "succeeded";
            })
            .addCase(fetchMeThunk.rejected, (s) => {
                s.user = null;
                s.status = "idle";
            })
            .addCase(logoutThunk.fulfilled, (state) => {
                state.user = null;
                state.isAuthenticated = false;   // ✅
            });
    },
});

export const { clearSession } = slice.actions;
export default slice.reducer;
