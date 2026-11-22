// 사고 재현 장면의 움직임 계산 (순수 함수 — three.js 없이 테스트)

export const G = 9.8;
/** 장면 하나의 길이(초): 사고 장면과 대책 장면이 같은 길이 */
export const PHASE_SEC = 6;
/** 실제 건물 3D 에서 위험 구역을 짚는 장면 길이(초) */
export const INTRO_SEC = 4;
/** 위험 사이사이 평소 화면(건물 3D·평면도 전체)을 보여 주는 길이(초) — 예방 영상은 이 간격으로 주기적으로 재생 */
export const BASE_SEC = 8;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp01(t);
/** 부드럽게 출발·도착 */
export const ease = (t: number) => { const x = clamp01(t); return x * x * (3 - 2 * x); };

/** t초 동안 떨어진 높이(자유 낙하). 바닥(floor)에서 멈춘다 */
export function fallY(y0: number, t: number, floor = 0): number {
  if (t <= 0) return y0;
  return Math.max(floor, y0 - 0.5 * G * t * t);
}

/** y0 에서 floor 까지 떨어지는 데 걸리는 시간 */
export function fallTime(y0: number, floor = 0): number {
  return Math.sqrt((2 * Math.max(0, y0 - floor)) / G);
}

/** 걷기: 시작~끝 지점까지 [t0,t1] 동안 이동. 팔다리 흔들림 위상도 돌려준다 */
export function walk(from: number, to: number, t: number, t0: number, t1: number) {
  const k = clamp01((t - t0) / (t1 - t0));
  const moving = t > t0 && t < t1;
  return { x: lerp(from, to, k), swing: moving ? Math.sin(t * 9) * 0.6 : 0, k };
}

export type Phase = "base" | "intro" | "accident" | "measure";

const PHASES: [Phase, number][] = [["base", BASE_SEC], ["intro", INTRO_SEC], ["accident", PHASE_SEC], ["measure", PHASE_SEC]];
const CYCLE = PHASES.reduce((a, [, s]) => a + s, 0);

/** 재생 위치(초) → 몇 번째 위험 · 평소 화면/위험 구역 짚기/사고/대책 · 그 장면 안에서 흐른 시간 */
export function timeline(elapsed: number, count: number) {
  if (count <= 0) return { index: 0, phase: "base" as Phase, t: 0 };
  const total = count * CYCLE;
  const e = ((elapsed % total) + total) % total;
  const index = Math.floor(e / CYCLE);
  let t = e - index * CYCLE;
  for (const [phase, sec] of PHASES) {
    if (t < sec) return { index, phase, t };
    t -= sec;
  }
  return { index, phase: "measure" as Phase, t: PHASE_SEC };
}
