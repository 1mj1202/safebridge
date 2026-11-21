// 구역별 챗봇 브리핑 미리보기 — 승인하면 근로자 챗봇이 이 내용 안에서만 안내한다
import { Panel } from "../../shared/ui";
import type { DraftItem, Meta, ZoneBriefing } from "../../shared/types";
import BriefingCard from "./BriefingCard";

export default function ZoneBriefings({ briefings, items, meta, approved }: {
  briefings: ZoneBriefing[]; items: DraftItem[]; meta: Meta; approved: boolean }) {
  const off = new Set(items.filter((i) => i.included === false).map((i) => i.id));
  return (
    <Panel title="구역별 챗봇 브리핑" right={<span className="text-xs text-slate-400">{approved ? "승인됨 · 근로자에게 안내 중" : "초안 승인 시 함께 확정"}</span>}>
      <div className="grid gap-2 sm:grid-cols-2">
        {briefings.map((b) => <BriefingCard key={b.zone} b={b} off={off} meta={meta} />)}
      </div>
    </Panel>
  );
}
