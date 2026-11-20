import { describe, expect, it } from "vitest";
import { focusCamera, groupZones, ifcToThree, statusStyle, zoneBox } from "./scene";
import type { Zone } from "../../shared/types";

const z = (id: string, kind: Zone["kind"] = "fall"): Zone => ({
  id, kind, label: id, storey: "3F", min: [0, 0, 9.9], max: [30, 1, 9.9], element_tags: [], rule: "LAW-42", task_ids: [],
});

describe("scene", () => {
  it("zoneBox gives min thickness", () => {
    const b = zoneBox(z("a"));
    expect(b.size).toEqual([30, 1, 0.05]);
    expect(b.center).toEqual([15, 0.5, 9.9]);
  });
  it("converts IFC Z-up to Y-up", () => {
    expect(ifcToThree([1, 2, 3])).toEqual([1, 3, -2]);
  });
  it("groups 4 edge bands into one hazard", () => {
    const g = groupZones([z("Z-FALL-3F-EDGE-남측"), z("Z-FALL-3F-EDGE-북측"), z("Z-FALL-3F-OPN-3F-계단실")]);
    expect(g.map((x) => x.zones.length)).toEqual([2, 1]);
    expect(g[0].label).toBe("3F 슬래브 단부 추락");
  });
  it("unknown status falls back", () => {
    expect(statusStyle(undefined).opacity).toBe(0.3);
  });
});

describe("focusCamera", () => {
  it("looks at the zone center from above", () => {
    const c = focusCamera({ min: [0, 0, 9.9], max: [15, 18, 13.2] });
    expect(c.target).toEqual(ifcToThree([7.5, 9, 11.55]));
    expect(c.position[1]).toBeGreaterThan(c.target[1]);
  });
});
