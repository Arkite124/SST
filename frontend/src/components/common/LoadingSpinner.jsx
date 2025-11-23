import loading from "@/assets/loding.gif";

export default function LoadingSpinner({message}){
    return (
        <div className="flex flex-col items-center justify-center w-full">
            <img
                src={loading}
                alt="로딩 중..."
                className="object-contain"
            />
            {message && (
                <span className="text-lg md:text-xl font-medium text-gray-600 mt-4">
          {message} 로딩 중...
        </span>
            )}
        </div>
    );
}