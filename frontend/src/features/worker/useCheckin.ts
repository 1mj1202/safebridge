// 구역 태그(QR 주소 열기·NFC·직접 선택) → 서버에 내 위치 갱신. 로그인한 근로자만, 가입 없이 보기는 기록 안 함
import { useEffect, useState } from "react";
import { api } from "../../shared/api";

export type TagSource = "qr" | "nfc" | "pick";
export interface Tag { zone: string; source: TagSource; at: number }

/** 그 구역 교육을 이미 이해했다고 눌렀는지 (같은 구역 다시 태그해도 유지) */
export function useCheckin(token: string, signedIn: boolean, tag: Tag | null) {
  const [understood, setUnderstood] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!signedIn || !tag) return;
    api.post<{ zone: string; understood: boolean }>(`/w/${token}/checkin`, { zone: tag.zone, source: tag.source })
      .then((r) => setUnderstood((u) => ({ ...u, [r.zone]: r.understood })))
      .catch(() => undefined);
  }, [token, signedIn, tag]);
  const mark = (zone: string) => setUnderstood((u) => ({ ...u, [zone]: true }));
  return { understood, mark };
}
