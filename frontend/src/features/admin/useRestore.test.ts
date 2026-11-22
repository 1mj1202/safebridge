import { describe, expect, it } from "vitest";
import { pickRestore } from "./useRestore";

const live = { tbm_id: 3, assessment_id: 7 };

describe("pickRestore", () => {
  it("발행본보다 새로 만든 발행 전 초안이 있으면 그 초안을 연다", () => {
    expect(pickRestore(live, [{ id: 17, tbms: [] }, { id: 7, tbms: [{ id: 3 }] }])).toEqual({ kind: "latest", id: 17 });
  });

  it("가장 새 위험성평가가 지금 발행본이면 발행본을 연다", () => {
    expect(pickRestore(live, [{ id: 7, tbms: [{ id: 3 }] }])).toEqual({ kind: "live", live });
  });

  it("더 새 위험성평가가 이미 발행됐으면(다른 발행본) 지금 발행본을 연다", () => {
    expect(pickRestore(live, [{ id: 9, tbms: [{ id: 5 }] }, { id: 7, tbms: [{ id: 3 }] }])).toEqual({ kind: "live", live });
  });

  it("발행본이 없으면 가장 최근 위험성평가, 아무것도 없으면 null", () => {
    expect(pickRestore(null, [{ id: 4, tbms: [] }])).toEqual({ kind: "latest", id: 4 });
    expect(pickRestore(null, [])).toBeNull();
  });
});
