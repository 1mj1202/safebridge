import { describe, expect, it } from "vitest";
import { kstTime, shortDate, stampLine } from "./stamp";

describe("발행본 표시", () => {
  it("UTC 를 한국 시각으로", () => {
    expect(kstTime("2026-11-20T01:09:33Z")).toBe("11/20 10:09");
    expect(kstTime("2026-11-20T15:30:00Z")).toBe("11/21 00:30");
    expect(kstTime(null)).toBe("");
  });

  it("작업일·승인·발행 번호를 한 줄로", () => {
    expect(shortDate("2026-11-24")).toBe("11/24");
    const line = stampLine(
      { tbm_id: 3, work_date: "2026-11-24", approved_at: "2026-11-20T01:09:22Z", published_at: "2026-11-20T01:09:33Z" },
      { work_day: "작업일", approved: "승인", published: "발행" });
    expect(line).toBe("작업일 11/24 · 승인 11/20 10:09 · 발행 #3 11/20 10:09");
  });
});
