import { EV } from "./data.js";
import { getSt } from "./state.js";

let permission = typeof Notification !== "undefined" ? Notification.permission : "denied";
let reg = null;
const pendingTimers = new Map(); // tag → timeoutId

const SOUND_URL = "/sounds/event-alert.mp3";
const AUTO_CLOSE_MS = 7000; // auto-dismiss after 7 seconds

export async function initNotifications() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

  try {
    reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
  } catch (err) {
    console.warn("Service Worker registration failed", err);
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
      if (ts > now && (best === null || ts < best)) best = ts;
    }
  }
  return best;
}

function playAlertSound() {
  try {
    const audio = new Audio(SOUND_URL);
    audio.volume = 0.7;
    audio.play().catch(() => {}); // ignore autoplay restrictions
  } catch {}
}

function showNotification(title, body, tag) {
  if (permission !== "granted") return;

  // Play custom sound
  playAlertSound();

  // System notification
  const n = new Notification(title, {
    body,
    tag,
    requireInteraction: false, // allows auto-close
    silent: true               // we play our own sound
  });

  // Auto-close after a few seconds
  setTimeout(() => n.close(), AUTO_CLOSE_MS);

  n.onclick = () => {
    window.focus();
    n.close();
  };
}

export function scheduleEventNotifications() {
  // Clear previous timers
  for (const id of pendingTimers.values()) clearTimeout(id);
  pendingTimers.clear();

  if (permission !== "granted") return;

  const st = getSt();
  const notifyList = st.evNotify || [];
  const minutesBefore = [15, 10, 5];

  EV.forEach(event => {
    if (!notifyList.includes(event[0])) return;

    const start = nextOccurrence(event);
    if (!start) return;

    minutesBefore.forEach(min => {
      const fireAt = start - min * 60 * 1000;
      const delay = fireAt - Date.now();

      // Only schedule near-term (next 25 minutes max)
      if (delay <= 0 || delay > 25 * 60 * 1000) return;

      const tag = `devaion-${event[0]}-${min}`;

      const timerId = setTimeout(() => {
        showNotification(
          `${event[1]} ${event[0]}`,
          `Starts in ${min} minutes`,
          tag
        );
        pendingTimers.delete(tag);
      }, delay);

      pendingTimers.set(tag, timerId);
    });
  });
}

export function getNotificationPermission() {
  return permission;
}
