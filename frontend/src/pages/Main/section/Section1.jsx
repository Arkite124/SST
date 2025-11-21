import React, {Component} from 'react';
import bgImg from "@/assets/bgImg.png";
import cloud from "@/assets/cuteCloud.png"

export default function Section1() {
        return (
            <>
                <section
                    className="text-center backdrop-blur-md shadow-inner snap-start
                 flex flex-col items-center justify-center
                 bg-repeat-y bg-[length:auto] bg-center"
                    style={{
                        width: "100%",
                        height: "calc(100vh)",
                        backgroundImage: `url(${bgImg})`,
                    }}
                >
                    {/* 로고 넣고 클릭하면 위로 올라가게 하면서 아래에 오브젝트 나타나게 하고싶다. */}
                    <div className="flex flex-col items-center justify-center">
                        <img
                            src={cloud}
                            alt="cloud"
                            className="absolute w-[20%] mb-[5%] ml-[10%] cloud-animation"
                        />
                    </div>
                </section>
            </>
        );
}
