import { describe, expect, it } from "vitest";
import { zoneUrl } from "./ZoneQrList";

describe("zone QR url", () => {
  it("encodes the zone name", () => {
    expect(zoneUrl("http://x/w/abc", "A동 3F-a")).toBe("http://x/w/abc?zone=A%EB%8F%99%203F-a");
  });
});
