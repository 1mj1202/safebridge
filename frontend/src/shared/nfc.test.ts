import { describe, expect, it } from "vitest";
import { nfcSupported, zoneFromUrl } from "./nfc";

describe("nfc", () => {
  it("reads the zone only from this TBM's url", () => {
    expect(zoneFromUrl("http://x/w/abc?zone=A%EB%8F%99%203F-a", "abc")).toBe("A동 3F-a");
    expect(zoneFromUrl("http://x/w/other?zone=A", "abc")).toBeNull();
    expect(zoneFromUrl("not a url", "abc")).toBeNull();
  });
  it("is unsupported outside android chrome", () => {
    expect(nfcSupported()).toBe(false);
  });
});
