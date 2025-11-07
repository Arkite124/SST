// src/router/index.jsx
import { createBrowserRouter } from "react-router-dom";

// ✅ 레이아웃
import MainLayout from "../layouts/MainLayout";

// ✅ 메인
import MainPage from "../pages/Main/MainPage";

// ✅ 활동
import ActivityPage from "../pages/Activity/ActivityPage";
import ReadingLogPage from "../pages/Activity/ReadingLog/ReadingLogPage";
import DailyWritingPage from "../pages/Activity/DailyWriting/DailyWritingPage";
import WordSearchPage from "../pages/Activity/WordSearch/WordSearchPage";

// ✅ 커뮤니티
import CommunityPage from "../pages/Community/CommunityPage";
import StudentDiscussionPage from "../pages/Community/StudentDiscussion/StudentDiscussionPage";
import ParentBoardPage from "../pages/Community/ParentBoard/ParentBoardPage";

// ✅ 테스트
import TestsPage from "../pages/Tests/TestsPage";
import ReadingTest from "../pages/Tests/ReadingTest/ReadingTest.jsx";
import VocabularyTestPage from "../pages/Tests/VocabularyTest/VocabularyTestPage";

// ✅ 게임
import GamesPage from "../pages/Games/GamesPage";
import WordChainPage from "../pages/Games/WordChain/WordChainPage";
import WordMeaningPage from "../pages/Games/WordMeaning/WordMeaningPage";
import SentencePuzzlePage from "../pages/Games/SentenceComplete/SentencePuzzlePage.jsx";

// ✅ 마이페이지
import MyPagePage from "../pages/MyPage/MyPagePage";
import DashboardPage from "../pages/MyPage/Dashboard/ChildDashboard.jsx";
import ParentDashboard from "../pages/MyPage/Dashboard/ParentDashboard";
import AdminDashboard from "../pages/Admin/AdminDashboard.jsx";
import ProfileEditPage from "../pages/MyPage/ProfileEdit/ProfileEditPage";
import SubscriptionPage from "../pages/MyPage/Subscription/SubscriptionPage";

// ✅ 로그인 관련
import LoginPage from "../pages/Auth/Login/LoginPage";
import RegisterPage from "../pages/Auth/Register/RegisterPage";
import FindAccountPage from "../pages/Auth/FindAccount/FindAccountPage";
import WithdrawPage from "../pages/Auth/Withdraw/WithdrawPage";

// ✅ AI 대화
import AIChatPage from "../pages/AIChat/AIChatPage";
import PaymentSuccess from "../pages/MyPage/Subscription/PaymentSuccess";
import PaymentFail from "../pages/MyPage/Subscription/PaymentFail";
import ParentLoginPage from "@/pages/MyPage/Dashboard/ParentLogin.jsx";
import ProtectedProfileRoute from "@/pages/MyPage/ProfileEdit/ProtectedProfileRoute.jsx";
import ProfilePwConfirm from "@/pages/MyPage/ProfileEdit/ProfilePwConfirm.jsx";
import UserBanManager from "@/pages/Admin/UserBanManager.jsx";
import AdminDashboardPage from "@/pages/Admin/AdminDashboardPage.jsx";
// ✅ 라우터 설정
const router = createBrowserRouter([
    {
        path: "/",
        element: <MainLayout />,
        children: [
            { index: true, element: <MainPage /> },

            {
                path: "activity",
                element: <ActivityPage />,
                children: [
                    { index: true, element: <ReadingLogPage /> },
                    { path: "reading-log", element: <ReadingLogPage /> },
                    { path: "daily-writing", element: <DailyWritingPage /> },
                    { path: "word-search", element: <WordSearchPage /> },
                ],
            },
            // 커뮤니티
            {
                path: "community",
                element: <CommunityPage />,
                children: [
                    { index: true, element: <StudentDiscussionPage /> },
                    { path: "student-discussion", element: <StudentDiscussionPage /> },
                    { path: "parent-board", element: <ParentBoardPage /> },
                ],
            },
            // 테스트
            {
                path: "tests",
                element: <TestsPage />,
                children: [
                    { path: "reading", element: <ReadingTest /> },
                    { path: "vocabulary", element: <VocabularyTestPage /> },
                ],
            },
            // 게임
            {
                path: "games",
                element: <GamesPage />,
                children: [
                    { index: true, element: <WordChainPage /> },
                    { path: "word-chain", element: <WordChainPage /> },
                    { path: "word-meaning", element: <WordMeaningPage /> },
                    { path: "sentence-complete", element: <SentencePuzzlePage /> },
                ],
            },
            // 마이페이지
            {
                path: "mypage",
                element: <MyPagePage />,
                children: [
                    { index: true, element: <DashboardPage /> },
                    { path: "dashboard", element: <DashboardPage /> },
                    { path: "subscription", element: <SubscriptionPage /> },
                    { path: "subscription/success", element: <PaymentSuccess /> },
                    { path: "subscription/fail", element: <PaymentFail /> },
                    // 비밀번호 확인 페이지 추가
                    { path: "confirm", element: <ProfilePwConfirm /> },
                    // 보호 라우트: confirm 후만 접근 가능
                    {
                        path: "profile-edit",
                        element: (
                            <ProtectedProfileRoute>
                                <ProfileEditPage />
                            </ProtectedProfileRoute>
                        ),
                    },
                ],
            },
            // 관리자
            {
                path: "admin",
                element: <AdminDashboardPage />,
                children: [
                    { index: true, element: <AdminDashboard /> },
                    { path: "dashboard", element: <AdminDashboard /> },
                    { path: "user_ban" , element: <UserBanManager/>},
                ],
            },

            // 로그인 관련
            { path: "login", element: <LoginPage /> },
            { path: "register", element: <RegisterPage /> },
            { path: "find-account", element: <FindAccountPage /> },
            { path: "withdraw", element: <WithdrawPage /> },
            { path: "/auth/register", element: <RegisterPage /> },

            // AI 대화
            { path: "ai-chat", element: <AIChatPage /> },
            // 부모 대시보드 및 페이지 확인용
            { path: "/parent/login", element: <ParentLoginPage /> },
            { path: "/parent/dashboard", element: <ParentDashboard /> },

            // ✅ fallback (404 방지)
            {
                path: "*",
                element: (
                    <div className="p-10 text-center text-gray-600">
                        🚧 페이지를 찾을 수 없습니다.
                    </div>
                ),
            },
        ],
    },
]);

export default router;