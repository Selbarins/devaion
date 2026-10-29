import { EV } from "./data.js";
import { getSt } from "./state.js";

let permission = typeof Notification !== "undefined" ? Notification.permission : "denied";

export async function initNotifications() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.warn("Service Worker registration failed", err);
    return;
  }

  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
}

function nextOccurrence(e) {
  const now = Date.now();
  let best = null;

  for (let k = 0; k < 4; k++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + k);

    if (e[3] && !e[3].includes(d.getUTCDay())) continue;

    for (const hour of e[4]) {
      const ts = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, e[5] || 0);
      if (ts > now && (best === null || ts < best)) {
        best = ts;
      }
    }
  }
  return best;
}

export function scheduleEventNotifications() {
  if (permission !== "granted") return;
  if (!navigator.serviceWorker?.controller) return;

  const st = getSt();
  const hidden = st.evHide || [];
  const minutesBefore = [15, 10, 5];

  EV.forEach(event => {
    if (hidden.includes(event[0])) return;

    const start = nextOccurrence(event);
    if (!start) return;

    minutesBefore.forEach(min => {
      const fireAt = start - min * 60 * 1000;
      if (fireAt <= Date.now()) return;

      navigator.serviceWorker.controller.postMessage({
        type: "SCHEDULE",
        title: `${event[1]} ${event[0]}`,
        body: `Starts in ${min} minutes`,
        timestamp: fireAt,
        tag: `devaion-${event[0]}-${min}`
      });
    });
  });
}
