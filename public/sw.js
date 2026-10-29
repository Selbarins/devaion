/* Devaion Service Worker – event notifications */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("message", e => {
  if (e.data?.type !== "SCHEDULE") return;

  const { title, body, timestamp, tag } = e.data;
  const delay = timestamp - Date.now();
  if (delay <= 0) return;

  setTimeout(() => {
    self.registration.showNotification(title, {
      body,
      tag,
      data: { url: "/" }
    });
  }, delay);
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window" }).then(list => {
      if (list.length > 0) list[0].focus();
      else clients.openWindow("/");
    })
  );
});
