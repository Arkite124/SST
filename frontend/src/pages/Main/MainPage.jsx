import { useRef } from "react";
import useAuthLoad from "@/hooks/useAuthLoad.jsx";
import Section1 from "@/pages/Main/section/Section1.jsx";
import Section2 from "@/pages/Main/section/Section2.jsx";

function MainPage() {
    useAuthLoad();

    // 각 섹션의 ref 생성
    const sectionRefs = [useRef(null), useRef(null)];

    const scrollToSection = (index) => {
        sectionRefs[index].current?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="w-full snap-y snap-mandatory overflow-x-hidden overflow-y-auto">
            {/* 섹션들 */}
            <div ref={sectionRefs[0]} className="snap-start">
                <Section1 />
            </div>
            <div ref={sectionRefs[1]} className="snap-start">
                <Section2 />
            </div>

            {/* 닷 포인트 네비게이션 */}
            <div className="fixed top-1/2 right-6 transform -translate-y-1/2 flex flex-col space-y-4 z-50">
                <button
                    className="w-3 h-3 rounded-full bg-gray-200 hover:bg-[#4E944F]"
                    onClick={() => scrollToSection(0)}
                />
                <button
                    className="w-3 h-3 rounded-full bg-gray-200 hover:bg-[#4E944F]"
                    onClick={() => scrollToSection(1)}
                />
            </div>
        </div>
    );
}

export default MainPage;
