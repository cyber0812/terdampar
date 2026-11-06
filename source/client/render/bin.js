// The phone build ships binaries as base64 inside .json, because the page host only serves plain web types.
const solo = () => !!window.__Room;
export async function getBin(url) {
  if (!solo()) return fetch(url).then(r => r.arrayBuffer());
  const s = await fetch(url + '.json').then(r => r.json()), b = atob(s), n = b.length, u = new Uint8Array(n);
  for (let i = 0; i < n; i++) u[i] = b.charCodeAt(i); return u.buffer;
}
export async function loadGlb(loader, url) { if (!solo()) return loader.loadAsync(url); return loader.parseAsync(await getBin(url), url.slice(0, url.lastIndexOf('/') + 1)); }
