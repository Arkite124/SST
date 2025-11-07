import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axiosInstance from "@/utils/axiosInstance.js";

export default function ProtectedProfileRoute({ children }) {
    const [authorized, setAuthorized] = useState(null);
    useEffect(() => {
        const checkAccess = async () => {
            try {
                await axiosInstance.get("/users/edit", { withCredentials: true });
                setAuthorized(true);
            } catch (err) {
                setAuthorized(false);
            }
        };
        checkAccess();
    }, []);
    if (authorized === null) return <p>확인 중...</p>;
    if (!authorized) return <Navigate to="/mypage/confirm" replace />;
    return children;
}
