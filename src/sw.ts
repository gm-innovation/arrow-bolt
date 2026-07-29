/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */

// Unified Service Worker: precache + runtime cache + push notifications
// Built via vite-plugin-pwa injectManifest.

import { clientsClaim } from "workbox-core";
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Build-time injected version (see vite.config.ts `define`)
declare const __SW_VERSION__: string;
const SW_VERSION =
  typeof __SW_VERSION__ !== "undefined" ? __SW_VERSION__ : "dev";

// ---- Precache (Workbox injects the manifest here) ----
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ---- Message channel: identity + kill switch + skip waiting ----
let currentUserId: string | null = null;

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = (event.data ?? {}) as { type?: string; userId?: string };
  if (data.type === "SET_USER_ID" && typeof data.userId === "string") {
    currentUserId = data.userId;
    return;
  }
  if (data.type === "CLEAR_USER_CACHE") {
    const target = data.userId ?? currentUserId;
    event.waitUntil(clearUserCache(target));
    return;
  }
  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (data.type === "GET_SW_VERSION") {
    event.ports?.[0]?.postMessage({ version: SW_VERSION });
    return;
  }
});

async function clearUserCache(userId: string | null): Promise<void> {
  const prefix = `${userId ?? "anon"}|`;
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((n) => n.startsWith("user-scoped-"))
      .map(async (name) => {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        await Promise.all(
          requests.map(async (req) => {
            // We stored under a synthetic Request whose URL is `${prefix}${original}`
            if (req.url.includes(prefix)) await cache.delete(req);
          })
        );
      })
  );
}

// ---- Kill-switch on install: wipe legacy Workbox caches from previous SWs ----
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const legacyCacheNames = [
        "supabase-api-cache",
        "supabase-storage-cache",
        "images-cache",
        "fonts-cache",
        "workbox-precache-v2",
      ];
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (k) =>
              legacyCacheNames.includes(k) ||
              /^workbox-precache-v\d+-/.test(k)
          )
          .map((k) => caches.delete(k))
      );
    })()
  );
});

self.addEventListener("activate", () => {
  clientsClaim();
});

// ---- Per-user cache key ----
const userScopedKey = async ({ request }: { request: Request }) => {
  const prefix = currentUserId ?? "anon";
  return new Request(`${prefix}|${request.url}`, { method: request.method });
};

// ---- Runtime caches ----

// Supabase REST — NetworkFirst, scoped per user
registerRoute(
  ({ url }) =>
    url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/rest/"),
  new NetworkFirst({
    cacheName: "user-scoped-supabase-rest",
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      { cacheKeyWillBeUsed: userScopedKey },
    ],
  }),
  "GET"
);

// Supabase Storage — NetworkFirst (short TTL), scoped per user
registerRoute(
  ({ url }) =>
    url.hostname.endsWith(".supabase.co") &&
    url.pathname.startsWith("/storage/"),
  new NetworkFirst({
    cacheName: "user-scoped-supabase-storage",
    networkTimeoutSeconds: 8,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 5 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      { cacheKeyWillBeUsed: userScopedKey },
    ],
  }),
  "GET"
);

// Images
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images-v2",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Fonts
registerRoute(
  ({ request }) => request.destination === "font",
  new CacheFirst({
    cacheName: "fonts-v2",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ---- Navigation route with offline fallback ----
// denylist avoids returning offline.html for API/asset requests
const navigationHandler = new NetworkFirst({
  cacheName: "pages",
  networkTimeoutSeconds: 5,
  plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
});

registerRoute(
  new NavigationRoute(
    async (params) => {
      try {
        const response = await navigationHandler.handle(params);
        if (response) return response;
        throw new Error("empty");
      } catch {
        const cached = await caches.match("/offline.html");
        if (cached) return cached;
        return new Response("Offline", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        });
      }
    },
    {
      denylist: [
        /^\/api\//,
        /^\/functions\//,
        /^\/rest\//,
        /^\/storage\//,
        /^\/auth\//,
        /\.[a-z0-9]+$/i,
      ],
    }
  )
);

// ---- Push notifications ----
self.addEventListener("push", (event: PushEvent) => {
  let data: {
    title?: string;
    body?: string;
    message?: string;
    url?: string;
    notificationId?: string;
    referenceId?: string;
    tag?: string;
    requireInteraction?: boolean;
  } = { title: "Arrow", body: "Nova notificação", url: "/" };

  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    console.error("[SW] Error parsing push data:", e);
  }

  const options: NotificationOptions & { actions?: any[]; vibrate?: number[] } =
    {
      body: data.body || data.message,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      vibrate: [100, 50, 100],
      data: {
        url: data.url || "/",
        notificationId: data.notificationId,
        referenceId: data.referenceId,
      },
      actions: [
        { action: "open", title: "Abrir" },
        { action: "dismiss", title: "Dispensar" },
      ],
      tag: data.tag || "arrow-notification",
      renotify: true,
      requireInteraction: data.requireInteraction || false,
    } as any;

  event.waitUntil(
    self.registration.showNotification(data.title || "Arrow", options)
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  if ((event as any).action === "dismiss") return;

  const urlToOpen = (event.notification.data as any)?.url || "/";
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientsList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          await (client as WindowClient).focus();
          await (client as WindowClient).navigate(urlToOpen);
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(urlToOpen);
      }
    })()
  );
});

self.addEventListener("notificationclose", () => {
  // Placeholder for analytics if needed later.
});
