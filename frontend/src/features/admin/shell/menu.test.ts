import { describe, expect, it } from "vitest";
import { menusFor, startMenu } from "./menu";

describe("menu", () => {
  it("목업 순서 + 근로자 화면 미리보기", () => {
    expect(menusFor("safety").map((m) => m.label)).toEqual(["위험 지도", "TBM 초안", "발행", "확인 현황", "신고함", "근로자 화면"]);
    expect(menusFor("manager").map((m) => m.id)).toEqual(["home", "draft", "status", "inbox", "map", "preview"]);
    expect(menusFor("viewer").map((m) => m.id)).toEqual(["home", "map", "status", "inbox", "preview"]);
  });
  it("부류별 첫 화면", () => {
    expect(startMenu("safety")).toBe("map");
    expect(startMenu("manager")).toBe("home");
    expect(startMenu("viewer")).toBe("home");
    expect(startMenu(null)).toBe("map");
  });
});
