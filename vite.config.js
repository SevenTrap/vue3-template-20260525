import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { mars3dPlugin } from "vite-plugin-mars3d";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), mars3dPlugin()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 42000,
  },
  build: {
    rollupOptions: {
      output: {
        // 改为 es 或 umd 格式
        format: "es",
      },
    },
  },
  optimizeDeps: {
    exclude: ["satellite.js"],
  },
  // 配置 worker 格式
  worker: {
    format: "es",
  },
});
