// 관리자 잠금: 서버에 비밀번호가 설정돼 있으면 로그인 후에만 관리자 화면을 연다
import { Lock } from "lucide-react";
import { lazy, useEffect, useState, type FormEvent } from "react";
import { api } from "../../shared/api";

const AdminPage = lazy(() => import("./AdminPage"));

export default function AdminGate() {
  const [state, setState] = useState<"wait" | "login" | "ok">("wait");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<{ required: boolean; ok: boolean }>("/admin/me")
      .then((r) => setState(r.ok ? "ok" : "login"))
      .catch(() => setState("ok")); // 예전 서버(잠금 기능 없음)면 그대로 연다
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await api.post("/admin/login", { password: pw });
      setState("ok");
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
        {err && <p className="text-xs text-red-600">{err}</p>}
        <button disabled={busy || !pw} className="w-full rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white disabled:opacity-40">
          {busy ? "…" : "들어가기"}</button>
      </form>
    </div>
  );
}
