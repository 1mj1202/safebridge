// 위험 지도 오른쪽: 고른 위험 구역의 1순위 위험 + 그 구역 근로자가 받을 챗봇 브리핑 미리보기 (목업 별첨 2-10)
import { Panel, LevelBadge } from "../../../shared/ui";
import type { Assessment, Meta, Zone } from "../../../shared/types";
import BriefingCard from "../../assessment/BriefingCard";

interface Props {
  zone: Zone | null;
  a: Assessment | null;
  stale: boolean;
  meta: Meta | null;
  onOpenDraft: () => void;
}

export default function ZoneDetail({ zone, a, stale, meta, onOpenDraft }: Props) {
  const items = a && !stale ? a.draft.items.filter((i) => i.included !== false) : [];
  const ranked = [...items].sort((x, y) => (x.risk_rank ?? 99) - (y.risk_rank ?? 99));
  const related = zone ? ranked.filter((i) => i.evidence.zones.includes(zone.id)) : ranked.slice(0, 3);
  const ids = new Set(related.map((i) => i.id));
  const off = new Set(a?.draft.items.filter((i) => i.included === false).map((i) => i.id) ?? []);
  const briefings = zone && a && !stale ? (a.draft.briefings ?? []).filter((b) => b.safety.some((s) => ids.has(s.item_id))) : [];
  const top = related[0];

  return (
    <Panel title={zone ? <>구역 <span className={zone.kind === "fall" ? "text-red-700" : "text-orange-600"}>{zone.label}</span></> : "주요 위험"}>
      {zone && <p className="-mt-1 mb-2 text-xs text-slate-500">부재 {zone.element_tags.join(", ")}</p>}
      {!a || stale ? (
        <p className="text-xs text-slate-400">이 날짜의 위험성평가 초안이 없어요. 위에서 위험 분석을 하면 구역별 위험과 브리핑이 보여요.</p>
      ) : !related.length ? (
        <p className="text-xs text-slate-400">이 구역에 연결된 초안 항목이 없어요.</p>
      ) : (<>
        {top && (
          <button type="button" onClick={onOpenDraft} className="w-full rounded-lg bg-red-50 p-2.5 text-left hover:bg-red-100">
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              {top.risk_rank && <span className="rounded bg-red-600 px-1.5 text-xs font-bold text-white">{top.risk_rank}순위</span>}
              <b>{top.hazard}</b><LevelBadge level={top.level} />
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              {top.rank_basis && `P${top.rank_basis.p}×S${top.rank_basis.s} · `}
              {top.frequency && `유사 사고사례 ${top.frequency.count}건`}
            </p>
          </button>
        )}
        {related.length > 1 && (
          <ul className="mt-2 space-y-1 text-xs">
            {related.slice(1).map((i) => (
              <li key={i.id} className="flex items-center gap-1.5">
                <span className="w-10 font-bold text-slate-500">{i.risk_rank ? `${i.risk_rank}순위` : i.id}</span>
                <LevelBadge level={i.level} />{i.hazard}
              </li>
            ))}
          </ul>
        )}
        {zone && meta && briefings.length > 0 && (
          <div className="mt-3">
            <div className="mb-1 text-xs font-bold text-slate-500">챗봇 브리핑 미리보기</div>
            <div className="space-y-2">{briefings.map((b) => <BriefingCard key={b.zone} b={b} off={off} meta={meta} />)}</div>
          </div>
        )}
        {!zone && <p className="mt-2 text-xs text-slate-400">3D에서 위험 구역을 누르면 그 구역의 위험과 근로자 브리핑을 볼 수 있어요.</p>}
      </>)}
    </Panel>
  );
}
