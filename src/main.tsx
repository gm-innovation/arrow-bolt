import React from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import App from "./App.tsx";
import "./index.css";

/**
 * Guard: decides whether we should register the app service worker.
 * Never registers in dev, preview, iframes, Lovable hosts, or when ?sw=off.
 */
function shouldRegisterSW(): boolean {
  if (!("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;

  try {
    if (window.top !== window.self) return false;
  } catch {
    // cross-origin iframe access threw — treat as iframe
    return false;
  }

  const url = new URL(window.location.href);
  if (url.searchParams.get("sw") === "off") {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
    return false;
  }

  const host = window.location.hostname;
  const blockedHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev");
  if (blockedHost) return false;

  return true;
}

if (shouldRegisterSW()) {
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          toast("Nova versão do Arrow disponível", {
            description:
              "Atualize para receber as últimas correções e melhorias.",
            duration: Infinity,
            action: {
              label: "Atualizar agora",
              onClick: () => {
                try {
                  navigator.serviceWorker.controller?.postMessage({
                    type: "SKIP_WAITING",
                  });
                } catch {}
                updateSW(true);
              },
            },
            cancel: { label: "Depois", onClick: () => {} },
          });
        },
        onOfflineReady() {
          console.log("[PWA] App pronto para uso offline");
        },
      });
    })
    .catch(() => {
      // PWA registration not critical
    });
} else {
  // In dev/preview/iframe/localhost/?sw=off — unregister any lingering SW
  navigator.serviceWorker
    ?.getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
