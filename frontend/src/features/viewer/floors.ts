// 층 버튼: 고른 층까지(그 층 기둥·윗면 슬래브까지)만 보인다. 위험 영역·인원 배지도 그 높이 아래 것만 남긴다
// 부재의 층(storey X)은 X 바닥에서 윗층 바닥까지 — 3F 슬래브 단부 영역은 3F 부재 윗면(=4F 바닥 높이)에 놓인다
import type { BimModel, Vec3 } from "../../shared/types";

type Box = { min: Vec3; max: Vec3 };

/** 고른 층 부재의 윗면 높이 (윗층 바닥 높이). 없는 층이면 null */
export function floorTop(storeys: BimModel["storeys"], name: string | null): number | null {
  if (!name) return null;
  const sorted = [...storeys].sort((a, b) => a.elevation - b.elevation);
  const i = sorted.findIndex((s) => s.name === name);
  if (i < 0) return null;
  return sorted[i + 1]?.elevation ?? sorted[i].elevation + 3.3;
}

/** 상자가 보이는 높이 안에서 시작하는지 (top 이 null 이면 전체) */
export function belowTop(box: Box, top: number | null): boolean {
  return top === null || box.min[2] <= top + 0.05;
}
