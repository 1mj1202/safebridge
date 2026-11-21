// 근로자 가입·로그인 (처음 한 번만) — 이름 · 소속 업체 · 숫자 4자리. 아래에 '가입 없이 보기'
import { Building2, KeyRound, LogIn, User, UserPlus } from "lucide-react";
import { useState } from "react";
import { api } from "../../shared/api";
import { useFetch } from "../../shared/hooks";
import { authErrorKey, cleanPin } from "./authErrors";
import type { AuthUiKey, CompaniesData, Worker } from "./types";

const FIELD = "w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-lg outline-none focus:border-slate-900";
const ICON = { size: 18, strokeWidth: 1.75, className: "shrink-0 text-slate-400" } as const;

export default function SignupPage({ lang, onDone, onGuest }: {
  lang: string; onDone: (w: Worker) => void; onGuest: () => void }) {
  const { data } = useFetch<CompaniesData>(`/workers/companies?lang=${lang}`);
  const [login, setLogin] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<AuthUiKey | null>(null);
  const [busy, setBusy] = useState(false);
  if (!data) return <div className="p-6 text-center text-slate-500">…</div>;
  const ui = data.ui;
  const ok = name.trim() && company && pin.length === 4;

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const body = login ? { name, company, pin } : { name, company, pin, lang };
      const r = await api.post<{ worker: Worker }>(login ? "/workers/login" : "/workers/signup", body);
      onDone(r.worker);
    } catch (e) {
      const k = authErrorKey(e);
      setErr(k);
      if (k === "taken") setLogin(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-3 bg-white p-6 pt-12">
      <p className="mb-2 flex items-center gap-2 text-2xl font-semibold">
        {login ? <LogIn size={24} strokeWidth={1.75} /> : <UserPlus size={24} strokeWidth={1.75} />}{login ? ui.login : ui.signup}</p>
      <label className="flex items-center gap-2"><User {...ICON} />
        <input className={FIELD} value={name} onChange={(e) => setName(e.target.value)} placeholder={ui.name}
          autoComplete="name" maxLength={40} /></label>
      <label className="flex items-center gap-2"><Building2 {...ICON} />
        <select className={`${FIELD} bg-white ${company ? "" : "text-slate-400"}`} value={company}
          onChange={(e) => setCompany(e.target.value)} aria-label={ui.company}>
          <option value="" disabled>{ui.company}</option>
          {data.companies.map((c) => <option key={c.company} value={c.company}>{c.company} · {c.team}</option>)}
        </select></label>
      <label className="flex items-center gap-2"><KeyRound {...ICON} />
        <input className={`${FIELD} ${pin ? "tracking-[0.5em]" : ""}`} value={pin} onChange={(e) => setPin(cleanPin(e.target.value))}
          placeholder={ui.pin} inputMode="numeric" type="password" autoComplete={login ? "current-password" : "new-password"} /></label>
      {err && <p className="text-base text-red-600" role="alert">{ui[err]}</p>}
      <button onClick={submit} disabled={!ok || busy}
        className="mt-2 rounded-full bg-slate-900 py-4 text-lg font-semibold text-white disabled:bg-slate-300">
        {login ? ui.login : ui.signup}</button>
      <button onClick={() => { setLogin(!login); setErr(null); }} className="py-2 text-base text-slate-600 underline-offset-4 active:underline">
        {login ? ui.new_account : ui.have_account}</button>
      <button onClick={onGuest} className="mt-auto py-3 text-sm text-slate-400">{ui.guest}</button>
    </div>
  );
}
