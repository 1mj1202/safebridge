// 관리자 화면 입구: 고른 부류가 있으면 그 부류 화면으로, 아니면 이용자층 고르기(RoleLogin, 비밀번호 없음)
// 서버에서 비밀번호 확인을 다시 켜면 마지막 사용 뒤 15분 자동 로그아웃도 함께 돌아온다
import { lazy, useCallback, useEffect, useState } from "react";
import { api } from "../../shared/api";
import { StaffContext, type StaffMe } from "../../shared/staff";
import RoleLogin from "./RoleLogin";
import { useIdleLogout } from "./useIdleLogout";

const AdminPage = lazy(() => import("./AdminPage"));

export default function AdminGate() {
  const [me, setMe] = useState<StaffMe | null>(null);
  const [state, setState] = useState<"wait" | "login" | "ok">("wait");
  const [notice, setNotice] = useState("");
  const idleSec = me?.idle_seconds ?? 15 * 60;

  const apply = (r: StaffMe) => { setMe(r); setState(r.ok ? "ok" : "login"); };

  const logout = useCallback(() => {
    api.post("/admin/logout").catch(() => {});
    setNotice(""); setState("login");
  }, []);

  useIdleLogout(state === "ok" && !!me?.required, idleSec * 1000, () => {
    setNotice(`${Math.round(idleSec / 60)}분 동안 사용하지 않아 로그아웃됐어요`); setState("login");
  });

  useEffect(() => {
    api.get<StaffMe>("/admin/me")
      .then(apply)
      .catch(() => setState("ok")); // 예전 서버(잠금 기능 없음)면 그대로 연다
  }, []);

  if (state === "wait") return <div className="p-6 text-slate-500">…</div>;
  if (state === "login") return <RoleLogin roles={me?.roles ?? []} notice={notice} onLogin={(r) => { setNotice(""); apply(r); }} />;
  return (
    <StaffContext.Provider value={{ me, logout }}>
      <AdminPage />
    </StaffContext.Provider>
  );
}
