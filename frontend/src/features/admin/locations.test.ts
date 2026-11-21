import { describe, expect, it } from "vitest";
import { ago, companiesOf, countByZone, filterCompany, sortWorkers, type WorkerLoc } from "./locations";

const w = (id: number, o: Partial<WorkerLoc>): WorkerLoc => ({
  id, name: `w${id}`, company: "A", team: "t", lang: "vi", zone: "A동 3F-a", source: "qr", at: "", minutes: 1,
  fresh: true, understood: false, ...o,
});

describe("근로자 현재 위치", () => {
  const ws = [
    w(1, { understood: true }),
    w(2, {}),
    w(3, { zone: "A동 3F-b", company: "B", minutes: 0 }),
    w(4, { fresh: false, minutes: 300 }),
    w(5, { zone: null, minutes: null, source: null }),
  ];

  it("구역별 인원은 오래된 태그·태그 없음을 빼고, 교육 미확인을 따로 센다", () => {
    const c = countByZone(ws);
    expect(c.get("A동 3F-a")).toEqual({ count: 2, pending: 1 });
    expect(c.get("A동 3F-b")).toEqual({ count: 1, pending: 1 });
    expect(c.size).toBe(2);
  });

  it("업체로 걸러 보기", () => {
    expect(filterCompany(ws, "B").map((x) => x.id)).toEqual([3]);
    expect(filterCompany(ws, "")).toHaveLength(5);
    expect(companiesOf(ws)).toEqual(["A", "B"]);
  });

  it("지금 있는 사람 먼저, 최근 태그 먼저", () => {
    expect(sortWorkers(ws).map((x) => x.id)).toEqual([3, 1, 2, 4, 5]);
  });

  it("몇 분 전", () => {
    expect([ago(0), ago(12), ago(130), ago(3000), ago(null)]).toEqual(["방금", "12분 전", "2시간 전", "2일 전", "태그 없음"]);
  });
});

describe("평면 배치", () => {
  it("위층부터, 외곽 지상은 맨 아래", async () => {
    const { zoneGrid } = await import("./locations");
    expect(zoneGrid(["A동 2F-b", "A동 외곽 지상", "A동 3F-b", "A동 3F-a", "A동 2F-b"])).toEqual([
      { storey: "3F", zones: ["A동 3F-a", "A동 3F-b"] },
      { storey: "2F", zones: ["A동 2F-b"] },
      { storey: "지상", zones: ["A동 외곽 지상"] },
    ]);
  });
});
