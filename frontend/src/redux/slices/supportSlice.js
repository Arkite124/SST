import { createSlice } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "@/utils/axiosInstance";

// ========================================================
// 1) FAQ 목록 조회 (GET /faq?page=&size=)
// ========================================================
export const fetchFAQList = createAsyncThunk(
    "support/fetchFAQList",
    async ({ page = 1, size = 5 }, thunkAPI) => {
        try {
            const res = await axiosInstance.get(`/customer-support/faq`, {
                params: { page, size },
            });
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

// ========================================================
// 2) FAQ 상세 조회 (GET /faq/{post_id})
// ========================================================
export const fetchFAQDetail = createAsyncThunk(
    "support/fetchFAQDetail",
    async (postId, thunkAPI) => {
        try {
            const res = await axiosInstance.get(`/customer-support/faq/${postId}`);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

// ========================================================
// 3) FAQ 검색 (GET /faq/search?word=)
// ========================================================
export const searchFAQ = createAsyncThunk(
    "support/searchFAQ",
    async (word, thunkAPI) => {
        try {
            const res = await axiosInstance.get(`/customer-support/faq/search`, {
                params: { word },
            });
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

// ========================================================
// 4) 내 문의 목록 조회 (GET /my-posts?page=&size=)
// ========================================================
export const fetchMyPosts = createAsyncThunk(
    "support/fetchMyPosts",
    async ({ page = 1, size = 5 }, thunkAPI) => {
        try {
            const res = await axiosInstance.get(`/customer-support/my-posts`, {
                params: { page, size },
            });

            const data = res.data;

            return data
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

// ========================================================
// 5) 문의글 생성 (POST /posts)
// ========================================================
export const createSupportPost = createAsyncThunk(
    "support/createPost",
    async ({ category, title, content }, thunkAPI) => {
        try {
            const res = await axiosInstance.post(`/customer-support/posts`, {
                category,
                title,
                content,
            });
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

// ========================================================
// 6) 문의글 상세 조회 (GET /posts/{post_id})
// ========================================================
export const fetchSupportPostDetail = createAsyncThunk(
    "support/fetchPostDetail",
    async (postId, thunkAPI) => {
        try {
            const res = await axiosInstance.get(`/customer-support/posts/${postId}`);
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

// ========================================================
// 7) 문의글 수정 (PATCH /posts/{post_id})
// ========================================================
export const updateSupportPost = createAsyncThunk(
    "support/updatePost",
    async ({ postId, category, title, content }, thunkAPI) => {
        try {
            const res = await axiosInstance.patch(
                `/customer-support/posts/${postId}`,
                { category, title, content }
            );
            return res.data;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

// ========================================================
// 8) 문의글 삭제 (DELETE /posts/{post_id})
// ========================================================
export const deleteSupportPost = createAsyncThunk(
    "support/deletePost",
    async (postId, thunkAPI) => {
        try {
            const res = await axiosInstance.delete(
                `/customer-support/posts/${postId}`
            );
            return res.data; // { success: true }
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

// ========================================================
// 9) 댓글 / 답글 작성 (POST /comments)
// ========================================================
export const createSupportComment = createAsyncThunk(
    "support/createComment",
    async ({ post_id, content, reply_id = null }, thunkAPI) => {
        try {
            const res = await axiosInstance.post(`/customer-support/comments`, {
                post_id,
                content,
                reply_id,
            });
            return res.data; // comment response
        } catch (err) {
            return thunkAPI.rejectWithValue(err.response?.data);
        }
    }
);

const initialState = {
    // 게시글 작성/수정
    category: "",
    title: "",
    content: "",
    faq: {
        items: [],
        total: 0,
        page: 1,
        size: 5,
    },
    myPosts: {
        items: [],
        total: 0,
        page: 1,
        size: 5,
    },
    loading: false,
    error: null,
    // FAQ 검색
    faqSearchWord: "",

    // 내 문의 목록 페이징
    page: 1,
    size: 5,

    // 상세 페이지
    selectedPostId: null,

    // 댓글 작성
    commentContent: "",
    replyId: null,   // null이면 부모 댓글, 값 있으면 대댓글
};

export const supportSlice = createSlice({
    name: "support",
    initialState,
    reducers: {
        // ▶ 입력값 상태
        setCategory: (state, action) => {
            state.category = action.payload;
        },
        setTitle: (state, action) => {
            state.title = action.payload;
        },
        setContent: (state, action) => {
            state.content = action.payload;
        },

        // ▶ FAQ 검색어
        setFaqSearchWord: (state, action) => {
            state.faqSearchWord = action.payload;
        },

        // ▶ 내 문의 목록 페이징
        setPage: (state, action) => {
            state.page = action.payload;
        },
        setSize: (state, action) => {
            state.size = action.payload;
        },

        // ▶ 상세 페이지
        setSelectedPostId: (state, action) => {
            state.selectedPostId = action.payload;
        },

        // ▶ 댓글 작성
        setCommentContent: (state, action) => {
            state.commentContent = action.payload;
        },
        setReplyId: (state, action) => {
            state.replyId = action.payload;
        },

        // ▶ 폼 리셋 (작성 완료 후)
        resetForm: (state) => {
            state.category = "";
            state.title = "";
            state.content = "";
        },

        // ▶ 댓글 입력폼 리셋 (등록 후)
        resetCommentForm: (state) => {
            state.commentContent = "";
            state.replyId = null;
        },
    },
    // ================================================
    // extraReducers - createAsyncThunk 연결
    // ================================================
    extraReducers: (builder) => {
        // ------------------------------------------------
        // FAQ 목록
        // ------------------------------------------------
        builder
            .addCase(fetchFAQList.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchFAQList.fulfilled, (state, action) => {
                state.loading = false;
                state.faqList = action.payload;
            })
            .addCase(fetchFAQList.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ------------------------------------------------
        // FAQ 상세
        // ------------------------------------------------
        builder
            .addCase(fetchFAQDetail.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchFAQDetail.fulfilled, (state, action) => {
                state.loading = false;
                state.faqDetail = action.payload;
            })
            .addCase(fetchFAQDetail.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ------------------------------------------------
        // FAQ 검색
        // ------------------------------------------------
        builder
            .addCase(searchFAQ.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(searchFAQ.fulfilled, (state, action) => {
                state.loading = false;
                state.faqList = action.payload; // 검색 결과를 FAQ 목록에 넣음
            })
            .addCase(searchFAQ.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ------------------------------------------------
        // 내 문의 목록 조회
        // ------------------------------------------------
        builder
            .addCase(fetchMyPosts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMyPosts.fulfilled, (state, action) => {
                state.loading = false;
                state.myPosts = action.payload;
            })
            .addCase(fetchMyPosts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ------------------------------------------------
        // 문의글 생성
        // ------------------------------------------------
        builder
            .addCase(createSupportPost.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createSupportPost.fulfilled, (state, action) => {
                state.loading = false;
                state.successMessage = "문의글이 성공적으로 등록되었습니다!";
                state.postDetail = action.payload; // 새로 등록된 글 상세 저장
            })
            .addCase(createSupportPost.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ------------------------------------------------
        // 문의글 상세 조회
        // ------------------------------------------------
        builder
            .addCase(fetchSupportPostDetail.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSupportPostDetail.fulfilled, (state, action) => {
                state.loading = false;
                state.postDetail = action.payload;
            })
            .addCase(fetchSupportPostDetail.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ------------------------------------------------
        // 문의글 수정
        // ------------------------------------------------
        builder
            .addCase(updateSupportPost.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateSupportPost.fulfilled, (state, action) => {
                state.loading = false;
                state.successMessage = "문의글이 수정되었습니다.";
                state.postDetail = action.payload;
            })
            .addCase(updateSupportPost.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ------------------------------------------------
        // 문의글 삭제
        // ------------------------------------------------
        builder
            .addCase(deleteSupportPost.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteSupportPost.fulfilled, (state) => {
                state.loading = false;
                state.successMessage = "문의글이 삭제되었습니다.";
                state.postDetail = null;
            })
            .addCase(deleteSupportPost.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // ------------------------------------------------
        // 댓글 작성
        // ------------------------------------------------
        builder
            .addCase(createSupportComment.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createSupportComment.fulfilled, (state, action) => {
                state.loading = false;
                state.successMessage = "댓글이 작성되었습니다.";

                // 댓글을 상세 데이터(postDetail.comments)에 추가
                if (state.postDetail?.comments) {
                    state.postDetail.comments.push(action.payload);
                }
            })
            .addCase(createSupportComment.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

export const {
    setCategory,
    setTitle,
    setContent,
    setFaqSearchWord,
    setPage,
    setSize,
    setSelectedPostId,
    setCommentContent,
    setReplyId,
    resetForm,
    resetCommentForm,
} = supportSlice.actions;

export default supportSlice.reducer;
