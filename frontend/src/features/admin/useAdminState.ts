// 관리자 화면 공통 상태: 보고 있는 날짜(메뉴끼리 공유)·위험성평가 초안·발행 TBM 과 서버 호출(분석·저장·승인·발행)
import { useCallback, useEffect, useState } from "react";
import { api } from "../../shared/api";
import { useFetch } from "../../shared/hooks";
import type { Assessment, DraftItem, Meta, RiskResponse, Tbm } from "../../shared/types";
import { addDays, otherDay } from "./dates";
import { useRestore } from "./useRestore";

export function useAdminState() {
  const { data: meta } = useFetch<Meta>("/meta");
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => { if (meta && !day) setDay(addDays(meta.today, 1)); }, [meta, day]);
  const { data: risk } = useFetch<RiskResponse>(day ? `/risk?date=${day}` : null);
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
    setA(r); setTbm(null); setDay(r.work_date);
    return r;
  });
  const save = (items: DraftItem[], summary: string, notes: string[]) => a && run(async () => {
    setA(await api.put<Assessment>(`/assessments/${a.id}`, {
      summary, notes,
      items: items.map((i) => ({ id: i.id, explanation: i.explanation, measures: i.measures.filter(Boolean),
        level: i.level, included: i.included !== false })),
    }));
  });
  const approve = async () => !!a && !!(await run(async () => {
    setA(await api.post<Assessment>(`/assessments/${a.id}/approve`, { work_date: day }));
    return true;
  }));
  const publish = (memo: string) => a && run(async () => setTbm(await api.post<Tbm>(`/assessments/${a.id}/publish`, { memo })));

  // 보고 있는 날짜와 초안 작업일이 다르면 이전 초안은 보존하되 수정·승인·발행을 잠근다
  const stale = otherDay(a?.work_date, day);
  const noWork = !!risk && risk.tasks.every((t) => t.trade === "양생");

  return { meta, day, setDay, risk, a, tbm, busy, err, ask, save, approve, publish, stale, noWork };
}

export type AdminState = ReturnType<typeof useAdminState>;
