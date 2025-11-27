import React, {Component, useState} from 'react';
import bgImg from "@/assets/bgImg.png";
import cloud from "@/assets/cuteCloud.png"

export default function Section1() {
        const [showMessage, setShowMessage] = useState(false);
        const [showCloud, setShowCloud] = useState(true);
        const [isDisappearing, setIsDisappearing] = useState(false);

        const handleCloudClick = () => {
            setIsDisappearing(true);
            setTimeout(() => {
                setShowCloud(false);
            }, 700); // 애니메이션 지속시간 만큼
        };

        return (
            <>
                {/* 배경 아래의 흰 줄은 이미지 자체의 문제이므로 자를 예정입니다. */}
                <section
                    className="text-center backdrop-blur-md shadow-inner snap-start
                 flex flex-col items-center justify-center
                 bg-no-repeat bg-cover bg-center h-[100vh] border-none"
                    style={{
                        width: "100%",
                        backgroundImage: `url(${bgImg})`,
                    }}
                >
                    {/* 로고 넣고 클릭하면 위로 올라가게 하면서 아래에 오브젝트 나타나게 하고싶다. */}
                    {showCloud && (
                        <div className="flex flex-col items-center justify-center">
                            <img
                                src={cloud}
                                alt="cloud"
                                onClick={handleCloudClick}
                                onMouseEnter={() => setShowMessage(true)}
                                onMouseLeave={() => setShowMessage(false)}
                                className={`absolute max-w-[250px] w-[20%] bottom-[50%] left-[40%]
                                    cloud-animation hover:brightness-50 cursor-pointer
                                    ${isDisappearing ? "cloud-fly-up" : ""}
                                `}
                            />
                            {/* 말풍선 대사창 */}
                            {showMessage && (
                                <div
                                    className="
                                    absolute bottom-[70%] left-[50%]
                                    bg-white shadow-[#3d5919] text-[#3d5919]
                                    p-3 rounded-3xl drop-shadow-lg
                                    w-[250px] text-center z-[-10]
                                ">
                                    나를 눌러봐! <br/>
                                    새싹톡 친구들을 소개해줄게!
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </>
        );
}
