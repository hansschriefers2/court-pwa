// ─── Service Worker for Web Push Notifications ───────────────────────────────
// Served at /sw.js (public/ folder) so it controls the full origin scope.

self.addEventListener("install", () => {
  // Take effect immediately without waiting for existing tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// ─── Push ─────────────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Neuer Slot", body: event.data.text() };
  }

  const { title = "Neuer Slot", body = "", courtSlug } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon_1024.png",
      badge: "/icon_1024.png",
      data: { courtSlug },
      // Collapse multiple notifications from the same court into one.
      tag: courtSlug ? `court-${courtSlug}` : "court-slot",
      renotify: true,
    })
  );
});

// ─── Notification click ───────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const courtSlug = event.notification.data?.courtSlug;
  const targetUrl = courtSlug ? `/${courtSlug}` : "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus an existing tab that already has the court open.
        for (const client of windowClients) {
          if (new URL(client.url).pathname === targetUrl && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new tab.
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
