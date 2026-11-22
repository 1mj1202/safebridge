// 근로자 현장 챗봇 (구역 QR 접속)
// 언어 → 가입·로그인(처음 한 번, 또는 가입 없이 보기) → 구역(?zone=, 태그하면 내 위치 갱신) → 구역 브리핑 + 음성 → 질문(브리핑 안에서 답) / 문제 알리기(번역·긴급도·반장 전달) → 회신
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { saveLastVisit } from "../app/lastVisit";
import SignupPage from "../auth/SignupPage";
import { useWorker } from "../auth/useWorker";
import { api } from "../../shared/api";
import { useFetch } from "../../shared/hooks";
import BriefMessage, { briefSpeech } from "./BriefMessage";
import ChatInput, { type Mode } from "./ChatInput";
import type { Brief, ChatMsg, ZonesData } from "./fieldTypes";
import LangPicker from "./LangPicker";
import MessageList from "./MessageList";
import { THANKS } from "./messages";
import { pickPhoto, preparePhoto } from "./photoUpload";
import SideMenu from "./SideMenu";
import { once, remember, seen } from "./storage";
import SuggestionChips from "./SuggestionChips";
import TopBar from "./TopBar";
import { useCheckin, type Tag, type TagSource } from "./useCheckin";
import { useIssueReplies } from "./useIssueReplies";
import { useNfcZone } from "./useNfcZone";
import { useSpeech } from "./useSpeech";
import ZonePicker from "./ZonePicker";

function loadMsgs(k: string): ChatMsg[] {
  try { return JSON.parse(sessionStorage.getItem(k) ?? "[]") as ChatMsg[]; } catch { return []; }
}

