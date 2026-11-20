// 언어별 이해 확인 현황 (3초마다 갱신). 현장 이슈는 IssueInbox, 예전 카드 화면 신고만 여기
import { useFetch, usePoll } from "../../shared/hooks";
import { Panel } from "../../shared/ui";
import type { Meta, TbmStatus } from "../../shared/types";

export default function StatusPanel({ tbmId, meta }: { tbmId: number; meta: Meta }) {
  const { data, reload } = useFetch<TbmStatus>(`/tbms/${tbmId}/status`);
  usePoll(reload, 3000, true);
  if (!data) return null;
  const follow = Object.entries(data.langs).filter(([, v]) => v.needs_followup).map(([l]) => meta.langs[l]);
  return (
    <Panel title="이해 확인 현황" right={<span className="text-xs text-slate-400">익명 · 언어별 집계</span>}>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-slate-500"><th>언어</th><th>열람</th><th>이해</th><th>질문</th><th>이해율</th></tr></thead>
        <tbody>
          {Object.entries(data.langs).map(([l, v]) => (
            <tr key={l} className={v.needs_followup ? "font-semibold text-red-700" : ""}>
              <td>{meta.langs[l]}</td><td>{v.viewed}</td><td>{v.understood}</td><td>{v.question}</td>
              <td>{v.rate === null ? "-" : `${Math.round(v.rate * 100)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {follow.length > 0 && (
        <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">대면 재설명 필요: {follow.join(", ")} 그룹</p>
      )}
      {data.reports.length > 0 && <h3 className="mt-3 text-xs font-bold text-slate-500">카드 화면 신고 (한국어 자동 번역)</h3>}
      {data.reports.length > 0 && (
        <ul className="mt-1 space-y-1 text-sm">
          {data.reports.map((r) => (
            <li key={r.id} className="rounded bg-orange-50 p-2">
              <b>{r.kind === "hazard" ? "⚠ 위험 신고" : "❓ 질문"}</b> <span className="text-xs text-slate-500">{meta.langs[r.lang]}</span>
              <p>{r.text_ko}</p>
              {r.lang !== "ko" && <p className="text-xs text-slate-500">원문: {r.text_original}</p>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
