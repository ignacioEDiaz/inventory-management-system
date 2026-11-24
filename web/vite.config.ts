import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// en desarrollo, /api va al servidor de Express (npm run dev:server)
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:3001" } },
});