export default function WorkerPage() {
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const [lang, setLang] = useState<string | null>(() => remember(`sb-lang-${token}`));
  const [zone, setZone] = useState<string | null>(
    () => remember(`sb-zone-${token}`, params.get("zone") ?? undefined)); // 구역 QR·NFC 주소의 zone 이 우선
  // 구역 QR·NFC 주소로 열렸을 때만 태그로 본다 (홈 화면 앱이 마지막 구역으로 연 것은 제외)
  const [tag, setTag] = useState<Tag | null>(() => {
    const z = params.get("zone");
    return z && params.get("from") !== "app" ? { zone: z, source: "qr", at: Date.now() } : null;
  });
  const auth = useWorker();
  const signedIn = !!auth.worker;
  const checkin = useCheckin(token, signedIn, tag);
  const [big, setBig] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [mode, setMode] = useState<Mode>("ask");
  const { data, error } = useFetch<ZonesData>(`/w/${token}/zones?lang=${lang ?? "ko"}`);
  const { data: brief } = useFetch<Brief>(lang && zone ? `/w/${token}/brief?lang=${lang}&zone=${encodeURIComponent(zone)}` : null);
  const msgKey = `sb-chat-${token}-${zone}-${lang}`;
  const doneKey = `sb-understood-${token}-${lang}`; // '이해했어요'는 기기·언어당 한 번만 집계
  const [done, setDone] = useState(() => seen(doneKey));
  useEffect(() => setDone(seen(doneKey)), [doneKey]);
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => loadMsgs(msgKey));

  useEffect(() => setMsgs(loadMsgs(msgKey)), [msgKey]);
  useEffect(() => { try { sessionStorage.setItem(msgKey, JSON.stringify(msgs)); } catch { /* */ } }, [msgKey, msgs]);
  const add = useCallback((m: ChatMsg) => setMsgs((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, m])), []);
  useIssueReplies(token, msgs, add);
  // 직접 고른 구역은 교육만 열고 위치는 갱신하지 않는다 (위치는 QR·NFC 태그로만)
  const pickZone = useCallback((z: string, source?: TagSource) => {
    setZone(remember(`sb-zone-${token}`, z) ?? z);
    if (source) setTag({ zone: z, source, at: Date.now() });
  }, [token]);
  const nfc = useNfcZone(token, (z) => pickZone(z, "nfc"));
  // 로그인한 근로자는 가입할 때 고른 언어로 바로 시작
  useEffect(() => { if (!lang && auth.worker) setLang(remember(`sb-lang-${token}`, auth.worker.lang) ?? auth.worker.lang); },
    [lang, auth.worker, token]);
  useEffect(() => saveLastVisit(lang, zone), [lang, zone]); // 홈 화면 앱이 다음에 이어서 열 언어·구역
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (msgs.length) end.current?.scrollIntoView?.({ behavior: "smooth" }); }, [msgs.length]);
  const voice = useSpeech(`${lang}-${zone}`);

  // 언어별 열람 1회 기록 (같은 기기 새로고침 중복 제외)
  useEffect(() => {
    if (lang && brief && once(`sb-viewed-${token}-${lang}`)) api.post(`/w/${token}/ack`, { lang, status: "viewed" }).catch(() => undefined);
  }, [lang, brief, token]);

  if (error) return <div className="p-6 text-center text-red-600">TBM 을 찾을 수 없어요 ({error})</div>;
  if (!data) return <div className="p-6 text-center text-slate-500">…</div>;
  if (auth.worker === undefined) return <div className="p-6 text-center text-slate-500">…</div>;
  if (!lang) return <LangPicker langs={data.langs} onPick={(l) => setLang(remember(`sb-lang-${token}`, l) ?? l)} />;
  if (!auth.worker && !auth.guest) {
    return <SignupPage lang={lang} onDone={auth.signedIn} onGuest={() => auth.setGuest(true)} />;
  }
  const ui = data.ui;
  if (!zone || (data.zones.length && !data.zones.some((z) => z.zone === zone))) {
    return <ZonePicker greet={ui.greet} zones={data.zones} onPick={pickZone} nfc={nfc} />;
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
        const r = await api.post<{ id: number; key: string; urgency: string; lead?: string; messages: string[] }>(
          `/w/${token}/issue`, { lang, zone, text });
        const shown = r.lead ? [...r.messages.slice(0, -1), r.lead] : r.messages; // 전달 확인은 짧게(반장 이름만)
        setMode("ask");
        shown.forEach((m, i) => add({
          id: `bot-${now}-${i}`, from: "bot", text: m,
          tone: r.urgency === "urgent" && i === 0 ? "urgent" : r.lead && i === shown.length - 1 ? "sent" : "info",
          issue: i === shown.length - 1 ? { id: r.id, key: r.key } : undefined,
        }));
      }
    } catch {
      add({ id: `bot-${now}`, from: "bot", text: ui.ask_lead });
    } finally {
      setBusy(false);
    }
  };
  const shoot = async () => {
    const file = await pickPhoto();
    if (!file) return;
    const now = Date.now();
    setBusy(true);
    try {
      const { upload, thumb } = await preparePhoto(file);
      add({ id: `me-${now}`, from: "me", text: "", image: thumb });
      const r = await api.post<{ message: string }>(`/w/${token}/photos`,
        { lang, zone, request: brief?.photo?.key ?? "", image: upload });
      add({ id: `bot-${now}`, from: "bot", text: r.message, tone: "sent" });
    } catch {
      add({ id: `bot-${now}`, from: "bot", text: ui.ask_lead });
    } finally {
      setBusy(false);
    }
  };
  const photo = { label: ui.photo, onShoot: shoot };
  // 질문을 보낸 근로자는 '질문 있음'으로 한 번 집계 (관리자 TBM 확인 현황)
  const ack = (status: "understood" | "question") => api.post(`/w/${token}/ack`, { lang, status }).catch(() => undefined);

  const title = brief?.zone === zone ? brief.label : zone;
  // 로그인: 구역마다 이해 확인(내 태그 기록), 언어별 익명 집계는 기기당 한 번. 가입 없이 보기: 기기당 한 번
  const isDone = signedIn ? !!checkin.understood[zone] : done;
  const understood = () => {
    if (signedIn) {
      api.post(`/w/${token}/ack`, { lang, status: "understood", zone, tally: once(doneKey) }).catch(() => undefined);
      checkin.mark(zone);
    } else if (once(doneKey)) ack("understood");
    setDone(true);
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white">
      <TopBar title={title} onMenu={() => setMenu(true)} listen={ui.listen} speaking={voice.speaking}
        onListen={brief ? () => voice.toggle(briefSpeech(brief), lang) : undefined} />
      <SideMenu open={menu} onClose={() => setMenu(false)} zones={data.zones} zone={zone} onZone={pickZone} nfc={nfc}
        langs={data.langs} lang={lang} onLang={(l) => setLang(remember(`sb-lang-${token}`, l) ?? l)} big={big} onBig={setBig}
        account={auth.worker ? { name: auth.worker.name, company: auth.worker.company, logout: ui.logout, onLogout: auth.logout } : undefined}
        guestBack={!auth.worker && auth.guest ? { label: ui.login, onBack: () => auth.setGuest(false) } : undefined} />

      <main className="space-y-5 px-4 pb-64 pt-4">
        {brief ? <BriefMessage brief={brief} big={big} token={token} ui={ui}
          photo={{ done: msgs.some((m) => m.image), busy, onShoot: shoot }} /> : <p className="text-slate-400">…</p>}
        <MessageList msgs={msgs} big={big} />
        {isDone && <p className={big ? "text-xl" : "text-base"}>{THANKS[lang]}</p>}
        <div ref={end} />
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-white via-white to-white/0 px-3 pb-3 pt-4">
        <SuggestionChips understood={isDone ? undefined : ui.understood} onUnderstood={understood}
          confirm={{ q: ui.understood_q, back: ui.read_again }}
          report={ui.report} onReport={() => setMode("issue")} />
        <ChatInput lang={lang} mode={mode} onMode={setMode} busy={busy} labels={{ ask: ui.question, issue: ui.report }}
          hints={{ ask: ui.ask, issue: ui.issue }} onSend={send} photo={photo} />
      </div>
    </div>
  );
}
