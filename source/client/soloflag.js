// iOS 15.0-15.3 Safari has no .at()
for (const C of [Array, Int8Array, Uint8Array, Uint16Array, Uint32Array, Int16Array, Float32Array]) if (!C.prototype.at) Object.defineProperty(C.prototype, 'at', { value(n) { n = Math.trunc(n) || 0; if (n < 0) n += this.length; return this[n]; }, writable: true, configurable: true });
import { Room } from '../server/room.js'; import fs from './shim/fs.js'; import * as P2P from './net/p2p.js';
window.__P2P = P2P; window.__Room = Room; window.__soloFs = fs; window.__dev = new URLSearchParams(location.search).has('cheat');
