// 첫 화면 잠금: 로그인된 기기면 바로 그 부류 화면으로, 아니면 부류 고르기(RoleLogin)
// 이 기기에서 마지막에 근로자로 들어갔고 근로자 로그인이 살아 있으면 근로자 앱으로 바로 넘긴다
// 관리자 쪽은 마지막으로 화면을 쓴 뒤 15분(서버 설정)이 지나면 자동 로그아웃
import { lazy, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../shared/api";
import { StaffContext, type StaffMe } from "../../shared/staff";
import { lastRole } from "./lastRole";
import RoleLogin from "./RoleLogin";
import { useIdleLogout } from "./useIdleLogout";

const AdminPage = lazy(() => import("./AdminPage"));

export default function AdminGate() {
  const nav = useNavigate();
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
      .then(async (r) => {
        if (!r.ok && lastRole() === "worker") {
          const w = await api.get<{ worker: unknown }>("/workers/me").catch(() => null);
          if (w?.worker) return nav("/app", { replace: true });
        }
        apply(r);
      })
      .catch(() => setState("ok")); // 예전 서버(잠금 기능 없음)면 그대로 연다
  }, [nav]);

  if (state === "wait") return <div className="p-6 text-slate-500">…</div>;
  if (state === "login") return <RoleLogin roles={me?.roles ?? []} notice={notice} onLogin={(r) => { setNotice(""); apply(r); }} />;
  return (
    <StaffContext.Provider value={{ me, logout }}>
      <AdminPage />
    </StaffContext.Provider>
  );
}
