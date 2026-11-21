// 메뉴 ① 위험 지도: 층 버튼 + 3D 위험 지도 + 날짜 슬라이더 + 진행 작업·기상 | 에이전트 질문 + 고른 구역 정보
import { useMemo, useState } from "react";
import { useFetch } from "../../../shared/hooks";
import { useStaff } from "../../../shared/staff";
import type { BimModel, Task, Zone } from "../../../shared/types";
import AgentQuery from "../../assessment/AgentQuery";
import { belowTop, floorTop } from "../../viewer/floors";
import Legend from "../../viewer/Legend";
import Viewer3D, { type PeopleMarker } from "../../viewer/Viewer3D";
import ZoneLabels from "../../viewer/ZoneLabels";
import DateSlider from "../DateSlider";
import DayInfo from "../DayInfo";
import FloorButtons from "../FloorButtons";
import type { AdminState } from "../useAdminState";
import ZoneDetail from "./ZoneDetail";

export interface ZoneSel {
  selected: string[];
  zoneInfo: Zone | null;
  set: (ids: string[], info: Zone | null) => void;
}

interface Props {
  s: AdminState;
  markers: PeopleMarker[];
  sel: ZoneSel;
  onOpenDraft: () => void;
}

export default function MapView({ s, markers, sel, onOpenDraft }: Props) {
  const { can } = useStaff();
  const { data: model, error: modelErr } = useFetch<BimModel>("/bim/model");
  const { data: sched } = useFetch<{ start: string; end: string; tasks: Task[] }>("/schedule");
  const { selected, zoneInfo } = sel;
  // 층: 처음엔 그날 작업 층(없으면 전체), 버튼을 누르면 그 값
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const workFloor = s.risk?.tasks.find((t) => t.trade !== "양생")?.storey ?? null;
  const floor = picked === undefined ? workFloor : picked;
  const top = model ? floorTop(model.storeys, floor) : null;

  const zones = useMemo(() => (s.risk?.zones ?? []).filter((z) => belowTop(z, top)), [s.risk, top]);
  const shownMarkers = useMemo(() => markers.filter((m) => belowTop(m.box, top)), [markers, top]);
  const floors = useMemo(() => [...(model?.storeys ?? [])].sort((x, y) => y.elevation - x.elevation).map((x) => x.name), [model]);
  const active = s.risk?.tasks.filter((t) => t.trade !== "양생").length ?? 0;

  const pickZones = (zs: Zone[]) => sel.set(zs.map((z) => z.id), zs[0]);
  const clearZones = () => sel.set([], null);

  return (
    <div className="grid gap-4 p-4 lg:h-full lg:grid-cols-[minmax(0,1.4fr)_minmax(360px,1fr)] lg:overflow-hidden">
      <div className="flex min-w-0 flex-col gap-3 lg:min-h-0">
        <div className="flex flex-wrap items-center gap-2">
          <FloorButtons floors={floors} value={floor} onChange={(f) => { setPicked(f); clearZones(); }} />
          <span className="ml-auto text-xs text-slate-500">진행 중 작업 {active} · 위험 구역 {zones.length}</span>
        </div>
        <div className="relative h-[360px] shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-200 sm:h-[440px] lg:h-auto lg:min-h-[320px] lg:flex-1 lg:shrink">
          {model && s.risk ? (
            <Viewer3D model={model} status={s.risk.element_status} zones={zones} selected={selected} upTo={floor}
              onZoneClick={(z) => sel.set([z.id], z)} markers={shownMarkers} />
          ) : <div className="p-6 text-slate-500">{modelErr ?? "3D 모델 불러오는 중…"}</div>}
          <div className="absolute left-3 top-3 hidden sm:block"><Legend /></div>
          <div className="absolute right-3 top-3 hidden sm:block">
            <ZoneLabels zones={zones} selected={selected} onPick={pickZones} onClear={clearZones} />
          </div>
        </div>
        <div className="space-y-2 sm:hidden">
          <ZoneLabels row zones={zones} selected={selected} onPick={pickZones} onClear={clearZones} />
          <Legend />
        </div>
        {sched && s.meta && s.day && <DateSlider start={sched.start} end={sched.end} value={s.day} today={s.meta.today}
          onChange={(d) => { s.setDay(d); clearZones(); }} />}
        {s.risk && <DayInfo risk={s.risk} />}
      </div>

      <div className="min-w-0 space-y-4 lg:min-h-0 lg:overflow-y-auto lg:pb-4">
        {can("analyze") && (
          <AgentQuery busy={s.busy} onAsk={(q) => { clearZones(); s.ask(q); }} day={s.day} today={s.meta?.today}
            trace={s.a?.trace ?? null} provider={s.meta?.provider ?? ""} />
        )}
        <ZoneDetail zone={zoneInfo} a={s.a} stale={s.stale} meta={s.meta} onOpenDraft={onOpenDraft} />
      </div>
    </div>
  );
}
