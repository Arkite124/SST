import {useEffect} from "react";
import axiosInstance from "@/utils/axiosInstance.js";
import {useDispatch} from "react-redux";
import {fetchMeThunk} from "@/redux/slices/authSlice.js";
import {fetchParentMe} from "@/redux/slices/parentSlice.js";
import Button from "@/components/common/Button.jsx";
import {useNavigate} from "react-router-dom";

export default function useAuthLoad() {
    const dispatch = useDispatch();
    const navigate=useNavigate();
    useEffect(() => {
        // ✅ 앱 시작 시 세션 복원
        dispatch(fetchMeThunk());
        dispatch(fetchParentMe())
        // ✅ 주기적 refresh
        const interval = setInterval(async () => {
            try {
                await axiosInstance.post("/auth/refresh", {});
            } catch (err) {
                return (<div><h1>서버와 {err.code} 오류가 발생했습니다.</h1><br/>
                <Button onClick={navigate("/")} label={"홈으로"}/></div>)
            }
        }, 1000 * 60 * 5); // 5분마다 refresh
        return () => clearInterval(interval);
    }, [dispatch, navigate]);
}