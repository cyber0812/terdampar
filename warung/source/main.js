// ===== Warung Kompak: boot, input, loop, jaringan =====
import { moveCircle, inWarung, rp, rpShort, ITEMS } from './data.js';
import { newState, step, act, makeView, addPlayer, removePlayer, setPlayerPos, saveData, STORY } from './sim.js';
import { findTarget } from './rules.js';
import { hostRoom, joinRoom, cleanCode } from './net.js';
import { createWorld, PCOLORS } from './world.js';
import { createUI, copyText, esc } from './ui.js';
import { unlockAudio, sfx, setMuted, isMuted } from './audio.js';

const $ = id => document.getElementById(id);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};
const url = new URL(location.href);
const LOCAL = url.searchParams.has('local');
const touch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;

// ---------- State ----------
let role = null, S = null, view = null, myId = null, net = null, code = '-----', online = false, slot = 1;
const me = { x: 0, z: 0, r: 0, m: 0 };
let inGame = false, lastSnap = 0, lastPos = 0, lastSave = 0, joinWait = null;
const fxQ = [];

const world = createWorld($('c'));
const ui = createUI({
  world, view: () => view, myId: () => myId, role: () => role, code: () => code, online: () => online, slot: () => slot,
  muted: isMuted, act: doAct, tap: () => sfx('tap'),
  copyInvite(btn) { copyText(inviteLink()).then(ok => { btn.textContent = ok ? 'Link kesalin ✓' : inviteLink(); }); },
  saveNow() { saveSlot(); }, exportSave, unstuck() { me.x = 0; me.z = -1; },
  toggleMute() { setMuted(!isMuted()); store.set('wk_mute', isMuted() ? '1' : '0'); }, quit: quitToMenu,
});
setMuted(store.get('wk_mute') === '1');
function inviteLink() { const u = new URL(location.origin + location.pathname); u.searchParams.set('join', code); if (LOCAL) u.searchParams.set('local', '1'); return u.toString(); }

// ---------- Save slot ----------
const slotKey = n => 'wk_slot_' + n;
function readSlot(n) { try { const s = JSON.parse(store.get(slotKey(n)) || 'null'); return s && s.v === 1 ? s : null; } catch (e) { return null; } }
function saveSlot() {
  if (role !== 'host' || !S) return;
  const d = saveData(S);
  d.names = Object.values(S.pl).map(p => p.n);
  store.set(slotKey(slot), JSON.stringify(d));
  lastSave = performance.now();
}
function exportSave() { saveSlot(); const raw = store.get(slotKey(slot)) || '{}'; return 'WK1.' + btoa(unescape(encodeURIComponent(raw))); }
function importSave(txt) {
  try {
    const s = String(txt).trim().replace(/^WK1\./, '');
    const d = JSON.parse(decodeURIComponent(escape(atob(s))));
    if (!d || d.v !== 1 || !d.day) return 0;
    let n = [1, 2, 3].find(i => !readSlot(i)) || 3;
    store.set(slotKey(n), JSON.stringify(d));
    return n;
  } catch (e) { return 0; }
}

