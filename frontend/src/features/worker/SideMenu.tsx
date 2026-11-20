// 메뉴(왼쪽 서랍): 구역 · NFC · 언어(기본 5 + 접기) · 큰 글씨
import { Ban, Check, ChevronDown, Globe, MapPin, Nfc, Type } from "lucide-react";
import { useState, type ReactNode } from "react";
import { splitLangs } from "../../shared/langs";
import type { ZoneRow } from "./fieldTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  zones: ZoneRow[];
  zone: string;
  onZone: (z: string) => void;
  nfc: { supported: boolean; active: boolean; start: () => void };
  langs: Record<string, string>;
  lang: string;
  onLang: (l: string) => void;
  big: boolean;
  onBig: (b: boolean) => void;
}

const ROW = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] active:bg-slate-100";
const ICON = { size: 18, strokeWidth: 1.75 } as const;

function Group({ icon: I, children }: { icon: typeof MapPin; children: ReactNode }) {
  return (
    <section className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
      <I {...ICON} className="mb-1 ml-3 text-slate-400" aria-hidden />
      {children}
    </section>
  );
}

export default function SideMenu({ open, onClose, zones, zone, onZone, nfc, langs, lang, onLang, big, onBig }: Props) {
  const { main, more } = splitLangs(Object.keys(langs));
  const [moreOpen, setMoreOpen] = useState(more.includes(lang));
  if (!open) return null;
  const pick = (f: () => void) => { f(); onClose(); };
  return (
    <div className="fixed inset-0 z-30" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/40" aria-label="close" onClick={onClose} />
      <nav className="absolute inset-y-0 left-0 flex w-[80%] max-w-xs flex-col gap-3 overflow-y-auto bg-white p-3 pt-6 shadow-xl">
        <Group icon={MapPin}>
          {zones.map((z) => (
            <button key={z.zone} onClick={() => pick(() => onZone(z.zone))}
              className={`${ROW} ${z.zone === zone ? "bg-slate-100 font-semibold" : ""} ${z.restricted ? "text-slate-400" : ""}`}>
              {z.restricted && <Ban {...ICON} className="shrink-0" />}
              <span className="flex-1">{z.label}</span>
              {z.zone === zone && <Check {...ICON} className="shrink-0" />}
            </button>
          ))}
          {nfc.supported && (
            <button onClick={() => pick(nfc.start)} aria-pressed={nfc.active} className={`${ROW} ${nfc.active ? "text-blue-600" : ""}`}>
              <Nfc {...ICON} className="shrink-0" />NFC</button>
          )}
        </Group>
        <Group icon={Globe}>
          <div className="flex flex-wrap gap-1.5 px-2">
            {[...main, ...(moreOpen ? more : [])].map((l) => (
              <button key={l} onClick={() => pick(() => onLang(l))} aria-pressed={l === lang}
                className={`rounded-full px-3 py-1.5 text-sm ${l === lang ? "bg-slate-900 font-semibold text-white" : "bg-slate-100 text-slate-700"}`}>{langs[l]}</button>
            ))}
            {more.length > 0 && !moreOpen && (
              <button onClick={() => setMoreOpen(true)}
                className="flex items-center gap-0.5 rounded-full px-3 py-1.5 text-sm text-slate-500 ring-1 ring-slate-200">
                <ChevronDown size={14} />+{more.length}</button>
            )}
          </div>
        </Group>
        <Group icon={Type}>
          <button onClick={() => onBig(!big)} aria-pressed={big} className={`${ROW} justify-between`}>
            <span className="text-lg font-medium">Aa+</span>
            <span className={`h-6 w-11 rounded-full p-0.5 transition ${big ? "bg-slate-900" : "bg-slate-200"}`}>
              <span className={`block h-5 w-5 rounded-full bg-white shadow transition ${big ? "translate-x-5" : ""}`} />
            </span>
          </button>
        </Group>
      </nav>
    </div>
  );
}
