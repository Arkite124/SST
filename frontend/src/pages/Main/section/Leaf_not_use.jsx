import React, { useState, useEffect } from "react";
import {Snowfall} from "react-snowfall";


export default function Section2() {
    const [images, setImages] = useState([]);

    useEffect(() => {
        const leaf1 = new Image();
        leaf1.src = '/assets/leaf.png';
        const leaf2 = new Image();
        leaf2.src = '/assets/leaf2.png';

        // 두 이미지가 모두 로드되면 setImages
        let loadedCount = 0;
        const onLoad = () => {
            loadedCount += 1;
            if (loadedCount === 2) {
                setImages([leaf1, leaf2]);
            }
        };

        leaf1.onload = onLoad;
        leaf2.onload = onLoad;
    }, []);
    return (
        <>
            <section
                className="relative h-screen"
                style={{
                    height: 'calc(100vh)',
                    background: 'linear-gradient(165deg, #b6cd4b, #7b9c40)',
                }}>
                {images.length > 0 && (
                    <Snowfall
                        speed={[0,1.5]}
                        images={images}
                        radius={[6, 17]}
                        snowflakeCount={50}
                        style={{
                            zIndex: 10,
                            position: 'absolute', // fixed -> absolute
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                        }}
                    />
                )}
                <div className="flex flex-col items-center justify-center h-full relative z-20">
                    <p className="text-lg md:text-3xl font-main text-[#3d5919] font-juache">
                        아동·청소년 어휘력 증진을 위한 인공지능 학습 플랫폼
                    </p>
                    <div className="flex flex-wrap justify-center gap-6 mt-10">
                        <div className="bg-[#f1ffe0] w-[300px] h-[400px] rounded-2xl"></div>
                        <div className="bg-[#f1ffe0] w-[300px] h-[400px] rounded-2xl"></div>
                        <div className="bg-[#f1ffe0] w-[300px] h-[400px] rounded-2xl"></div>
                        <div className="bg-[#f1ffe0] w-[300px] h-[400px] rounded-2xl"></div>
                    </div>
                </div>
            </section>
        </>
    );
}

