import type { ReactNode } from "react";
import type { Level } from "./types";

export function LevelBadge({ level }: { level: Level }) {
  const cls = { 상: "bg-red-600 text-white", 중: "bg-orange-500 text-white", 하: "bg-slate-300 text-slate-800" }[level];
  return <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${cls}`}>위험 {level}</span>;
}

export function Chip({ children, onClick, tone = "slate" }: { children: ReactNode; onClick?: () => void;
  tone?: "slate" | "blue" | "amber" | "red" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    blue: "bg-blue-50 text-blue-700 hover:bg-blue-100",
    amber: "bg-amber-50 text-amber-800 hover:bg-amber-100",
    red: "bg-red-50 text-red-700 hover:bg-red-100",
  };
  const Tag = onClick ? "button" : "span";
  return (
    <Tag onClick={onClick} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </Tag>
  );
}

export function Button({ children, onClick, disabled, kind = "primary", type = "button" }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; kind?: "primary" | "ghost" | "danger";
  type?: "button" | "submit" }) {
  const k = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    ghost: "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50",
    danger: "bg-orange-600 text-white hover:bg-orange-500",
  }[kind];
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40 ${k}`}>
      {children}
    </button>
  );
}

export function Panel({ title, children, right }: { title: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
