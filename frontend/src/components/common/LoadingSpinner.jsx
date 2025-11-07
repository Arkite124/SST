export default function LoadingSpinner({message}){
    return(
        <div className="my-[2rem] h-[8rem] w-[8rem] flex flex-col justify-center items-center rounded-[1000rem]">
            <div className="inset-0 rounded-full bg-gradient-to-r from-red-500
            via-yellow-400 via-green-400 via-blue-400 to-purple-500 animate-spin w-[80%] h-[80%] rounded-full"></div>
            <div className="inset-1 rounded-full bg-sky-50 w-[78%] h-[78%]"></div>
            <span className="text-lg md:text-2xl font-mono my-5 w-full h-[15%]">{message} 로딩중...</span>
        </div>
    )
}