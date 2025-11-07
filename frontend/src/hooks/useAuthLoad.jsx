import {useEffect} from "react";
import axiosInstance from "@/utils/axiosInstance.js";
import {useDispatch} from "react-redux";
import {fetchMeThunk} from "@/redux/slices/authSlice.js";
import {fetchParentMe} from "@/redux/slices/parentSlice.js";

export default function useAuthLoad() {
    const dispatch = useDispatch();

    useEffect(() => {
        // ✅ 앱 시작 시 세션 복원
        dispatch(fetchMeThunk());
        dispatch(fetchParentMe())
        // ✅ 주기적 refresh
        const interval = setInterval(async () => {
            try {
                await axiosInstance.post("/auth/refresh", {});
                console.log("토큰이 재발급 되었습니다.");
            } catch (err) {
                console.error("백엔드 연동 실패", err);
            }
        }, 1000 * 60 * 10); // 50분마다 refresh
        return () => clearInterval(interval);
    }, [dispatch]);
}