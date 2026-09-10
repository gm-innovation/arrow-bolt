import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

const SW_VERSION = new Date().toISOString();

/**
 * Versão do bundle web entregue por OTA.
 * No workflow de release é injetada a partir da tag Git (vX.Y.Z).
 */
const BUNDLE_VERSION = process.env.BUNDLE_VERSION || "0.0.0-dev";

/**
 * Build nativo embutido no APK. Incrementar APENAS quando algo nativo muda
 * (novo plugin Capacitor, permissão, AndroidManifest, SDK, ícone nativo).
 * Um bundle OTA com `minNativeBuild` maior que este não é instalável.
 */
const NATIVE_BUILD = Number(process.env.NATIVE_BUILD || 1);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  define: {
    __SW_VERSION__: JSON.stringify(SW_VERSION),
    __BUNDLE_VERSION__: JSON.stringify(BUNDLE_VERSION),
    __NATIVE_BUILD__: JSON.stringify(NATIVE_BUILD),
  },
  plugins: [
    react(),
    mcpPlugin(),
    mode === "development" && componentTagger(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: [
        "favicon.svg",
        "offline.html",
      ],
      manifest: {
        id: "/?source=pwa",
        name: "Arrow",
        short_name: "Arrow",
        description:
          "Sistema de gerenciamento de ordens de serviço e técnicos",
        theme_color: "#0EA5E9",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        lang: "pt-BR",
        categories: ["business", "productivity"],
        icons: [
          { src: "/pwa-192x192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
          { src: "/pwa-512x512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
          { src: "/pwa-192x192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "maskable" },
          { src: "/pwa-512x512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      injectManifest: {
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}",
          "offline.html",
        ],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
