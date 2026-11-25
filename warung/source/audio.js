// SFX sintetis kecil pakai WebAudio
let ac = null, master = null, muted = false;
export function unlockAudio() {
  try {
    if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.35; master.connect(ac.destination); }
    if (ac.state === 'suspended') ac.resume();
  } catch (e) {}
}
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.35; }
export function isMuted() { return muted; }
function tone(f, d, type = 'sine', v = 0.5, t0 = 0, f2) {
  const t = ac.currentTime + t0;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.05);
}
function noise(d, v = 0.3, f = 1800) {
  const len = Math.floor(ac.sampleRate * d), b = ac.createBuffer(1, len, ac.sampleRate), a = b.getChannelData(0);
  for (let i = 0; i < len; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ac.createBufferSource(); s.buffer = b;
  const fl = ac.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f;
  const g = ac.createGain(); g.gain.value = v;
  s.connect(fl); fl.connect(g); g.connect(master); s.start();
}
export function sfx(n) {
  if (!ac || muted) return;
  try {
    switch (n) {
      case 'coin': tone(1320, 0.08, 'square', 0.18); tone(1980, 0.22, 'square', 0.16, 0.07); break;
      case 'pick': tone(660, 0.06, 'triangle', 0.35, 0, 880); break;
      case 'bell': tone(1046, 0.4, 'triangle', 0.25); tone(1568, 0.3, 'sine', 0.12, 0.02); break;
      case 'bad': tone(220, 0.25, 'sawtooth', 0.15, 0, 140); break;
      case 'alarm': for (let i = 0; i < 4; i++) tone(i % 2 ? 620 : 880, 0.14, 'square', 0.14, i * 0.15); break;
      case 'lvl': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.25, i * 0.09)); break;
      case 'ok': [659, 784, 988].forEach((f, i) => tone(f, 0.16, 'square', 0.12, i * 0.08)); break;
      case 'sweep': noise(0.25, 0.4, 2500); break;
      case 'squeak': tone(2200, 0.08, 'sine', 0.2, 0, 3000); tone(2600, 0.07, 'sine', 0.15, 0.1, 3200); break;
      case 'down': tone(440, 0.5, 'sawtooth', 0.14, 0, 80); break;
      case 'up': tone(200, 0.35, 'triangle', 0.2, 0, 900); break;
      case 'drip': tone(1400, 0.1, 'sine', 0.25, 0, 600); break;
      case 'horn': tone(392, 0.14, 'square', 0.12); tone(392, 0.2, 'square', 0.12, 0.2); break;
      case 'ping': tone(988, 0.12, 'sine', 0.25); tone(1318, 0.18, 'sine', 0.2, 0.1); break;
      case 'tap': tone(520, 0.04, 'triangle', 0.15); break;
    }
  } catch (e) {}
}
