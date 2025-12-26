
import React from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'

// Register service worker from VitePWA
const updateSW = registerSW({
  onNeedRefresh() {
    // Show a prompt to the user to refresh the page
    if (confirm('Nova versão disponível! Deseja atualizar?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App pronto para uso offline');
  },
  onRegistered(registration) {
    console.log('Service Worker registrado:', registration);
  },
  onRegisterError(error) {
    console.error('Erro ao registrar Service Worker:', error);
  }
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
