import { Link } from "react-router-dom";
import bgImg from "../../assets/bgImg.png";
import useAuthLoad from "@/hooks/useAuthLoad.jsx"; // 첨부한 세로형 지도 이미지 사용

function MainPage() {
    useAuthLoad()
    return (
        <div className="w-full snap-y snap-mandatory overflow-x-hidden">
        {/* Hero Section */}
            <section
                className="text-center bg-[#7b9c40]/70 backdrop-blur-md shadow-inner snap-start
             flex flex-col items-center justify-center w-full
             bg-repeat-y bg-[length:auto] bg-center"
                style={{
                    width: "100%",
                    height: "calc(100vh - 5rem)",
                    backgroundImage: `url(${bgImg})`,
                }}
            >
            </section>
            <section
                style={{
                    height: 'calc(100vh - 5rem - 120px)',
                }}>
                <div className="flex flex-col items-center">
                    <p className="text-lg md:text-xl font-main text-textsub">
                        아동·청소년 어휘력 증진을 위한 인공지능 학습 플랫폼
                    </p>
                </div>
            </section>
        </div>
    );
}

export default MainPage;