// ---------- Menu ----------
const nameIn = $('nameIn');
nameIn.value = store.get('wk_name') || '';
let myColor = +(store.get('wk_color') || Math.floor(Math.random() * PCOLORS.length)) % PCOLORS.length;
function renderSwatches() {
  $('swatches').innerHTML = PCOLORS.map((c, i) => `<button data-c="${i}" class="${i === myColor ? 'on' : ''}" style="background:#${c.toString(16).padStart(6, '0')}" aria-label="Warna ${i + 1}"></button>`).join('');
}
renderSwatches();
$('swatches').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; myColor = +b.dataset.c; store.set('wk_color', myColor); renderSwatches(); };
function myName() { const n = nameIn.value.trim().slice(0, 12) || 'Pemain'; store.set('wk_name', n); return n; }
function menuView(which) {
  $('mMain').hidden = which !== 'main'; $('mSlots').hidden = which !== 'slots'; $('mJoin').hidden = which !== 'join';
  status(''); $('offlineBox').hidden = true;
}
function status(s, ok) { const el = $('menuStatus'); el.textContent = s; el.classList.toggle('ok', !!ok); }
function ago(t) { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'barusan' : m < 60 ? m + ' menit lalu' : m < 1440 ? Math.round(m / 60) + ' jam lalu' : Math.round(m / 1440) + ' hari lalu'; }
function renderSlots() {
  let h = '';
  for (const n of [1, 2, 3]) {
    const s = readSlot(n);
    if (s) h += `<div class="slot"><div class="t"><b>Slot ${n} · Hari ${s.day} · Lv ${s.lv}</b><small>${rp(s.money)} · celengan ${rpShort(s.cel)} · misi ${Math.min(s.story.i + 1, STORY.length)}/${STORY.length}</small><small>${esc((s.names || []).join(', '))} · ${ago(s.at)}</small></div><button class="btn" data-load="${n}">Lanjut</button><button class="btn ghost" data-del="${n}" aria-label="Hapus slot ${n}">🗑</button></div>`;
    else h += `<div class="slot"><div class="t"><b>Slot ${n}</b><small>Kosong</small></div><button class="btn y" data-new="${n}">Mulai baru</button></div>`;
  }
  $('slotList').innerHTML = h;
}
$('slotList').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  unlockAudio(); sfx('tap');
  if (b.dataset.load) { slot = +b.dataset.load; startHost(readSlot(slot)); }
  if (b.dataset.new) { slot = +b.dataset.new; startHost(null); }
  if (b.dataset.del) { if (b.dataset.sure) { store.del(slotKey(+b.dataset.del)); renderSlots(); } else { b.dataset.sure = 1; b.textContent = 'Yakin?'; b.classList.add('r'); } }
};
$('btnHost').onclick = () => { unlockAudio(); sfx('tap'); myName(); renderSlots(); menuView('slots'); };
$('btnJoinOpen').onclick = () => { unlockAudio(); sfx('tap'); myName(); menuView('join'); $('codeIn').focus(); };
$('slotBack').onclick = $('joinBack').onclick = () => menuView('main');
$('btnImport').onclick = () => { $('importBox').hidden = !$('importBox').hidden; };
$('btnImportGo').onclick = () => { const n = importSave($('importIn').value); $('importNote').textContent = n ? `Berhasil! Save masuk ke slot ${n}.` : 'Kodenya nggak kebaca. Pastikan disalin lengkap.'; if (n) { $('importIn').value = ''; renderSlots(); } };
$('codeIn').oninput = () => { $('codeIn').value = cleanCode($('codeIn').value); };
$('btnJoin').onclick = () => { unlockAudio(); sfx('tap'); const c = cleanCode($('codeIn').value); if (c.length !== 5) return status('Kode room harus 5 huruf'); startGuest(c); };
$('codeIn').onkeydown = e => { if (e.key === 'Enter') $('btnJoin').click(); };
$('btnOffline').onclick = () => { startOffline(); };

