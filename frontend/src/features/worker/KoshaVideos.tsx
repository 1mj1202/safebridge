// 안전보건공단(KOSHA) 영상 — 제목을 누르면 화면 안에서 바로 재생 (mp4 는 <video>, 유튜브는 iframe)
import { useState } from "react";
import { CirclePlay, X } from "lucide-react";
import type { KoshaVideo } from "./fieldTypes";

function Player({ v }: { v: KoshaVideo }) {
  if (v.kind === "youtube")
    return <iframe src={`${v.src}?autoplay=1&playsinline=1`} title={v.title} allow="autoplay; encrypted-media; fullscreen"
      allowFullScreen className="aspect-video w-full rounded-xl bg-black" />;
  return <video src={v.src} controls autoPlay playsInline preload="metadata" className="aspect-video w-full rounded-xl bg-black" />;
}

export default function KoshaVideos({ videos }: { videos: KoshaVideo[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!videos.length) return null;
  return (
    <ul className="space-y-1.5">
      {videos.map((v) => (
        <li key={v.url}>
          {open === v.url ? (
            <div className="space-y-1">
              <Player v={v} />
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="truncate">{v.title} · KOSHA</span>
                <button onClick={() => setOpen(null)} aria-label="close" className="shrink-0 rounded-full p-1 hover:bg-slate-100">
                  <X size={16} strokeWidth={1.75} /></button>
              </div>
            </div>
          ) : (
            <button onClick={() => setOpen(v.url)}
              className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
              <CirclePlay size={18} strokeWidth={1.75} className="shrink-0 text-red-600" />
              <span className="line-clamp-2">{v.title}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
