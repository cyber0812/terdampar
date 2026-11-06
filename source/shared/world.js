// Height queries and entity table shared by the server and the client.
export const SEA_LEVEL = 0;
export class WorldData {
  constructor(heightU16, pois, spawns) {
    const { N, WORLD, MINH, MAXH } = pois.world;
    this.N = N; this.WORLD = WORLD; this.S = WORLD / (N - 1); this.pois = pois;
    this.h = new Float32Array(N * N);
    for (let i = 0; i < this.h.length; i++) this.h[i] = MINH + (heightU16[i] / 65535) * (MAXH - MINH);
    this.entities = []; this.byCell = new Map(); this.CELL = 32;
    let id = 0;
    for (const type of Object.keys(spawns)) for (const e of spawns[type]) {
      const ent = { id: id++, type, x: e[0], z: e[1], y: e[2], s: e[3], r: e[4] };
      this.entities.push(ent);
      const k = this.cellKey(ent.x, ent.z); let l = this.byCell.get(k); if (!l) this.byCell.set(k, l = []); l.push(ent);
    }
  }
  cellKey(x, z) { return (Math.floor(x / this.CELL) + 512) * 4096 + Math.floor(z / this.CELL) + 512; }
  height(x, z) {
    const { N, S, WORLD, h } = this; let fx = (x + WORLD / 2) / S, fz = (z + WORLD / 2) / S;
    fx = Math.max(0, Math.min(N - 1.001, fx)); fz = Math.max(0, Math.min(N - 1.001, fz));
    const ix = fx | 0, iz = fz | 0, u = fx - ix, v = fz - iz, q = iz * N + ix;
    return h[q] * (1 - u) * (1 - v) + h[q + 1] * u * (1 - v) + h[q + N] * (1 - u) * v + h[q + N + 1] * u * v;
  }
  normal(x, z, e = 1.5) {
    const a = this.height(x - e, z), b = this.height(x + e, z), c = this.height(x, z - e), d = this.height(x, z + e);
    const nx = a - b, nz = c - d, ny = 2 * e, l = Math.hypot(nx, ny, nz); return [nx / l, ny / l, nz / l];
  }
  forNear(x, z, r, fn) {
    const c = this.CELL, x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c), z0 = Math.floor((z - r) / c), z1 = Math.floor((z + r) / c);
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
      const l = this.byCell.get((i + 512) * 4096 + j + 512); if (l) for (const e of l) fn(e);
    }
  }
  // water surface at a point, or null. Lake and river sit above sea level.
  waterLevel(x, z) {
    const { lake, river } = this.pois; const g = this.height(x, z);
    if (Math.hypot(x - lake.x, z - lake.z) < lake.r + 60 && g < lake.level) return lake.level;
    if (this._rv === undefined) { this._rv = river; }
    let best = 1e9, by = 0, bw = 0;
    for (let i = 0; i < river.length; i += 2) { const r = river[i], d = (r[0] - x) ** 2 + (r[1] - z) ** 2; if (d < best) { best = d; by = r[2]; bw = r[3]; } }
    if (best < (bw + 3) ** 2 && g < by) return by;
    return g < SEA_LEVEL ? SEA_LEVEL : null;
  }
}
