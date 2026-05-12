// ════════════════════════════════════════════════════════════════════
// Calibrate · Supabase sync module
// ════════════════════════════════════════════════════════════════════
// Wraps the existing localStorage writes so that, when an authenticated
// Supabase session exists, the same data is mirrored to the cloud for
// cross-device sync. Without credentials this module is a no-op —
// Calibrate continues to run 100 % local.
//
// Usage from dist/public/index.html:
//   <script type="module" src="../../supabase/sync.js"></script>
//
//   // After any localStorage write:
//   window.__calSync && window.__calSync.queueUpload('profile');
//
// © 2026 Sanketh Verma <sankethverma07@gmail.com> · MIT
// ════════════════════════════════════════════════════════════════════

const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || '';
const SUPABASE_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || '';

// localStorage key → Supabase table mapping
const STORAGE_TO_TABLE = {
  'calibrate.profile.v1':        'profiles',
  'calibrate.songMoods.v1':      'song_moods',
  'calibrate.customEq.v1':       'custom_eqs',
  'calibrate.namedPresets.v1':   'named_presets',
};

let supabase = null;
let session  = null;
let pending  = new Set();
let flushing = false;

// ─── Lazy client init ────────────────────────────────────────
async function getClient() {
  if (supabase) return supabase;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, storageKey: 'calibrate.auth.v1' },
    });
    const { data } = await supabase.auth.getSession();
    session = data?.session || null;
    supabase.auth.onAuthStateChange((_evt, s) => { session = s; if (session) flushAll(); });
    return supabase;
  } catch (e) {
    console.warn('[Calibrate sync] Failed to load Supabase client — running local-only.', e);
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────
//   queueUpload(name): mark a slice dirty; flush soon.
//   pull():            fetch all slices from server, write to localStorage.
//   signIn(email):     send magic link.
//   signOut():
//   currentUser():
// ─────────────────────────────────────────────────────────────

async function queueUpload(name) {
  pending.add(name);
  setTimeout(flushPending, 800);
}

async function flushPending() {
  if (flushing) return;
  flushing = true;
  try {
    const client = await getClient();
    if (!client || !session) { flushing = false; return; }
    const userId = session.user.id;
    for (const key of pending) {
      const table = STORAGE_TO_TABLE[key];
      if (!table) continue;
      let raw;
      try { raw = JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { raw = null; }
      if (!raw) continue;
      await upsertSlice(client, table, userId, raw);
    }
    pending.clear();
  } catch (e) {
    console.warn('[Calibrate sync] flush failed', e);
  } finally {
    flushing = false;
  }
}

async function upsertSlice(client, table, userId, raw) {
  switch (table) {
    case 'profiles': {
      const row = {
        user_id: userId,
        total_focus_minutes: countGoodMinutes(raw),
        longest_streak: raw.longestStreak || 0,
        achievements: raw.unlocked || {},
        updated_at: new Date().toISOString(),
      };
      return client.from('profiles').upsert(row, { onConflict: 'user_id' });
    }
    case 'song_moods': {
      const rows = Object.entries(raw).map(([song_key, entry]) => ({
        user_id: userId,
        song_key,
        samples: entry.samples,
        total: entry.total,
        dominant: entry.dominant,
        manual_tag: entry.manualTag,
        first_heard: new Date(entry.firstHeard || Date.now()).toISOString(),
        last_heard:  new Date(entry.lastHeard  || Date.now()).toISOString(),
      }));
      if (!rows.length) return null;
      return client.from('song_moods').upsert(rows, { onConflict: 'user_id,song_key' });
    }
    case 'custom_eqs': {
      const rows = Object.entries(raw).map(([mood, bands]) => ({
        user_id: userId, mood, bands, updated_at: new Date().toISOString(),
      }));
      if (!rows.length) return null;
      return client.from('custom_eqs').upsert(rows, { onConflict: 'user_id,mood' });
    }
    case 'named_presets': {
      const rows = Object.entries(raw).map(([name, bands]) => ({
        user_id: userId, name, bands,
      }));
      if (!rows.length) return null;
      return client.from('named_presets').upsert(rows, { onConflict: 'user_id,name' });
    }
    default: return null;
  }
}

function countGoodMinutes(profile) {
  if (!profile || !profile.buckets) return 0;
  let n = 0;
  for (const b of profile.buckets) {
    if (b.mood === 'cruising' || b.mood === 'locked') n++;
  }
  return n;
}

async function flushAll() {
  Object.keys(STORAGE_TO_TABLE).forEach(k => pending.add(k));
  return flushPending();
}

async function pull() {
  const client = await getClient();
  if (!client || !session) return false;
  const userId = session.user.id;

  const [profile, songs, customs, named] = await Promise.all([
    client.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    client.from('song_moods').select('*').eq('user_id', userId),
    client.from('custom_eqs').select('*').eq('user_id', userId),
    client.from('named_presets').select('*').eq('user_id', userId),
  ]);

  if (profile.data) {
    const local = (() => { try { return JSON.parse(localStorage.getItem('calibrate.profile.v1') || '{}'); } catch { return {}; } })();
    local.longestStreak = Math.max(local.longestStreak || 0, profile.data.longest_streak || 0);
    local.unlocked = Object.assign({}, local.unlocked || {}, profile.data.achievements || {});
    localStorage.setItem('calibrate.profile.v1', JSON.stringify(local));
  }
  if (songs.data?.length) {
    const map = {};
    for (const r of songs.data) {
      map[r.song_key] = {
        samples: r.samples, total: r.total, dominant: r.dominant,
        manualTag: r.manual_tag, firstHeard: +new Date(r.first_heard), lastHeard: +new Date(r.last_heard),
      };
    }
    localStorage.setItem('calibrate.songMoods.v1', JSON.stringify(map));
  }
  if (customs.data?.length) {
    const map = {};
    for (const r of customs.data) map[r.mood] = r.bands;
    localStorage.setItem('calibrate.customEq.v1', JSON.stringify(map));
  }
  if (named.data?.length) {
    const map = {};
    for (const r of named.data) map[r.name] = r.bands;
    localStorage.setItem('calibrate.namedPresets.v1', JSON.stringify(map));
  }
  return true;
}

async function signIn(email) {
  const client = await getClient();
  if (!client) throw new Error('Supabase not configured');
  return client.auth.signInWithOtp({ email });
}

async function signOut() {
  const client = await getClient();
  if (!client) return;
  return client.auth.signOut();
}

async function currentUser() {
  const client = await getClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data?.session?.user || null;
}

// ─── Expose to the rest of the app ───────────────────────────
const api = { queueUpload, flushAll, pull, signIn, signOut, currentUser, isConfigured: !!(SUPABASE_URL && SUPABASE_KEY) };
if (typeof window !== 'undefined') window.__calSync = api;
export default api;
