import { describe, expect, it } from "vitest";
import { INTRO_SEC, PHASE_SEC, fallTime, fallY, timeline, walk } from "./motion";

describe("motion", () => {
  it("자유 낙하는 바닥에서 멈춘다", () => {
    expect(fallY(3, 0)).toBe(3);
    expect(fallY(3, 0.5)).toBeCloseTo(3 - 0.5 * 9.8 * 0.25);
    expect(fallY(3, 5)).toBe(0);
    expect(fallY(3, fallTime(3))).toBeCloseTo(0);
  });
  it("걷기는 구간 밖에서 멈춰 있다", () => {
    expect(walk(0, 2, 0, 1, 3).x).toBe(0);
    expect(walk(0, 2, 2, 1, 3).x).toBeCloseTo(1);
    expect(walk(0, 2, 9, 1, 3)).toMatchObject({ x: 2, swing: 0 });
  });
  it("위험 구역 짚기 → 사고 → 대책 → 다음 위험 순서로 반복", () => {
    const cycle = INTRO_SEC + PHASE_SEC * 2;
    expect(timeline(0, 2)).toMatchObject({ index: 0, phase: "intro" });
    expect(timeline(INTRO_SEC + 1, 2)).toMatchObject({ index: 0, phase: "accident", t: 1 });
    expect(timeline(INTRO_SEC + PHASE_SEC + 1, 2)).toMatchObject({ index: 0, phase: "measure", t: 1 });
    expect(timeline(cycle, 2)).toMatchObject({ index: 1, phase: "intro" });
    expect(timeline(cycle * 2 + 0.5, 2)).toMatchObject({ index: 0, phase: "intro" });
  });
});
