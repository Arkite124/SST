import React, {useEffect} from 'react';
import {useSelector} from "react-redux";
import {toast} from "react-toastify";
import {useNavigate} from "react-router-dom";

export default function useCheckUser () {
    // 로그인 유저 없을시 로그인 창으로 되돌려 보내기
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    useEffect(() => {
        if (user == null) {
            toast.error("로그인이 필요합니다", { autoClose: 2000 });
            return navigate("/login", { replace: true });
        }
    }, [user, navigate]);
};