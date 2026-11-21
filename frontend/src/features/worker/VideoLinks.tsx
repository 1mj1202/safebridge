// 안전보건공단(KOSHA) 안전보건자료 링크 — 새 창으로 연다
import { ExternalLink } from "lucide-react";

export default function VideoLinks({ links }: { links: { title: string; url: string }[] }) {
  if (!links.length) return null;
  return (
    <ul className="space-y-1">
      {links.map((v) => (
        <li key={v.url}>
          <a href={v.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-slate-600 underline-offset-2 hover:underline">
            <ExternalLink size={15} strokeWidth={1.75} className="shrink-0" />{v.title}</a>
        </li>
      ))}
    </ul>
  );
}
