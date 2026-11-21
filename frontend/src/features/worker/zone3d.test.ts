import { describe, expect, it } from "vitest";
import type { Zone } from "../../shared/types";
import { unionBox, zonesOfKind } from "./Zone3D";

const z = (id: string, kind: "fall" | "drop"): Zone => ({ id, kind, label: id, storey: "3F", min: [0, 0, 0], max: [1, 1, 1], element_tags: [], rule: "", task_ids: [] });
const zones = [z("Z-FALL-3F-EDGE-남측", "fall"), z("Z-FALL-3F-OPN-3F-계단실", "fall"), z("Z-DROP-3F-BELOW", "drop")];

describe("위험 구역 짚기", () => {
  it("위험 종류별 영역", () => {
    expect(zonesOfKind(zones, "fall_edge").map((x) => x.id)).toEqual(["Z-FALL-3F-EDGE-남측"]);
    expect(zonesOfKind(zones, "fall_opening").map((x) => x.id)).toEqual(["Z-FALL-3F-OPN-3F-계단실"]);
    expect(zonesOfKind(zones, "falling_object").map((x) => x.id)).toEqual(["Z-DROP-3F-BELOW"]);
    expect(zonesOfKind(zones, "collapse")).toEqual([]);
  });
  it("감싸는 상자", () => {
    expect(unionBox([{ min: [0, 0, 0], max: [1, 1, 1] }, { min: [-1, 2, 0], max: [0, 3, 5] }])).toEqual({ min: [-1, 0, 0], max: [1, 3, 5] });
    expect(unionBox([])).toBeNull();
  });
});
