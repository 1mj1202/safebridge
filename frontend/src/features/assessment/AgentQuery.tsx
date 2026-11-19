// 에이전트 질문 + 도구 호출 기록
import { useState } from "react";
import { Button, Panel } from "../../shared/ui";
import type { TraceStep } from "../../shared/types";

const TOOL_LABEL: Record<string, string> = {
  get_schedule: "공정 조회", get_accident_patterns: "재해 패턴 조회", compute_spatial_risk: "공간 위험 계산",
  check_weather: "기상 판정", get_law: "조문 조회",
};

export default function AgentQuery({ busy, onAsk, trace, provider }: {
  busy: boolean; onAsk: (q: string) => void; trace: TraceStep[] | null; provider: string }) {
  const [q, setQ] = useState("내일 3층 작업 위험 알려줘");
  return (
    <Panel title="안전 에이전트에게 묻기" right={<span className="text-xs text-slate-400">LLM: {provider}</span>}>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) onAsk(q.trim()); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="질문"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none" />
        <Button type="submit" disabled={busy}>{busy ? "분석 중…" : "위험 분석"}</Button>
      </form>
      {trace && (
        <ol className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {trace.map((t, i) => (
            <li key={i} className={`rounded-full px-2 py-0.5 ${t.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}
              title={JSON.stringify(t.input)}>
              {i + 1}. {TOOL_LABEL[t.tool] ?? t.tool}{"trade" in t.input ? `(${t.input.trade})` : ""}{t.auto ? " · 자동 보완" : ""}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
