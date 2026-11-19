// TBM 발행 — QR·언어별 카드 미리보기·용어 유지율·관리자 한마디 역번역
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Button, Panel } from "../../shared/ui";
import type { Meta, Tbm } from "../../shared/types";

export default function PublishPanel({ tbm, meta, busy, onPublish }: {
  tbm: Tbm | null; meta: Meta; busy: boolean; onPublish: (memo: string) => void }) {
  const [memo, setMemo] = useState("오늘은 바람이 강하니 단부 작업 전 꼭 안전대를 거세요");
  const [qr, setQr] = useState("");
  const [lang, setLang] = useState("vi");
  useEffect(() => {
    if (tbm) QRCode.toDataURL(tbm.url, { width: 220, margin: 1 }).then(setQr);
  }, [tbm]);

  if (!tbm) {
    return (
      <Panel title="TBM 발행">
        <label className="text-xs font-bold text-slate-500" htmlFor="memo">관리자 한마디 (선택, 자동 번역·역번역)</label>
        <textarea id="memo" className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm" rows={2}
          value={memo} onChange={(e) => setMemo(e.target.value)} />
        <div className="mt-2 text-right"><Button kind="danger" disabled={busy} onClick={() => onPublish(memo)}>
          {busy ? "발행 중…" : "TBM 발행 (QR 만들기)"}</Button></div>
      </Panel>
    );
  }
  const check = tbm.translation_check;
  const m = check.memo?.[lang];
  return (
    <Panel title="TBM 발행됨">
      <div className="flex flex-wrap gap-4">
        {qr && <img src={qr} alt="근로자 접속 QR" className="h-44 w-44 rounded-lg ring-1 ring-slate-200" />}
        <div className="min-w-0 flex-1 text-sm">
          <p className="break-all"><a className="text-blue-700 underline" href={tbm.url} target="_blank" rel="noreferrer">{tbm.url}</a></p>
          <p className="mt-2 text-xs font-bold text-slate-500">핵심 용어 유지율 (사전 고정 번역)</p>
          <ul className="mt-1 grid grid-cols-2 gap-x-3 text-xs">
            {Object.entries(check.phrases).filter(([l]) => l !== "ko").map(([l, c]) => (
              <li key={l}>{meta.langs[l]}: <b>{Math.round(c.rate * 100)}%</b> ({c.kept}/{c.total})</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-3 flex gap-1">
        {Object.keys(tbm.cards).filter((l) => l !== "ko").map((l) => (
          <button key={l} onClick={() => setLang(l)}
            className={`rounded px-2 py-1 text-xs ${l === lang ? "bg-slate-900 text-white" : "bg-slate-100"}`}>{meta.langs[l]}</button>
        ))}
      </div>
      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
        {tbm.cards[lang].map((c, i) => (
          <div key={c.type} className="rounded-lg bg-slate-50 p-2">
            <b>{c.title}</b>
            <p className="text-slate-400">{tbm.cards.ko[i].title}</p>
            <ul className="mt-1 space-y-0.5">
              {c.lines.map((l, j) => {
                const ko = tbm.cards.ko[i].lines[j];
                return <li key={j}>• {typeof l === "string" ? l : l.text}
                  <span className="block text-slate-400">{typeof ko === "string" ? ko : ko?.text}</span></li>;
              })}
            </ul>
          </div>
        ))}
      </div>
      {m && (
        <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs">
          <b>관리자 한마디</b> {m.ok ? "" : <span className="text-amber-700">({m.note || "번역 실패"}: 한국어 원문 표시)</span>}
          <p>원문: {m.source}</p><p>번역: {m.translated}</p><p>역번역: {m.back || "-"}</p>
          {m.terms && <p>용어 유지 {m.terms.kept}/{m.terms.total}</p>}
        </div>
      )}
    </Panel>
  );
}
