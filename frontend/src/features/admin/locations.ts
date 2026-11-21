// 근로자 현재 위치(마지막 태그 구역) — 걸러 보기·구역별 인원 (순수 함수, 단위 테스트 대상)
import type { Vec3 } from "../../shared/types";

export interface WorkerLoc {
  id: number; name: string; company: string; team: string; lang: string;
  zone: string | null; source: "qr" | "nfc" | "pick" | null; at: string | null; minutes: number | null;
  fresh: boolean; understood: boolean;
}

export interface Locations {
  now: string;
  fresh_hours: number;
  workers: WorkerLoc[];
  boxes: Record<string, { min: Vec3; max: Vec3 } | null>;
}

export function filterCompany(ws: WorkerLoc[], company: string): WorkerLoc[] {
  return company ? ws.filter((w) => w.company === company) : ws;
}

export function companiesOf(ws: WorkerLoc[]): string[] {
  return [...new Set(ws.map((w) => w.company))];
}

/** 구역별 지금 있는 인원(오래된 태그 제외)과 교육 미확인 인원 */
export function countByZone(ws: WorkerLoc[]): Map<string, { count: number; pending: number }> {
  const m = new Map<string, { count: number; pending: number }>();
  for (const w of ws) {
    if (!w.zone || !w.fresh) continue;
    const c = m.get(w.zone) ?? { count: 0, pending: 0 };
    c.count += 1;
    if (!w.understood) c.pending += 1;
    m.set(w.zone, c);
  }
  return m;
}

/** 목록 순서: 지금 있는 사람(최근 태그 먼저) → 오래된 태그 → 태그 없음 */
export function sortWorkers(ws: WorkerLoc[]): WorkerLoc[] {
  const rank = (w: WorkerLoc) => (w.zone == null ? 2 : w.fresh ? 0 : 1);
  return [...ws].sort((a, b) => rank(a) - rank(b) || (a.minutes ?? 0) - (b.minutes ?? 0) || a.name.localeCompare(b.name));
}

export function ago(minutes: number | null): string {
  if (minutes == null) return "태그 없음";
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const h = Math.floor(minutes / 60);
  return h < 24 ? `${h}시간 전` : `${Math.floor(h / 24)}일 전`;
}

export const SOURCE_LABEL = { qr: "QR", nfc: "NFC", pick: "직접 선택" } as const;

/** 평면 배치: 층(위층 먼저)별 구역 칸, 외곽 지상은 맨 아래 */
export function zoneGrid(zones: string[]): { storey: string; zones: string[] }[] {
  const rows = new Map<string, string[]>();
  for (const z of new Set(zones)) {
    const storey = z.match(/(\d+)F/)?.[0] ?? "지상";
    rows.set(storey, [...(rows.get(storey) ?? []), z].sort());
  }
  const n = (s: string) => (s === "지상" ? -1 : parseInt(s, 10));
  return [...rows.entries()].sort((a, b) => n(b[0]) - n(a[0])).map(([storey, zs]) => ({ storey, zones: zs }));
}
