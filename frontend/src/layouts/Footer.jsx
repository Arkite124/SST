import teamLogo from "../assets/team_logo.png";
import { FaGithub, FaRegStickyNote } from "react-icons/fa";

function Footer() {
    return (
        <footer className="bg-[#3d5919] overflow-hidden">
            <div className="px-2 md:px-8 py-2 md:py-5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-stretch text-sm text-[#f1ffe0] font-juache">
                    {/* ---------- 왼쪽 영역 ---------- */}
                    <div className="flex-1 flex flex-col justify-center md:space-y-2 ml-auto mr-auto">
                        <p className="text-base text-[#f1ffe0] font-medium">
                            © 2025 새싹톡 | 아동·청소년 어휘력 증진 학습 플랫폼
                        </p>
                        <div className="flex gap-6 justify-center md:justify-start mt-0">
                            <a href="/terms" className="hover:text-[#b6cd4b]">
                                이용약관
                            </a>
                            <a href="/privacy" className="hover:text-[#b6cd4b]">
                                개인정보처리방침
                            </a>
                            <a href="/support" className="hover:text-[#b6cd4b]">
                                문의하기
                            </a>
                        </div>
                    </div>

                    {/* ---------- 오른쪽 영역 ---------- */}
                    <div className="flex-1 flex flex-row md:flex-col items-center md:items-end justify-center mt-0 ml-auto mr-auto md:ml-0 md:mr-0">
                        {/* 아이콘 라인 */}
                        <div className="flex items-center gap-2 text-[#f1ffe0] mr-10">
                            <a
                                href="https://github.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-[#b6cd4b] transition-transform transform hover:scale-110"
                                title="GitHub"
                            >
                                <FaGithub size={25} />
                            </a>
                            <a
                                href="https://www.notion.so/Project-2778c0d741a880cd8b72fa552f18ba16?source=copy_link"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-[#b6cd4b] transition-transform transform hover:scale-110"
                                title="Notion"
                            >
                                <FaRegStickyNote size={25} />
                            </a>
                        </div>

                        {/* 프로젝트명 + 로고 (하단 정렬) */}
                        <div className="flex items-center mr-10 mt-1">
                            <img
                                src={teamLogo}
                                alt="Team Dodam 로고"
                                className="h-5 md:h-5 inline transition-all duration-300 hover:filter hover:brightness-0 hover:invert"
                                style={{
                                    marginBottom: "8px",
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
