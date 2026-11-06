// Minimal stand-in for node:fs so the server's Room can run in the browser. Saves live in localStorage.
const mem = new Map(), K = 'terdampar:';
const get = f => { try { return localStorage.getItem(K + f); } catch { return null; } };
export default {
  existsSync: f => get(f) !== null,
  mkdirSync() { },
  readFileSync(f) { const v = get(f); if (v === null) throw new Error('no save'); return v; },
  writeFileSync(f, d) { mem.set(f, d); },
  renameSync(a, b) { const d = mem.get(a); mem.delete(a); try { localStorage.setItem(K + b, d); } catch { } },
  rm(f) { try { localStorage.removeItem(K + f); } catch { } },
};
