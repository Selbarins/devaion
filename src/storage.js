import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabase = !!(supabaseUrl && supabaseKey);

export const supabase = hasSupabase
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ---------- localStorage helpers ----------
const S = {
  get(k) {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k, v) {
    try { localStorage.setItem(k, v); } catch {}
  },
  remove(k) {
    try { localStorage.removeItem(k); } catch {}
  }
};

export function localGet(key, fallback = null) {
  try {
    const raw = S.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function localSet(key, value) {
  S.set(key, JSON.stringify(value));
}

// ---------- Cloud sync (per-user) ----------
let saveTimer = null;
let lastSyncStatus = 'idle';

export function getSyncStatus() {
  return lastSyncStatus;
}

export async function loadFromCloud(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('tracker')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    lastSyncStatus = 'synced';
    return data?.data ?? null;
  } catch (err) {
    console.warn('Supabase load failed', err);
    lastSyncStatus = 'error';
    return null;
  }
}

export async function saveToCloud(userId, payload) {
  if (!supabase || !userId) return;

  lastSyncStatus = 'syncing';
  try {
    const { error } = await supabase
      .from('tracker')
      .upsert({
        user_id: userId,
        data: payload,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    lastSyncStatus = 'synced';
  } catch (err) {
    console.warn('Supabase save failed', err);
    lastSyncStatus = 'error';
  }
}

export function scheduleCloudSave(userId, payload, delay = 800) {
  if (!supabase || !userId) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveToCloud(userId, payload), delay);
}

export async function loadAll(userId) {
  const local = {
    roster: localGet('devaion_roster'),
    st: localGet('devaion_st'),
    goals: localGet('devaion_goals', []),
    notes: localGet('devaion_notes', []),
    customs: localGet('devaion_customs', []),
  };

  if (supabase && userId) {
    const cloud = await loadFromCloud(userId);
    if (cloud) {
      return {
        roster: cloud.roster ?? local.roster,
        st: cloud.st ?? local.st,
        goals: cloud.goals ?? local.goals,
        notes: cloud.notes ?? local.notes,
        customs: cloud.customs ?? local.customs,
        _source: 'cloud'
      };
    }
  }

  return { ...local, _source: 'local' };
}

export function saveAll(userId, state) {
  if (state.roster) localSet('devaion_roster', state.roster);
  if (state.st) localSet('devaion_st', state.st);
  if (state.goals) localSet('devaion_goals', state.goals);
  if (state.notes) localSet('devaion_notes', state.notes);
  if (state.customs) localSet('devaion_customs', state.customs);

  if (userId) {
    scheduleCloudSave(userId, {
      roster: state.roster,
      st: state.st,
      goals: state.goals,
      notes: state.notes,
      customs: state.customs,
    });
  }
}

export { S };
