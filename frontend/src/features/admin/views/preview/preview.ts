// 근로자 화면 미리보기 — 관리자가 언어·구역을 골라 근로자와 같은 브리핑을 본다.
// 읽기(GET)만 한다: 열람·'이해했어요'·질문 집계(/ack), 위치, 질문·신고·사진은 보내지 않는다.
import type { ZoneRow } from "../../../worker/fieldTypes";

/** 처음 보여 줄 구역: 작업 구역(출입 통제 아님) 중 첫 번째, 없으면 첫 구역 */
export function firstZone(zones: ZoneRow[]): string | null {
  return (zones.find((z) => !z.restricted) ?? zones[0])?.zone ?? null;
}

/** 근로자 화면과 같은 읽기 주소 (근로자 화면 WorkerPage 와 같은 API) */
export function previewPaths(token: string, lang: string, zone: string | null) {
  return {
    zonesKo: `/w/${token}/zones?lang=ko`, // 구역 고르기 이름은 한국어로
    zones: `/w/${token}/zones?lang=${lang}`, // 발행본 표시·화면 문구는 고른 언어로
    brief: zone ? `/w/${token}/brief?lang=${lang}&zone=${encodeURIComponent(zone)}` : null,
  };
}

/** 언어 목록: 고른 구역 근로자가 쓰는 언어를 앞에 */
export function orderLangs(all: Record<string, string>, zoneLangs: string[] = []): { code: string; name: string; here: boolean }[] {
  const codes = Object.keys(all);
  const here = codes.filter((c) => zoneLangs.includes(c));
  return [...here, ...codes.filter((c) => !here.includes(c))].map((code) => ({ code, name: all[code], here: here.includes(code) }));
}
