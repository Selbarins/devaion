/**
 * Devaion · Aion 2 Tracker — entry point
 */
import { initAuth, getUser, onAuthChange, signInWithDiscord, signOut } from "./auth.js";
import { hasSupabase, getSyncStatus, S, localGet, loadAll, saveAll } from "./storage.js";
import {
  getSt, getRoster, setRoster, getGoals, setGoals, getNotes, setNotes,
  getMissions, setMissions, activeChar, persist
} from "./state.js";
import { CHAR_COLORS, NC, SIEGE_DAYS, DN } from "./data.js";
import { tog, fmt, lastReset, pk, esc, fmtShort, P2 } from "./helpers.js";
import { applyOdyleTicks, setOdyleVal, getOdyleVal, nextUtcTick } from "./odyle.js";
import { getAllMissions, max, val, key, ordered, prog, unfinishedDailies } from "./missions.js";
import { applyTicketTicks, adjTicket } from "./tickets.js";
import { gval, gmax, gkey, createOrUpdateGoalFromForm } from "./goals.js";
import { drawMissions } from "./ui/missionsView.js";
import { drawEvents } from "./ui/eventsView.js";
import { drawHub, nextEventTimes } from "./ui/hubView.js";
import { initNotifications, scheduleEventNotifications } from "./notifications.js";
import { drawCraft } from "./ui/craftView.js";

// Full file restore in progress via subsequent commit if truncated.
// BOOTSTRAP: re-fetch original from last known good if needed.
console.warn('[devaion] If app fails to load, hard-refresh after deploy completes.');

