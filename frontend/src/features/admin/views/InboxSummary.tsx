// TBM 초안 오른쪽: 사진 증빙·이슈함 요약 (목업 별첨 2-11). 누르면 해당 메뉴로
import { AlertTriangle, Camera, Check } from "lucide-react";
import { Chip, Panel } from "../../../shared/ui";
import type { InboxCounts } from "../useInboxCounts";

interface Props {
  published: boolean;
  c: InboxCounts;
  onPhotos: () => void;
  onIssues: () => void;
}

export default function InboxSummary({ published, c, onPhotos, onIssues }: Props) {
  if (!published) {
    return <Panel title="사진 증빙 · 이슈함"><p className="text-xs text-slate-400">TBM을 발행하면 구역별 사진 증빙과 현장 이슈가 여기에 모여요.</p></Panel>;
  }
  const open = c.issues.filter((i) => i.status === "open")
    .sort((x, y) => Number(y.urgency === "urgent") - Number(x.urgency === "urgent")).slice(0, 3);
  return (
    <div className="space-y-4">
      <Panel title="사진 증빙" right={<button type="button" onClick={onPhotos} className="text-xs text-slate-500 hover:underline">전체 보기</button>}>
        {!c.photos.length && !c.missing.length ? <p className="text-xs text-slate-400">아직 없음</p> : (
          <ul className="divide-y divide-slate-100 text-xs">
            {c.photos.slice(0, 4).map((p) => (
              <li key={p.id} className="flex items-center gap-1.5 py-1.5">
                {p.status === "confirmed" ? <Check size={13} className="text-emerald-600" /> : <Camera size={13} className="text-orange-500" />}
                <span className="min-w-0 flex-1 truncate">{p.zone} {p.request}</span>
                <span className={p.status === "confirmed" ? "font-semibold text-emerald-700" : "text-orange-600"}>
                  {p.status === "confirmed" ? "확인" : p.ai_status === "ok" ? "AI 확인" : "확인 대기"}</span>
              </li>
            ))}
            {c.missing.map((z) => (
              <li key={z} className="flex items-center gap-1.5 py-1.5">
                <AlertTriangle size={13} className="text-red-600" /><span className="flex-1">{z}</span>
                <span className="font-semibold text-red-600">미제출</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="이슈함" right={<button type="button" onClick={onIssues} className="text-xs text-slate-500 hover:underline">전체 보기</button>}>
        {!open.length ? <p className="text-xs text-slate-400">미회신 이슈 없음</p> : (
          <ul className="space-y-1.5 text-xs">
            {open.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={onIssues}
                  className={`w-full rounded-lg p-2 text-left ${i.urgency === "urgent" ? "bg-red-50 hover:bg-red-100" : "bg-slate-50 hover:bg-slate-100"}`}>
                  <span className="flex items-center gap-1">
                    {i.urgency === "urgent" ? <Chip tone="red">긴급</Chip> : <Chip>일반</Chip>}
                    <b className="truncate">{i.zone || "구역 미지정"} {i.summary_ko || i.text_ko}</b>
                  </span>
                  <span className="mt-0.5 block text-slate-500">{i.route.join(" → ")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
