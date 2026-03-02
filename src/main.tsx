
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Only register Service Worker in production to avoid stale cache issues in preview/dev
const isProduction = import.meta.env.PROD && !window.location.hostname.includes('preview');

if (isProduction) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      onNeedRefresh() {
        if (confirm('Nova versão disponível! Deseja atualizar?')) {
          updateSW(true);
        }
      },
      onOfflineReady() {
        console.log('App pronto para uso offline');
      },
    });
  }).catch(() => {
    // PWA registration not critical
  });
} else {
  // In dev/preview, unregister any existing SW to prevent stale modules
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  }).catch(() => {});
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
