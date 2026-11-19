// 근로자 모바일 웹 (QR 접속, 로그인·개인정보 없음): 언어 선택 → 카드 3장 + 음성 → 이해 확인 → 질문·위험 신고
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../shared/api";
import { useFetch } from "../../shared/hooks";
import type { Card } from "../../shared/types";
import WorkerCard from "./WorkerCard";

interface WorkerData {
  lang: string;
  langs: Record<string, string>;
  work_date: string;
  storey: string;
  cards: Card[];
  ui: Record<"understood" | "question" | "report" | "listen", string>;
}

const SENT: Record<string, string> = {
  ko: "관리자에게 전달했어요", en: "Sent to the site manager", zh: "已发送给管理人员",
  vi: "Đã gửi cho quản lý", th: "ส่งถึงผู้จัดการแล้ว",
};
const THANKS: Record<string, string> = {
  ko: "확인 고마워요. 안전하게 일하세요!", en: "Thank you. Work safely!", zh: "谢谢确认, 注意安全!",
  vi: "Cảm ơn. Hãy làm việc an toàn!", th: "ขอบคุณ ทำงานอย่างปลอดภัย!",
};

function storeLang(token: string, lang?: string): string | null {
  try {
    if (lang) localStorage.setItem(`sb-lang-${token}`, lang);
    return localStorage.getItem(`sb-lang-${token}`);
  } catch {
    return lang ?? null;
  }
}

export default function WorkerPage() {
  const { token = "" } = useParams();
  const [lang, setLang] = useState<string | null>(() => storeLang(token));
  const [big, setBig] = useState(false);
  const { data, error } = useFetch<WorkerData>(lang ? `/w/${token}?lang=${lang}` : `/w/${token}?lang=ko`);
  const [done, setDone] = useState<"understood" | "question" | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"hazard" | "question">("hazard");
  const [sent, setSent] = useState(false);

  // 언어별 열람 1회 기록 (같은 기기에서 새로고침해도 중복 집계하지 않음)
  useEffect(() => {
    if (!lang || !data) return;
    const k = `sb-viewed-${token}-${lang}`;
    try {
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch { /* 저장소 차단 시 그냥 기록 */ }
    api.post(`/w/${token}/ack`, { lang, status: "viewed" }).catch(() => undefined);
  }, [lang, data, token]);

  if (error) return <div className="p-6 text-center text-red-600">TBM 을 찾을 수 없어요 ({error})</div>;
  if (!data) return <div className="p-6 text-center text-slate-500">…</div>;

  if (!lang) {
    return (
      <div className="mx-auto max-w-md p-5">
        <h1 className="mb-1 text-center text-2xl font-bold">SafeBridge TBM</h1>
        <p className="mb-5 text-center text-slate-500">언어를 고르세요 · Choose your language</p>
        <div className="grid gap-3">
          {Object.entries(data.langs).map(([k, v]) => (
            <button key={k} onClick={() => setLang(storeLang(token, k) ?? k)}
              className="rounded-2xl bg-white py-5 text-2xl font-bold shadow ring-1 ring-slate-200 active:bg-slate-100">{v}</button>
          ))}
        </div>
      </div>
    );
  }

  const ack = async (status: "understood" | "question") => {
    await api.post(`/w/${token}/ack`, { lang, status });
    setDone(status);
    if (status === "question") { setKind("question"); setReportOpen(true); }
  };
  const submit = async () => {
    if (!text.trim()) return;
    await api.post(`/w/${token}/report`, { lang, kind, text: text.trim() });
    setSent(true); setText(""); setReportOpen(false);
  };

  return (
    <div className="mx-auto max-w-md space-y-4 p-4 pb-28">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{data.work_date} · {data.storey}</p>
          <h1 className="text-xl font-bold">SafeBridge TBM</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setBig((b) => !b)} aria-pressed={big}
            className={`rounded-full px-3 py-1.5 text-sm font-bold ${big ? "bg-slate-900 text-white" : "bg-white ring-1 ring-slate-300"}`}>
            가 A+</button>
          <button onClick={() => { setLang(null); try { localStorage.removeItem(`sb-lang-${token}`); } catch { /* */ } }}
            className="rounded-full bg-white px-3 py-1.5 text-sm ring-1 ring-slate-300">🌐 {data.langs[lang]}</button>
        </div>
      </header>

      {data.cards.map((c) => <WorkerCard key={c.type} card={c} lang={lang} big={big} listenLabel={data.ui.listen} />)}

      {done === "understood" && <p className="rounded-xl bg-emerald-50 p-3 text-center text-emerald-800">{THANKS[lang]}</p>}
      {sent && <p className="rounded-xl bg-blue-50 p-3 text-center text-blue-800">{SENT[lang]}</p>}

      {reportOpen && (
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="mb-2 flex gap-2">
            {(["hazard", "question"] as const).map((k) => (
              <button key={k} onClick={() => setKind(k)}
                className={`flex-1 rounded-lg py-2 font-semibold ${kind === k ? "bg-orange-600 text-white" : "bg-slate-100"}`}>
                {k === "hazard" ? data.ui.report : data.ui.question}</button>
            ))}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={500}
            className="w-full rounded-lg border border-slate-300 p-2 text-lg" aria-label={data.ui.report} />
          <button onClick={submit} className="mt-2 w-full rounded-lg bg-slate-900 py-3 text-lg font-bold text-white">➤</button>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 mx-auto grid max-w-md grid-cols-3 gap-2 bg-white/95 p-3 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <button onClick={() => ack("understood")} className="rounded-xl bg-emerald-600 py-3 font-bold text-white">👍 {data.ui.understood}</button>
        <button onClick={() => ack("question")} className="rounded-xl bg-blue-600 py-3 font-bold text-white">❓ {data.ui.question}</button>
        <button onClick={() => { setKind("hazard"); setReportOpen(true); }} className="rounded-xl bg-orange-600 py-3 font-bold text-white">⚠ {data.ui.report}</button>
      </nav>
    </div>
  );
}
