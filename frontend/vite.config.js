import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const port = Number(process.env.PORT) || 8080;

export default defineConfig({
  plugins: [react()],
  preview: {
    host: "0.0.0.0",
    port,
    strictPort: true,
  },
});
