// 에이전트 질문 + 도구 호출 기록
import { useState } from "react";
import { Button, Panel } from "../../shared/ui";
import type { TraceStep } from "../../shared/types";
import { label } from "../admin/dates";

const TOOL_LABEL: Record<string, string> = {
  get_activities: "진행 활동", search_cases: "유사 사고사례", get_spatial_hazards: "위험 구역",
  get_weather: "기상 판정", get_regulation: "근거 조문", query_hazard_rules: "위험 규칙(P·S)",
  get_accident_stats: "사고 통계", get_guides: "KOSHA GUIDE",
};

export default function AgentQuery({ busy, onAsk, trace, provider, day, today }: {
  busy: boolean; onAsk: (q: string) => void; trace: TraceStep[] | null; provider: string; day: string | null; today?: string }) {
  const [q, setQ] = useState("3층 작업 위험 알려줘");
  return (
    <Panel title="안전 에이전트에게 묻기" right={<span className="text-xs text-slate-400">LLM: {provider}</span>}>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) onAsk(q.trim()); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="질문"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none" />
        <Button type="submit" disabled={busy}>{busy ? "분석 중…" : "위험 분석"}</Button>
      </form>
      {day && <p className="mt-1 text-xs text-slate-500">분석 날짜 <b>{label(day, today)}</b> · 아래 날짜 슬라이더에서 바꿔요</p>}
      {trace && trace.length > 0 && (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer select-none text-slate-500">
            도구 {new Set(trace.map((t) => t.tool)).size}종 · 호출 {trace.length}회
            {trace.some((t) => t.auto) ? ` · 자동 보완 ${trace.filter((t) => t.auto).length}회` : ""}
            {trace.some((t) => !t.ok) ? ` · 실패 ${trace.filter((t) => !t.ok).length}회` : ""} (펼쳐서 기록 보기)
          </summary>
          <ol className="mt-2 flex flex-wrap gap-1.5">
            {trace.map((t, i) => (
              <li key={i} className={`rounded-full px-2 py-0.5 ${t.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}
                title={JSON.stringify(t.input)}>
                {i + 1}. {TOOL_LABEL[t.tool] ?? t.tool}{"trade" in t.input ? `(${t.input.trade})` : ""}{t.auto ? " · 자동 보완" : ""}
              </li>
            ))}
          </ol>
        </details>
      )}
    </Panel>
  );
}
