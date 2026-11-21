// 위쪽 막대: 메뉴 · 구역 이름 · 브리핑 듣기(읽는 중이면 멈춤 버튼)
import { Menu, Square, Volume2 } from "lucide-react";
import { canSpeak } from "./speech";

export default function TopBar({ title, onMenu, onListen, listen, speaking = false }: {
  title: string; onMenu: () => void; onListen?: () => void; listen: string; speaking?: boolean }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-2">
      <button onClick={onMenu} aria-label="menu" className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 active:bg-slate-100"><Menu size={22} strokeWidth={1.75} /></button>
      <h1 className="min-w-0 flex-1 truncate px-2 text-center text-base font-semibold tracking-tight">{title}</h1>
      {canSpeak() && onListen ? (
        <button onClick={onListen} aria-label={speaking ? "stop" : listen} aria-pressed={speaking}
          className={`flex h-10 w-10 items-center justify-center rounded-full active:bg-slate-100 ${speaking ? "bg-red-50 text-red-600" : "text-slate-700"}`}>
          {speaking ? <Square size={18} strokeWidth={2} fill="currentColor" /> : <Volume2 size={22} strokeWidth={1.75} />}</button>
      ) : <span className="w-10" />}
    </header>
  );
}
