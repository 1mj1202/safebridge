// 관리자(청년 기사, PC) 화면: 3D 위험구역·근로자 인원 + 날짜 슬라이더 | 에이전트 → 근로자 현재 위치 → 초안 검토·승인 → TBM 발행 → 확인 현황
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../shared/api";
import { useFetch } from "../../shared/hooks";
import { useStaff } from "../../shared/staff";
import type { Assessment, BimModel, DraftItem, Meta, RiskResponse, Task, Tbm, Zone } from "../../shared/types";
import AgentQuery from "../assessment/AgentQuery";
import DraftDateNotice from "../assessment/DraftDateNotice";
import DraftReview from "../assessment/DraftReview";
import ZoneBriefings from "../assessment/ZoneBriefings";
import IssueInbox from "../tbm/IssueInbox";
import PhotoInbox from "../tbm/PhotoInbox";
import PublishPanel from "../tbm/PublishPanel";
import StatusPanel from "../tbm/StatusPanel";
import Legend from "../viewer/Legend";
import Viewer3D, { type PeopleMarker } from "../viewer/Viewer3D";
import ZoneLabels from "../viewer/ZoneLabels";
import DateSlider from "./DateSlider";
import DayInfo from "./DayInfo";
import { addDays, otherDay } from "./dates";
import { countByZone, filterCompany } from "./locations";
import { useLocations } from "./useLocations";
import WorkerLocations from "./WorkerLocations";
import { useRestore } from "./useRestore";
import StaffBadge from "./StaffBadge";

export default function AdminPage() {
  const { can } = useStaff();
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
  const loc = useLocations();
  const [company, setCompany] = useState("");
  const shown = useMemo(() => filterCompany(loc.data?.workers ?? [], company), [loc.data, company]);
  const markers = useMemo<PeopleMarker[]>(() => [...countByZone(shown)].flatMap(([zone, c]) => {
    const box = loc.data?.boxes[zone];
    return box ? [{ key: zone, box, text: `${c.count}명`, warn: c.pending > 0 }] : [];
  }), [shown, loc.data]);
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
  const approve = () => a && run(async () => setA(await api.post<Assessment>(`/assessments/${a.id}/approve`, { work_date: day })));
  const publish = (memo: string) => a && run(async () => setTbm(await api.post<Tbm>(`/assessments/${a.id}/publish`, { memo })));

  const zones = risk?.zones ?? [];
  const pickZones = (zs: Zone[]) => { setSelected(zs.map((z) => z.id)); setZoneInfo(zs[0]); };
  const clearZones = () => { setSelected([]); setZoneInfo(null); };
  // 보고 있는 날짜와 초안 작업일이 다르면 이전 초안은 보존하되 수정·승인·발행을 잠근다
  const stale = otherDay(a?.work_date, day);
  const noWork = !!risk && risk.tasks.every((t) => t.trade === "양생");
  const related = zoneInfo && a && !stale ? a.draft.items.filter((i) => i.evidence.zones.includes(zoneInfo.id)) : [];

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 bg-slate-900 px-5 py-3 text-white">
        <img src="/favicon.svg" alt="" className="h-7 w-7" />
        <h1 className="text-lg font-bold">SafeBridge</h1>
        <span className="ml-auto text-xs text-slate-400">오늘 {meta?.today} · 가상 현장 데이터</span>
        <StaffBadge />
      </header>
      {err && <div className="bg-red-600 px-5 py-2 text-sm text-white">오류: {err}</div>}
      <main className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(380px,1fr)] lg:overflow-hidden">
        <div className="flex min-w-0 flex-col gap-3 lg:min-h-[480px]">
          <div className="relative h-[360px] shrink-0 sm:h-[440px] lg:h-auto lg:min-h-[360px] lg:flex-1 lg:shrink">
            {model && risk ? (
              <Viewer3D model={model} status={risk.element_status} zones={zones} selected={selected}
                onZoneClick={(z) => { setZoneInfo(z); setSelected([z.id]); }} markers={markers} />
            ) : <div className="p-6 text-slate-500">{modelErr ?? "3D 모델 불러오는 중…"}</div>}
            <div className="absolute left-3 top-3 hidden sm:block"><Legend /></div>
            <div className="absolute right-3 top-3 hidden sm:block">
              <ZoneLabels zones={zones} selected={selected} onPick={pickZones} onClear={clearZones} />
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
          <div className="space-y-2 sm:hidden">
            <ZoneLabels row zones={zones} selected={selected} onPick={pickZones} onClear={clearZones} />
            <Legend />
          </div>
          {sched && meta && day && <DateSlider start={sched.start} end={sched.end} value={day} today={meta.today}
            onChange={(d) => { setDay(d); setSelected([]); setZoneInfo(null); }} />}
          {risk && <DayInfo risk={risk} />}
        </div>

        <div className="min-w-0 space-y-4 pb-8 lg:min-h-0 lg:overflow-y-auto">
          {can("analyze") && <AgentQuery busy={busy} onAsk={ask} day={day} today={meta?.today} trace={a?.trace ?? null} provider={meta?.provider ?? ""} />}
          {a && stale && day && (
            <DraftDateNotice draftDay={a.work_date} viewDay={day} today={meta?.today} noWork={noWork} busy={busy}
              onBack={() => { setDay(a.work_date); setSelected([]); setZoneInfo(null); }} onReanalyze={can("analyze") ? () => ask(a.query) : undefined} />
          )}
          {a && <DraftReview a={a} busy={busy} onSave={save} onApprove={approve} frozen={stale}
            onFocusZones={(ids) => { setSelected(ids); setZoneInfo(zones.find((z) => z.id === ids[0]) ?? null); }} />}
          <div className={stale ? "pointer-events-none space-y-4 opacity-50" : "space-y-4"} aria-disabled={stale}>
            {a?.draft.briefings && meta && (
              <ZoneBriefings briefings={a.draft.briefings} items={a.draft.items} meta={meta} approved={a.status === "approved"} />
            )}
            {a?.status === "approved" && meta && (tbm || can("publish")) && (
              <PublishPanel tbm={tbm} meta={meta} busy={busy} onPublish={publish} zones={a.draft.briefings ?? []} />
            )}
          </div>
          <WorkerLocations data={loc.data} error={loc.error} workers={shown} company={company} onCompany={setCompany}
            zones={(a?.draft.briefings ?? []).map((b) => b.zone)} langs={meta?.langs ?? {}} />
          {tbm && meta && <IssueInbox tbmId={tbm.id} meta={meta} />}
          {tbm && <PhotoInbox tbmId={tbm.id} />}
          {tbm && meta && <StatusPanel tbmId={tbm.id} meta={meta} />}
        </div>
      </main>
    </div>
  );
}
