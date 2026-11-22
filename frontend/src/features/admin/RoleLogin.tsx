// 이용자층 고르기 — 비밀번호·가입 없이 고르기만 하면 들어간다 (사용자 결정 2026-11-22)
// 근로자는 근로자 앱(/app), 나머지는 그 부류 권한으로 관리자 화면
import { Building2, ClipboardCheck, HardHat, ShieldCheck, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../shared/api";
import type { StaffMe } from "../../shared/staff";

const ICONS: Record<string, LucideIcon> = { safety: ShieldCheck, manager: Building2, viewer: ClipboardCheck };

interface Props {
  roles: StaffMe["roles"];
  notice?: string;
  onLogin: (me: StaffMe) => void;
  /** 근로자를 골랐을 때 (기본: 근로자 앱으로) */
  onWorker?: () => void;
}

export default function RoleLogin({ roles, notice, onLogin, onWorker }: Props) {
  const nav = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const enter = async (role: string) => {
    setBusy(role); setErr("");
    try {
      onLogin(await api.post<StaffMe>("/admin/login", { role }));
    } catch {
      setErr("들어가지 못했어요. 잠시 뒤 다시 눌러 주세요");
    } finally {
      setBusy(null);
    }
  };

  const btn = "flex w-full items-center gap-3 rounded-xl border border-slate-300 px-4 py-3.5 text-left text-[15px] font-medium hover:bg-slate-50 disabled:opacity-50";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-xs space-y-3 rounded-2xl bg-white p-6 shadow">
        <div className="flex items-center gap-2 font-bold">
          <img src="/favicon.svg" alt="" className="h-6 w-6" />SafeBridge
        </div>
        <p className="text-xs text-slate-500">누구로 들어갈지 골라 주세요</p>
        <button type="button" className={btn} onClick={() => (onWorker ? onWorker() : nav("/app"))}>
          <HardHat size={18} className="shrink-0" />근로자</button>
        {roles.map((r) => {
          const Icon = ICONS[r.id] ?? ShieldCheck;
          return (
            <button key={r.id} type="button" className={btn} disabled={!!busy} onClick={() => enter(r.id)}>
              <Icon size={18} className="shrink-0" />{busy === r.id ? "…" : r.label}</button>
          );
        })}
        {notice && !err && <p className="text-xs text-slate-500">{notice}</p>}
        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>
    </div>
  );
}
