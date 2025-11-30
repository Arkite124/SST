// src/store/slices/userBanSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "@/utils/axiosInstance.js";

// --- Thunks ---
export const fetchBans = createAsyncThunk("userBan/fetchBans", async ({ page, size }) => {
    try {
        const res = await axiosInstance.get(`/admin/users/bans?page=${page}&size=${size}`);
        return res.data;
    } catch (err) {
        throw err;
    }
});

export const createBan = createAsyncThunk("userBan/createBan", async (data, { dispatch }) => {
    await axiosInstance.post("/admin/users/bans", data);
    dispatch(fetchBans({ page: 1, size: 10 }));
});

export const liftBan = createAsyncThunk("userBan/liftBan", async (banId, { dispatch }) => {
    await axiosInstance.patch(`/admin/users/bans/${banId}`);
    dispatch(fetchBans({ page: 1, size: 10 }));
});

// --- Slice ---
const userBanSlice = createSlice({
    name: "userBan",
    initialState: {
        items: [],
        total: 0,
        page: 1,
        size: 10,
        pages: 1,
        loading: false,
        error: null,
    },
    reducers: {
        setPage: (state, action) => {
            state.page = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchBans.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchBans.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload.items;
                state.total = action.payload.total;
                state.pages = action.payload.pages;
            })
            .addCase(fetchBans.rejected, (state) => {
                state.loading = false;
                state.error = "데이터 불러오기 실패";
            });
    },
});

export const { setPage } = userBanSlice.actions;
export default userBanSlice.reducer;