import React from "react";
import Kid1 from "@/assets/kid1.png";
import Kid2 from "@/assets/kid2.png";
import Kid3 from "@/assets/kid3.png";
import Kid4 from "@/assets/kid4.png";
import Logo from "@/assets/logo.png";
import pattern from "@/assets/pattern1.png";


export default function Section2() {
    return (
        <>
            <section
                style={{
                    height: 'calc(100vh)',
                    backgroundImage: `url(${pattern}), linear-gradient(180deg, #b6cd4b 0%, #d2f7ff 50%, #35d7ff 100%)`,
                    backgroundRepeat: 'repeat-x, no-repeat',
                    backgroundSize: '1300px, cover',
                    backgroundPosition: 'center 870px, top',
                }}
            >
                <div className="flex flex-col items-center justify-center h-full">
                    <div>
                        <img src={Logo} alt="Logo" className="w-20 md:w-[130px] block mx-auto mb-2 md:mt-[4vh] 2xl:mt-0 shadow-green-800/50 filter brightness-[1.15] drop-shadow-[0_5px_7px_rgba(182,205,75,0.5)]" />
                        <p className="text-xl md:text-3xl font-main text-[#3d5919] font-juache">
                            아동·청소년 어휘력 증진을 위한 인공지능 학습 플랫폼
                        </p>
                    </div>

                    <div className="hidden 2xl:flex 2xl:flex-wrap 2xl:justify-center gap-6 mt-10 font-juache">
                        <div className="bg-[#f1ffe0]/40 2xl:w-[300px] 2xl:h-[450px] rounded-2xl shadow-lg shadow-sky-600/30 relative
                                        hover:-translate-y-2 transition-transform duration-300 ease-out">
                            <div className="absolute top-10 left-1/2 transform -translate-x-1/2 text-2xl p-2 bg-[#b6cd4b] w-[100px] h-[40px] rounded-2xl flex items-center justify-center">주제</div>
                            <img
                                src = {Kid1}
                                alt = "Kid1"
                                className="w-[250px] ml-[10%] mt-[70%]"
                            />
                        </div>
                        <div className="bg-[#f1ffe0]/40 2xl:w-[300px] 2xl:h-[450px] rounded-2xl shadow-lg shadow-sky-600/30 relative
                                        hover:-translate-y-2 transition-transform duration-300 ease-out">
                            <div className="absolute top-10 left-1/2 transform -translate-x-1/2 text-2xl p-2 bg-[#b6cd4b] w-[100px] h-[40px] rounded-2xl flex items-center justify-center">주제</div>
                            <img
                                src = {Kid2}
                                alt = "Kid2"
                                className="w-[250px] ml-[10%] mt-[80%]"
                            />
                        </div>
                        <div className="bg-[#f1ffe0]/40 2xl:w-[300px] 2xl:h-[450px] rounded-2xl shadow-lg shadow-sky-600/30 relative
                                        hover:-translate-y-2 transition-transform duration-300 ease-out">
                            <div className="absolute top-10 left-1/2 transform -translate-x-1/2 text-2xl p-2 bg-[#b6cd4b] w-[100px] h-[40px] rounded-2xl flex items-center justify-center">주제</div>
                            <img
                                src = {Kid3}
                                alt = "Kid3"
                                className="w-[250px] ml-[10%] mt-[60%]"
                            />
                        </div>
                        <div className="bg-[#f1ffe0]/40 2xl:w-[300px] 2xl:h-[450px] rounded-2xl shadow-lg shadow-sky-600/30 relative
                                        hover:-translate-y-2 transition-transform duration-300 ease-out">
                            <div className="absolute top-10 left-1/2 transform -translate-x-1/2 text-2xl p-2 bg-[#b6cd4b] w-[100px] h-[40px] rounded-2xl flex items-center justify-center">주제</div>
                            <img
                                src = {Kid4}
                                alt = "Kid4"
                                className="w-[250px] ml-[10%] mt-[60%]"
                            />
                        </div>
                    </div>
                    <div className="2xl:hidden flex flex-wrap justify-center gap-5 mt-8">
                        <div className="flex flex-col gap-5">
                            <div className="bg-[#f1ffe0]/40 w-[75vw] h-[15vh] md:w-[400px] md:h-[300px] rounded-2xl shadow-lg shadow-sky-600/20">

                                <img
                                    src = {Kid1}
                                    alt = "Kid1"
                                    className="w-[150px] md:w-[200px] ml-1 md:ml-[25%] md:mt-[30%] "
                                />
                            </div>
                            <div className="bg-[#f1ffe0]/40 w-[75vw] h-[15vh] md:w-[400px] md:h-[300px] rounded-2xl shadow-lg shadow-sky-600/20">
                                <img
                                    src = {Kid3}
                                    alt = "Kid3"
                                    className="w-[130px] md:w-[200px] ml-1 mt-1 md:ml-[25%] md:mt-[20%] "
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-5">
                            <div className="bg-[#f1ffe0]/40 w-[75vw] h-[15vh] md:w-[400px] md:h-[300px] rounded-2xl shadow-lg shadow-sky-600/20">
                                <img
                                    src = {Kid2}
                                    alt = "Kid2"
                                    className="w-[130px] md:w-[200px] ml-3 mt-3 md:ml-[25%] md:mt-[35%] "
                                />
                            </div>
                            <div className="bg-[#f1ffe0]/40 w-[75vw] h-[15vh] md:w-[400px] md:h-[300px] rounded-2xl shadow-lg shadow-sky-600/20">
                                <img
                                    src = {Kid4}
                                    alt = "Kid4"
                                    className="w-[120px] md:w-[200px] ml-1 md:ml-[25%] md:mt-[20%] "
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

