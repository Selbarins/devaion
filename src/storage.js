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

// ---------- Cloud sync (per-user, full state) ----------
let saveTimer = null;
let lastSyncStatus = 'idle';

export function getSyncStatus() {
  return lastSyncStatus;
}

/** Collect every progress / ticket / odyle key that should live in the cloud */
function collectKV() {
  const kv = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k.startsWith('d2|') ||
        k.startsWith('g|') ||
        k.startsWith('a2') ||
        k === 'devaion_base_missions'
      ) {
        kv[k] = localStorage.getItem(k);
      }
    }
  } catch {}
  return kv;
}

/** Write a kv object back into localStorage */
function hydrateKV(kv) {
  if (!kv || typeof kv !== 'object') return;
  Object.entries(kv).forEach(([k, v]) => {
    if (v == null) return;
    try { localStorage.setItem(k, v); } catch {}
  });
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
      }, { onConflict: 'user_id' });

    if (error) throw error;
    lastSyncStatus = 'synced';
  } catch (err) {
    console.warn('Supabase save failed', err);
    lastSyncStatus = 'error';
  }
}

export function scheduleCloudSave(userId, payload, delay = 700) {
  if (!supabase || !userId) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveToCloud(userId, payload), delay);
}

/**
 * Cloud is the source of truth when the user is logged in.
 * localStorage is only a cache + offline buffer.
 */
export async function loadAll(userId) {
  const local = {
    roster: localGet('devaion_roster'),
    st: localGet('devaion_st'),
    goals: localGet('devaion_goals', []),
    notes: localGet('devaion_notes', []),
    missions: localGet('devaion_missions'),
    kv: collectKV()
  };

  if (supabase && userId) {
    const cloud = await loadFromCloud(userId);
    if (cloud) {
      if (cloud.kv) hydrateKV(cloud.kv);
      return {
        roster: cloud.roster ?? local.roster,
        st: cloud.st ?? local.st,
        goals: cloud.goals ?? local.goals,
        notes: cloud.notes ?? local.notes,
        missions: cloud.missions ?? local.missions,
        _source: 'cloud'
      };
    }
  }

  return { ...local, _source: 'local' };
}

  return { ...local, _source: 'local' };
}

export function saveAll(userId, state) {
  // Always keep a local cache
  if (state.roster) localSet('devaion_roster', state.roster);
  if (state.st) localSet('devaion_st', state.st);
  if (state.goals) localSet('devaion_goals', state.goals);
  if (state.notes) localSet('devaion_notes', state.notes);
  export function saveAll(userId, state) {
  if (state.roster) localSet('devaion_roster', state.roster);
  if (state.st) localSet('devaion_st', state.st);
  if (state.goals) localSet('devaion_goals', state.goals);
  if (state.notes) localSet('devaion_notes', state.notes);
  if (state.missions) localSet('devaion_missions', state.missions);

  if (userId) {
    const payload = {
      roster: state.roster,
      st: state.st,
      goals: state.goals,
      notes: state.notes,
      missions: state.missions ?? localGet('devaion_missions'),
      kv: collectKV()
    };
    scheduleCloudSave(userId, payload);
  }
}

  if (userId) {
    const payload = {
      roster: state.roster,
      st: state.st,
      goals: state.goals,
      notes: state.notes,
      customs: state.customs,
      baseMissions: state.baseMissions ?? localGet('devaion_base_missions'),
      kv: collectKV()
    };
    scheduleCloudSave(userId, payload);
  }
}

export { S };
