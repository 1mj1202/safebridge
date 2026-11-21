// 메뉴 알림 숫자·초안 화면 오른쪽 요약용: 발행한 TBM 의 이슈·사진 증빙을 주기적으로 읽는다
import { useFetch, usePoll } from "../../shared/hooks";
import type { FieldIssue, SitePhoto } from "../../shared/types";

export function useInboxCounts(tbmId: number | null) {
  const issues = useFetch<FieldIssue[]>(tbmId ? `/tbms/${tbmId}/issues` : null);
  const photos = useFetch<{ photos: SitePhoto[]; missing: string[] }>(tbmId ? `/tbms/${tbmId}/photos` : null);
  usePoll(issues.reload, 5000, !!tbmId);
  usePoll(photos.reload, 5000, !!tbmId);
  const open = issues.data?.filter((i) => i.status === "open") ?? [];
  return {
    issues: issues.data ?? [],
    openIssues: open.length,
    urgentIssues: open.filter((i) => i.urgency === "urgent").length,
    photos: photos.data?.photos ?? [],
    missing: photos.data?.missing ?? [],
    pendingPhotos: photos.data?.photos.filter((p) => p.status === "pending").length ?? 0,
  };
}

export type InboxCounts = ReturnType<typeof useInboxCounts>;
