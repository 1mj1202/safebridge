// 근로자 카드 한 장 (일할 곳 / 조심할 사고 / 확인할 것)
import type { Card, CardLine } from "../../shared/types";
import FloorPlan, { type Plan } from "./FloorPlan";
import Pictogram from "./Pictogram";
import { cardSpeech, canSpeak, speak } from "./speech";

const ICON = { place: "📍", hazard: "⚠️", check: "✅" } as const;
const TONE = { place: "border-blue-500", hazard: "border-red-600", check: "border-emerald-600" } as const;

export function lineText(l: string | CardLine): string {
  return typeof l === "string" ? l : l.text;
}

export default function WorkerCard({ card, lang, big, listenLabel }: {
  card: Card & { plan?: Plan | null }; lang: string; big: boolean; listenLabel: string }) {
  const lines = big && card.type !== "place" ? card.lines.slice(0, 3) : card.lines;
  const text = cardSpeech(card.title, [...lines.map(lineText), ...(card.memo && card.memo_translated ? [card.memo] : [])]);
  return (
    <section className={`rounded-2xl border-l-8 bg-white p-4 shadow ${TONE[card.type]}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={`${big ? "text-2xl" : "text-lg"} font-bold`}>{ICON[card.type]} {card.title}</h2>
        {canSpeak() && (
          <button onClick={() => speak(text, lang)} className="rounded-full bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white">
            🔊 {listenLabel}</button>
        )}
      </div>
      {card.type === "place" && card.plan && <div className="mt-3"><FloorPlan plan={card.plan} /></div>}
      <ul className={`mt-3 space-y-2 ${big ? "text-xl" : "text-base"}`}>
        {lines.map((l, i) => (
          <li key={i} className="flex items-center gap-3">
            {typeof l !== "string" && (
              <Pictogram name={l.pictogram} className={`${big ? "h-14 w-14" : "h-10 w-10"} shrink-0 ${l.level === "상" ? "text-red-600" : "text-orange-500"}`} />
            )}
            <span className={typeof l !== "string" && l.level === "상" ? "font-semibold" : ""}>{lineText(l)}</span>
          </li>
        ))}
      </ul>
      {card.memo && (
        <p className="mt-3 rounded-lg bg-amber-50 p-2 text-sm">💬 {card.memo_translated ? card.memo : card.memo_ko}</p>
      )}
    </section>
  );
}
