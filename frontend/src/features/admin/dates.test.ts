import { describe, expect, it } from "vitest";
import { addDays, daysBetween, label } from "./dates";

describe("dates", () => {
  it("adds across month end", () => expect(addDays("2026-11-30", 1)).toBe("2026-12-01"));
  it("counts days", () => expect(daysBetween("2026-11-23", "2026-11-24")).toBe(1));
  it("labels tomorrow", () => expect(label("2026-11-24", "2026-11-23")).toBe("11월 24일 (화) (내일)"));
});
