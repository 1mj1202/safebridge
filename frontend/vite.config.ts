import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 기본은 이 PC 에서만. 시연 때 휴대폰으로 QR 접속하려면 VITE_HOST=0.0.0.0 npm run dev
    host: process.env.VITE_HOST ?? "127.0.0.1",
    port: 5173,
    proxy: { "/api": { target: process.env.API_URL ?? "http://127.0.0.1:8000", changeOrigin: true } },
  },
  build: { chunkSizeWarningLimit: 900 },
});
