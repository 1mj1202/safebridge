// 어떤 주소로 들어오든(첫 주소·/app·구역 QR·홈 화면 앱) 처음엔 이용자층 고르기부터 (사용자 결정 2026-11-22)
// 로그인은 유지: 이미 로그인한 부류는 눌러도 비밀번호 없이 바로, 근로자는 원래 가려던 주소(구역 QR 포함)로 이어진다
// 고르면 새 기록으로 넘어가므로, 뒤로 가기를 누르면 선택 화면으로 돌아온다
import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import RoleLogin from "../admin/RoleLogin";
import { api } from "../../shared/api";
import type { StaffMe } from "../../shared/staff";
import { gateIdx, historyIdx, markPicked, picked, unmarkPicked } from "./picked";

export default function RoleGate({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const { pathname, search } = useLocation();
  const [done, setDone] = useState(picked);
  const [me, setMe] = useState<StaffMe | null | undefined>(undefined);

  useEffect(() => {
    if (!done) api.get<StaffMe>("/admin/me").then(setMe).catch(() => setMe(null));
  }, [done]);

  useEffect(() => {
    const back = () => {
      if (picked() && historyIdx() <= gateIdx()) { unmarkPicked(); setMe(undefined); setDone(false); }
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);

  if (done) return <>{children}</>;
  if (me === undefined) return <div className="p-6 text-slate-500">…</div>;
  if (me === null) { markPicked(historyIdx()); return <>{children}</>; } // 예전 서버(잠금 없음)면 그대로 연다

  const enter = (to: string) => { markPicked(historyIdx()); setDone(true); nav(to); };
  return (
    <RoleLogin roles={me.roles} signedIn={me.ok ? me.role : null}
      onWorker={() => enter(pathname === "/" ? "/app" : pathname + search)}
      onLogin={() => enter("/")} />
  );
}
