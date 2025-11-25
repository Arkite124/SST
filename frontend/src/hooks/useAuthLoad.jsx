import {useEffect} from "react";
import axiosInstance from "@/utils/axiosInstance.js";
import {useDispatch} from "react-redux";
import {fetchMeThunk} from "@/redux/slices/authSlice.js";
import {fetchParentMe} from "@/redux/slices/parentSlice.js";
import Button from "@/components/common/Button.jsx";
import {useNavigate} from "react-router-dom";

export default function useAuthLoad() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(fetchMeThunk());
        dispatch(fetchParentMe());

        const interval = setInterval(async () => {
            try {
                await axiosInstance.post("/auth/refresh", {});
            } catch (err) {
                console.error("refresh 실패:", err);
                navigate("/");
            }
        }, 1000 * 60 * 5);

        return () => clearInterval(interval);
    }, [dispatch, navigate]);
}
