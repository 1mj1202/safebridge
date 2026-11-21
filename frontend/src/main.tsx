import "@fontsource-variable/noto-sans-kr";
import "./styles.css";
import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

// 근로자 화면은 3D 뷰어(three.js) 없이 가볍게 열리도록 분리해서 불러온다
const AdminGate = lazy(() => import("./features/admin/AdminGate")); // 비밀번호 확인 후 관리자 화면
const WorkerPage = lazy(() => import("./features/worker/WorkerPage"));
const LaunchPage = lazy(() => import("./features/app/LaunchPage")); // 홈 화면 앱 시작점

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="p-6 text-slate-500">불러오는 중…</div>}>
        <Routes>
          <Route path="/" element={<AdminGate />} />
          <Route path="/app" element={<LaunchPage />} />
          <Route path="/w/:token" element={<WorkerPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
