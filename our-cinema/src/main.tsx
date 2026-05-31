import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { isEnvConfigured } from "./config/env";
import ConfigSetup from "./components/ConfigSetup";
import "./index.css";

async function bootstrap() {
  const root = document.getElementById("root");
  if (!root) return;

  if (!isEnvConfigured()) {
    createRoot(root).render(
      <StrictMode>
        <ConfigSetup />
      </StrictMode>
    );
    return;
  }

  const { default: App } = await import("./App.tsx");
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

bootstrap();
