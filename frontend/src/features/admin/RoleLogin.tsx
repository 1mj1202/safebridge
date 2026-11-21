// 첫 화면: 이용자 부류 고르기 → 근로자는 근로자 앱(/app, 자체 가입·로그인·가입 없이 보기), 나머지는 부류별 비밀번호
// 고른 부류는 이 기기에 기억해 다음에는 그 부류가 먼저 선택돼 있다
import { HardHat, Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../shared/api";
import type { StaffMe } from "../../shared/staff";
import { lastRole, setLastRole } from "./lastRole";

interface Props {
  roles: StaffMe["roles"];
  notice?: string;
  onLogin: (me: StaffMe) => void;
}

export default function RoleLogin({ roles, notice, onLogin }: Props) {
  const nav = useNavigate();
  const remembered = lastRole();
  const [role, setRole] = useState<string | null>(roles.some((r) => r.id === remembered) ? remembered : null);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const worker = () => { setLastRole("worker"); nav("/app"); };
  const pick = (id: string) => { setRole(id); setPw(""); setErr(""); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setBusy(true); setErr("");
    try {
      const me = await api.post<StaffMe>("/admin/login", { role, password: pw });
      setLastRole(role);
      onLogin(me);
    } catch {
      setErr("비밀번호가 맞지 않아요");
    } finally {
      setBusy(false);
    }
  };

  const btn = (on: boolean) => `flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm ${
    on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 hover:bg-slate-50"}`;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-xs space-y-3 rounded-2xl bg-white p-6 shadow">
        <div className="flex items-center gap-2 font-bold">
          <img src="/favicon.svg" alt="" className="h-6 w-6" />SafeBridge
        </div>
        <p className="text-xs text-slate-500">누구로 들어갈지 골라 주세요</p>
        <button type="button" className={btn(false)} onClick={worker}><HardHat size={16} />근로자</button>
        {roles.map((r) => (
          <button key={r.id} type="button" className={btn(role === r.id)} aria-pressed={role === r.id}
            onClick={() => pick(r.id)}><Lock size={16} />{r.label}</button>
        ))}
        {role && (
          <form onSubmit={submit} className="space-y-2 pt-1">
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus aria-label="비밀번호"
              placeholder="비밀번호" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            {notice && !err && <p className="text-xs text-slate-500">{notice}</p>}
            {err && <p className="text-xs text-red-600">{err}</p>}
            <button disabled={busy || !pw} className="w-full rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white disabled:opacity-40">
              {busy ? "…" : "들어가기"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
