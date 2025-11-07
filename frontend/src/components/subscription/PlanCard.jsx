export default function PlanCard({ planName, amount, benefits = [], onClick }) {
    return (
        <div className="bg-[#f7fcf8] border border-green-200 rounded-2xl mx-[0.5rem] p-6 shadow-md w-[20rem] min-h-[25rem] flex flex-col justify-between">
            <div>
                <h2 className="text-lg font-bold text-green-700 mb-2">
                    {planName} 요금제
                </h2>
                <p className="text-gray-700 mb-1">
                    💰 <span className="font-semibold">{amount.toLocaleString()}원</span> / 월
                </p>

                <h3 className="text-md font-semibold text-green-800 mt-4 mb-2">🎁 혜택</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {benefits.map((b, idx) => (
                        <li key={idx}>{b}</li>
                    ))}
                </ul>
            </div>

            <button
                onClick={onClick}
                className="mt-6 bg-[#4E944F] hover:bg-[#3a7a3d] text-white px-6 py-2 rounded-xl font-semibold shadow w-full"
            >
                {planName} 결제하기
            </button>
        </div>
    );
}
