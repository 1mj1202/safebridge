import { describe, expect, it } from "vitest";
import { plainEnding, splitMeasure } from "./measureFormat";

describe("measureFormat", () => {
  it("splits condition and action", () => {
    expect(splitMeasure("철근조립이나 데크플레이트 설치 구간 등 실족위험이 있는 경우 작업장 바닥에 실족방지망 또는 작업발판 및 안전난간 설치"))
      .toEqual({ cond: "철근조립이나 데크플레이트 설치 구간 등 실족위험이 있는 경우", action: "작업장 바닥에 실족방지망 또는 작업발판 및 안전난간 설치" });
    expect(splitMeasure("자재 운반시 낙하위험이 없도록 2줄걸이 실시 및 훅 해지장치 설치"))
      .toEqual({ cond: "자재 운반시", action: "낙하위험이 없도록 2줄걸이 실시 및 훅 해지장치 설치" });
    expect(splitMeasure("근로자 이동 또는 작업 시 안전대 체결")).toEqual({ cond: "근로자 이동 또는 작업 시", action: "안전대 체결" });
  });
  it("keeps short or condition-less measures whole", () => {
    expect(splitMeasure("안전대 착용 철저")).toEqual({ cond: "", action: "안전대 착용 철저" });
    expect(splitMeasure("지붕사다리 설치 및 근로자 이동 또는 작업 시 안전대 체결").cond).toBe("");
    expect(splitMeasure("작업 전 안전교육 실시 후 작업")).toEqual({ cond: "", action: "작업 전 안전교육 실시 후 작업" });
  });
  it("turns descriptive endings into noun form", () => {
    expect(plainEnding("안전난간을 설치해야 합니다.")).toBe("안전난간을 설치");
    expect(plainEnding("작업발판을 설치한다.")).toBe("작업발판을 설치");
    expect(plainEnding("안전대를 착용할 것")).toBe("안전대를 착용");
  });
});
