// 관리자 화면 (PDF 별첨 2-10·2-11 목업): 머리글(현장·기상·상태) + 왼쪽 메뉴(휴대폰은 아래 탭), 소장·발주처는 '오늘' 홈부터
// 위험 지도 / TBM 초안 / 발행 / 확인 현황 / 신고함. 날짜·초안·TBM 은 메뉴끼리 공유(useAdminState)
import { useMemo, useState } from "react";
import { useStaff } from "../../shared/staff";
import type { Zone } from "../../shared/types";
import type { PeopleMarker } from "../viewer/Viewer3D";
import { countByZone, filterCompany } from "./locations";
import AdminHeader from "./shell/AdminHeader";
import AdminNav from "./shell/AdminNav";
import { menusFor, startMenu, type MenuId } from "./shell/menu";
import { useAdminState } from "./useAdminState";
import { useInboxCounts } from "./useInboxCounts";
import { useLocations } from "./useLocations";
import DraftView from "./views/DraftView";
import ManagerHome from "./views/home/ManagerHome";
import ViewerHome from "./views/home/ViewerHome";
import InboxView from "./views/InboxView";
import MapView from "./views/MapView";
import PublishView from "./views/PublishView";
import StatusView from "./views/StatusView";

export default function AdminPage() {
  const { me, can } = useStaff();
  const s = useAdminState();
  const [menu, setMenu] = useState<MenuId>(() => startMenu(me?.role));
  const [selected, setSelected] = useState<string[]>([]);
  const [zoneInfo, setZoneInfo] = useState<Zone | null>(null);
  const loc = useLocations();
  const [company, setCompany] = useState("");
  const workers = useMemo(() => filterCompany(loc.data?.workers ?? [], company), [loc.data, company]);
  const markers = useMemo<PeopleMarker[]>(() => [...countByZone(workers)].flatMap(([zone, c]) => {
    const box = loc.data?.boxes[zone];
    return box ? [{ key: zone, box, text: `${c.count}명`, warn: c.pending > 0 }] : [];
  }), [workers, loc.data]);
  const c = useInboxCounts(s.tbm?.id ?? null);

  const sel = { selected, zoneInfo, set: (ids: string[], z: Zone | null) => { setSelected(ids); setZoneInfo(z); } };
  const focusZones = (ids: string[]) => {
    sel.set(ids, s.risk?.zones.find((z) => z.id === ids[0]) ?? null);
    setMenu("map");
  };
  // 승인하면(발행 권한이 있으면) 바로 발행 메뉴로 — 목업의 '승인 후 QR 발행' 흐름
  const st = {
    ...s,
    approve: async () => { const ok = await s.approve(); if (ok && can("publish")) setMenu("publish"); return ok; },
    ask: async (q: string) => { const r = await s.ask(q); sel.set([], null); return r; },
  };
  const approvedNow = s.a?.status === "approved" && !s.stale;

  return (
    <div className="flex h-full flex-col">
      <AdminHeader site={s.meta?.site} risk={s.risk} a={s.a} tbm={s.tbm} />
      {s.err && <div className="bg-red-600 px-5 py-2 text-sm text-white">오류: {s.err}</div>}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <AdminNav cur={menu} onPick={setMenu} items={menusFor(me?.role)}
          badges={{ inbox: { n: c.openIssues, urgent: c.urgentIssues > 0 }, status: { n: c.pendingPhotos } }}
          dimmed={{ publish: !approvedNow && !s.tbm }} />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-slate-100">
          <div className={menu === "map" ? "lg:h-full" : "hidden"}>
            <MapView s={st} markers={markers} sel={sel} onOpenDraft={() => setMenu("draft")} />
          </div>
          {menu === "home" && (me?.role === "viewer"
            ? <ViewerHome s={st} c={c} goto={setMenu} /> : <ManagerHome s={st} c={c} goto={setMenu} />)}
          {menu === "draft" && (
            <DraftView s={st} c={c} onFocusZones={focusZones} goto={setMenu}
              onBackToDraftDay={() => { if (s.a) s.setDay(s.a.work_date); sel.set([], null); }} />
          )}
          {menu === "publish" && <PublishView s={st} onDraft={() => setMenu("draft")} />}
          {menu === "status" && <StatusView s={st} loc={loc} workers={workers} company={company} onCompany={setCompany} />}
          {menu === "inbox" && <InboxView s={st} />}
        </main>
      </div>
    </div>
  );
}
