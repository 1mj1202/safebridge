// 관리자 잠금: 서버에 비밀번호가 설정돼 있으면 로그인 후에만 관리자 화면을 연다
// 마지막으로 화면을 쓴 뒤 15분(서버 설정)이 지나면 자동 로그아웃
import { Lock } from "lucide-react";
import { lazy, useEffect, useState, type FormEvent } from "react";
import { api } from "../../shared/api";
import { useIdleLogout } from "./useIdleLogout";

type Me = { required: boolean; ok: boolean; idle_seconds?: number };

const AdminPage = lazy(() => import("./AdminPage"));

export default function AdminGate() {
  const [state, setState] = useState<"wait" | "login" | "ok">("wait");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false); // 비밀번호가 걸린 서버인지 (아니면 자동 로그아웃 없음)
  const [idleSec, setIdleSec] = useState(15 * 60);
  const [timedOut, setTimedOut] = useState(false);

  const apply = (r: Me) => {
    setLocked(r.required);
    if (r.idle_seconds) setIdleSec(r.idle_seconds);
    setState(r.ok ? "ok" : "login");
  };

  useIdleLogout(state === "ok" && locked, idleSec * 1000, () => {
    setPw(""); setErr(""); setTimedOut(true); setState("login");
  });

  useEffect(() => {
    api.get<Me>("/admin/me")
      .then(apply)
      .catch(() => setState("ok")); // 예전 서버(잠금 기능 없음)면 그대로 연다
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      apply(await api.post<Me>("/admin/login", { password: pw }));
      setTimedOut(false);
    } catch {
      setErr("비밀번호가 맞지 않아요");
    } finally {
      setBusy(false);
    }
  };

  if (state === "ok") return <AdminPage />;
  if (state === "wait") return <div className="p-6 text-slate-500">…</div>;
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 p-6">
      <form onSubmit={submit} className="w-full max-w-xs space-y-3 rounded-2xl bg-white p-6 shadow">
        <div className="flex items-center gap-2 font-bold"><Lock size={18} />SafeBridge 관리자</div>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus aria-label="비밀번호"
          placeholder="비밀번호" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        {timedOut && !err && <p className="text-xs text-slate-500">{Math.round(idleSec / 60)}분 동안 사용하지 않아 로그아웃됐어요</p>}
        {err && <p className="text-xs text-red-600">{err}</p>}
        <button disabled={busy || !pw} className="w-full rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white disabled:opacity-40">
          {busy ? "…" : "들어가기"}</button>
      </form>
    </div>
  );
}
