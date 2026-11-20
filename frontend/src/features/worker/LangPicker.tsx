// 첫 화면: 언어 고르기
export default function LangPicker({ langs, onPick }: { langs: Record<string, string>; onPick: (l: string) => void }) {
  return (
    <div className="mx-auto max-w-md p-5">
      <h1 className="mb-1 text-center text-2xl font-bold">SafeBridge</h1>
      <p className="mb-5 text-center text-slate-500">언어를 고르세요 · Choose your language</p>
      <div className="grid gap-3">
        {Object.entries(langs).map(([k, v]) => (
          <button key={k} onClick={() => onPick(k)}
            className="rounded-2xl bg-white py-5 text-2xl font-bold shadow ring-1 ring-slate-200 active:bg-slate-100">{v}</button>
        ))}
      </div>
    </div>
  );
}
