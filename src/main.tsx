import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";

import { loadRuntimeConfig } from "@/axios-config/request";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("缺少 #root 应用挂载节点");
}

const root = createRoot(rootElement);

function ConfigErrorScreen({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : "发生未知的运行时配置错误";

  return (
    <main
      role="alert"
      style={{
        boxSizing: "border-box",
        width: "100vw",
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 32,
        color: "#d8f6ff",
        background: "#061821",
        fontFamily:
          '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif',
      }}
    >
      <section
        style={{
          width: "min(680px, 100%)",
          padding: "32px 36px",
          border: "1px solid rgba(63, 207, 255, 0.45)",
          borderRadius: 12,
          background: "rgba(7, 36, 49, 0.92)",
          boxShadow: "0 0 28px rgba(33, 189, 239, 0.16)",
        }}
      >
        <h1 style={{ margin: "0 0 16px", fontSize: 24 }}>运行时配置加载失败</h1>
        <p style={{ margin: 0, lineHeight: 1.75, color: "#aac7d2" }}>
          {message}
        </p>
        <p
          style={{
            margin: "18px 0 0",
            lineHeight: 1.75,
            color: "#7899a6",
          }}
        >
          请检查部署目录中的 config.json，然后刷新页面重试。
        </p>
      </section>
    </main>
  );
}





async function bootstrap() {
  try {
    // 两者互不依赖，并行发起：串行时 App chunk 要等 config.json 多走一个 RTT。
    const [, { default: App }] = await Promise.all([
      loadRuntimeConfig(),
      import("./App.tsx"),
    ]);

    root.render(
      <StrictMode>
        <HashRouter>
          <App />
        </HashRouter>
      </StrictMode>,
    );
  } catch (error) {
    console.error("Failed to bootstrap application:", error);
    root.render(<ConfigErrorScreen error={error} />);
  }
}

void bootstrap();
