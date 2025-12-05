// Custom Service Worker for Push Notifications
self.addEventListener("push", function (event) {
  console.log("[SW] Push event received:", event);

  let data = { title: "Arrow", body: "Nova notificação", url: "/" };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error("[SW] Error parsing push data:", e);
  }

  const options = {
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
    tag: data.tag || "aqua-task-notification",
    renotify: true,
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", function (event) {
  console.log("[SW] Notification click:", event);

  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // Try to focus an existing window
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }),
  );
});

self.addEventListener("notificationclose", function (event) {
  console.log("[SW] Notification closed:", event);
});
