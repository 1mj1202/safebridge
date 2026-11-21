// 3D 위험 영역 라벨 목록 — 데스크톱은 3D 위 오른쪽, 좁은 화면은 3D 아래 가로 줄로(모델·범례를 가리지 않게)
import type { Zone } from "../../shared/types";
import { groupZones } from "./scene";

export default function ZoneLabels({ zones, selected, onPick, onClear, row = false }: {
  zones: Zone[]; selected: string[]; onPick: (zs: Zone[]) => void; onClear: () => void; row?: boolean }) {
  const btn = (extra: string) => `shrink-0 rounded-md px-2 py-1 text-left text-xs shadow ${extra}`;
  return (
    <div className={row ? "flex gap-1.5 overflow-x-auto pb-1" : "max-w-[260px] space-y-1"}>
      {groupZones(zones).map((g) => (
        <button key={g.key} onClick={() => onPick(g.zones)}
          className={btn(`${row ? "" : "block w-full "}text-white ${g.kind === "fall" ? "bg-red-600" : "bg-orange-500"}`)}>
          {g.label}{g.zones.length > 1 ? ` (${g.zones.length})` : ""}
        </button>
      ))}
      {selected.length > 0 && (
        <button className={btn(`${row ? "" : "block w-full "}bg-white`)} onClick={onClear}>전체 보기</button>
      )}
    </div>
  );
}
