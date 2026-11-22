// 챗봇 첫 메시지: 구역 브리핑 (사용자 결정 2026-11-22 — 같은 안내는 한 번만, 행동 시점이 먼저 보이게)
// 출입금지 배너(통제 구역, 가장 먼저) → 3D 모델(기본 펼침) → 오늘의 작업 조건 → 이 구역에서 해야 할 행동(위험 | 시점, 행동)
// → 공통 보호구 → 관리자 한마디 → 사진 증빙 → 관련 예방 영상 N개 ▾ (접힘)
import { Ban, CirclePlay, HardHat, MessageSquareText, Wind } from "lucide-react";
import type { ReactNode } from "react";
import { briefCaptions } from "./brief";
import Fold from "./Fold";
import KoshaVideos from "./KoshaVideos";
import PhotoRequest from "./PhotoRequest";
import Pictogram from "./Pictogram";
import ZoneView from "./ZoneView";
import type { Brief } from "./fieldTypes";

export { briefSpeech } from "./brief";

function Label({ children }: { children: ReactNode }) {
  return <h3 className="mb-1.5 text-[0.8em] font-semibold text-slate-500">{children}</h3>;
}

export default function BriefMessage({ brief, big, token, ui, photo }: {
  brief: Brief; big: boolean; token: string; ui: { video: string; photo: string };
  photo: { done: boolean; busy: boolean; onShoot: () => void } }) {
  const size = big ? "text-xl" : "text-base";
  const weather = brief.sections.find((s) => s.type === "weather")?.lines ?? [];
  const picto = Object.fromEntries((brief.sections.find((s) => s.type === "safety")?.lines ?? []).map((l) => [l.item_id, l.pictogram]));
  const acts = brief.actions ?? [];
  const L = brief.labels;
  return (
    <div className={`space-y-4 ${size}`}>
      {brief.ban && (
        <div role="alert" className="rounded-2xl bg-red-600 p-4 text-white" data-testid="brief-ban">
          <p className="flex items-start gap-2 text-[1.2em] font-bold leading-snug"><Ban size={26} strokeWidth={2.25} className="mt-0.5 shrink-0" />{brief.ban.text}</p>
          <p className="mt-2 font-semibold">{brief.ban.until}</p>
          {brief.ban.hazards.length > 0 && <p className="mt-1 text-[0.85em] text-red-100">⚠ {brief.ban.hazards.join(" · ")}</p>}
        </div>
      )}

      <ZoneView key={brief.zone} token={token} zone={brief.zone} plan={brief.plan} video={ui.video}
        captions={briefCaptions(brief)} sims={brief.sims} />

      {weather.length > 0 && (
        <section data-testid="brief-conditions">
          {L && <Label>{L.conditions}</Label>}
          <ul className="space-y-1.5 rounded-2xl bg-amber-50 p-3">
            {weather.map((l, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-[0.2em] flex w-6 shrink-0 justify-center text-amber-700">
                  {l.pictogram ? <Pictogram name={l.pictogram} className="h-5 w-5" /> : <Wind size={18} strokeWidth={1.75} />}</span>
                <span className={l.level === "상" ? "font-semibold" : ""}>{l.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {acts.length > 0 && (
        <section data-testid="brief-actions">
          {L && <Label>{L.actions}</Label>}
          <ul className="space-y-2">
            {acts.map((a) => (
              <li key={a.item_id} className={`rounded-2xl border p-3 ${a.level === "상" ? "border-red-200" : "border-slate-200"}`}>
                <p className={`flex items-center gap-2 font-semibold ${a.level === "상" ? "text-red-700" : "text-orange-700"}`}>
                  {picto[a.item_id] && <Pictogram name={picto[a.item_id]!} className="h-5 w-5 shrink-0" />}{a.hazard}</p>
                {a.do && <p className="mt-1">{a.when && <b>{a.when}, </b>}{a.do}</p>}
                {a.extra.map((x) => <p key={x} className="mt-1">{x}</p>)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(brief.ppe?.length ?? 0) > 0 && (
        <p className="flex items-start gap-2.5" data-testid="brief-ppe">
          <HardHat size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-slate-600" />
          <span><b>{L?.ppe}</b>: {brief.ppe!.join(" · ")}</span></p>
      )}
      {brief.memo && (
        <p className="flex items-start gap-2.5" data-testid="brief-memo">
          <MessageSquareText size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-slate-600" />{brief.memo}</p>
      )}
      {!brief.ban && brief.final && <p className="rounded-xl bg-red-50 p-3 font-semibold text-red-700" data-testid="brief-final">{brief.final}</p>}

      {brief.photo && <PhotoRequest text={brief.photo.text} label={ui.photo} {...photo} />}

      {brief.videos.length > 0 && (
        <Fold label={L?.videos ?? `${ui.video} ${brief.videos.length}`} icon={<CirclePlay size={18} className="shrink-0 text-red-600" />}>
          {() => <KoshaVideos videos={brief.videos} />}</Fold>
      )}
    </div>
  );
}
