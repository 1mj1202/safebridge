import { describe, expect, it } from "vitest";
import { TOUCH_EVERY_MS, isIdle, shouldTouch, touchEvery } from "./idle";

const MIN = 60_000;

describe("관리자 자동 로그아웃", () => {
  it("마지막으로 쓴 뒤 15분이면 로그아웃", () => {
    expect(isIdle(0, 14 * MIN, 15 * MIN)).toBe(false);
    expect(isIdle(0, 15 * MIN, 15 * MIN)).toBe(true);
  });
  it("안 썼으면 서버에 연장 요청 안 함, 썼으면 1분에 한 번만", () => {
    expect(shouldTouch(0, 0, 10 * MIN)).toBe(false);
    expect(shouldTouch(5 * MIN, 0, 5 * MIN)).toBe(true);
    expect(shouldTouch(5 * MIN + 1, 5 * MIN, 5 * MIN + 1)).toBe(false);
    expect(shouldTouch(6 * MIN, 5 * MIN, 5 * MIN + TOUCH_EVERY_MS)).toBe(true);
  });
  it("알림 간격은 만료 시간보다 짧다", () => {
    expect(touchEvery(15 * MIN)).toBe(MIN);
    expect(touchEvery(MIN)).toBe(15_000);
  });
});
