// 근거 상세 — 사고사례·조문·KOSHA GUIDE·위험요소 프로파일
import { useFetch } from "../../shared/hooks";
import type { Accident, Guide, LawArticle, RiskProfile } from "../../shared/types";

export type Evidence = { kind: "case" | "law" | "guide" | "profile"; id: string };

const PATH: Record<Evidence["kind"], string> = { case: "/accidents/", law: "/law/", guide: "/guides/", profile: "/profile/" };

export default function EvidenceModal({ ev, onClose }: { ev: Evidence; onClose: () => void }) {
  const { data, error } = useFetch<Accident & LawArticle & Guide & RiskProfile>(PATH[ev.kind] + encodeURIComponent(ev.id));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {error && <p className="text-red-600">{error}</p>}
        {data && ev.kind === "case" && <CaseView c={data} />}
        {data && ev.kind === "law" && (
          <>
            <h3 className="font-bold">{data.law} {data.article} ({data.title})</h3>
            <p className="mt-3 text-sm">{data.summary}</p>
            {data.original_text && (
              <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">법제처 원문 보기</summary>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{data.original_text}</p>
              </details>
            )}
            <p className="mt-3 text-xs text-slate-500">{data.source} ·<a className="underline" href={data.url} target="_blank" rel="noreferrer">법제처에서 보기</a></p>
          </>
        )}
        {data && ev.kind === "guide" && (
          <>
            <h3 className="font-bold">KOSHA GUIDE {data.id}</h3>
            <p className="mt-3 text-sm">{data.title} ({data.year})</p>
            <p className="mt-3 text-xs text-slate-500">{data.source}</p>
          </>
        )}
        {data && ev.kind === "profile" && (
          <>
            <h3 className="font-bold">위험요소 프로파일 · {data.trade} {data.accident_type}</h3>
            <p className="mt-3 text-sm">설계안전성검토 위험요소 {data.n.toLocaleString()}건의 평균 등급(1~5)이에요.</p>
            <p className="mt-1 text-sm"><b>사고가능성</b> {data.likelihood} · <b>심각성</b> {data.severity}</p>
            <p className="mt-2 text-sm"><b>주요 원인</b> {data.top_causes.join(", ")}</p>
            <p className="mt-3 text-xs text-slate-500">{data.source}</p>
          </>
        )}
        <div className="mt-4 text-right"><button className="text-sm text-slate-600 hover:underline" onClick={onClose}>닫기</button></div>
      </div>
    </div>
  );
}

function CaseView({ c }: { c: Accident }) {
  return (
    <>
      <h3 className="font-bold">사고사례 {c.case_id} {c.virtual && <span className="text-xs text-amber-700">(가상 사례)</span>}</h3>
      <p className="mt-1 text-xs text-slate-500">
        {[c.date, c.category, c.work, c.accident_type, c.cause_object_raw ?? c.cause_object, c.severity].filter(Boolean).join(" · ")}
      </p>
      <p className="mt-3 text-sm">{c.raw_text}</p>
      {c.causes.length > 0 && <p className="mt-3 text-sm"><b>원인</b> {c.causes.join(", ")}</p>}
      {c.measures.length > 0 && (
        <div className="mt-1 text-sm"><b>대책</b>
          <ul className="ml-4 list-disc">{c.measures.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}
      {c.source && <p className="mt-3 text-xs text-slate-500">출처: {c.source}</p>}
    </>
  );
}
