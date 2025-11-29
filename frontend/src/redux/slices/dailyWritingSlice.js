import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "@/utils/axiosInstance.js";

// ---------------------
// Async Thunks
// ---------------------
export const fetchDailyWritings = createAsyncThunk(
    "dailyWriting/fetchDailyWritings",
    async ({ page = 1, size = 6 } = {}, { rejectWithValue }) => {
        try {
            const res = await axiosInstance.get("/activities/list/daily_writing", {
                params: { page, size },
            });
            return res.data; // { total, page, size, items }
        } catch (err) {
            return rejectWithValue(err.response?.data || "Failed to fetch");
        }
    }
);

export const addDailyWriting = createAsyncThunk(
    "dailyWriting/addDailyWriting",
    async (data, { rejectWithValue }) => {
        try {
            const res = await axiosInstance.post("/activities/list/daily_writing", data);
            return res.data; // 서버에서 반환한 실제 객체
        } catch (err) {
            return rejectWithValue(err.response?.data || "Failed to add");
        }
    }
);

export const editDailyWriting = createAsyncThunk(
    "dailyWriting/editDailyWriting",
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const res = await axiosInstance.patch(`/activities/list/daily_writing/${id}`, data);
            return res.data; // 서버에서 반환한 최신 객체
        } catch (err) {
            return rejectWithValue(err.response?.data || "Failed to edit");
        }
    }
);

export const deleteDailyWriting = createAsyncThunk(
    "dailyWriting/deleteDailyWriting",
    async (id, { rejectWithValue }) => {
        try {
            await axiosInstance.delete(`/activities/list/daily_writing/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(err.response?.data || "Failed to delete");
        }
    }
);

// ---------------------
// Slice
// ---------------------
const dailyWritingSlice = createSlice({
    name: "dailyWriting",
    initialState: {
        items: [],
        total: 0,
        page: 1,
        size: 6,
        loading: false,
        error: null,
    },
    reducers: {
        setPage: (state, action) => {
            state.page = action.payload;
        },
        setSize: (state, action) => {
            state.size = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // fetch
            .addCase(fetchDailyWritings.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDailyWritings.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload.items;
                state.total = action.payload.total;
                state.page = action.payload.page;
                state.size = action.payload.size;
            })
            .addCase(fetchDailyWritings.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // add
            .addCase(addDailyWriting.fulfilled, (state, action) => {
                state.items.unshift(action.payload);
                state.total += 1;
            })

            // edit
            .addCase(editDailyWriting.fulfilled, (state, action) => {
                const idx = state.items.findIndex((w) => w.id === action.payload.id);
                if (idx !== -1) state.items[idx] = action.payload;
            })

            // delete
            .addCase(deleteDailyWriting.fulfilled, (state, action) => {
                state.items = state.items.filter((w) => w.id !== action.payload);
                state.total -= 1;
            });
    },
});

export const { setPage, setSize } = dailyWritingSlice.actions;
export default dailyWritingSlice.reducer;
