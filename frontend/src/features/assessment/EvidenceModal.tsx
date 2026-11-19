// 근거 상세 — 사고사례 또는 조문
import { useFetch } from "../../shared/hooks";
import type { Accident, LawArticle } from "../../shared/types";

export type Evidence = { kind: "case"; id: string } | { kind: "law"; id: string };

export default function EvidenceModal({ ev, onClose }: { ev: Evidence; onClose: () => void }) {
  const path = ev.kind === "case" ? `/accidents/${ev.id}` : `/law/${ev.id}`;
  const { data, error } = useFetch<Accident & LawArticle>(path);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-w-lg rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {error && <p className="text-red-600">{error}</p>}
        {data && ev.kind === "case" && (
          <>
            <h3 className="font-bold">사고사례 {data.case_id} {data.virtual && <span className="text-xs text-amber-700">(가상 사례)</span>}</h3>
            <p className="mt-1 text-xs text-slate-500">{data.date} · {data.trade} · {data.work} · {data.accident_type} · {data.severity} · 신뢰도 {data.confidence}</p>
            <p className="mt-3 text-sm">{data.raw_text}</p>
            <p className="mt-3 text-sm"><b>원인</b> {data.causes.join(", ")}</p>
            <p className="text-sm"><b>대책</b> {data.measures.join(", ")}</p>
          </>
        )}
        {data && ev.kind === "law" && (
          <>
            <h3 className="font-bold">{data.law} {data.article} ({data.title})</h3>
            <p className="mt-3 text-sm">{data.summary}</p>
            <p className="mt-3 text-xs text-slate-500">{data.source} · <a className="underline" href={data.url} target="_blank" rel="noreferrer">법제처에서 보기</a></p>
          </>
        )}
        <div className="mt-4 text-right"><button className="text-sm text-slate-600 hover:underline" onClick={onClose}>닫기</button></div>
      </div>
    </div>
  );
}
