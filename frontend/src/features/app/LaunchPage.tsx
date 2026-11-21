// 홈 화면 앱의 시작 화면(/app): 가장 최근에 발행된 TBM 의 근로자 화면으로 바로 넘긴다
// 고정 구역 QR·NFC(/app?zone=)로 열리면 그 구역 태그로 넘긴다(위치 갱신)
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../shared/api";
import { workerPath } from "./lastVisit";

export default function LaunchPage() {
  const nav = useNavigate();
  const [failed, setFailed] = useState(false);
  const zone = useSearchParams()[0].get("zone");

  useEffect(() => {
    api.get<{ token: string }>("/launch")
      .then((r) => nav(workerPath(r.token, zone), { replace: true }))
      .catch(() => setFailed(true));
  }, [nav, zone]);

  if (failed) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center text-slate-600">
        <p>오늘 발행된 안전 브리핑이 아직 없어요.</p>
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" onClick={() => location.reload()}>다시 열기</button>
      </div>
    );
  }
  return <div className="p-6 text-center text-slate-500">…</div>;
}
