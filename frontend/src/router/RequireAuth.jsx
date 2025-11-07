import { useSelector } from "react-redux";
import {Navigate, Outlet, useLocation, useNavigate} from "react-router-dom";
import {useEffect} from "react";
import {toast} from "react-toastify";

/**
 * 로그인된 유저만 접근 가능한 보호 라우트
 * - 비로그인 시 /login으로 이동
 * - 로그인 후 원래 가려던 페이지(from)로 자동 복귀
 */
export default function RequireAuth() {
    const user = useSelector((state) => state.auth.user);
    const navigate=useNavigate()
    useEffect(() => {
        if (user == null) {
            toast.error("이용하려면 로그인 해주세요.", { autoClose: 2000 });
            navigate("/login", { replace: true })// 로그인 사이트으로 이동후 뒤로가기 방지
        }
    }, [user, navigate]);

    // ✅ 로그인 상태일 때
    return <Outlet />;
}
