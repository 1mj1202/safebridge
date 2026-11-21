// 관리자(청년 기사, PC) 화면: 3D 위험구역 + 날짜 슬라이더 | 에이전트 → 초안 검토·승인 → TBM 발행 → 확인 현황
import { useCallback, useEffect, useState } from "react";
import { api } from "../../shared/api";
import { useFetch } from "../../shared/hooks";
import type { Assessment, BimModel, DraftItem, Meta, RiskResponse, Task, Tbm, Zone } from "../../shared/types";
import AgentQuery from "../assessment/AgentQuery";
import DraftReview from "../assessment/DraftReview";
import ZoneBriefings from "../assessment/ZoneBriefings";
import IssueInbox from "../tbm/IssueInbox";
import PhotoInbox from "../tbm/PhotoInbox";
import PublishPanel from "../tbm/PublishPanel";
import StatusPanel from "../tbm/StatusPanel";
import Legend from "../viewer/Legend";
import Viewer3D from "../viewer/Viewer3D";
import { groupZones } from "../viewer/scene";
import DateSlider from "./DateSlider";
import DayInfo from "./DayInfo";
import { addDays } from "./dates";
import { useRestore } from "./useRestore";

export default function AdminPage() {
  const { data: meta } = useFetch<Meta>("/meta");
  const { data: model, error: modelErr } = useFetch<BimModel>("/bim/model");
  const { data: sched } = useFetch<{ start: string; end: string; tasks: Task[] }>("/schedule");
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => { if (meta && !day) setDay(addDays(meta.today, 1)); }, [meta, day]);
  const { data: risk } = useFetch<RiskResponse>(day ? `/risk?date=${day}` : null);

  const [selected, setSelected] = useState<string[]>([]);
  const [zoneInfo, setZoneInfo] = useState<Zone | null>(null);
  const [a, setA] = useState<Assessment | null>(null);
  const [tbm, setTbm] = useState<Tbm | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = useCallback(async <T,>(f: () => Promise<T>) => {
    setBusy(true); setErr(null);
    try { return await f(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }, []);

  useRestore(useCallback((ra: Assessment, rt: Tbm | null) => {
    setA((cur) => cur ?? ra); setTbm((cur) => cur ?? rt); setDay(ra.work_date);
  }, []));

  // 분석 날짜는 슬라이더에서 고른 날 (질문 문장의 날짜 표현보다 우선, 문장에서는 층만 읽는다)
  const ask = (q: string) => run(async () => {
    const r = await api.post<Assessment>("/agent/assess", { query: q, ...(day ? { date: day } : {}) });
    setA(r); setTbm(null); setDay(r.work_date); setSelected([]);
  });
  const save = (items: DraftItem[], summary: string, notes: string[]) => a && run(async () => {
    setA(await api.put<Assessment>(`/assessments/${a.id}`, {
      summary, notes,
      items: items.map((i) => ({ id: i.id, explanation: i.explanation, measures: i.measures.filter(Boolean),
        level: i.level, included: i.included !== false })),
    }));
  });
  const approve = () => a && run(async () => setA(await api.post<Assessment>(`/assessments/${a.id}/approve`)));
  const publish = (memo: string) => a && run(async () => setTbm(await api.post<Tbm>(`/assessments/${a.id}/publish`, { memo })));

  const zones = risk?.zones ?? [];
  const related = zoneInfo && a ? a.draft.items.filter((i) => i.evidence.zones.includes(zoneInfo.id)) : [];

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 bg-slate-900 px-5 py-3 text-white">
        <img src="/favicon.svg" alt="" className="h-7 w-7" />
        <h1 className="text-lg font-bold">SafeBridge <span className="font-normal text-slate-300">세이프브릿지</span></h1>
        <span className="text-sm text-slate-400">재해 데이터 × BIM 안전 TBM 에이전트</span>
        <span className="ml-auto text-xs text-slate-400">오늘 {meta?.today} · 가상 현장 데이터</span>
      </header>
      {err && <div className="bg-red-600 px-5 py-2 text-sm text-white">오류: {err}</div>}
      <main className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(380px,1fr)]">
        <div className="flex min-h-[480px] flex-col gap-3">
          <div className="relative min-h-[360px] flex-1">
            {model && risk ? (
              <Viewer3D model={model} status={risk.element_status} zones={zones} selected={selected}
                onZoneClick={(z) => { setZoneInfo(z); setSelected([z.id]); }} />
            ) : <div className="p-6 text-slate-500">{modelErr ?? "3D 모델 불러오는 중…"}</div>}
            <div className="absolute left-3 top-3"><Legend /></div>
            <div className="absolute right-3 top-3 max-w-[260px] space-y-1">
              {groupZones(zones).map((g) => (
                <button key={g.key} onClick={() => { setSelected(g.zones.map((z) => z.id)); setZoneInfo(g.zones[0]); }}
                  className={`block w-full rounded-md px-2 py-1 text-left text-xs text-white shadow ${g.kind === "fall" ? "bg-red-600" : "bg-orange-500"}`}>
                  {g.label}{g.zones.length > 1 ? ` (${g.zones.length})` : ""}
                </button>
              ))}
              {selected.length > 0 && (
                <button className="block w-full rounded-md bg-white px-2 py-1 text-xs shadow" onClick={() => { setSelected([]); setZoneInfo(null); }}>
                  전체 보기</button>
              )}
            </div>
            {zoneInfo && (
              <div className="absolute bottom-3 left-3 max-w-sm rounded-lg bg-white p-3 text-sm shadow-lg">
                <b className={zoneInfo.kind === "fall" ? "text-red-700" : "text-orange-600"}>{zoneInfo.label}</b>
                <p className="text-xs text-slate-500">영역 {zoneInfo.id} · 부재 {zoneInfo.element_tags.join(", ")} · 근거 {zoneInfo.rule}</p>
                {related.map((i) => <p key={i.id} className="mt-1 text-xs"><span className="font-semibold">{i.id}</span> {i.hazard}: {i.explanation}</p>)}
                {!a && <p className="mt-1 text-xs text-slate-400">에이전트 분석 후 예상 사고·사례·체크리스트가 함께 표시됩니다</p>}
              </div>
            )}
          </div>
          {sched && meta && day && <DateSlider start={sched.start} end={sched.end} value={day} today={meta.today}
            onChange={(d) => { setDay(d); setSelected([]); setZoneInfo(null); }} />}
          {risk && <DayInfo risk={risk} />}
        </div>

        <div className="min-h-0 space-y-4 overflow-y-auto pb-8">
          <AgentQuery busy={busy} onAsk={ask} day={day} today={meta?.today} trace={a?.trace ?? null} provider={meta?.provider ?? ""} />
          {a && <DraftReview a={a} busy={busy} onSave={save} onApprove={approve}
            onFocusZones={(ids) => { setSelected(ids); setZoneInfo(zones.find((z) => z.id === ids[0]) ?? null); }} />}
          {a?.draft.briefings && meta && (
            <ZoneBriefings briefings={a.draft.briefings} items={a.draft.items} meta={meta} approved={a.status === "approved"} />
          )}
          {a?.status === "approved" && meta && (
            <PublishPanel tbm={tbm} meta={meta} busy={busy} onPublish={publish} zones={a.draft.briefings ?? []} />
          )}
          {tbm && meta && <IssueInbox tbmId={tbm.id} meta={meta} />}
          {tbm && <PhotoInbox tbmId={tbm.id} />}
          {tbm && meta && <StatusPanel tbmId={tbm.id} meta={meta} />}
        </div>
      </main>
    </div>
  );
}
