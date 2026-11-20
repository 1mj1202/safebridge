// 위쪽 막대: ☰ 메뉴 · 구역 이름 · 🔊 브리핑 듣기
import { canSpeak } from "./speech";

export default function TopBar({ title, onMenu, onListen, listen }: {
  title: string; onMenu: () => void; onListen?: () => void; listen: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-2">
      <button onClick={onMenu} aria-label="menu" className="flex h-10 w-10 items-center justify-center rounded-full text-2xl active:bg-slate-100">☰</button>
      <h1 className="min-w-0 flex-1 truncate px-2 text-center text-lg font-bold">{title}</h1>
      {canSpeak() && onListen ? (
        <button onClick={onListen} aria-label={listen} className="flex h-10 w-10 items-center justify-center rounded-full text-xl active:bg-slate-100">🔊</button>
      ) : <span className="w-10" />}
    </header>
  );
}
