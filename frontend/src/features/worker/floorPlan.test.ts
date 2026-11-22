import { describe, expect, it } from "vitest";
import { planSpots, type Plan } from "./FloorPlan";

const plan: Plan = {
  storey: "3F", bounds: [0, 0, 20, 10],
  openings: [[5, 5, 6, 6]],
  zones: [{ kind: "fall", rect: [0, 0, 20, 1] }, { kind: "drop", rect: [0, 0, 3, 3] }],
};

describe("평면도 위험 위치 짚기", () => {
  it("위험 종류마다 평면도의 그 자리", () => {
    expect(planSpots(plan, "fall_opening")).toEqual([[5, 5, 6, 6]]);
    expect(planSpots(plan, "fall_edge")).toEqual([[0, 0, 20, 1]]);
    expect(planSpots(plan, "falling_object")).toEqual([[0, 0, 3, 3]]);
    expect(planSpots(plan, "collapse")).toEqual([[0, 0, 20, 10]]); // 영역이 없으면 슬래브 전체
    expect(planSpots(plan, null)).toEqual([]);
  });
});
