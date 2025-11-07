// src/layouts/MainLayout.jsx
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import "react-toastify/dist/ReactToastify.css";
import {ToastContainer} from "react-toastify";

export default function MainLayout() {
    return (
        <div className="flex flex-col min-h-screen bg-[#F6F6F6] text-[#263035]">
            {/* 헤더를 fixed로 만들고 z-index 적용 */}
            <Header className="fixed top-0 left-0 w-full z-50 "/>

            {/* main에 padding-top으로 header 높이 만큼 공간 확보 */}
            <main className="flex-grow">  {/* Header 높이만큼 패딩 */}
                <Outlet />
                <ToastContainer position="top-center" autoClose={3300} />
            </main>

            <Footer />
        </div>
    );
}