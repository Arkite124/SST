import axiosInstance from "@/utils/axiosInstance.js";
const url="/check/duplicate"

//ID 중복 체크 완료
export function CheckUserNickname(userNickname){
    return axiosInstance.get(
        `${url}/check-nickname`,{
            params:{userNickname},
            headers: {"Content-Type": "application/json"}
        })}
//닉네임 중복체크
export function CheckPwCorrect({password,confirmPassword}){
    return axiosInstance.post(
        `${url}/check-password`, {
            password: password,
            confirmPassword: confirmPassword
        }, {
            headers: {"Content-Type": "application/json"},
        })
}
//비밀번호 일치 확인

export async function CheckEmail(email){
    return axiosInstance.post(`${url}/check-email`,{
        email
    },{
        headers: {"Content-Type": "application/json"}
    })}
//이메일 중복 확인

export async function CheckPhone(phone){
    return axiosInstance.post(`${url}/check-phone`,{
        phone:phone
    },{
        headers: {"Content-Type": "application/json"}
    })}
//핸드폰 중복 확인 여기까지 중복체크