// ---------- Mulai game ----------
let pendingSave = null;
async function startHost(save) {
  myName();
  status('Lagi bikin room…', true);
  disableMenu(true);
  pendingSave = save;
  try {
    net = await hostRoom(LOCAL, { onJoin: onGuestJoin, onData: onGuestData, onLeave: onGuestLeave });
    online = true; code = net.code;
    beginHost();
  } catch (e) {
    disableMenu(false);
    status('Gagal bikin room online. Cek internet, atau main sendiri dulu.');
    $('offlineBox').hidden = false;
  }
}
function startOffline() { net = null; online = false; code = 'OFFLINE'; beginHost(); }
function beginHost() {
  role = 'host'; myId = 'host';
  S = newState(pendingSave);
  const p = addPlayer(S, myId, myName(), myColor);
  me.x = p.x; me.z = p.z; me.r = 0;
  enterGame();
  if (online) ui.toast(`Room ${code} siap. Buka HP › Room buat ngajak temen`, 'ok');
  if (!pendingSave) ui.toast('Ikutin misi di kiri atas ya', 'info');
  saveSlot();
}
async function startGuest(c) {
  status('Nyambung ke room ' + c + '…', true);
  disableMenu(true);
  try {
    net = await joinRoom(c, LOCAL, { onData: onHostData, onClose: onHostClose });
    code = c; online = true; role = 'guest';
    net.send({ t: 'hello', n: myName(), c: myColor });
    await new Promise((res, rej) => { joinWait = { res, rej }; setTimeout(() => rej(new Error('timeout')), 10000); });
    enterGame();
    ui.toast('Kamu gabung ke room ' + c + '!', 'ok');
  } catch (e) {
    try { net && net.close(); } catch (x) {}
    net = null; role = null;
    disableMenu(false);
    const t = e && e.type;
    status(t === 'peer-unavailable' ? 'Room ' + c + ' nggak ketemu. Cek kodenya, atau suruh temen bikin room dulu.' : e && e.message === 'full' ? 'Room-nya udah penuh (4 orang).' : 'Gagal nyambung. Coba lagi, atau pakai WiFi yang sama.');
  } finally { joinWait = null; }
}
function disableMenu(d) { for (const b of document.querySelectorAll('#menu button')) b.disabled = d; }
function enterGame() {
  disableMenu(false);
  $('menu').hidden = true; $('hud').hidden = false;
  $('joyHint').hidden = !touch; $('pcHint').hidden = touch; $('actKbd').hidden = touch;
  inGame = true;
  if (url.searchParams.has('join')) { url.searchParams.delete('join'); history.replaceState(null, '', url.pathname + (LOCAL ? '?local=1' : '')); }
}
function quitToMenu() {
  if (role === 'host') saveSlot();
  try { net && net.close(); } catch (e) {}
  net = null; role = null; S = null; view = null; myId = null; inGame = false; online = false;
  ui.reset();
  $('hud').hidden = true; $('menu').hidden = false; menuView('main');
}

// ---------- Host: pesan dari guest ----------
function onGuestJoin(cid) { if (S && Object.keys(S.pl).length >= 4) { net.send(cid, { t: 'full' }); setTimeout(() => net.kick(cid), 300); } }
function onGuestData(cid, m) {
  if (!S || !m || typeof m !== 'object') return;
  if (m.t === 'hello') {
    if (S.pl[cid]) return;
    if (Object.keys(S.pl).length >= 4) { net.send(cid, { t: 'full' }); return; }
    let c = (m.c | 0) % PCOLORS.length;
    const used = Object.values(S.pl).map(p => p.c);
    if (used.includes(c)) c = [0, 1, 2, 3, 4, 5].find(i => !used.includes(i)) ?? c;
    const p = addPlayer(S, cid, String(m.n || 'Temen'), c);
    net.send(cid, { t: 'welcome', id: cid, x: p.x, z: p.z });
    net.send(cid, makeView(S));
    emit({ f: 'toast', s: `${p.n} gabung ke warung!`, k: 'ok' });
    emit({ f: 'sfx', s: 'bell' });
  } else if (m.t === 'pos') setPlayerPos(S, cid, +m.x, +m.z, +m.r, m.m);
  else if (m.t === 'act') act(S, cid, m, emit);
}
function onGuestLeave(cid) {
  if (!S || !S.pl[cid]) return;
  const n = S.pl[cid].n;
  removePlayer(S, cid);
  emit({ f: 'toast', s: `${n} keluar dari room`, k: 'warn' });
}
function emit(fx) { fxQ.push(fx); }
function flushFx() {
  if (!fxQ.length) return;
  const all = fxQ.splice(0);
  const pub = [];
  for (const fx of all) {
    if (fx.f === 'save') { saveSlot(); continue; }
    if (!fx.to || fx.to === myId) handleFx(fx);
    if (net && fx.to && fx.to !== myId) net.send(fx.to, { t: 'fx', l: [fx] });
    else if (!fx.to) pub.push(fx);
  }
  if (net && pub.length) net.broadcast({ t: 'fx', l: pub });
}
function handleFx(fx) {
  if (fx.f === 'toast') ui.toast(fx.s, fx.k, fx.big);
  else if (fx.f === 'float') ui.addFloat(fx);
  else if (fx.f === 'sfx') sfx(fx.s);
  else if (fx.f === 'win') ui.showWin();
}

