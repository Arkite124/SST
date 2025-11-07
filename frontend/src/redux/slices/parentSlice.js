import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "@/utils/axiosInstance.js";

// ✅ 부모 정보 가져오기 Thunk
export const fetchParentMe = createAsyncThunk(
    "parent/fetchParentMe",
    async (_, { rejectWithValue }) => {
        try {
            const res = await axiosInstance.get("/parent/me", { withCredentials: true });
            return res.data.role; // ✅ 서버가 { parent: {...} } or { parent: null } 형태로 응답하므로
        } catch (err) {
            console.error("fetchParentMe 실패:", err);
            return rejectWithValue(null);
        }
    }
);

// ✅ Slice
const parentSlice = createSlice({
    name: "parent",
    initialState: {
        parent: null,
        loading: true,
    },
    reducers: {
        logoutParent: (state) => {
            state.parent = null;
            state.loading = false;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchParentMe.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchParentMe.fulfilled, (state, action) => {
                state.loading = false;
                // ✅ 백엔드에서 null이 오면 자동으로 비로그인 상태
                state.parent = action.payload;
            })
            .addCase(fetchParentMe.rejected, (state) => {
                state.loading = false;
                state.parent = null;
            });
    },
});

export const { logoutParent } = parentSlice.actions;
export default parentSlice.reducer;
