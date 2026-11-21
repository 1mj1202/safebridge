import { describe, expect, it } from "vitest";
import { MENU, startMenu } from "./menu";

describe("menu", () => {
  it("메뉴 5개, 목업 순서", () => {
    expect(MENU.map((m) => m.label)).toEqual(["위험 지도", "TBM 초안", "발행", "확인 현황", "신고함"]);
  });
  it("부류별 첫 화면", () => {
    expect(startMenu("safety")).toBe("map");
    expect(startMenu("manager")).toBe("draft");
    expect(startMenu("viewer")).toBe("status");
    expect(startMenu(null)).toBe("map");
  });
});
