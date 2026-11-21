import { describe, expect, it } from "vitest";
import { zoneUrl } from "./ZoneQrList";

describe("zone QR url", () => {
  it("TBM 과 무관한 고정 구역 주소(/app?zone=)", () => {
    expect(zoneUrl("http://x/w/abc", "A동 3F-a")).toBe("http://x/app?zone=A%EB%8F%99%203F-a");
  });
});
