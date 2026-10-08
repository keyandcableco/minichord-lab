/* ============================================================================
 * store.js: the looper's songs and takes, kept in the browser (IndexedDB)
 *
 * A song is saved as it changes; a take's audio once, when it's complete, as
 * two Float32Arrays. Takes no song refers to any more are let go when a song
 * is opened or deleted.
 * ========================================================================== */
const DB = "minichord-looper", VER = 1;
let opening = null;

function open() {
  if (opening) return opening;
  return opening = new Promise((done, fail) => {
    if (typeof indexedDB === "undefined") { fail(new Error("no IndexedDB")); return; }
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("songs")) db.createObjectStore("songs", { keyPath: "id" });
      if (!db.objectStoreNames.contains("audio")) db.createObjectStore("audio");
    };
    r.onsuccess = () => done(r.result);
    r.onerror = () => { opening = null; fail(r.error); };
  });
}
const req = r => new Promise((done, fail) => { r.onsuccess = () => done(r.result); r.onerror = () => fail(r.error); });
async function tx(store, mode, fn) {
  const db = await open(), t = db.transaction(store, mode), s = t.objectStore(store);
  const out = await fn(s);
  await new Promise((done, fail) => { t.oncomplete = done; t.onerror = () => fail(t.error); t.onabort = () => fail(t.error); });
  return out;
}

export const saveSong = song => tx("songs", "readwrite", s => req(s.put(JSON.parse(JSON.stringify({ ...song, updated: Date.now() })))));
export const loadSong = id => tx("songs", "readonly", s => req(s.get(id)));
export async function listSongs() {
  const all = await tx("songs", "readonly", s => req(s.getAll()));
  return all.map(x => ({ id: x.id, name: x.name, updated: x.updated, clips: x.clips.length, bpm: x.bpm })).sort((a, b) => b.updated - a.updated);
}
export async function deleteSong(id) { await tx("songs", "readwrite", s => req(s.delete(id))); await gc(); }

export const putAudio = (id, l, r) => tx("audio", "readwrite", s => req(s.put({ l, r }, id)));
export const getAudio = id => tx("audio", "readonly", s => req(s.get(id)));
export const hasAudio = id => tx("audio", "readonly", s => req(s.getKey(id))).then(k => k !== undefined);

/** lets go of every take no saved song refers to (keep: ids still in use in memory) */
export async function gc(keep = new Set()) {
  const songs = await tx("songs", "readonly", s => req(s.getAll()));
  const used = new Set(keep);
  for (const x of songs) { for (const c of x.clips) used.add(c.sourceId); for (const id of Object.keys(x.sources || {})) if (x.clips.some(c => c.sourceId === id)) used.add(id); }
  const keys = await tx("audio", "readonly", s => req(s.getAllKeys()));
  const gone = keys.filter(k => !used.has(k));
  if (gone.length) await tx("audio", "readwrite", s => Promise.all(gone.map(k => req(s.delete(k)))));
  return gone.length;
}
/** about how much the browser holds for the looper, and how much it allows */
export async function usage() {
  try { return await navigator.storage.estimate(); } catch (e) { return null; }
}
