// ===== UI: HUD, label 3D, HP, menu, modal =====
import { ITEMS, IKEYS, TIERS, UPG, LVXP, MAXLV, HOUSES, STATIONS, METER, doorOf, rp, rpShort, clock, priceOf, capOf, isUnlocked, carryCap } from './data.js';
import { PCOLORS } from './world.js';

const $ = id => document.getElementById(id);
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hex = n => '#' + n.toString(16).padStart(6, '0');
const star = r => '★ ' + r.toFixed(1).replace('.', ',');

export function createUI(ctx) {
  const L = $('labels');
  const pool = new Map();
  const floats = [];
  let phoneTab = 'belanja', phoneOpen = false, lastPhoneRender = 0, missionsMin = matchMedia('(max-width:600px)').matches;
  let modalKind = null, sumShownDay = -1, lastJobsSeen = 0;

  // ---------- Label ----------
  function label(id, html, cls, x, y, z, edge) {
    let o = pool.get(id);
    if (!o) { const el = document.createElement('div'); el.className = 'lb ' + cls; L.appendChild(el); o = { el, html: '', cls }; pool.set(id, o); }
    o.used = true;
    if (o.html !== html) { o.el.innerHTML = html; o.html = html; }
    const p = ctx.world.project(x, y, z);
    let sx = p.x, sy = p.y;
    if (edge) {
      const m = 46, W = innerWidth, H = innerHeight;
      const off = !p.vis || sx < m || sx > W - m || sy < m + 40 || sy > H - m;
      if (!p.vis) { sx = W - sx; sy = H - m; }
      if (off) { sx = Math.max(m, Math.min(W - m, sx)); sy = Math.max(m + 60, Math.min(H - 120, sy)); }
      o.el.style.opacity = off ? 0.92 : 1;
    } else if (!p.vis) { o.el.style.display = 'none'; return; }
    o.el.style.display = '';
    o.el.style.transform = `translate(${sx | 0}px,${sy | 0}px) translate(-50%,-100%)`;
  }
  function flushLabels() { for (const [id, o] of pool) { if (!o.used) { o.el.remove(); pool.delete(id); } else o.used = false; } }

  function addFloat(f) { floats.push({ ...f, t0: performance.now() }); if (floats.length > 14) floats.shift(); }

  // ---------- Toast ----------
  function toast(s, k = 'info', big = false) {
    const box = $('toasts');
    const el = document.createElement('div'); el.className = 'toast ' + k + (big ? ' big' : ''); el.textContent = s;
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => el.remove(), big ? 4500 : 3400);
  }

  // ---------- HUD ----------
  let prevTargetKey = '';
  function update(v, me, target, hold) {
    if (!v) return;
    const my = v.pl.find(p => p.id === ctx.myId());
    $('hDay').textContent = 'Hari ' + v.day;
    $('hClock').textContent = v.ph === 'sum' ? 'Tutup' : clock(v.tm);
    $('hMoney').textContent = rp(v.money);
    $('hRating').textContent = star(v.rating);
    $('hLv').textContent = 'Lv ' + v.lv;
    const a = LVXP[v.lv - 1] || 0, b = LVXP[v.lv] || a + 1;
    $('hXp').style.width = (v.lv >= MAXLV ? 100 : Math.min(100, (v.xp - a) / (b - a) * 100)) + '%';
    const wx = [];
    if (v.rain) wx.push('Hujan');
    if (!v.power) wx.push('Mati lampu');
    if (v.promo) wx.push('MegaMart promo');
    $('hWx').hidden = !wx.length; $('hWx').textContent = wx.join(' · ');
    $('hCode').textContent = ctx.code();
    $('hPl').textContent = ' · ' + v.pl.length + ' org';
    renderMissions(v);
    // bawaan
    const cEl = $('carry');
    const ca = my ? my.ca : [], bx = my ? my.bx : null;
    if (bx) { cEl.hidden = false; setHTML(cEl, '📦<small>Kardus ' + ITEMS[bx].n + '</small>'); }
    else if (ca.length) { cEl.hidden = false; setHTML(cEl, ca.map(k => ITEMS[k].i).join('') + `<small>${ca.length}/${carryCap(v.up)}</small>`); }
    else cEl.hidden = true;
    $('btnDrop').hidden = !(bx || ca.length);
    $('btnDrop').lastChild.textContent = bx ? 'Taruh' : 'Balikin';
    // tombol aksi
    const btn = $('btnAct');
    const key = target ? target.id + target.l + target.ok : '';
    if (key !== prevTargetKey) {
      prevTargetKey = key;
      $('actLabel').textContent = target ? target.l : (bx ? 'Bawa ke rak ' + ITEMS[bx].n : ca.length ? 'Kasih ke pembeli' : 'Jalan ke rak / pembeli');
      btn.classList.toggle('off', !target || !target.ok);
    }
    $('holdFill').style.width = (hold > 0 ? Math.min(100, hold * 100) : 0) + '%';
    $('nextDayBtn').hidden = !(v.ph === 'sum' && modalKind !== 'sum');
    // notifikasi antar
    const offers = v.jobs.filter(j => !j.acc).length;
    $('phoneDot').hidden = !offers;
    if (offers > lastJobsSeen && !phoneOpen) {} lastJobsSeen = offers;
    // ringkasan harian
    if (v.ph === 'sum' && v.sum && sumShownDay !== v.day) { sumShownDay = v.day; showSummary(v); }
    if (v.ph !== 'sum' && modalKind === 'sum') closeModal();
    // HP
    if (phoneOpen && performance.now() - lastPhoneRender > 400) renderPhone(v);
    // label
    drawLabels(v, me);
  }
  function setHTML(el, h) { if (el._h !== h) { el.innerHTML = h; el._h = h; } }

  function renderMissions(v) {
    const el = $('missions');
    const s = v.ms.s;
    let h = '';
    if (s) {
      const pct = Math.min(100, s.c / s.g * 100);
      const prog = s.money ? `${rpShort(s.c)} / ${rpShort(s.g)}` : s.rating ? `${s.c.toFixed(1).replace('.', ',')} / ${s.g.toFixed(1).replace('.', ',')}` : `${Math.floor(s.c)}/${s.g}`;
      h += `<button class="hd int" data-min="1"><span><span class="k">Misi ${s.i + 1}/${s.n}</span><br><b>${esc(s.ti)}</b></span><span class="num">${prog}</span></button><div class="pb"><i style="width:${pct}%"></i></div><div class="de">${esc(s.de)}</div>`;
    } else h += `<button class="hd int" data-min="1"><span><span class="k">Semua misi cerita beres</span><br><b>Bebas main, kejar rating ★5</b></span></button>`;
    h += '<div class="dls">';
    for (const d of v.ms.d) {
      const c = d.end ? `kabur ${d.c}/${d.g}` : d.money ? `${rpShort(d.c)}/${rpShort(d.g)}` : `${d.c}/${d.g}`;
      h += `<div class="dl ${d.ok ? 'ok' : ''}"><span>${d.ok ? '✓ ' : ''}${esc(d.ti)}</span><span class="num">${d.ok ? '+' + rpShort(d.rw) : c}</span></div>`;
    }
    h += '</div>';
    el.classList.toggle('min', missionsMin);
    setHTML(el, h);
  }
  $('missions').addEventListener('click', () => { missionsMin = !missionsMin; $('missions').classList.toggle('min', missionsMin); });

  function drawLabels(v, me) {
    const W = ctx.world;
    for (const p of v.pl) {
      const isMe = p.id === ctx.myId();
      const pos = isMe ? me : (W.entPos('pl', p.id) || p);
      label('p' + p.id, `<div class="nm ${isMe ? 'me' : ''}" style="${isMe ? '' : 'background:' + hex(PCOLORS[p.c % PCOLORS.length])}">${esc(p.n)}</div>`, '', pos.x, 2.35, pos.z);
    }
    for (const c of v.cu) {
      if (c.st === 'leave' || (c.st === 'walk' && c.sl < 0)) continue;
      if (c.st !== 'slot' && c.st !== 'queue') continue;
      const pos = W.entPos('cu', c.id) || c;
      const p = c.p, col = p > 0.6 ? '#1f8a5b' : p > 0.3 ? '#e08a12' : '#e2483d';
      const items = c.or.map(([k, q]) => `<span>${ITEMS[k].i}<small>×${q}</small></span>`).join('');
      label('c' + c.id, `<div class="ord ${c.st === 'queue' ? 'q' : ''}"><div class="it">${items}</div><div class="bar"><i style="width:${(p * 100) | 0}%;background:${col}"></i></div></div>`, '', pos.x, 2.25 * (pos.s || 1) + 0.35, pos.z);
    }
    for (const b of v.bx) label('b' + b.id, `<div class="ic">${ITEMS[b.k].i}</div>`, '', b.x, 0.95, b.z);
    for (const t of v.th) { const pos = W.entPos('th', t.id) || t; label('t' + t.id, `<div class="tag red">MALING!</div>`, '', pos.x, 2.5, pos.z, true); }
    for (const r of v.rt) label('r' + r.id, `<div class="tag red">🐭</div>`, '', r.x, 0.8, r.z);
    for (const l of v.lk) if (!l.b) label('l' + l.id, `<div class="tag">💧 bocor ${l.t}s</div>`, '', l.x, 1.4, l.z, true);
    for (const j of v.jobs) if (j.acc) {
      const d = doorOf(j.h);
      const need = j.it.map(([k, q]) => ITEMS[k].i + '×' + q).join(' ');
      label('j' + j.id, `<div class="tag">${esc(HOUSES[j.h].n)} · ${need} · ${j.t}s</div>`, '', d.x, 3.6, d.z, true);
    }
    if (!v.power) label('pw', `<div class="tag red">⚡ Meteran listrik</div>`, '', METER.x, 2.6, METER.z, true);
    const now = performance.now();
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i], k = (now - f.t0) / 1600;
      if (k >= 1) { floats.splice(i, 1); continue; }
      label('f' + f.t0 + i, `<div class="fl" style="color:${esc(f.c || '#fff')};opacity:${(1 - k * k).toFixed(2)}">${esc(f.s)}</div>`, '', f.x, 2.6 + k * 1.4, f.z);
    }
    flushLabels();
  }

  // ---------- HP ----------
  const TABS = [['belanja', 'Belanja'], ['harga', 'Harga'], ['upgrade', 'Upgrade'], ['antar', 'Antar'], ['misi', 'Misi'], ['celengan', 'Celengan'], ['room', 'Room']];
  function openPhone(tab) {
    if (tab) phoneTab = tab;
    phoneOpen = true; $('phone').hidden = false; lastPhoneRender = 0;
    const v = ctx.view(); if (v) renderPhone(v, true);
  }
  function closePhone() { phoneOpen = false; $('phone').hidden = true; }
  $('phoneClose').onclick = closePhone;
  $('btnPhone').onclick = () => (phoneOpen ? closePhone() : openPhone());
  $('tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; phoneTab = b.dataset.tab; renderPhone(ctx.view(), true); });

  function renderPhone(v, reset) {
    if (!v) return;
    lastPhoneRender = performance.now();
    const offers = v.jobs.filter(j => !j.acc).length;
    setHTML($('tabs'), TABS.map(([k, n]) => `<button data-tab="${k}" class="${k === phoneTab ? 'on' : ''}">${n}${k === 'antar' && offers ? `<span class="b">${offers}</span>` : ''}</button>`).join(''));
    $('phoneTitle').textContent = rp(v.money);
    const body = $('phoneBody');
    const sc = body.scrollTop;
    let h = '';
    if (phoneTab === 'belanja') {
      h += `<div class="note">Pesen kardus, kurir naruh di samping kiri warung. Angkat kardusnya terus bawa ke rak yang cocok.</div>`;
      if (v.orders.length) h += `<div class="sec">Lagi dikirim</div>` + v.orders.map(([k, t]) => `<div class="it"><div class="e">📦</div><div class="t"><b>${ITEMS[k].n}</b><small>${t > 0 ? 'sampai ± ' + t + ' detik lagi' : 'kurir lagi jalan'}</small></div></div>`).join('');
      h += `<div class="sec">Barang</div>`;
      for (const k of IKEYS) {
        const it = ITEMS[k], unl = isUnlocked(k, v.lv, v.up), cost = it.c * it.box;
        const why = v.lv < it.lv ? `Kebuka di Level ${it.lv}` : it.need && !v.up[it.need] ? `Butuh upgrade ${UPG[it.need].n}` : '';
        h += `<div class="it" style="${unl ? '' : 'opacity:.5'}"><div class="e">${it.i}</div><div class="t"><b>${it.n}</b><small>${unl ? `Stok ${v.stock[k]}/${capOf(k, v.up)} · isi ${it.box} · ${rp(cost)}` : why}</small></div>${unl ? `<button class="btn" data-a="buy" data-k="${k}" ${v.money < cost ? 'disabled' : ''}>Pesen</button>` : ''}</div>`;
      }
    } else if (phoneTab === 'harga') {
      h += `<div class="note">Murah bikin pembeli lebih sabar & rating naik. Mahal untungnya gede, tapi pembeli cepet bete dan kadang protes.</div>`;
      for (const k of IKEYS) {
        if (!isUnlocked(k, v.lv, v.up)) continue;
        const it = ITEMS[k];
        h += `<div class="it"><div class="e">${it.i}</div><div class="t"><b>${it.n}</b><small>Modal ${rp(it.c)}</small></div><div class="seg">${TIERS.map((T, i) => `<button data-a="price" data-k="${k}" data-t="${i}" class="${v.price[k] === i ? 'on' : ''}">${T.n}<br>${rpShort(priceOf(k, i))}</button>`).join('')}</div></div>`;
      }
    } else if (phoneTab === 'upgrade') {
      for (const k in UPG) {
        const u = UPG[k], own = v.up[k], lock = v.lv < u.lv;
        h += `<div class="it" style="${lock ? 'opacity:.55' : ''}"><div class="t"><b>${u.n}</b><small>${u.d}</small><small>${own ? 'Udah kepasang' : lock ? 'Kebuka di Level ' + u.lv : rp(u.p)}</small></div>${own ? '<button class="btn ghost" disabled>✓</button>' : lock ? '' : `<button class="btn" data-a="upg" data-k="${k}" ${v.money < u.p ? 'disabled' : ''}>Beli</button>`}</div>`;
      }
    } else if (phoneTab === 'antar') {
      h += `<div class="note">Terima pesanan, ambil barangnya dari rak, terus jalan ke rumah yang ada sinar kuning. Enaknya: satu jaga warung, satu nganter.</div>`;
      if (!v.jobs.length) h += `<div class="note" style="margin-top:14px">Belum ada pesanan. Nanti warga ngabarin lewat sini.</div>`;
      for (const j of v.jobs) {
        const need = j.it.map(([k, q]) => ITEMS[k].i + '×' + q).join('  ');
        h += `<div class="it"><div class="e">🏠</div><div class="t"><b>${esc(HOUSES[j.h].n)}</b><small>${need} · bayar ${rp(j.rw)}</small><small>${j.acc ? 'Sisa waktu ' + j.t + ' detik' : j.forced ? 'Pesanan misi' : 'Berlaku ' + j.t + ' detik'}</small></div>${j.acc ? '<button class="btn ghost" disabled>Diterima</button>' : `<button class="btn" data-a="job" data-id="${j.id}">Terima</button>`}</div>`;
      }
    } else if (phoneTab === 'misi') {
      const s = v.ms.s;
      if (s) h += `<div class="sec">Misi cerita ${s.i + 1} dari ${s.n}</div><div class="it"><div class="t"><b>${esc(s.ti)}</b><small>${esc(s.de)}</small></div></div>`;
      h += `<div class="sec">Misi harian (reset tiap hari)</div>` + v.ms.d.map(d => `<div class="it"><div class="e">${d.ok ? '✅' : '📝'}</div><div class="t"><b>${esc(d.ti)}</b><small>${d.ok ? 'Beres!' : d.end ? 'Dicek pas warung tutup · kabur ' + d.c : d.money ? rpShort(d.c) + ' / ' + rpShort(d.g) : d.c + ' / ' + d.g} · hadiah ${rp(d.rw)}</small></div></div>`).join('');
      h += `<div class="sec">Rintangan yang bisa muncul</div>
      <div class="note">🦹 <b>Maling</b>: nyolong dari rak, tabrak sebelum kabur.<br>🐭 <b>Tikus</b>: makan stok, deketin buat ngusir.<br>💧 <b>Atap bocor</b> pas hujan: pasang ember sebelum barang basah.<br>⚡ <b>Mati lampu</b>: benerin di meteran kanan warung, kulkas bisa rusak.<br>😤 <b>Pembeli rewel</b>: suka ganti pesanan di tengah jalan.<br>🧹 <b>Kotoran</b>: bikin rating turun pelan-pelan.<br>🏪 <b>MegaMart promo</b>: pembeli makin sepi kalau rating jelek.<br>🛵 <b>Kurir telat</b>: jalanan macet, pesen stok lebih awal.</div>`;
    } else if (phoneTab === 'celengan') {
      const g = 5e6, pct = Math.min(100, v.cel / g * 100);
      h += `<div class="sec">Celengan renovasi warung</div><div class="big num" style="letter-spacing:0">${rp(v.cel)}</div><div class="pb" style="height:12px"><i style="width:${pct}%"></i></div><div class="note">Target ${rp(g)} buat ngerenov warung jadi toko kelontong. Uang di celengan nggak bisa dipakai belanja, jadi sisain modal buat stok.</div>`;
      h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">` + [50000, 100000, 250000, 500000].map(n => `<button class="btn" data-a="cel" data-n="${n}" ${v.money < n ? 'disabled' : ''}>+ ${rpShort(n)}</button>`).join('') + `</div>`;
      const all = Math.max(0, v.money - 100000);
      h += `<button class="btn y" style="width:100%;margin-top:8px" data-a="cel" data-n="${all}" ${all <= 0 ? 'disabled' : ''}>Tabung semua, sisain Rp 100rb</button>`;
    } else if (phoneTab === 'room') {
      const host = ctx.role() === 'host';
      h += `<div class="sec">Kode room</div><div class="big num">${esc(ctx.code())}</div>`;
      if (ctx.online()) h += `<button class="btn y" style="width:100%" data-x="invite">Salin link undangan</button><div class="note" style="margin-top:6px">Kirim link ini ke temen. Dia tinggal buka terus tap Gabung.</div>`;
      else h += `<div class="note">Mode offline, temen nggak bisa gabung.</div>`;
      h += `<div class="sec">Pemain (${v.pl.length}/4)</div>` + v.pl.map(p => `<div class="it"><div class="e"><span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:${hex(PCOLORS[p.c % PCOLORS.length])}"></span></div><div class="t"><b>${esc(p.n)}${p.id === ctx.myId() ? ' (kamu)' : ''}</b><small>${p.id === 'host' ? 'Host' : 'Temen'}</small></div></div>`).join('');
      h += `<div class="sec">Save</div>`;
      if (host) h += `<div class="note">Game disimpen otomatis tiap warung tutup & tiap 1 menit di slot ${ctx.slot()}.</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><button class="btn" data-x="save">Simpan sekarang</button><button class="btn ghost" data-x="export">Salin kode save</button></div><textarea class="inp" id="exportOut" readonly hidden style="margin-top:8px"></textarea>`;
      else h += `<div class="note">Progress disimpen di HP/PC host.</div>`;
      h += `<div class="sec">Lainnya</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn ghost" data-x="unstuck">Pindahin aku ke warung</button><button class="btn ghost" data-x="mute">${ctx.muted() ? 'Nyalain suara' : 'Matiin suara'}</button></div><button class="btn r" style="width:100%;margin-top:10px" data-x="quit">Keluar ke menu</button>`;
    }
    if (body._h !== h || reset) { body.innerHTML = h; body._h = h; }
    body.scrollTop = reset ? 0 : sc;
  }
  $('phoneBody').addEventListener('click', e => {
    const b = e.target.closest('[data-a],[data-x]');
    if (!b || b.disabled) return;
    ctx.tap();
    if (b.dataset.a) {
      const m = { a: b.dataset.a };
      if (b.dataset.k) m.k = b.dataset.k;
      if (b.dataset.t !== undefined) m.t = +b.dataset.t;
      if (b.dataset.id) m.id = +b.dataset.id;
      if (b.dataset.n) m.n = +b.dataset.n;
      ctx.act(m);
      setTimeout(() => renderPhone(ctx.view()), 150);
      return;
    }
    const x = b.dataset.x;
    if (x === 'invite') ctx.copyInvite(b);
    if (x === 'save') { ctx.saveNow(); b.textContent = 'Kesimpen ✓'; }
    if (x === 'export') { const s = ctx.exportSave(); const t = $('exportOut'); if (t) { t.hidden = false; t.value = s; t.select(); } copyText(s).then(ok => { b.textContent = ok ? 'Kode kesalin ✓' : 'Salin manual di bawah'; }); }
    if (x === 'unstuck') { ctx.unstuck(); closePhone(); }
    if (x === 'mute') { ctx.toggleMute(); renderPhone(ctx.view(), false); }
    if (x === 'quit') { if (b.dataset.sure) ctx.quit(); else { b.dataset.sure = 1; b.textContent = ctx.role() === 'host' ? 'Yakin? Room bakal ditutup' : 'Yakin keluar?'; } }
  });

  // ---------- Modal ----------
  function modal(html, kind) { modalKind = kind; $('modalCard').innerHTML = html; $('modal').hidden = false; }
  function closeModal() { modalKind = null; $('modal').hidden = true; }
  function showSummary(v) {
    const s = v.sum;
    modal(`<div class="logo"><h1 style="font-size:38px">Hari ${s.day}<br><span>beres!</span></h1></div>
      <div class="sumg num"><span>Omzet</span><b>${rp(s.rev)}</b><span>Belanja stok & upgrade</span><b>-${rp(s.spent)}</b><span>Sewa & listrik</span><b>-${rp(s.rent)}</b>${s.bonus ? `<span>Bonus misi</span><b>+${rp(s.bonus)}</b>` : ''}
      <span class="tot">Untung bersih</span><b class="tot" style="color:${s.profit >= 0 ? 'var(--g)' : 'var(--r)'}">${rp(s.profit)}</b></div>
      <div class="sumg num"><span>Pembeli dilayani</span><b>${s.served}</b><span>Pembeli kabur</span><b>${s.lost}</b><span>Rating</span><b>${star(s.rating)}</b><span>Misi harian beres</span><b>${s.done}/3</b></div>
      <div class="cta"><button class="btn" id="mNext">Buka hari berikutnya</button><button class="btn ghost" id="mStay">Jalan-jalan dulu</button></div>
      <div class="foot">${ctx.role() === 'host' ? 'Progress udah kesimpen.' : 'Siapa aja di room bisa buka hari berikutnya.'}</div>`, 'sum');
    $('mNext').onclick = () => { ctx.tap(); ctx.act({ a: 'next' }); closeModal(); };
    $('mStay').onclick = () => { ctx.tap(); closeModal(); };
  }
  $('nextDayBtn').onclick = () => { ctx.tap(); ctx.act({ a: 'next' }); };
  function showWin() {
    modal(`<div class="logo"><h1 style="font-size:40px">Warung<br><span>Kompak Jaya!</span></h1></div>
      <p>Celengan penuh! Warung warisan Mbah Sarni resmi jadi <b>Toko Kelontong Kompak</b>. Warga Desa Cempaka tetap belanja di sini walaupun MegaMart buka di seberang.</p>
      <p class="note">Kalian bisa terus main: kejar rating ★5, buka semua upgrade, dan selesain misi harian.</p>
      <div class="cta"><button class="btn" id="mOk">Lanjut main</button></div>`, 'win');
    $('mOk').onclick = () => { ctx.tap(); closeModal(); };
  }
  function showInfo(title, text, btn = 'Oke', cb) {
    modal(`<h2 style="margin:0 0 6px">${esc(title)}</h2><p>${esc(text)}</p><div class="cta"><button class="btn" id="mOk">${esc(btn)}</button></div>`, 'info');
    $('mOk').onclick = () => { closeModal(); cb && cb(); };
  }

  return { update, toast, addFloat, openPhone, closePhone, phoneOpen: () => phoneOpen, showWin, showInfo, closeModal, modalOpen: () => !!modalKind,
    reset() { for (const [, o] of pool) o.el.remove(); pool.clear(); floats.length = 0; closePhone(); closeModal(); sumShownDay = -1; $('toasts').innerHTML = ''; } };
}

export function copyText(s) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(s).then(() => true, () => fallback());
  return Promise.resolve(fallback());
  function fallback() {
    try { const t = document.createElement('textarea'); t.value = s; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); return ok; } catch (e) { return false; }
  }
}
