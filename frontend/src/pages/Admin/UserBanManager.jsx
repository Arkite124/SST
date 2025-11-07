// src/components/admin/UserBanManager.jsx
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import {
    fetchBans,
    createBan,
    liftBan,
} from "@/redux/slices/userBanSlice.js";
import Loading from "@/components/common/Loading.jsx";

export default function UserBanManager() {
    const dispatch = useDispatch();
    const [page, setPage] = useState(1);

    const { items, pages, loading, error } = useSelector(
        (state) => state.userBans
    );

    // 처음 렌더링 / 페이지 변경 시 목록 요청
    useEffect(() => {
        dispatch(fetchBans({ page, size: 10 }));
    }, [dispatch, page]);

    const [newBan, setNewBan] = useState({
        user_id: "",
        reason: "",
        notes: "",
    });

    const handleCreateBan = (e) => {
        e.preventDefault();
        dispatch(
            createBan({
                user_id: Number(newBan.user_id),
                reason: newBan.reason,
                notes: newBan.notes,
            })
        );
        setNewBan({ user_id: "", reason: "", notes: "" });
    };

    const handleLiftBan = (banId) => {
        dispatch(liftBan(banId));
    };

    if (loading) return <Loading />;
    if (error) return <p>{error}</p>;
    if (!items) return null;

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-3">🚫 유저 벤 관리</h2>

            {/* ✅ 벤 생성 폼 */}
            <form
                onSubmit={handleCreateBan}
                className="space-y-2 border p-4 rounded mb-4 bg-gray-50"
            >
                <h3 className="font-semibold">새로운 벤 추가</h3>
                <input
                    type="number"
                    placeholder="User ID"
                    value={newBan.user_id}
                    onChange={(e) =>
                        setNewBan({ ...newBan, user_id: e.target.value })
                    }
                    className="border p-2 rounded w-full"
                    required
                />
                <input
                    type="text"
                    placeholder="Reason"
                    value={newBan.reason}
                    onChange={(e) =>
                        setNewBan({ ...newBan, reason: e.target.value })
                    }
                    className="border p-2 rounded w-full"
                    required
                />
                <textarea
                    placeholder="Notes"
                    value={newBan.notes}
                    onChange={(e) =>
                        setNewBan({ ...newBan, notes: e.target.value })
                    }
                    className="border p-2 rounded w-full"
                />
                <button
                    type="submit"
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                    벤 추가
                </button>
            </form>

            {/* ✅ 벤 목록 */}
            <table className="w-full border-collapse border text-sm">
                <thead>
                <tr className="bg-gray-200">
                    <th className="border p-2">User ID</th>
                    <th className="border p-2">닉네임</th>
                    <th className="border p-2">사유</th>
                    <th className="border p-2">등록일</th>
                    <th className="border p-2">해제일</th>
                    <th className="border p-2">관리</th>
                </tr>
                </thead>
                <tbody>
                {items.map((ban) => {
                    const now = dayjs();
                    const endDate = ban.end_date ? dayjs(ban.end_date) : null;
                    const canLift = endDate && endDate.isAfter(now);
                    return (
                        <tr key={ban.user_id} className="text-center">
                            <td className="border p-2">{ban.user_id}</td>
                            <td className="border p-2">{ban.nickname}</td>
                            <td className="border p-2">{ban.reason}</td>
                            <td className="border p-2">
                                {dayjs(ban.created_at)
                                    .locale("ko")
                                    .format("YYYY년 MM월 DD일 HH시")}
                            </td>
                            <td className="border p-2">
                                {ban.end_date
                                    ? dayjs(ban.end_date)
                                        .locale("ko")
                                        .format("YYYY년 MM월 DD일 HH시")
                                    : "-"}
                            </td>
                            <td className="border p-2">
                                {canLift ? (
                                    <button
                                        onClick={() =>
                                            handleLiftBan(ban.user_id)
                                        }
                                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                                    >
                                        해제
                                    </button>
                                ) : (
                                    <span className="text-gray-400">만료됨</span>
                                )}
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>

            {/* ✅ 페이지네이션 */}
            <div className="mt-4 flex justify-between items-center">
                <button
                    onClick={() => setPage((prev) => prev - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                >
                    이전
                </button>
                <span>
                    {page} / {pages || 1}
                </span>
                <button
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={page >= pages}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                >
                    다음
                </button>
            </div>
        </div>
    );
}
