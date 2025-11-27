// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ModalProvider } from "@/contexts/ModalContext";   // ⭐ 추가

// 레이아웃
import MainLayout from "./layouts/MainLayout";

// 메인
import MainPage from "./pages/Main/MainPage";

// 활동
import ActivityPage from "./pages/Activity/ActivityPage";
import ReadingLogPage from "./pages/Activity/ReadingLog/ReadingLogPage";
import DailyWritingPage from "./pages/Activity/DailyWriting/DailyWritingPage";
import WordSearchPage from "./pages/Activity/WordSearch/WordSearchPage";

// 커뮤니티
import CommunityPage from "./pages/Community/CommunityPage";
import StudentDiscussionPage from "./pages/Community/StudentDiscussion/StudentDiscussionPage";
import StudentDiscussionDetailPage from "./pages/Community/StudentDiscussion/StudentDiscussionDetailPage";
import ParentBoardPage from "./pages/Community/ParentBoard/ParentBoardPage";

// 테스트
import TestsPage from "./pages/Tests/TestsPage";
import ReadingTest from "./pages/Tests/ReadingTest/ReadingTest";
import VocabularyTestPage from "./pages/Tests/VocabularyTest/VocabularyTestPage";

// 게임
import GamesPage from "./pages/Games/GamesPage";
import WordChainPage from "./pages/Games/WordChain/WordChainPage";
import WordMeaningPage from "./pages/Games/WordMeaning/WordMeaningPage";
import SentencePuzzlePage from "./pages/Games/SentenceComplete/SentencePuzzlePage";

// 마이페이지
import MyPagePage from "./pages/MyPage/MyPagePage";
import DashboardPage from "./pages/MyPage/Dashboard/ChildDashboard";
import ParentDashboard from "./pages/MyPage/Dashboard/ParentDashboard";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import ProfileEditPage from "./pages/MyPage/ProfileEdit/ProfileEditPage";
import SubscriptionPage from "./pages/MyPage/Subscription/SubscriptionPage";

// 로그인 관련
import LoginPage from "./pages/Auth/Login/LoginPage";
import RegisterPage from "./pages/Auth/Register/RegisterPage";
import FindAccountPage from "./pages/Auth/FindAccount/FindAccountPage";
import WithdrawPage from "./pages/Auth/Withdraw/WithdrawPage";

// AI Chat
import AIChatPage from "./pages/AIChat/AIChatPage";
import PaymentSuccess from "./pages/MyPage/Subscription/PaymentSuccess";
import PaymentFail from "./pages/MyPage/Subscription/PaymentFail";
import ParentLoginPage from "./pages/MyPage/Dashboard/ParentLogin";
import ProtectedProfileRoute from "./pages/MyPage/ProfileEdit/ProtectedProfileRoute";
import ProfilePwConfirm from "./pages/MyPage/ProfileEdit/ProfilePwConfirm";
import UserBanManager from "./pages/Admin/UserBanManager";
import AdminDashboardPage from "./pages/Admin/AdminDashboardPage";
import Social from "@/pages/Auth/Register/Social.jsx";
import CustomerCenter from "@/pages/CustomerCenter/CustomerCenter.jsx";

function App() {
    return (
        <BrowserRouter>
            <ModalProvider>
                <Routes>
                    {/* 메인 레이아웃 */}
                    <Route path="/" element={<MainLayout />}>

                        {/* 메인 */}
                        <Route index element={<MainPage />} />

                        {/* 활동 */}
                        <Route path="activity" element={<ActivityPage />}>
                            <Route index element={<ReadingLogPage />} />
                            <Route path="reading-log" element={<ReadingLogPage />} />
                            <Route path="daily-writing" element={<DailyWritingPage />} />
                            <Route path="word-search" element={<WordSearchPage />} />
                        </Route>

                        {/* 커뮤니티 */}
                        <Route path="community" element={<CommunityPage />}>
                            <Route index element={<StudentDiscussionPage />} />
                            {/*학생 커뮤니티 목록 페이지*/}
                            <Route path="student-discussion" element={<StudentDiscussionPage />} />
                            {/*학생 커뮤니티 상세페이지*/}
                            <Route path="student-discussion/:id" element={<StudentDiscussionDetailPage />} />
                            <Route path="parent-board" element={<ParentBoardPage />} />
                        </Route>

                        {/* 테스트 */}
                        <Route path="tests" element={<TestsPage />}>
                            <Route path="reading" element={<ReadingTest />} />
                            <Route path="vocabulary" element={<VocabularyTestPage />} />
                        </Route>

                        {/* 게임 */}
                        <Route path="games" element={<GamesPage />}>
                            <Route index element={<WordChainPage />} />
                            <Route path="word-chain" element={<WordChainPage />} />
                            <Route path="word-meaning" element={<WordMeaningPage />} />
                            <Route path="sentence-complete" element={<SentencePuzzlePage />} />
                        </Route>

                        {/* 마이페이지 */}
                        <Route path="mypage" element={<MyPagePage />}>
                            <Route index element={<DashboardPage />} />
                            <Route path="dashboard" element={<DashboardPage />} />
                            <Route path="subscription" element={<SubscriptionPage />} />
                            <Route path="subscription/success" element={<PaymentSuccess />} />
                            <Route path="subscription/fail" element={<PaymentFail />} />
                            <Route path="confirm" element={<ProfilePwConfirm />} />
                            <Route
                                path="profile-edit"
                                element={
                                    <ProtectedProfileRoute>
                                        <ProfileEditPage />
                                    </ProtectedProfileRoute>
                                }
                            />
                        </Route>

                        {/* 관리자 */}
                        <Route path="admin" element={<AdminDashboardPage />}>
                            <Route index element={<AdminDashboard />} />
                            <Route path="dashboard" element={<AdminDashboard />} />
                            <Route path="user_ban" element={<UserBanManager />} />
                        </Route>
                        {/* 고객센터 */}
                        <Route path="support" element={<CustomerCenter />}>
                            <Route index element={<CustomerCenter />} />
                        </Route>

                        {/* 로그인 */}
                        <Route path="login" element={<LoginPage />} />
                        <Route path="register" element={<RegisterPage />} />
                        <Route path="social" element={<Social />} /> {/*소셜 로그인 최초 정보 입력*/}
                        <Route path="find-account" element={<FindAccountPage />} />
                        <Route path="withdraw" element={<WithdrawPage />} />
                        <Route path="/auth/register" element={<RegisterPage />} />

                        {/* AI 페이지 */}
                        <Route path="ai-chat" element={<AIChatPage />} />

                        {/* 부모 페이지 */}
                        <Route path="/parent/login" element={<ParentLoginPage />} />
                        <Route path="/parent/dashboard" element={<ParentDashboard />} />

                        {/* 404 */}
                        <Route
                            path="*"
                            element={
                                <div className="p-10 text-center text-gray-600">
                                    🚧 페이지를 찾을 수 없습니다.
                                </div>
                            }
                        />
                    </Route>
                </Routes>
            </ModalProvider>
        </BrowserRouter>
    );
}

export default App;
