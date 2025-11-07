import teamLogo from "../assets/team_logo.png";
import { FaGithub, FaRegStickyNote } from "react-icons/fa";

function Footer() {
    return (
        <footer className="bg-[#E9EFC0] border-t border-[#B4E197] h-[120px] overflow-hidden">
            <div className="px-4 md:px-8 lg:px-20 2xl:px-[300px] py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end text-sm text-gray-600 font-juache">
                    {/* ---------- 왼쪽 영역 ---------- */}
                    <div className="space-y-4 md:space-y-2">
                        <p className="text-base text-[#263035] font-medium">
                            © 2025 새싹톡 | 아동·청소년 어휘력 증진 학습 플랫폼
                        </p>
                        <div className="flex gap-6 justify-center md:justify-start">
                            <a href="/terms" className="hover:text-[#4E944F]">
                                이용약관
                            </a>
                            <a href="/privacy" className="hover:text-[#4E944F]">
                                개인정보처리방침
                            </a>
                            <a href="mailto:gydud1477@gmail.com" className="hover:text-[#4E944F]">
                                문의하기
                            </a>
                        </div>
                    </div>

                    {/* ---------- 오른쪽 영역 ---------- */}
                    <div className="flex flex-col items-end mt-6 md:mt-0">
                        {/* 아이콘 라인 */}
                        <div className="flex items-center gap-3 text-gray-600 mb-1">
                            <a
                                href="https://github.com/noooopa/KDT_Project"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-[#4E944F] transition-transform transform hover:scale-110"
                                title="GitHub"
                            >
                                <FaGithub size={25} />
                            </a>
                            <a
                                href="https://www.notion.so/Project-2778c0d741a880cd8b72fa552f18ba16?source=copy_link"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-[#4E944F] transition-transform transform hover:scale-110"
                                title="Notion"
                            >
                                <FaRegStickyNote size={25} />
                            </a>
                        </div>

                        {/* 프로젝트명 + 로고 (하단 정렬) */}
                        <div className="flex items-end gap-2">
                            <p className="text-sm text-gray-500 font-medium mb-[2px]">
                                SaessakTalk Project |
                            </p>
                            <img
                                src={teamLogo}
                                alt="Team Saessak 로고"
                                className="h-5 md:h-5"
                                style={{
                                    marginBottom: "4px",
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