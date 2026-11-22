// 구역 NFC 태그 쓰기 — 버튼을 누르고 빈 태그를 휴대폰 뒷면에 대면 구역 주소가 기록된다
import { Nfc } from "lucide-react";
import { useState } from "react";
import { nfcSupported, writeUrl } from "../../shared/nfc";

export default function NfcWriteButton({ url }: { url: string }) {
  const [state, setState] = useState<"idle" | "wait" | "done" | "fail">("idle");
  if (!nfcSupported()) return null;
  const write = async () => {
    setState("wait");
    try { await writeUrl(url); setState("done"); } catch { setState("fail"); }
  };
  const label = { idle: "NFC 쓰기", wait: "태그를 대세요…", done: "기록됨", fail: "실패, 다시" }[state];
  return (
    <button onClick={(e) => { e.preventDefault(); write(); }} disabled={state === "wait"}
      className={`mt-1 flex w-full items-center justify-center gap-1 rounded px-1 py-0.5 text-[11px] font-semibold ${state === "done" ? "bg-emerald-600 text-white" : "bg-brand-600 text-white"}`}>
      <Nfc size={12} />{label}</button>
  );
}
