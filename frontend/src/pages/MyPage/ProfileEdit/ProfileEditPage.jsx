import { useEffect, useState } from "react";
import axiosInstance from "../../../utils/axiosInstance.js";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import toast from "react-hot-toast";

function ProfileEditPage() {
  const [profile, setProfile] = useState({
    id: "",
    name: "",
    nickname: "",
    age: "",
    gender: "",
    phone: "",
    email: "",
    key_parent: "",
  });
  const [loading, setLoading] = useState(true);
  const [showParentKeyInput, setShowParentKeyInput] = useState(false);
  const [parentKey, setParentKey] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axiosInstance.get("/users/me", { withCredentials: true });
        setProfile(response.data);
      } catch (err) {
        console.error("프로필 정보 불러오기 실패:", err);
        toast.error("프로필 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.patch(`/users/me`, profile, {
        withCredentials: true,
      });
      toast.success("프로필이 성공적으로 수정되었습니다!");
    } catch (err) {
      console.error("프로필 수정 실패:", err);
      toast.error("수정 중 오류가 발생했습니다.");
    }
  };

  // ✅ ParentKey DB에 저장
  const handleParentKeySave = async () => {
    if (!parentKey.trim()) {
      toast.error("Parent Key를 입력해주세요.");
      return;
    }
    try {
      const res = await axiosInstance.patch(
        `/users/me`,
        { ...profile, key_parent: parentKey },
        { withCredentials: true }
      );
      setProfile(res.data);
      toast.success("Parent Key가 성공적으로 저장되었습니다!");
      setShowParentKeyInput(false);
    } catch (err) {
      console.error("Parent Key 저장 실패:", err);
      toast.error("Parent Key 저장 중 오류가 발생했습니다.");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 bg-[#E9EFC0] min-h-screen">
      <h1 className="text-3xl font-bold text-[#4E944F] mb-6">프로필 수정</h1>

      <Card className="bg-white p-6 shadow-md rounded-2xl border border-[#B4E197] max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이름 */}
          <div>
            <label className="block text-[#4E944F] font-semibold mb-1">이름</label>
            <input
              type="text"
              name="name"
              value={profile.name || ""}
              onChange={handleChange}
              className="w-full border border-[#B4E197] rounded-lg p-2 focus:ring-2 focus:ring-[#4E944F]"
              placeholder="이름을 입력하세요"
            />
          </div>

          {/* 닉네임 */}
          <div>
            <label className="block text-[#4E944F] font-semibold mb-1">닉네임</label>
            <input
              type="text"
              name="nickname"
              value={profile.nickname || ""}
              onChange={handleChange}
              className="w-full border border-[#B4E197] rounded-lg p-2 focus:ring-2 focus:ring-[#4E944F]"
              placeholder="닉네임을 입력하세요"
            />
          </div>

          {/* 나이 */}
          <div>
            <label className="block text-[#4E944F] font-semibold mb-1">나이</label>
            <input
              type="number"
              name="age"
              value={profile.age || ""}
              onChange={handleChange}
              className="w-full border border-[#B4E197] rounded-lg p-2 focus:ring-2 focus:ring-[#4E944F]"
              placeholder="나이를 입력하세요"
            />
          </div>

          <div>
            <label className="block text-[#4E944F] font-semibold mb-1">성별</label>
            <select
              name="gender"
              value={profile.gender || ""}
              onChange={handleChange}
              className="w-full border border-[#B4E197] rounded-lg p-2 focus:ring-2 focus:ring-[#4E944F]"
            >
              <option value="">선택</option>
              <option value="M">남성</option>
              <option value="F">여성</option>
            </select>
          </div>

          <div>
            <label className="block text-[#4E944F] font-semibold mb-1">전화번호</label>
            <input
              type="tel"
              name="phone"
              value={profile.phone || ""}
              onChange={handleChange}
              className="w-full border border-[#B4E197] rounded-lg p-2 focus:ring-2 focus:ring-[#4E944F]"
              placeholder="010-0000-0000"
            />
          </div>

          <div>
            <label className="block text-[#4E944F] font-semibold mb-1">이메일</label>
            <input
              type="email"
              value={profile.email || ""}
              readOnly
              className="w-full border border-gray-300 bg-gray-100 rounded-lg p-2"
            />
          </div>
          {/*  parent key 생성 확인 버튼 */}
          <div className="pt-4">
            <button
              type="button"
              onClick={() => setShowParentKeyInput(!showParentKeyInput)}
              className="bg-[#83BD75] hover:bg-[#6AA56A] text-white px-4 py-2 rounded-xl font-semibold shadow transition"
            >
              {showParentKeyInput ? "입력창 닫기" : "Parent Key 생성"}
            </button>
          </div>
          {/*parent key 생성 창 출력*/}
          {showParentKeyInput && (
            <div className="pt-4">
              <label className="block text-[#4E944F] font-semibold mb-1">Parent Key 입력</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={parentKey}
                  onChange={(e) => setParentKey(e.target.value)}
                  className="flex-1 border border-[#B4E197] rounded-lg p-2 focus:ring-2 focus:ring-[#4E944F]"
                  placeholder="부모 인증키를 입력하세요"
                />
                <button
                  type="button"
                  onClick={handleParentKeySave}
                  className="bg-[#4E944F] hover:bg-[#3a7a3d] text-white px-4 py-2 rounded-xl font-semibold shadow"
                >
                  저장
                </button>
              </div>
            </div>
          )}

          {/* 저장 버튼 */}
          <div className="text-center pt-6">
            <button
              type="submit"
              className="bg-[#4E944F] hover:bg-[#3a7a3d] text-white px-6 py-2 rounded-xl font-semibold"
            >
              저장하기
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default ProfileEditPage;
