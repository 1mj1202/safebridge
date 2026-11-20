// 근로자 현장 챗봇 (구역 QR 접속, 로그인·개인정보 없음)
// 언어 → 구역(?zone=) → 구역 브리핑 + 음성 → 질문(브리핑 안에서 답) / 문제 알리기(번역·긴급도·반장 전달) → 회신
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../../shared/api";
import { useFetch } from "../../shared/hooks";
import BriefMessage from "./BriefMessage";
import ChatInput, { type Mode } from "./ChatInput";
import type { Brief, ChatMsg, ZonesData } from "./fieldTypes";
import LangPicker from "./LangPicker";
import { THANKS } from "./messages";
import { once, remember } from "./storage";
import { useIssueReplies } from "./useIssueReplies";
import { useNfcZone } from "./useNfcZone";
import ZonePicker from "./ZonePicker";

const BUBBLE = {
  me: "ml-auto rounded-tr-none bg-blue-600 text-white",
  bot: "rounded-tl-none bg-white",
  lead: "rounded-tl-none bg-emerald-50 ring-1 ring-emerald-300",
} as const;

function loadMsgs(k: string): ChatMsg[] {
  try { return JSON.parse(sessionStorage.getItem(k) ?? "[]") as ChatMsg[]; } catch { return []; }
}

export default function WorkerPage() {
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const [lang, setLang] = useState<string | null>(() => remember(`sb-lang-${token}`));
  const [zone, setZone] = useState<string | null>(
    () => remember(`sb-zone-${token}`, params.get("zone") ?? undefined)); // 구역 QR·NFC 주소의 zone 이 우선
  const [big, setBig] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { data, error } = useFetch<ZonesData>(`/w/${token}/zones?lang=${lang ?? "ko"}`);
  const { data: brief } = useFetch<Brief>(lang && zone ? `/w/${token}/brief?lang=${lang}&zone=${encodeURIComponent(zone)}` : null);
  const msgKey = `sb-chat-${token}-${zone}-${lang}`;
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => loadMsgs(msgKey));

  useEffect(() => setMsgs(loadMsgs(msgKey)), [msgKey]);
  useEffect(() => { try { sessionStorage.setItem(msgKey, JSON.stringify(msgs)); } catch { /* */ } }, [msgKey, msgs]);
  const add = useCallback((m: ChatMsg) => setMsgs((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, m])), []);
  useIssueReplies(token, msgs, add);
  const pickZone = useCallback((z: string) => setZone(remember(`sb-zone-${token}`, z) ?? z), [token]);
  const nfc = useNfcZone(token, pickZone);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (msgs.length) end.current?.scrollIntoView?.({ behavior: "smooth" }); }, [msgs.length]);

  // 언어별 열람 1회 기록 (같은 기기 새로고침 중복 제외)
  useEffect(() => {
    if (lang && brief && once(`sb-viewed-${token}-${lang}`)) api.post(`/w/${token}/ack`, { lang, status: "viewed" }).catch(() => undefined);
  }, [lang, brief, token]);

  if (error) return <div className="p-6 text-center text-red-600">TBM 을 찾을 수 없어요 ({error})</div>;
  if (!data) return <div className="p-6 text-center text-slate-500">…</div>;
  if (!lang) return <LangPicker langs={data.langs} onPick={(l) => setLang(remember(`sb-lang-${token}`, l) ?? l)} />;
  const ui = data.ui;
  if (!zone || (data.zones.length && !data.zones.some((z) => z.zone === zone))) {
    return <ZonePicker greet={ui.greet} hint={ui.scan_hint} zones={data.zones} onPick={pickZone} nfc={nfc} />;
  }

  const send = async (mode: Mode, text: string) => {
    const now = Date.now();
    add({ id: `me-${now}`, from: "me", text });
    setBusy(true);
    try {
      if (mode === "ask") {
        if (once(`sb-asked-${token}-${lang}`)) ack("question");
        const r = await api.post<{ text: string }>(`/w/${token}/chat`, { lang, zone, message: text });
        add({ id: `bot-${now}`, from: "bot", text: r.text });
      } else {
        const r = await api.post<{ id: number; key: string; urgency: string; messages: string[] }>(
          `/w/${token}/issue`, { lang, zone, text });
        r.messages.forEach((m, i) => add({
          id: `bot-${now}-${i}`, from: "bot", text: m,
          tone: r.urgency === "urgent" && i === 0 ? "urgent" : "info",
          issue: i === r.messages.length - 1 ? { id: r.id, key: r.key } : undefined,
        }));
      }
    } catch {
      add({ id: `bot-${now}`, from: "bot", text: ui.ask_lead });
    } finally {
      setBusy(false);
    }
  };
  // 질문을 보낸 근로자는 '질문 있음'으로 한 번 집계 (관리자 TBM 확인 현황)
  const ack = (status: "understood" | "question") => api.post(`/w/${token}/ack`, { lang, status }).catch(() => undefined);

  return (
    <div className="mx-auto max-w-md space-y-3 bg-slate-100 p-4 pb-64">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{data.work_date}</p>
          <h1 className="truncate text-xl font-bold">📍 {brief?.zone === zone ? brief.label : zone}</h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => setBig((b) => !b)} aria-pressed={big}
            className={`rounded-full px-3 py-1.5 text-sm font-bold ${big ? "bg-slate-900 text-white" : "bg-white ring-1 ring-slate-300"}`}>가 A+</button>
          {nfc.supported && (
            <button onClick={nfc.start} aria-pressed={nfc.active} aria-label="NFC"
              className={`rounded-full px-3 py-1.5 text-sm ${nfc.active ? "bg-blue-600 text-white" : "bg-white ring-1 ring-slate-300"}`}>📶</button>
          )}
          <button onClick={() => setZone(remember(`sb-zone-${token}`, null))} aria-label={ui.change_zone}
            className="rounded-full bg-white px-3 py-1.5 text-sm ring-1 ring-slate-300">🔀</button>
          <button onClick={() => setLang(remember(`sb-lang-${token}`, null))}
            className="rounded-full bg-white px-3 py-1.5 text-sm ring-1 ring-slate-300">🌐 {data.langs[lang]}</button>
        </div>
      </header>

      {brief ? <BriefMessage brief={brief} lang={lang} big={big} listen={ui.listen} /> : <p className="text-slate-500">…</p>}

      {msgs.map((m) => (
        <p key={m.id} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl p-3 shadow ${BUBBLE[m.from]} ${big ? "text-xl" : "text-base"}
          ${m.tone === "urgent" ? "!bg-red-600 font-bold text-white" : ""}`}>
          {m.from === "bot" && "🤖 "}{m.from === "lead" && "👷 "}{m.text}
        </p>
      ))}
      <div ref={end} />
      {done && <p className="rounded-xl bg-emerald-50 p-3 text-center text-emerald-800">{THANKS[lang]}</p>}

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md space-y-2 bg-white/95 p-3 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        {!done && (
          <button onClick={() => { ack("understood"); setDone(true); }}
            className="w-full rounded-xl bg-emerald-600 py-2.5 font-bold text-white">👍 {ui.understood}</button>
        )}
        <ChatInput lang={lang} busy={busy} labels={{ ask: ui.question, issue: ui.report }}
          hints={{ ask: ui.ask, issue: ui.issue }} onSend={send} />
      </div>
    </div>
  );
}
