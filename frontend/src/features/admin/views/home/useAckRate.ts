// 발행한 TBM 의 전체 이해율(언어 합산) — 홈 화면 요약용
import { useFetch, usePoll } from "../../../../shared/hooks";
import type { TbmStatus } from "../../../../shared/types";

export function useAckRate(tbmId: number | null) {
  const { data, reload } = useFetch<TbmStatus>(tbmId ? `/tbms/${tbmId}/status` : null);
  usePoll(reload, 10000, !!tbmId);
  const rows = Object.values(data?.langs ?? {});
  const viewed = rows.reduce((n, r) => n + r.viewed, 0);
  const understood = rows.reduce((n, r) => n + r.understood, 0);
  return { viewed, understood, rate: viewed ? Math.round((understood / viewed) * 100) : null };
}
