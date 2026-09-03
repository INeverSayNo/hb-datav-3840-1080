import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/hb-datav/",
  // 预计算的路网二进制（scripts/precompute-hb-map.mjs 产出）不在 Vite 默认的
  // 资源后缀表里，显式登记后才能被 `?url` 导入并带上内容哈希。
  assetsInclude: ["**/*.bin"],
  resolve: {
    alias: {
      "@": resolve("src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // 前缀 vendor- 是为了避开与源码同名文件产生的 chunk 命名冲突
          // （src/pages/Index/map/three.tsx 也会生成名为 three 的 chunk）
          if (/[\\/]node_modules[\\/](three|three-stdlib)[\\/]/.test(id)) {
            return "vendor-three";
          }
          if (/[\\/]node_modules[\\/](echarts|zrender)[\\/]/.test(id)) {
            return "vendor-echarts";
          }
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return "vendor-react";
          }
          // tie-tools 带着 axios + elliptic/bn.js，不单独分桶会被并进
          // DashboardHeader 的页面 chunk（约 895KB）且不被 modulepreload。
          if (/[\\/]node_modules[\\/](@dczy[\\/]tie-tools|axios|elliptic|bn\.js)[\\/]/.test(id)) {
            return "vendor-http";
          }
        },
      },
    },
  },
  server: {
    port: 8001,
  },
});
