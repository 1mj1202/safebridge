// 메뉴 '근로자 화면': 관리자·현장소장·발주처가 언어와 구역을 골라 근로자가 보는 구역 브리핑(위험·대책·예방 영상)을 미리 본다.
// 근로자 화면(WorkerPage)과 같은 발행본·같은 브리핑 부품을 쓰되 읽기만 한다 — 열람·이해 확인·위치는 기록되지 않는다.
import { Ban, Eye, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetch } from "../../../../shared/hooks";
import { stampLine } from "../../../../shared/stamp";
import { Panel } from "../../../../shared/ui";
import BriefMessage from "../../../worker/BriefMessage";
import type { Brief, ZonesData } from "../../../worker/fieldTypes";
import type { AdminState } from "../../useAdminState";
import { firstZone, orderLangs, previewPaths } from "./preview";

const noShoot = { done: false, busy: true, onShoot: () => undefined }; // 미리보기에서는 사진을 보내지 않는다

export default function PreviewView({ s }: { s: AdminState }) {
  const token = s.tbm?.token ?? "";
  const [lang, setLang] = useState("ko");
  const [zone, setZone] = useState<string | null>(null);
  const p = previewPaths(token, lang, zone);
  const { data: ko, error } = useFetch<ZonesData>(token ? p.zonesKo : null);
  const { data: local } = useFetch<ZonesData>(token ? p.zones : null);
  const { data: brief, error: briefErr } = useFetch<Brief>(token ? p.brief : null);
  useEffect(() => { setZone(null); }, [token]); // 다른 발행본을 열면 구역을 다시 고른다
  useEffect(() => { if (ko && !zone) setZone(firstZone(ko.zones)); }, [ko, zone]);

  if (!s.tbm) {
    return <div className="mx-auto max-w-3xl p-4"><Panel title="근로자 화면 미리보기">
      <p className="text-sm text-slate-500">발행된 TBM이 없어요. 발행하면 근로자가 보는 화면을 여기서 미리 볼 수 있어요.</p></Panel></div>;
  }
  if (error) return <div className="p-6 text-red-600">근로자 화면을 불러오지 못했어요 ({error})</div>;
  if (!ko) return <div className="p-6 text-slate-500">불러오는 중…</div>;

  const row = ko.zones.find((z) => z.zone === zone);
  const ui = local?.lang === lang ? local.ui : null;
  // 구역·언어를 바꾸면 새 브리핑이 올 때까지 이전 내용을 그리지 않는다 (근로자 화면과 같은 규칙)
  const ready = brief && brief.zone === zone && (brief.lang ?? lang) === lang && ui ? brief : null;
  const title = local?.lang === lang ? local.zones.find((z) => z.zone === zone)?.label ?? zone : row?.label;

  return (
    <div className="mx-auto grid max-w-5xl gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_28rem]">
      <div className="space-y-4">
        <Panel title="구역">
          <div className="flex flex-wrap gap-2" role="group" aria-label="구역 고르기">
            {ko.zones.map((z) => (
              <button key={z.zone} type="button" onClick={() => setZone(z.zone)} aria-pressed={z.zone === zone}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${z.zone === zone
                  ? "border-brand-600 bg-brand-600 text-white" : z.restricted ? "border-slate-200 text-slate-400" : "border-slate-200 hover:bg-slate-50"}`}>
                {z.restricted ? <Ban size={14} /> : <MapPin size={14} />}{z.label}
              </button>
            ))}
          </div>
          {row && <p className="mt-2 text-xs text-slate-500">{row.storey} · {row.teams.join(", ") || "작업팀 없음"}{row.restricted ? " · 출입 통제" : ""}</p>}
        </Panel>
        <Panel title="언어">
          <div className="flex flex-wrap gap-2" role="group" aria-label="언어 고르기">
            {orderLangs(ko.langs, row?.langs).map((l) => (
              <button key={l.code} type="button" onClick={() => setLang(l.code)} aria-pressed={l.code === lang}
                className={`rounded-full border px-3 py-1.5 text-sm ${l.code === lang
                  ? "border-brand-600 bg-brand-600 text-white" : l.here ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 hover:bg-slate-50"}`}>
                {l.name}</button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">파란 언어는 이 구역 근로자가 쓰는 언어예요.</p>
        </Panel>
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" data-testid="preview-note">
          <Eye size={16} className="mt-0.5 shrink-0" />
          미리보기예요. 근로자 열람·이해 확인·위치는 기록되지 않고, 질문·신고·사진 보내기는 꺼져 있어요.</p>
      </div>

      <section aria-label="근로자 화면 미리보기" className="overflow-hidden rounded-[2rem] border-8 border-slate-800 bg-white shadow-lg lg:sticky lg:top-4 lg:self-start">
        <header className="border-b border-slate-100 px-4 py-3 text-center text-lg font-semibold">{title}</header>
        {local?.stamp && ui && (
          <p className="border-b border-slate-100 px-4 py-1.5 text-center text-xs text-slate-500" data-testid="stamp">{stampLine(local.stamp, ui)}</p>
        )}
        <div className="max-h-[70vh] overflow-y-auto px-4 py-4" data-testid="preview-brief">
          {briefErr ? <p className="py-10 text-center text-red-600">브리핑을 불러오지 못했어요 ({briefErr})</p>
            : ready && ui ? <BriefMessage brief={ready} big={false} token={token} ui={ui} photo={noShoot} />
              : <p role="status" className="py-10 text-center text-slate-400">{ui?.loading ?? "…"}</p>}
        </div>
      </section>
    </div>
  );
}
