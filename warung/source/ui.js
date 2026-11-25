// ===== UI: HUD, panel warung, kresek, dialog, HP, modal =====
import { ITEMS, IKEYS, TIERS, UPG, LVXP, MAXLV, HOUSES, PLACES, METER, LANE_Z, ZONES, HARI, CATS, rp, rpShort, clock, priceOf, capOf, isUnlocked, placeName, BAG_CAP } from './data.js';
import { PCOLORS } from './world.js';

const $ = id => document.getElementById(id);
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hex = n => '#' + n.toString(16).padStart(6, '0');
const hh = h => String(Math.floor(h)).padStart(2, '0') + '.' + (h % 1 ? '30' : '00');

export function createUI(ctx) {
  const L = $('labels');
  const pool = new Map();
  const floats = [];
  let phoneTab = 'belanja', phoneOpen = false, lastPhoneRender = 0;
  let modalKind = null, sumShownDay = -1, offerShown = 0, misMin = matchMedia('(max-width:760px)').matches, sideMin = misMin;
  const dlgQ = [];
  const seenTips = new Set(JSON.parse(localStorage.getItem('wk_tips') || '[]'));

  // ---------- label 3D ----------
  function label(id, html, cls, x, y, z, edge, onTap) {
    let o = pool.get(id);
    if (!o) {
      const el = document.createElement('div'); el.className = 'lb ' + cls; L.appendChild(el);
      o = { el, html: '' }; pool.set(id, o);
      if (onTap) el.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); onTap(); });
    }
    o.used = true;
    if (o.html !== html) { o.el.innerHTML = html; o.html = html; }
    const p = ctx.world.project(x, y, z);
    let sx = p.x, sy = p.y;
    if (edge) {
      const m = 50, W = innerWidth, H = innerHeight;
      if (!p.vis) { sx = W - sx; sy = H / 2; }
      sx = Math.max(m + 40, Math.min(W - m - 40, sx)); sy = Math.max(110, Math.min(H - 140, sy));
    } else if (!p.vis) { o.el.style.display = 'none'; return; }
    o.el.style.display = '';
    o.el.style.transform = `translate(${sx | 0}px,${sy | 0}px) translate(-50%,-100%)`;
  }
  function flushLabels() { for (const [id, o] of pool) { if (!o.used) { o.el.remove(); pool.delete(id); } else o.used = false; } }
  function addFloat(f) { floats.push({ ...f, t0: performance.now() }); if (floats.length > 12) floats.shift(); }
  function moneyFx(s) { const el = document.createElement('div'); el.className = 'moneyfx num'; el.textContent = s; $('hud').appendChild(el); setTimeout(() => el.remove(), 1400); }

  function toast(s, k = 'info', big = false) {
    const box = $('toasts');
    const el = document.createElement('div'); el.className = 'toast ' + k + (big ? ' big' : ''); el.textContent = s;
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => el.remove(), big ? 4200 : 3200);
  }
  function setHTML(el, h) { if (el._h !== h) { el.innerHTML = h; el._h = h; } }

  // ---------- dialog warga ----------
  function dialog(lines) { for (const l of lines) dlgQ.push(l); if ($('dlg').hidden) nextDlg(); }
  function nextDlg() {
    const l = dlgQ.shift();
    if (!l) { $('dlg').hidden = true; return; }
    $('dlg').hidden = false; $('dlgN').textContent = l[0]; $('dlgT').textContent = l[1];
    $('dlgAv').textContent = /Bu|Mbak|Ibu|Teh|Ceu|Tante/.test(l[0]) ? '🧕' : /Pak|Mas|Kang|Bang/.test(l[0]) ? '👳' : '👵';
  }
  $('dlg').addEventListener('pointerdown', e => { e.stopPropagation(); ctx.tap(); nextDlg(); });

  // ---------- tips sekali muncul ----------
  function tip(key, text) {
    if (seenTips.has(key) || modalKind) return;
    seenTips.add(key); try { localStorage.setItem('wk_tips', JSON.stringify([...seenTips])); } catch (e) {}
    modal(`<p>${esc(text)}</p><div class="row2"><button class="gb" id="mOk">Mengerti</button></div>`, 'tip');
    $('mOk').onclick = () => { ctx.tap(); closeModal(); };
  }

  // ---------- HUD ----------
  let prevKey = '';
  function update(v, me, target, hold, boxHold) {
    if (!v) return;
    const my = v.pl.find(p => p.id === ctx.myId());
    const inside = !!(my && my.w);
    $('hClock').textContent = v.ph === 'sum' ? 'Tutup' : clock(v.tm);
    $('hDay').textContent = HARI[(v.day - 1) % 7] + ', hari ' + v.day;
    const st = Math.round(v.rating * 2) / 2;
    setHTML($('hStars'), [1, 2, 3, 4, 5].map(i => i <= st ? '<i>★</i>' : i - 0.5 === st ? '<i style="opacity:.55">★</i>' : '★').join(''));
    const en = my ? my.en : 100;
    $('hEnL').textContent = 'Energi ' + en + '%';
    $('hEn').style.width = en + '%';
    $('hEn').style.background = en < 25 ? 'linear-gradient(#ff8a7a,#c0281c)' : '';
    $('hLv').textContent = v.lv;
    const a = LVXP[v.lv - 1] || 0, b = LVXP[v.lv] || a;
    $('hXp').textContent = v.lv >= MAXLV ? 'Maks' : `${v.xp - a}/${b - a} XP`;
    $('hMoney').textContent = rp(v.money);
    $('hCode').textContent = ctx.code(); $('hPl').textContent = v.pl.length + ' org';
    $('shopUI').hidden = !inside; $('streetUI').hidden = inside;
    const offers = v.jobs.filter(j => !j.acc).length + (v.offer ? 1 : 0);
    for (const id of ['hpBadge', 'hpBadge2']) { $(id).hidden = !offers; $(id).textContent = offers; }
    if (inside) renderShop(v, my, boxHold); else renderStreet(v, me, target, hold);
    $('nextDayBtn').hidden = !(v.ph === 'sum' && modalKind !== 'sum');
    if (v.ph === 'sum' && v.sum && sumShownDay !== v.day) { sumShownDay = v.day; showSummary(v); }
    if (v.ph !== 'sum' && modalKind === 'sum') closeModal();
    if (v.offer && offerShown !== v.offer.id && !modalKind) { offerShown = v.offer.id; showOffer(v.offer); }
    if (!v.offer && modalKind === 'offer') closeModal();
    if (phoneOpen && performance.now() - lastPhoneRender > 400) renderPhone(v);
    drawLabels(v, me, inside);
    if (inside) {
      if (v.cu.some(c => c.st === 'slot')) tip('serve', 'Pembeli dateng! Baca pesanannya di nota kuning, tap barangnya di panel biar masuk kresek, terus tap kreseknya buat nyerahin.');
      else tip('enter', 'Ini warung kalian. Panel atas isinya barang jualan: harga di kiri, stok di kanan (angka merah = stok tipis). Tunggu pembeli dateng ya.');
      if (v.bx.length) tip('box', 'Kardus dari kurir udah sampai. Tahan tombol Bongkar buat masukin ke stok.');
    } else if (my) tip('street', 'Kamu lagi di jalan. Geser joystick ke kiri atau kanan buat jalan. Rumah warga di kiri, masjid, MegaMart, dan sawah di kanan.');
  }

  // ---------- mode warung ----------
  let shopKey = '';
  function renderShop(v, my, boxHold) {
    const rats = {}; for (const r of v.rt) rats[r.k] = r.id;
    const key = JSON.stringify([v.stock, v.price, v.lv, v.up, rats]);
    if (key !== shopKey) {
      shopKey = key;
      for (const [cat, gid, lid] of [['dapur', 'gDapur', 'lkDapur'], ['camilan', 'gCamilan', 'lkCamilan'], ['pulsa', 'gPulsa', null]]) {
        const ks = IKEYS.filter(k => ITEMS[k].cat === cat);
        const un = ks.filter(k => isUnlocked(k, v.lv, v.up));
        setHTML($(gid), un.map(k => {
          const it = ITEMS[k], s = v.stock[k], dig = it.digital;
          const low = !dig && s <= 2;
          return `<button class="card ${!dig && s <= 0 ? 'empty' : ''}" data-k="${k}"><span class="pr out num">${rp(priceOf(k, v.price[k])).replace('Rp', '')}</span>${dig ? '' : `<span class="st num ${low ? 'low' : ''}">${s}</span>`}<span class="em">${it.i}</span><span class="nm2 out">${it.n}</span>${rats[k] ? `<span class="rat" data-rat="${rats[k]}">🐭</span>` : ''}</button>`;
        }).join(''));
        if (lid) $(lid).textContent = ks.length - un.length ? `${ks.length - un.length} terkunci` : '';
      }
      $('pPulsa').hidden = !IKEYS.some(k => ITEMS[k].cat === 'pulsa' && isUnlocked(k, v.lv, v.up));
    }
    // nota pesanan
    const slots = v.cu.filter(c => c.st === 'slot').sort((a, b) => a.sl - b.sl);
    let nh = '';
    if (!slots.length) nh = `<div class="note"><h4>PESANAN</h4><div class="wait">Menunggu pembeli…</div></div>`;
    for (const c of slots) {
      const lines = c.ord.map(([k, q]) => { const rem = (c.or.find(e => e[0] === k) || [k, 0])[1]; return `<div class="ln ${rem === 0 ? 'ok' : ''}"><span>${ITEMS[k].i} ${ITEMS[k].n}</span><span class="num">${q - rem}/${q}</span></div>`; }).join('');
      const p = c.p, col = p > 0.6 ? '#2fae4a' : p > 0.3 ? '#e08a12' : '#e2483d';
      nh += `<div class="note ${c.bulk ? 'bulk' : ''}" data-cu="${c.id}"><h4>${c.bulk ? 'BORONGAN' : 'PESANAN'}</h4><div class="who">${esc(c.nm)}</div>${lines}` +
        (c.ask ? `<div class="ask"><button class="gb" data-debt="${c.id}" data-ok="1">Kasih utang</button><button class="db" style="color:#2a1a10;border-color:#8a5a12" data-debt="${c.id}" data-ok="0">Tolak halus</button></div>` : `<div class="pb"><i style="width:${(p * 100) | 0}%;background:${col}"></i></div>`) + `</div>`;
    }
    setHTML($('notes'), nh);
    // kresek
    const bag = my ? my.bag : [];
    setHTML($('bagItems'), bag.map((k, i) => `<button data-bi="${i}" aria-label="Balikin ${ITEMS[k].n}">${ITEMS[k].i}</button>`).join(''));
    $('bagHint').textContent = bag.length ? `Tap buat nyerahin (${bag.length})` : 'Kresek kosong';
    $('bag').classList.toggle('full', bag.length > 0);
    // kardus & istirahat
    $('btnBox').hidden = !v.bx.length;
    if (v.bx.length) { $('boxL').textContent = `Bongkar (${v.bx.length})`; $('boxHf').style.width = (boxHold * 100) + '%'; $('btnBox').classList.add('hot'); }
    $('btnEat').classList.toggle('hot', !!my && my.en < 35);
  }
  // klik panel barang
  for (const gid of ['gDapur', 'gCamilan', 'gPulsa']) $(gid).addEventListener('pointerdown', e => {
    const r = e.target.closest('[data-rat]');
    if (r) { e.preventDefault(); ctx.act({ a: 'use', id: 'rt:' + r.dataset.rat }); return; }
    const b = e.target.closest('[data-k]'); if (!b) return;
    e.preventDefault(); ctx.act({ a: 'use', id: 'sh:' + b.dataset.k }); ctx.tapPick();
  });
  $('notes').addEventListener('pointerdown', e => {
    const d = e.target.closest('[data-debt]');
    if (d) { e.preventDefault(); ctx.tap(); ctx.act({ a: 'debt', id: +d.dataset.debt, ok: d.dataset.ok === '1' }); return; }
    const n = e.target.closest('[data-cu]'); if (n) { ctx.act({ a: 'give', pref: +n.dataset.cu }); }
  });
  $('bag').addEventListener('pointerdown', e => {
    e.preventDefault();
    const b = e.target.closest('[data-bi]');
    if (b) { ctx.act({ a: 'bag', i: +b.dataset.bi }); ctx.tap(); return; }
    ctx.act({ a: 'give' });
  });
  $('btnExit').onclick = () => { ctx.tap(); ctx.act({ a: 'exit' }); };
  $('btnEat').onclick = () => {
    ctx.tap(); const v = ctx.view(); if (!v) return;
    const k = ['kopi', 'mieg', 'mier', 'roti', 'teh', 'air'].find(x => v.stock[x] > 0);
    if (!k) return toast('Nggak ada stok buat dimakan', 'warn');
    ctx.act({ a: 'eat', k });
  };
  for (const b of document.querySelectorAll('[data-hp]')) b.addEventListener('click', () => { ctx.tap(); openPhone(b.dataset.hp); });

  // ---------- mode jalan ----------
  function renderStreet(v, me, target, hold) {
    const s = v.ms.s;
    let h = '';
    if (s) {
      const prog = s.money ? `${rpShort(s.c)}/${rpShort(s.g)}` : s.rating ? `${s.c.toFixed(1).replace('.', ',')}/${s.g.toFixed(1).replace('.', ',')}` : `${Math.floor(s.c)}/${s.g}`;
      h += `<button class="hd" data-min="m"><span style="color:var(--gold2)">◆</span> MISI <span class="c num">${s.i + 1}/${s.n}</span></button>
        <div style="margin-top:4px"><span class="tag">MISI UTAMA</span><span class="ti">${esc(s.ti)}</span> <span class="num" style="font-size:12px;color:var(--mut)">${prog}</span></div>
        <div class="pb"><i style="width:${Math.min(100, s.c / s.g * 100)}%"></i></div><div class="de">${esc(s.de)}</div>`;
    } else h += `<div class="hd">◆ MISI</div><div class="de">Semua misi cerita beres. Bebas main!</div>`;
    h += '<div class="dls">' + v.ms.d.map(d => `<div class="dl ${d.ok ? 'ok' : ''}"><span>${d.ok ? '✓ ' : ''}${esc(d.ti)}</span><span class="num">${d.ok ? '+' + rpShort(d.rw) : d.end ? 'kabur ' + d.c + '/' + d.g : d.money ? rpShort(d.c) + '/' + rpShort(d.g) : d.c + '/' + d.g}</span></div>`).join('') + '</div>';
    $('mis').classList.toggle('min', misMin); setHTML($('mis'), h);
    const hr = v.tm / 60;
    let sh = `<button class="hd" data-min="s" style="width:100%;text-align:left"><h5>Kerja sampingan ${sideMin ? '▸' : '▾'}</h5></button>`;
    sh += v.side.map(x => `<div class="sj ${x.done ? 'done' : ''}"><span class="pay num">${x.done ? '✓' : rpShort(x.pay)}</span><b>${esc(x.ti)}</b><small>🕘 ${hh(x.from)}–${hh(x.to)} · ${esc(placeName(x.loc))}${x.done ? ' · beres' : hr > x.to ? ' · lewat' : ''}</small></div>`).join('');
    $('sidePanel').classList.toggle('min', sideMin); setHTML($('sidePanel'), sh);
    const btn = $('btnAct');
    const key = target ? target.id + target.l + target.ok : '';
    if (key !== prevKey) { prevKey = key; $('actLabel').textContent = target ? target.l : 'Jalan kiri / kanan'; btn.classList.toggle('off', !target || !target.ok); }
    $('holdFill').style.width = (hold > 0 ? Math.min(100, hold * 100) : 0) + '%';
  }
  $('mis').addEventListener('click', () => { misMin = !misMin; });
  $('sidePanel').addEventListener('click', () => { sideMin = !sideMin; });

  function drawLabels(v, me, inside) {
    const W = ctx.world;
    // nama pemain
    for (const p of v.pl) {
      if (p.w && inside) continue;
      const isMe = p.id === ctx.myId();
      const pos = isMe && !p.w ? me : (W.entPos('pl', p.id) || p);
      label('p' + p.id, `<div class="nm ${isMe ? 'me' : ''}" style="${isMe ? '' : 'background:' + hex(PCOLORS[p.c % PCOLORS.length])}">${esc(p.n)}</div>`, '', pos.x, 2.4, pos.z || LANE_Z);
    }
    // omongan pembeli
    for (const c of v.cu) {
      const pos = W.entPos('cu', c.id) || c;
      const txt = c.say || (c.st === 'slot' ? c.line : '');
      if (!txt) continue;
      label('c' + c.id, `<div class="say out"><b>${esc(c.nm)}:</b> ${esc(txt)}</div>`, '', pos.x, 2.5 * (pos.s || 1) + 0.3, pos.z);
    }
    for (const t of v.th) {
      const pos = W.entPos('th', t.id) || t;
      label('t' + t.id, `<div class="tap red">${t.st === 'steal' && inside ? 'TANGKEP!' : 'MALING!'}</div>`, '', pos.x, 2.6, pos.z, true, () => ctx.act({ a: 'use', id: 'th:' + t.id }));
    }
    if (inside) {
      for (const d of v.dt) if (d.in) label('d' + d.id, `<div class="tap">🧹 Sapu</div>`, '', d.x, 0.6, d.z, false, () => { ctx.act({ a: 'use', id: 'dt:' + d.id }); ctx.sweep(); });
      for (const l of v.lk) if (!l.b) label('l' + l.id, `<div class="tap">💧 Pasang ember · ${l.t}s</div>`, '', l.x, 1.0, l.z, false, () => ctx.act({ a: 'use', id: 'lk:' + l.id }));
      for (const r of v.rt) label('r' + r.id, `<div class="tap red">🐭</div>`, '', r.x, 0.7, r.z, false, () => ctx.act({ a: 'use', id: 'rt:' + r.id }));
    } else {
      // papan nama tempat
      for (const k in HOUSES) label('h' + k, `<div class="plc">${esc(HOUSES[k].n)}</div>`, '', HOUSES[k].x + 1.2, 2.3, 0.2);
      for (const k in PLACES) label('pl' + k, `<div class="plc">${esc(PLACES[k].n)}</div>`, '', PLACES[k].x, 2.6, 0.2);
      label('zw', `<div class="plc" style="background:var(--y);color:var(--ink)">Warung Kompak</div>`, '', 0, 4.4, 0);
      for (const d of v.dt) if (!d.in) label('d' + d.id, `<div class="tap" style="font-size:12px;padding:2px 6px">🧹</div>`, '', d.x, 0.6, d.z, false, () => ctx.act({ a: 'use', id: 'dt:' + d.id }));
      for (const j of v.jobs) if (j.acc) label('j' + j.id, `<div class="tap">📦 ${esc(HOUSES[j.h].n)} · ${j.it.map(([k, q]) => ITEMS[k].i + '×' + q).join(' ')} · ${j.t}s</div>`, '', HOUSES[j.h].x + 1.2, 3.4, LANE_Z, true);
      if (!v.power) label('pw', `<div class="tap red">⚡ Meteran listrik</div>`, '', METER.x, 2.8, 0.4, true);
      const s = v.ms.s;
      if (s && s.place && !(v.talk || {})[s.place]) label('ms', `<div class="tap">❗ ${esc(placeName(s.place))}</div>`, '', HOUSES[s.place].x + 1.2, 3.6, 0.4, true);
    }
    const now = performance.now();
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i], k = (now - f.t0) / 1600;
      if (k >= 1) { floats.splice(i, 1); continue; }
      label('f' + f.t0 + i, `<div class="fl out" style="color:${esc(f.c || '#fff')};opacity:${(1 - k * k).toFixed(2)}">${esc(f.s)}</div>`, '', f.x, 2.8 + k * 1.2, f.z);
    }
    flushLabels();
  }

  // ---------- HP ----------
  const TABS = [['belanja', 'Belanja online'], ['harga', 'Atur harga'], ['upgrade', 'Upgrade'], ['antar', 'Antar'], ['hutang', 'Buku hutang'], ['misi', 'Misi'], ['celengan', 'Celengan'], ['room', 'Room & save']];
  function openPhone(tab) { if (tab) phoneTab = tab; phoneOpen = true; $('phone').hidden = false; lastPhoneRender = 0; const v = ctx.view(); if (v) renderPhone(v, true); }
  function closePhone() { phoneOpen = false; $('phone').hidden = true; }
  $('phoneClose').onclick = closePhone;
  $('btnMenu').onclick = () => { ctx.tap(); phoneOpen ? closePhone() : openPhone('room'); };
  $('roomChip').onclick = () => { ctx.tap(); openPhone('room'); };
  $('tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; phoneTab = b.dataset.tab; renderPhone(ctx.view(), true); });
  function renderPhone(v, reset) {
    if (!v) return;
    lastPhoneRender = performance.now();
    const offers = v.jobs.filter(j => !j.acc).length;
    setHTML($('tabs'), TABS.map(([k, n]) => `<button data-tab="${k}" class="${k === phoneTab ? 'on' : ''}">${n}${k === 'antar' && offers ? `<span class="b">${offers}</span>` : ''}${k === 'hutang' && v.debts.length ? `<span class="b">${v.debts.length}</span>` : ''}</button>`).join(''));
    $('phoneTitle').textContent = rp(v.money);
    const body = $('phoneBody'), sc = body.scrollTop;
    let h = '';
    if (phoneTab === 'belanja') {
      h += `<div class="note2">Pesen kardus, kurir nganter pakai mobil bak. Bongkar kardusnya di warung.</div>`;
      if (v.orders.length) h += `<div class="sec">Lagi dikirim</div>` + v.orders.map(([k, t]) => `<div class="it"><div class="e">📦</div><div class="t"><b>${ITEMS[k].n}</b><small>${t > 0 ? 'sampai ± ' + t + ' detik' : 'kurir lagi jalan'}</small></div></div>`).join('');
      for (const [cat, cn] of CATS) {
        if (cat === 'pulsa') continue;
        h += `<div class="sec">${cn}</div>`;
        for (const k of IKEYS) {
          const it = ITEMS[k]; if (it.cat !== cat) continue;
          const unl = isUnlocked(k, v.lv, v.up), cost = it.c * it.box;
          const why = v.lv < it.lv ? `Kebuka di Level ${it.lv}` : it.need && !v.up[it.need] ? `Butuh ${UPG[it.need].n}` : '';
          h += `<div class="it" style="${unl ? '' : 'opacity:.45'}"><div class="e">${it.i}</div><div class="t"><b>${it.n}</b><small>${unl ? `Stok ${v.stock[k]}/${capOf(k, v.up)} · isi ${it.box} · ${rp(cost)}` : why}</small></div>${unl ? `<button class="yb" style="min-height:38px;font-size:14px;padding:4px 12px" data-a="buy" data-k="${k}" ${v.money < cost ? 'disabled' : ''}>Pesen</button>` : ''}</div>`;
        }
      }
    } else if (phoneTab === 'harga') {
      h += `<div class="note2">Murah bikin pembeli lebih sabar & reputasi naik. Mahal untungnya gede, tapi pembeli cepet bete.</div>`;
      for (const k of IKEYS) {
        if (!isUnlocked(k, v.lv, v.up) || ITEMS[k].fixed) continue;
        const it = ITEMS[k];
        h += `<div class="it"><div class="e">${it.i}</div><div class="t"><b>${it.n}</b><small>Modal ${rp(it.c)}</small></div><div class="seg">${TIERS.map((T, i) => `<button data-a="price" data-k="${k}" data-t="${i}" class="${v.price[k] === i ? 'on' : ''}">${T.n}<br>${rpShort(priceOf(k, i))}</button>`).join('')}</div></div>`;
      }
    } else if (phoneTab === 'upgrade') {
      for (const k in UPG) {
        const u = UPG[k], own = v.up[k], lock = v.lv < u.lv;
        h += `<div class="it" style="${lock ? 'opacity:.5' : ''}"><div class="t"><b>${u.n}</b><small>${u.d}</small><small>${own ? 'Udah kepasang' : lock ? 'Kebuka di Level ' + u.lv : rp(u.p)}</small></div>${own ? '<span style="font-size:22px">✅</span>' : lock ? '' : `<button class="yb" style="min-height:38px;font-size:14px;padding:4px 12px" data-a="upg" data-k="${k}" ${v.money < u.p ? 'disabled' : ''}>Beli</button>`}</div>`;
      }
    } else if (phoneTab === 'antar') {
      h += `<div class="note2">Terima pesanan, masukin barangnya ke kresek di warung, terus jalan ke rumahnya. Enaknya: satu jaga warung, satu nganter.</div>`;
      if (!v.jobs.length) h += `<div class="note2" style="margin-top:14px">Belum ada pesanan.</div>`;
      for (const j of v.jobs) {
        const need = j.it.map(([k, q]) => ITEMS[k].i + '×' + q).join('  ');
        h += `<div class="it"><div class="e">🏠</div><div class="t"><b>${esc(HOUSES[j.h].n)}</b><small>${need} · dibayar ${rp(j.rw)}</small><small>${j.acc ? 'Sisa ' + j.t + ' detik' : j.forced ? 'Pesanan misi' : 'Berlaku ' + j.t + ' detik'}</small></div>${j.acc ? '<span>✅</span>' : `<button class="yb" style="min-height:38px;font-size:14px;padding:4px 12px" data-a="job" data-id="${j.id}">Terima</button>`}</div>`;
      }
    } else if (phoneTab === 'hutang') {
      h += `<div class="note2">Warga yang ngutang bakal bayar pas jatuh tempo (biasanya). Kalau 3 kali molor, utangnya diikhlasin.</div>`;
      if (!v.debts.length) h += `<div class="note2" style="margin-top:14px">Buku hutang masih bersih.</div>`;
      for (const d of v.debts) h += `<div class="it"><div class="e">📒</div><div class="t"><b>${esc(d.n)}</b><small>Jatuh tempo ${HARI[(d.due - 1) % 7]} (hari ${d.due})</small></div><b class="num">${rp(d.amt)}</b></div>`;
      if (v.debts.length) h += `<div class="it"><div class="t"><b>Total piutang</b></div><b class="num">${rp(v.debts.reduce((a, d) => a + d.amt, 0))}</b></div>`;
    } else if (phoneTab === 'misi') {
      const s = v.ms.s;
      if (s) h += `<div class="sec">Misi utama ${s.i + 1} dari ${s.n}</div><div class="it"><div class="t"><b>${esc(s.ti)}</b><small>${esc(s.de)}</small></div></div>`;
      h += `<div class="sec">Misi harian</div>` + v.ms.d.map(d => `<div class="it"><div class="e">${d.ok ? '✅' : '📝'}</div><div class="t"><b>${esc(d.ti)}</b><small>${d.ok ? 'Beres!' : d.end ? 'Dicek pas tutup · kabur ' + d.c : d.money ? rpShort(d.c) + ' / ' + rpShort(d.g) : d.c + ' / ' + d.g} · hadiah ${rp(d.rw)}</small></div></div>`).join('');
      h += `<div class="sec">Rintangan</div><div class="note2">🦹 Maling: tap "Tangkep" pas dia nyolong, atau kejar di jalan.<br>🐭 Tikus: tap tikusnya.<br>💧 Atap bocor pas hujan: tap buat pasang ember.<br>⚡ Mati lampu: benerin di meteran kiri warung.<br>😤 Pembeli rewel suka ganti pesanan.<br>🧹 Kotoran bikin reputasi turun.<br>🏪 MegaMart promo: pembeli sepi kalau reputasi jelek.<br>🛵 Kurir telat: pesen stok lebih awal.<br>☕ Energi abis: istirahat (ngopi/makan) di warung.</div>`;
    } else if (phoneTab === 'celengan') {
      const g = 1e7;
      h += `<div class="sec">Celengan renovasi warung</div><div class="big num" style="letter-spacing:0">${rp(v.cel)}</div><div class="pbar"><i style="width:${Math.min(100, v.cel / g * 100)}%"></i></div><div class="note2" style="margin-top:6px">Target ${rp(g)} buat ngerenov warung jadi toko kelontong. Sisain modal buat stok ya.</div>`;
      h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">` + [50000, 100000, 250000, 500000].map(n => `<button class="gb" data-a="cel" data-n="${n}" ${v.money < n ? 'disabled' : ''}>+ ${rpShort(n)}</button>`).join('') + `</div>`;
      const all = Math.max(0, v.money - 100000);
      h += `<button class="yb" style="width:100%;margin-top:8px" data-a="cel" data-n="${all}" ${all <= 0 ? 'disabled' : ''}>Tabung semua, sisain Rp100rb</button>`;
    } else if (phoneTab === 'room') {
      const host = ctx.role() === 'host';
      h += `<div class="sec">Kode room</div><div class="big num">${esc(ctx.code())}</div>`;
      if (ctx.online()) h += `<button class="yb" style="width:100%" data-x="invite">Salin link undangan</button><div class="note2" style="margin-top:6px">Kirim link ini ke temen. Dia tinggal buka terus tap Gabung.</div>`;
      else h += `<div class="note2">Mode offline, temen nggak bisa gabung.</div>`;
      h += `<div class="sec">Pemain (${v.pl.length}/4)</div>` + v.pl.map(p => `<div class="it"><div class="e"><span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:${hex(PCOLORS[p.c % PCOLORS.length])}"></span></div><div class="t"><b>${esc(p.n)}${p.id === ctx.myId() ? ' (kamu)' : ''}</b><small>${p.id === 'host' ? 'Host' : 'Temen'} · ${p.w ? 'jaga warung' : 'di jalan'} · energi ${p.en}%</small></div></div>`).join('');
      h += `<div class="sec">Save</div>`;
      if (host) h += `<div class="note2">Otomatis kesimpen tiap warung tutup & tiap 1 menit (slot ${ctx.slot()}).</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><button class="gb" data-x="save">Simpan sekarang</button><button class="db" data-x="export">Salin kode save</button></div><textarea class="inp" id="exportOut" readonly hidden style="margin-top:8px"></textarea>`;
      else h += `<div class="note2">Progress disimpen di HP/PC host.</div>`;
      h += `<div class="sec">Lainnya</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="db" data-x="mute">${ctx.muted() ? 'Nyalain suara' : 'Matiin suara'}</button><button class="db" data-x="tips">Ulang tutorial</button></div><button class="db" style="width:100%;margin-top:10px;border-color:#ff6b5b" data-x="quit">Keluar ke menu</button>`;
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
      ctx.act(m); setTimeout(() => renderPhone(ctx.view()), 150); return;
    }
    const x = b.dataset.x;
    if (x === 'invite') ctx.copyInvite(b);
    if (x === 'save') { ctx.saveNow(); b.textContent = 'Kesimpen ✓'; }
    if (x === 'export') { const s = ctx.exportSave(); const t = $('exportOut'); if (t) { t.hidden = false; t.value = s; t.select(); } copyText(s).then(ok => { b.textContent = ok ? 'Kode kesalin ✓' : 'Salin manual di bawah'; }); }
    if (x === 'mute') { ctx.toggleMute(); renderPhone(ctx.view(), false); }
    if (x === 'tips') { seenTips.clear(); try { localStorage.removeItem('wk_tips'); } catch (er) {} closePhone(); }
    if (x === 'quit') { if (b.dataset.sure) ctx.quit(); else { b.dataset.sure = 1; b.textContent = ctx.role() === 'host' ? 'Yakin? Room bakal ditutup' : 'Yakin keluar?'; } }
  });

  // ---------- modal ----------
  function modal(html, kind) { modalKind = kind; $('modalCard').innerHTML = html; $('modal').hidden = false; }
  function closeModal() { modalKind = null; $('modal').hidden = true; }
  function showOffer(o) {
    modal(`<span class="pill hd">Pesanan borongan</span><p><b>${esc(o.n)}</b> datang bawa kantong gede:</p><p style="color:#ffe9a8">"Buat ${esc(o.why.replace(/^buat /, ''))}, saya mau borong ${o.it.map(([k, q]) => `${q} ${ITEMS[k].n.toLowerCase()}`).join(', ')}."</p><p>Total <b>${rp(o.total)}</b> + tip. Siapin stoknya ya.</p><div class="row2"><button class="yb" id="oNo">Tolak halus</button><button class="yb" id="oYes">Terima</button></div>`, 'offer');
    $('oNo').onclick = () => { ctx.tap(); ctx.act({ a: 'offer', id: o.id, ok: false }); closeModal(); };
    $('oYes').onclick = () => { ctx.tap(); ctx.act({ a: 'offer', id: o.id, ok: true }); closeModal(); };
  }
  function showSummary(v) {
    const s = v.sum;
    modal(`<span class="pill hd">Hari ${s.day} beres</span>
      <div class="sumg num"><span>Omzet</span><b>${rp(s.rev)}</b><span>Belanja stok & upgrade</span><b>-${rp(s.spent)}</b><span>Sewa & listrik</span><b>-${rp(s.rent)}</b>${s.bonus ? `<span>Bonus misi</span><b>+${rp(s.bonus)}</b>` : ''}
      <span class="tot">Untung bersih</span><b class="tot" style="color:${s.profit >= 0 ? 'var(--money)' : '#ff8a7a'}">${rp(s.profit)}</b></div>
      <div class="sumg num"><span>Pembeli dilayani</span><b>${s.served}</b><span>Pembeli kabur</span><b>${s.lost}</b><span>Reputasi</span><b>★ ${s.rating.toFixed(1).replace('.', ',')}</b><span>Misi harian beres</span><b>${s.done}/3</b></div>
      <div class="row2"><button class="db" id="mStay">Jalan-jalan dulu</button><button class="yb" id="mNext">Buka hari berikutnya</button></div>
      <div class="foot">${ctx.role() === 'host' ? 'Progress udah kesimpen.' : 'Siapa aja di room bisa buka hari berikutnya.'}</div>`, 'sum');
    $('mNext').onclick = () => { ctx.tap(); ctx.act({ a: 'next' }); closeModal(); };
    $('mStay').onclick = () => { ctx.tap(); closeModal(); };
  }
  $('nextDayBtn').onclick = () => { ctx.tap(); ctx.act({ a: 'next' }); };
  function showWin() {
    modal(`<span class="pill hd">Warung Kompak Jaya!</span><p>Celengan penuh! Warung warisan Mbah Sarni resmi jadi <b>Toko Kompak</b>. Warga tetap setia belanja di sini walaupun MegaMart promo terus.</p><p class="note2">Kalian bisa terus main: kejar bintang 5, buka semua upgrade, dan beresin misi harian.</p><div class="row2"><button class="yb" id="mOk">Lanjut main</button></div>`, 'win');
    $('mOk').onclick = () => { ctx.tap(); closeModal(); };
  }
  function showInfo(title, text, btn = 'Oke', cb) {
    modal(`<span class="pill hd">${esc(title)}</span><p>${esc(text)}</p><div class="row2"><button class="yb" id="mOk">${esc(btn)}</button></div>`, 'info');
    $('mOk').onclick = () => { closeModal(); cb && cb(); };
  }

  return { update, toast, addFloat, moneyFx, dialog, openPhone, closePhone, phoneOpen: () => phoneOpen, showWin, showInfo, closeModal, modalOpen: () => !!modalKind || !$('dlg').hidden,
    reset() { for (const [, o] of pool) o.el.remove(); pool.clear(); floats.length = 0; closePhone(); closeModal(); sumShownDay = -1; $('toasts').innerHTML = ''; dlgQ.length = 0; $('dlg').hidden = true; shopKey = ''; } };
}

export function copyText(s) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(s).then(() => true, () => fallback());
  return Promise.resolve(fallback());
  function fallback() { try { const t = document.createElement('textarea'); t.value = s; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); return ok; } catch (e) { return false; } }
}
