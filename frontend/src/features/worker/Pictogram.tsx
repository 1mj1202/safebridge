// 위험 픽토그램 (단순 SVG — 글을 못 읽어도 알아볼 수 있게)
import type React from "react";
const P: Record<string, React.ReactElement> = {
  fall: (<><path d="M8 52h22" strokeWidth="5" /><circle cx="40" cy="20" r="5" fill="currentColor" /><path d="M40 26l-4 14 8 8M36 34l-8-4M38 40l-6 10" /><path d="M48 44l4 10" strokeDasharray="3 4" /></>),
  opening: (<><rect x="18" y="38" width="28" height="16" fill="none" strokeDasharray="4 3" /><circle cx="32" cy="14" r="5" fill="currentColor" /><path d="M32 20v12M26 26l6 6 6-6M32 32l-4 8M32 32l4 8" /></>),
  drop: (<><rect x="24" y="6" width="16" height="12" fill="currentColor" /><path d="M32 22v10M28 28l4 4 4-4" /><circle cx="32" cy="42" r="4" fill="currentColor" /><path d="M32 46v8M26 50h12" /></>),
  collapse: (<><path d="M8 20h48M14 20l6 30M50 20l-8 30M30 20l2 12" /><path d="M10 54h44" strokeWidth="5" /></>),
  caught: (<><rect x="6" y="18" width="18" height="28" fill="currentColor" /><rect x="40" y="18" width="18" height="28" fill="currentColor" /><path d="M28 32h8M30 26l-4 6 4 6M34 26l4 6-4 6" /></>),
  wind: (<><path d="M6 22h34a6 6 0 1 0-6-6M6 34h46a6 6 0 1 1-6 6M6 46h24" /></>),
  rain: (<><path d="M14 30a12 12 0 0 1 24-6 9 9 0 1 1 6 16H18a8 8 0 0 1-4-10z" /><path d="M22 46l-3 8M32 46l-3 8M42 46l-3 8" /></>),
  cold: (<><path d="M32 6v52M10 19l44 26M54 19L10 45" /><path d="M26 10l6 6 6-6M26 54l6-6 6 6" /></>),
};

export default function Pictogram({ name, className = "" }: { name: string | null; className?: string }) {
  if (!name || !P[name]) return null;
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="3.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[name]}</svg>
  );
}