// ---------- Guest: pesan dari host ----------
function onHostData(m) {
  if (!m || typeof m !== 'object') return;
  if (m.t === 'welcome') { myId = m.id; me.x = m.x; me.z = m.z; if (joinWait) joinWait.res(); }
  else if (m.t === 'snap') view = m;
  else if (m.t === 'fx') for (const fx of m.l || []) handleFx(fx);
  else if (m.t === 'full') { if (joinWait) joinWait.rej(new Error('full')); }
  else if (m.t === 'kick') onHostClose();
}
function onHostClose() {
  if (!inGame) return;
  ui.showInfo('Koneksi putus', 'Host keluar atau sinyal lagi jelek. Progress tetap kesimpen di HP host.', 'Balik ke menu', quitToMenu);
}

function doAct(m) {
  if (role === 'host') act(S, myId, m, emit);
  else if (net) net.send({ t: 'act', ...m });
}

// ---------- Input ----------
const keys = new Set();
addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (!inGame) return;
  if (k === 'e' || k === ' ' || k === 'enter') { if (!keys.has('act')) actPress(); keys.add('act'); return; }
  if (k === 'q') { doAct({ a: 'drop' }); return; }
  if (k === 'h' || k === 'tab') { e.preventDefault(); ui.phoneOpen() ? ui.closePhone() : ui.openPhone(); return; }
  if (k === 'escape') { ui.closePhone(); return; }
  keys.add(k);
});
addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (k === 'e' || k === ' ' || k === 'enter') { keys.delete('act'); actRelease(); } keys.delete(k); });
addEventListener('blur', () => { keys.clear(); joy.on = false; actHeld = false; });
// joystick (sentuh / tarik mouse di area kosong)
const joy = { on: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
const joyEl = $('joy'), knob = $('knob');
addEventListener('pointerdown', e => {
  unlockAudio();
  if (!inGame || joy.on) return;
  if (e.target.closest('button,.sheet,.ov,.missions,input,textarea')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (touch && e.clientX > innerWidth * 0.6) return;
  joy.on = true; joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0;
  joyEl.hidden = false; joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px'; knob.style.transform = '';
  $('joyHint').hidden = true;
});
addEventListener('pointermove', e => {
  if (!joy.on || e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
  const d = Math.hypot(dx, dy), R = 52;
  if (d > R) { dx = dx / d * R; dy = dy / d * R; }
  joy.x = dx / R; joy.y = dy / R;
  knob.style.transform = `translate(${dx}px,${dy}px)`;
});
const joyEnd = e => { if (joy.on && e.pointerId === joy.id) { joy.on = false; joy.x = joy.y = 0; joyEl.hidden = true; } };
addEventListener('pointerup', joyEnd); addEventListener('pointercancel', joyEnd);
document.addEventListener('gesturestart', e => e.preventDefault());
// tombol aksi
let actHeld = false, holdT = 0, holdId = null, repT = 0, target = null;
const btnAct = $('btnAct');
btnAct.addEventListener('pointerdown', e => { e.preventDefault(); unlockAudio(); actPress(); });
btnAct.addEventListener('pointerup', actRelease); btnAct.addEventListener('pointerleave', actRelease); btnAct.addEventListener('pointercancel', actRelease);
btnAct.addEventListener('contextmenu', e => e.preventDefault());
$('btnDrop').onclick = () => { sfx('tap'); doAct({ a: 'drop' }); };
let pressId = null;
function actPress() {
  actHeld = true; holdT = 0; repT = 0.38;
  pressId = target ? target.id : null;
  if (target && target.ok && !target.hold) { doAct({ a: 'use', id: target.id }); }
  else if (target && !target.ok) sfx('tap');
  holdId = target ? target.id : null;
}
function actRelease() { actHeld = false; holdT = 0; }

// ---------- Loop ----------
let last = performance.now(), fpsN = 0, fpsT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  lastFrameAt = now; bgLast = now;
  const rdt = Math.min(0.25, Math.max(0, (now - last) / 1000)); last = now;
  const dt = Math.min(0.1, rdt);
  fpsN++; if (now - fpsT > 1000) { window.__fps = fpsN; fpsN = 0; fpsT = now; }
  const t = now / 1000;
  if (!inGame || !view && role === 'guest') {
    world.update(null, { dt, t, menu: true });
    if (!inGame) return;
  }
  // gerak
  let ix = 0, iz = 0;
  if (!ui.phoneOpen() && !ui.modalOpen()) {
    if (keys.has('w') || keys.has('arrowup')) iz -= 1;
    if (keys.has('s') || keys.has('arrowdown')) iz += 1;
    if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
    if (keys.has('d') || keys.has('arrowright')) ix += 1;
    if (joy.on) { ix += joy.x; iz += joy.y; }
  }
  const il = Math.hypot(ix, iz);
  const myP = view && view.pl.find(p => p.id === myId);
  if (il > 0.12) {
    const n = Math.min(1, il);
    let sp = 4.4;
    if (myP && myP.bx) sp = 3.5;
    if (view && view.up.sepeda && !inWarung(me.x, me.z)) sp *= 1.3;
    const sub = Math.max(1, Math.ceil(rdt / 0.05));
    for (let i = 0; i < sub; i++) moveCircle(me, ix / il * n * sp * rdt / sub, iz / il * n * sp * rdt / sub, 0.32);
    me.r = Math.atan2(ix, iz); me.m = 1;
  } else me.m = 0;

  if (role === 'host') {
    setPlayerPos(S, myId, me.x, me.z, me.r, me.m);
    let rem = rdt;
    while (rem > 1e-4) { const s = Math.min(0.05, rem); step(S, s, emit); rem -= s; }
    view = makeView(S);
    if (net && now - lastSnap > 100 && net.count() > 0) { lastSnap = now; net.broadcast(view); }
    if (now - lastSave > 60000) saveSlot();
  } else if (net && now - lastPos > 66) { lastPos = now; net.send({ t: 'pos', x: Math.round(me.x * 100) / 100, z: Math.round(me.z * 100) / 100, r: Math.round(me.r * 100) / 100, m: me.m }); }
  if (!view) return;

  // target & tahan
  target = findTarget(view, { x: me.x, z: me.z, ca: myP ? myP.ca : [], bx: myP ? myP.bx : null });
  let holdP = 0;
  if (actHeld && target && target.ok) {
    if (target.hold) {
      if (holdId !== target.id) { holdId = target.id; holdT = 0; }
      holdT += rdt; holdP = holdT / target.hold;
      if (holdT >= target.hold) { doAct({ a: 'use', id: target.id }); holdT = 0; holdId = null; actHeld = false; }
    } else if (target.id === pressId && target.id.startsWith('sh:')) {
      repT -= rdt;
      if (repT <= 0) { repT = 0.24; doAct({ a: 'use', id: target.id }); }
    }
  }
  world.update(view, { dt, t, me, myId });
  ui.update(view, me, target, holdP);
  flushFx();
}
// host tetap jalan walau tab di belakang (selama browser ngizinin timer)
let lastFrameAt = performance.now(), bgLast = performance.now();
setInterval(() => {
  const now = performance.now();
  if (role !== 'host' || !S || now - lastFrameAt < 400) return;
  let rem = Math.min(1.5, (now - bgLast) / 1000); bgLast = now;
  while (rem > 1e-4) { const s = Math.min(0.05, rem); step(S, s, emit); rem -= s; }
  view = makeView(S);
  if (net && net.count() > 0) net.broadcast(view);
  flushFx();
}, 250);
addEventListener('resize', () => world.resize());
addEventListener('orientationchange', () => setTimeout(() => world.resize(), 200));
document.addEventListener('visibilitychange', () => { if (document.hidden && role === 'host') saveSlot(); });
addEventListener('beforeunload', () => { if (role === 'host') saveSlot(); });

// link undangan
const jp = cleanCode(url.searchParams.get('join'));
menuView('main');
if (jp.length === 5) {
  // diundang: satu tap langsung gabung
  const bj = $('btnJoinOpen'), bh = $('btnHost');
  bj.textContent = 'Gabung ke room ' + jp;
  bj.className = 'btn'; bh.className = 'btn ghost'; bh.textContent = 'Bikin room sendiri aja';
  bj.parentNode.insertBefore(bj, bh);
  bj.onclick = () => { unlockAudio(); sfx('tap'); myName(); startGuest(jp); };
  status('Kamu diundang ke room ' + jp + '. Isi nama, terus tap Gabung!', true);
}
if (LOCAL) window.__wk = { me, S: () => S, view: () => view, doAct, target: () => target };
requestAnimationFrame(frame);
