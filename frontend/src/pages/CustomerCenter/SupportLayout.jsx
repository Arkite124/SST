import { Outlet, NavLink } from "react-router-dom";
import {useSelector} from "react-redux";

export default function SupportLayout() {
    const {user}=useSelector((state)=>state.auth)
    return (
        <div className="max-w-4xl mx-auto py-6 px-4">

            {/* 상단 네비게이션 */}
            <div className="flex gap-4 mb-6 text-sm font-semibold">
                <NavLink
                    to="/support"
                    className={({ isActive }) =>
                        isActive ? "text-green-600 underline" : "text-gray-600"
                    }
                >
                    FAQ
                </NavLink>

                {user!=null && <NavLink
                    to="/support/write"
                    className={({ isActive }) =>
                        isActive ? "text-green-600 underline" : "text-gray-600"
                    }
                >
                    문의 작성
                </NavLink>}

                {user!=null && <NavLink
                    to="/support/my"
                    className={({ isActive }) =>
                        isActive ? "text-green-600 underline" : "text-gray-600"
                    }
                >
                    내 문의 목록
                </NavLink>}
            </div>

            <Outlet />
        </div>
    );
}