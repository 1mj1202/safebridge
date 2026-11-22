import { describe, expect, it } from "vitest";
import type { ZoneRow } from "../../../worker/fieldTypes";
import { firstZone, orderLangs, previewPaths } from "./preview";

const z = (zone: string, restricted = false): ZoneRow => ({ zone, label: zone, storey: "2F", restricted, teams: [], langs: [] });

describe("근로자 화면 미리보기", () => {
  it("처음 구역은 출입 통제가 아닌 첫 구역", () => {
    expect(firstZone([z("2F-x", true), z("2F-a")])).toBe("2F-a");
    expect(firstZone([z("2F-x", true)])).toBe("2F-x");
    expect(firstZone([])).toBeNull();
  });
  it("근로자 화면과 같은 읽기 주소만 쓴다", () => {
    const p = previewPaths("tok", "vi", "2F 동측");
    expect(p.brief).toBe("/w/tok/brief?lang=vi&zone=2F%20%EB%8F%99%EC%B8%A1");
    expect(p.zones).toBe("/w/tok/zones?lang=vi");
    expect(p.zonesKo).toBe("/w/tok/zones?lang=ko");
    expect(previewPaths("tok", "ko", null).brief).toBeNull();
    expect(Object.values(p).some((x) => x?.includes("/ack"))).toBe(false);
  });
  it("구역 근로자 언어를 앞에", () => {
    expect(orderLangs({ ko: "한국어", vi: "Tiếng Việt", my: "မြန်မာ" }, ["my"]).map((l) => [l.code, l.here]))
      .toEqual([["my", true], ["ko", false], ["vi", false]]);
  });
});
