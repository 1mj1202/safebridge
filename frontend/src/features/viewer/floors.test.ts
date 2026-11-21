import { describe, expect, it } from "vitest";
import type { Vec3 } from "../../shared/types";
import { belowTop, floorTop } from "./floors";

const storeys = [{ name: "2F", elevation: 3.3 }, { name: "1F", elevation: 0 }, { name: "3F", elevation: 6.6 }];
const box = (lo: number, hi: number) => ({ min: [0, 0, lo] as Vec3, max: [1, 1, hi] as Vec3 });

describe("floors", () => {
  it("층 윗면 높이", () => {
    expect(floorTop(storeys, "1F")).toBe(3.3);
    expect(floorTop(storeys, "3F")).toBeCloseTo(9.9);
    expect(floorTop(storeys, "9F")).toBeNull();
    expect(floorTop(storeys, null)).toBeNull();
  });
  it("3F 단부 영역은 3F 에서만, 하부·지상 영역은 아래층에서도 보인다", () => {
    const edge = box(9.9, 11.1), below = box(6.6, 6.75), ground = box(0, 0.1);
    const t3 = floorTop(storeys, "3F"), t2 = floorTop(storeys, "2F");
    expect([belowTop(edge, t3), belowTop(edge, t2)]).toEqual([true, false]);
    expect([belowTop(below, t2), belowTop(ground, floorTop(storeys, "1F"))]).toEqual([true, true]);
    expect(belowTop(edge, null)).toBe(true);
  });
});
