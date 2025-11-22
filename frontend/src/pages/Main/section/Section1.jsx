import React, {Component} from 'react';
import bgImg from "@/assets/bgImg.png";
import cloud from "@/assets/cuteCloud.png"

export default function Section1() {
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
                    <div className="flex flex-col items-center justify-center">
                        <img
                            src={cloud}
                            alt="cloud"
                            className="absolute max-w-[250px] w-[20%] bottom-[50%] left-[40%] cloud-animation"
                        />
                    </div>
                </section>
            </>
        );
}
