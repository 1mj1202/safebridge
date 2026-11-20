// 구역별 QR — 구역 입구에 붙이면 근로자가 찍자마자 그 구역 브리핑으로 들어간다
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { nfcSupported } from "../../shared/nfc";
import type { ZoneBriefing } from "../../shared/types";
import NfcWriteButton from "./NfcWriteButton";

export function zoneUrl(base: string, zone: string): string {
  return `${base}?zone=${encodeURIComponent(zone)}`;
}

export default function ZoneQrList({ url, zones }: { url: string; zones: ZoneBriefing[] }) {
  const [qrs, setQrs] = useState<Record<string, string>>({});
  useEffect(() => {
    Promise.all(zones.map(async (z) => [z.zone, await QRCode.toDataURL(zoneUrl(url, z.zone), { width: 160, margin: 1 })] as const))
      .then((rows) => setQrs(Object.fromEntries(rows)));
  }, [url, zones]);
  if (!zones.length) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-bold text-slate-500">구역별 QR·NFC (구역 입구 부착용)</p>
      <p className="text-[11px] text-slate-400">
        NFC 태그에는 QR과 같은 주소가 들어가요. 근로자는 앱 없이 태그에 휴대폰을 대면 그 구역 브리핑이 열려요.
        {nfcSupported() ? " 버튼을 누르고 빈 태그를 대세요." : " 태그 쓰기는 안드로이드 크롬에서 이 화면을 열거나, NFC 앱으로 아래 구역 주소를 쓰세요."}
      </p>
      <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {zones.map((z) => (
          <div key={z.zone} className={`rounded-lg p-1 text-center text-[11px] ring-1 ${z.restricted ? "ring-red-300" : "ring-slate-200"}`}>
            <a href={zoneUrl(url, z.zone)} target="_blank" rel="noreferrer">
              {qrs[z.zone] && <img src={qrs[z.zone]} alt={`${z.zone} QR`} className="mx-auto h-20 w-20" />}
              <span className="block font-semibold">{z.zone}</span>
            </a>
            <NfcWriteButton url={zoneUrl(url, z.zone)} />
          </div>
        ))}
      </div>
    </div>
  );
}
