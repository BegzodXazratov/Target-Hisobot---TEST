/* Target Hisobot — demo. Barcha raqamlar config.js asosida yaratiladi. */
(() => {
'use strict';
const C = window.CLIENT;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = 'th:' + C.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const store = {
  get(k, d) { try { const v = localStorage.getItem(KEY + ':' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(KEY + ':' + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(KEY + ':' + k); } catch {} }
};
const sess = {
  get() { try { return JSON.parse(sessionStorage.getItem(KEY + ':s') || localStorage.getItem(KEY + ':s') || 'null'); } catch { return null; } },
  set(v, remember) { try { sessionStorage.setItem(KEY + ':s', JSON.stringify(v)); if (remember) localStorage.setItem(KEY + ':s', JSON.stringify(v)); } catch {} },
  clear() { try { sessionStorage.removeItem(KEY + ':s'); localStorage.removeItem(KEY + ':s'); } catch {} }
};

/* ---------- formatlash ---------- */
const sep = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const cur = C.currency || '$';
const money = n => n == null || !isFinite(n) ? '—' : (Math.abs(n) < 100 ? cur + n.toFixed(2) : cur + sep(n));
const int = n => n == null || !isFinite(n) ? '—' : sep(n);
const pct = n => n == null || !isFinite(n) ? '—' : (n * 100).toFixed(n < .1 ? 1 : 0) + '%';
const mins = n => n == null || !isFinite(n) ? '—' : n < 60 ? Math.round(n) + ' daq' : (n / 60).toFixed(1) + ' soat';
const x = n => n == null || !isFinite(n) ? '—' : n.toFixed(1) + '×';
const FMT = { money, int, pct, mins, x, num: n => n == null || !isFinite(n) ? '—' : (Math.abs(n) < 100 ? n.toFixed(2) : sep(n)) };

/* ---------- seeded tasodif ---------- */
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = hash(String(seed)); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const noise = (r, amp) => 1 + (r() * 2 - 1) * amp;
const sround = (v, r) => { const f = Math.floor(v); return f + (r() < v - f ? 1 : 0); };

/* ---------- sanalar ---------- */
const pad = n => String(n).padStart(2, '0');
const dstr = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const addDays = (s, k) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + k); return dstr(d); };
const today = () => dstr(new Date());
const MON = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'];
const human = s => { const d = new Date(s + 'T12:00:00'); return d.getDate() + '-' + MON[d.getMonth()]; };

/* ---------- demo ma'lumot ---------- */
const ADW = {}; // har bir reklamaning doimiy "kuchi"
C.campaigns.forEach(c => {
  const names = C.ads[c.id] || ['Reklama 1'];
  const r = rng('ad' + c.id);
  const w = names.map(() => .5 + r()), sw = w.reduce((a, b) => a + b, 0);
  ADW[c.id] = names.map((n, i) => ({ id: c.id + '-' + i, name: n, w: w[i] / sw, cplM: .82 + r() * .4, qM: .9 + r() * .2, cvM: .85 + r() * .3 }));
});
const SW = (() => { const s = C.sellers, t = s.reduce((a, b) => a + b.share, 0); return s.map(x => ({ ...x, share: x.share / t })); })();
// soat bo'yicha faollik (kechqurun ko'p, tunda kam)
const HW = [.25, .15, .1, .08, .08, .12, .25, .5, .8, 1, 1.1, 1.15, 1.2, 1.15, 1.1, 1.1, 1.15, 1.2, 1.35, 1.5, 1.6, 1.5, 1.1, .6];
const HC = (() => { const c = [0]; HW.forEach(w => c.push(c[c.length - 1] + w)); return c.map(v => v / c[24]); })();
const curve = m => { const h = Math.min(23, Math.floor(m / 60)), f = (m - h * 60) / 60; return HC[h] + (HC[h + 1] - HC[h]) * f; };
const curveInv = p => { let h = 0; while (h < 23 && HC[h + 1] < p) h++; const f = (p - HC[h]) / ((HC[h + 1] - HC[h]) || 1); return Math.min(1439, (h + Math.max(0, Math.min(1, f))) * 60); };
const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes() + n.getSeconds() / 60; };
const fullCache = {}, timeCache = {};
function fullDay(ds) {
  if (fullCache[ds]) return fullCache[ds];
  const r = rng('day' + ds), d = new Date(ds + 'T12:00:00'), wd = d.getDay();
  const base = C.monthBudget / 30.4 * (wd === 0 ? .86 : wd === 6 ? .93 : 1.03) * noise(r, .1);
  const ads = [];
  C.campaigns.forEach(c => {
    const cs = base * c.share * noise(r, .14);
    ADW[c.id].forEach(a => {
      const spend = cs * a.w * noise(r, .12);
      const cpl = c.cpl * a.cplM * noise(r, .16);
      const leads = sround(spend / cpl, r);
      const qual = Math.min(leads, sround(leads * c.q * a.qM * noise(r, .1), r));
      const contacted = Math.min(leads, Math.max(qual, sround(leads * (.87 + r() * .09), r)));
      const sales = Math.min(qual, sround(leads * c.conv * a.cvM * noise(r, .25), r));
      const revenue = sales * c.check * (.85 + r() * .3);
      const clicks = Math.round(leads / (.085 + r() * .05));
      const impr = Math.round(clicks / (.011 + r() * .006));
      const calls = sround(leads * (.12 + r() * .08), r);
      ads.push({ camp: c.id, ad: a.id, spend, leads, qual, contacted, sales, revenue, clicks, impr, calls });
    });
  });
  return (fullCache[ds] = { ds, ads });
}
// har bir lid qaysi daqiqada kelgani (kun ichida)
function leadTimes(ds, a) {
  const k = ds + a.ad; if (timeCache[k]) return timeCache[k];
  const r = rng('t' + k), n = a.leads, t = [];
  for (let i = 0; i < n; i++) t.push(curveInv((i + r()) / n));
  return (timeCache[k] = t);
}
function genDay(ds) {
  const t = today();
  if (ds < t) return fullDay(ds);
  if (ds > t) return { ds, ads: [] };
  const F = fullDay(ds), now = nowMin(), cv = curve(now);
  return { ds, ads: F.ads.map(a => {
    const cnt = leadTimes(ds, a).filter(m => m <= now).length, k = a.leads ? cnt / a.leads : cv;
    // sotuv lid kelgandan keyin biroz kechikib yopiladi
    const ks = a.leads ? leadTimes(ds, a).filter(m => m <= now - 90).length / a.leads : 0;
    const sales = Math.floor(a.sales * ks);
    return { camp: a.camp, ad: a.ad, spend: a.spend * cv, leads: cnt, qual: Math.floor(a.qual * k), contacted: Math.floor(a.contacted * Math.max(0, k - .004)),
      sales, revenue: a.sales ? a.revenue * sales / a.sales : 0, clicks: Math.floor(a.clicks * cv), impr: Math.floor(a.impr * cv), calls: Math.floor(a.calls * k) };
  }) };
}
const ZERO = () => ({ spend: 0, leads: 0, qual: 0, contacted: 0, sales: 0, revenue: 0, clicks: 0, impr: 0, calls: 0 });
const addTo = (t, a) => { for (const k in t) t[k] += a[k] || 0; return t; };
function aggregate(from, to) {
  const tot = ZERO(), byDay = [], byCamp = {}, byAd = {};
  for (let ds = from; ds <= to; ds = addDays(ds, 1)) {
    const g = genDay(ds), dt = ZERO();
    g.ads.forEach(a => { addTo(tot, a); addTo(dt, a); addTo(byCamp[a.camp] ||= ZERO(), a); addTo(byAd[a.ad] ||= ZERO(), a); });
    byDay.push({ ds, ...dt });
  }
  // sotuvchilar
  const r = rng('sel' + from + to);
  const cw = SW.map(s => s.share * s.conv), cws = cw.reduce((a, b) => a + b, 0);
  const sellers = SW.map((s, i) => {
    const leads = Math.round(tot.leads * s.share), sales = Math.round(tot.sales * cw[i] / cws);
    return { name: s.name, leads, qual: Math.round(tot.qual * s.share * (.95 + r() * .1)), sales, revenue: tot.sales ? tot.revenue * sales / tot.sales : 0,
      resp: s.resp * (.85 + r() * .3), fast: Math.max(.05, Math.min(.97, 1.08 - s.resp / 22 + (r() - .5) * .06)) };
  });
  tot.resp = tot.leads ? sellers.reduce((a, s) => a + s.resp * s.leads, 0) / tot.leads : null;
  return { tot, byDay, byCamp, byAd, sellers };
}

/* ---------- metrikalar kutubxonasi ---------- */
const div = (a, b) => b ? a / b : null;
const METRICS = [
  { key: 'spend', label: 'Reklama sarfi', fmt: 'money', f: t => t.spend, good: 0, hint: 'Meta Ads' },
  { key: 'leads', label: 'Lidlar', fmt: 'int', f: t => t.leads, good: 1, hint: 'Formadan kelgan arizalar' },
  { key: 'cpl', label: 'Lid narxi', fmt: 'money', f: t => div(t.spend, t.leads), good: -1, hint: 'Sarf ÷ lid' },
  { key: 'qrate', label: 'Sifatli lid ulushi', fmt: 'pct', f: t => div(t.qual, t.leads), good: 1, hint: 'CRM: sotuvchi "sifatli" degan' },
  { key: 'qual', label: 'Sifatli lidlar', fmt: 'int', f: t => t.qual, good: 1, hint: 'CRM' },
  { key: 'cpql', label: 'Sifatli lid narxi', fmt: 'money', f: t => div(t.spend, t.qual), good: -1, hint: 'Sarf ÷ sifatli lid' },
  { key: 'sales', label: 'Sotuvlar', fmt: 'int', f: t => t.sales, good: 1, hint: 'CRM: "Sotildi" bosqichi' },
  { key: 'conv', label: 'Lid → sotuv', fmt: 'pct', f: t => div(t.sales, t.leads), good: 1, hint: 'Sotuv ÷ lid' },
  { key: 'cps', label: 'Bitta sotuv narxi', fmt: 'money', f: t => div(t.spend, t.sales), good: -1, hint: 'Sarf ÷ sotuv' },
  { key: 'revenue', label: 'Sotuv summasi', fmt: 'money', f: t => t.revenue, good: 1, hint: 'CRM: bitim summasi' },
  { key: 'roas', label: 'ROAS', fmt: 'x', f: t => div(t.revenue, t.spend), good: 1, hint: 'Sotuv summasi ÷ sarf' },
  { key: 'check', label: "O'rtacha chek", fmt: 'money', f: t => div(t.revenue, t.sales), good: 1, hint: 'Summa ÷ sotuv' },
  { key: 'contact', label: "Bog'lanilgan lidlar", fmt: 'pct', f: t => div(t.contacted, t.leads), good: 1, hint: "Sotuvchi qo'ng'iroq qilgan" },
  { key: 'resp', label: "O'rtacha javob vaqti", fmt: 'mins', f: t => t.resp, good: -1, hint: 'Lid tushgandan birinchi qo\'ng\'iroqqacha' },
  { key: 'calls', label: "Saytda qo'ng'iroq bosildi", fmt: 'int', f: t => t.calls, good: 1, hint: 'Pixel: Contact' },
  { key: 'ctr', label: 'CTR', fmt: 'pct', f: t => div(t.clicks, t.impr), good: 1, hint: 'Klik ÷ ko\'rish' },
  { key: 'cpc', label: 'Klik narxi', fmt: 'money', f: t => div(t.spend, t.clicks), good: -1, hint: 'Sarf ÷ klik' },
  { key: 'cpm', label: '1000 ko\'rish narxi', fmt: 'money', f: t => div(t.spend * 1000, t.impr), good: -1, hint: 'CPM' },
  { key: 'impr', label: "Ko'rishlar", fmt: 'int', f: t => t.impr, good: 1, hint: 'Meta Ads' },
  { key: 'clicks', label: 'Kliklar', fmt: 'int', f: t => t.clicks, good: 1, hint: 'Meta Ads' }
];
const DEFAULT_METRICS = ['spend', 'leads', 'cpl', 'qrate', 'sales', 'conv', 'cps', 'revenue'];
const VARS = { sarf: 'spend', lid: 'leads', sifatli: 'qual', boglanildi: 'contacted', sotuv: 'sales', daromad: 'revenue', klik: 'clicks', korish: 'impr', qongiroq: 'calls' };
function compileFormula(src) {
  const s = String(src || '').toLowerCase().trim();
  if (!s || s.length > 120 || !/^[a-z0-9_.+\-*/()\s]+$/.test(s)) return null;
  const words = s.match(/[a-z_]+/g) || [];
  if (words.some(w => !(w in VARS))) return null;
  try {
    const fn = new Function(...Object.keys(VARS), '"use strict";return (' + s + ');');
    fn(...Object.keys(VARS).map(() => 1));
    return t => { const v = fn(...Object.values(VARS).map(k => t[k] || 0)); return isFinite(v) ? v : null; };
  } catch { return null; }
}

/* ---------- holat ---------- */
let CFG = Object.assign({ brand: C.brand, accent: C.accent, targetCpl: C.targetCpl, metrics: DEFAULT_METRICS.slice(), custom: [] }, store.get('cfg', {}));
const saveCfg = () => { store.set('cfg', CFG); applyBrand(); };
let USER = null;
let PERIOD = store.get('period', '30');
let TAB = 'umumiy';

function allMetrics() {
  return METRICS.concat(CFG.custom.map(m => ({ key: m.id, label: m.name, fmt: m.fmt, f: compileFormula(m.formula) || (() => null), good: 0, hint: m.formula, custom: true })));
}
function applyBrand() {
  document.documentElement.style.setProperty('--acc', CFG.accent);
  const L = (C.logoText || CFG.brand[0] || 'H').toUpperCase();
  ['#llogo', '#hlogo'].forEach(s => { const e = $(s); if (e) e.textContent = L; });
  $('#lbrand').textContent = CFG.brand;
  $('#hbrand').innerHTML = esc(CFG.brand) + '<small>' + esc(C.tagline) + '</small>';
  document.title = CFG.brand + ' — hisobot';
}

/* ---------- parol (SHA-256) ---------- */
async function sha(s) {
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch { return 'f' + hash(s).toString(16) + hash(s + '#').toString(16); }
}
const passHash = (login, p) => sha(KEY + '|' + login.toLowerCase() + '|' + p);
async function users() {
  let u = store.get('users', null);
  if (!u || !u.length) { u = [{ login: C.defaultLogin, name: 'Administrator', role: 'admin', hash: await passHash(C.defaultLogin, C.defaultPassword) }]; store.set('users', u); }
  return u;
}

/* ---------- davr ---------- */
const PERIODS = [['today', 'Bugun'], ['yest', 'Kecha'], ['7', '7 kun'], ['30', '30 kun'], ['month', 'Bu oy'], ['90', '90 kun']];
function range(p = PERIOD) {
  const t = today();
  if (p === 'today') return { from: t, to: t, prev: { from: addDays(t, -1), to: addDays(t, -1) } };
  if (p === 'yest') { const y = addDays(t, -1); return { from: y, to: y, prev: { from: addDays(y, -1), to: addDays(y, -1) } }; }
  if (p === 'month') { const f = t.slice(0, 8) + '01', n = Math.round((new Date(t) - new Date(f)) / 864e5); return { from: f, to: t, prev: { from: addDays(f, -n - 1), to: addDays(f, -1) } }; }
  const n = +p; return { from: addDays(t, -(n - 1)), to: t, prev: { from: addDays(t, -(2 * n - 1)), to: addDays(t, -n) } };
}
const pLabel = () => (PERIODS.find(p => p[0] === PERIOD) || [0, ''])[1];

/* ---------- komponentlar ---------- */
function delta(m, cur, prev) {
  if (cur == null || prev == null || !prev) return '<div class="d fl">—</div>';
  const ch = (cur - prev) / Math.abs(prev);
  if (Math.abs(ch) < .005) return '<div class="d fl">o\'zgarmadi</div>';
  const better = m.good === 0 ? null : (ch > 0) === (m.good > 0);
  return `<div class="d ${better == null ? 'fl' : better ? 'up' : 'dn'}">${ch > 0 ? '▲' : '▼'} ${Math.abs(ch * 100).toFixed(0)}% <span class="fl" style="font-weight:600">oldingi davrga</span></div>`;
}
function kpiCards(A, P) {
  const map = Object.fromEntries(allMetrics().map(m => [m.key, m]));
  return `<div class="kpis">${CFG.metrics.filter(k => map[k]).map(k => { const m = map[k], v = m.f(A.tot), pv = m.f(P.tot);
    return `<div class="kpi" title="${esc(m.hint)}"><div class="k">${esc(m.label)}${m.custom ? ' <span class="tagc">o\'zim</span>' : ''}</div><div class="v num" data-k="${esc(m.key)}">${FMT[m.fmt](v)}</div>${delta(m, v, pv)}</div>`; }).join('')}</div>`;
}
function verdictOf(cpl) {
  const t = CFG.targetCpl;
  if (cpl == null) return ['Ma\'lumot hali kam', 'var(--mut)'];
  if (cpl <= t) return ['Lid narxi maqsaddan arzon', 'var(--good)'];
  if (cpl <= t * 1.3) return ['Lid narxi maqsadga yaqin', 'var(--warn)'];
  return ['Lid narxi qimmat — tekshirish kerak', 'var(--bad)'];
}
function speedo(cpl) {
  const tgt = CFG.targetCpl, cx = 140, cy = 140, r = 108;
  const P = (t, rr = r) => [cx - rr * Math.cos(Math.PI * t), cy - rr * Math.sin(Math.PI * t)];
  const arc = (a, b, c) => { const [x1, y1] = P(a), [x2, y2] = P(b); return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${c}" stroke-width="16" fill="none" stroke-linecap="butt"/>`; };
  const f = cpl == null ? 0 : Math.min(cpl / (tgt * 2), 1), deg = -90 + 180 * f;
  const col = verdictOf(cpl)[1];
  let ticks = '';
  for (let i = 0; i <= 20; i++) { const t = i / 20, [a, b] = P(t, r - 12), [c, d] = P(t, i % 5 ? r - 20 : r - 26); ticks += `<line x1="${a.toFixed(1)}" y1="${b.toFixed(1)}" x2="${c.toFixed(1)}" y2="${d.toFixed(1)}" stroke="var(--mut)" stroke-width="${i % 5 ? 1 : 2}" opacity=".55"/>`; }
  const lab = (t, s) => { const end = t === 0 || t === 1; const [lx, ly] = end ? [cx - r * Math.cos(Math.PI * t), cy + 22] : [P(t, r + 18)[0], P(t, r + 18)[1] + 4];
    return `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" style="font-size:12px;fill:var(--mut)">${s}</text>`; };
  return `<div class="speedo"><svg viewBox="0 0 280 200" role="img" aria-label="Lid narxi ${money(cpl)}, maqsad ${money(tgt)}">
    ${arc(0, .5, 'var(--good)')}${arc(.5, .65, 'var(--warn)')}${arc(.65, 1, 'var(--bad)')}${ticks}
    ${lab(0, cur + '0')}${lab(.5, 'maqsad ' + money(tgt))}${lab(1, money(tgt * 2) + '+')}
    <g class="ndl" style="--a:${deg}deg"><line x1="${cx}" y1="${cy + 14}" x2="${cx}" y2="${cy - r + 8}" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/></g>
    <circle cx="${cx}" cy="${cy}" r="9" fill="var(--ink)"/><circle cx="${cx}" cy="${cy}" r="3.5" fill="var(--card)"/>
    <text x="${cx}" y="${cy + 50}" text-anchor="middle" style="font-size:36px;font-weight:800;fill:${col};letter-spacing:-1px">${money(cpl)}</text>
    <text x="${cx}" y="${cy + 70}" text-anchor="middle" style="font-size:12px;fill:var(--mut)">o'rtacha lid narxi</text>
  </svg></div>`;
}
function dayChart(days, mode) {
  const W = 760, H = 230, L = 40, R = 40, T = 14, B = 26, n = days.length;
  if (!n) return '';
  const val = d => mode === 'sales' ? d.sales : mode === 'spend' ? d.spend : mode === 'qual' ? d.qual : d.leads;
  const max = Math.max(1, ...days.map(val)) * 1.12;
  const cpls = days.map(d => d.leads ? d.spend / d.leads : null), cmax = Math.max(CFG.targetCpl * 1.6, ...cpls.filter(v => v != null)) * 1.1;
  const bw = (W - L - R) / n, y = v => T + (H - T - B) * (1 - v / max), yc = v => T + (H - T - B) * (1 - v / cmax);
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = max * i / 4, yy = y(v); g += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" stroke="var(--line)"/><text x="${L - 6}" y="${yy + 4}" text-anchor="end">${mode === 'spend' ? cur + sep(v) : sep(v)}</text>`; }
  const step = Math.ceil(n / 8);
  const bars = days.map((d, i) => { const v = val(d), h = (H - T - B) * v / max; return `<rect x="${(L + i * bw + bw * .16).toFixed(1)}" y="${(y(v)).toFixed(1)}" width="${Math.max(1, bw * .68).toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4, bw * .2).toFixed(1)}" fill="var(--acc)" opacity=".85"><title>${human(d.ds)}: ${mode === 'spend' ? money(v) : int(v)}</title></rect>`
    + (i % step === 0 || n <= 8 ? `<text x="${(L + i * bw + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${human(d.ds)}</text>` : ''); }).join('');
  let line = '';
  if (mode === 'leads' && n > 1) {
    const pts = cpls.map((v, i) => v == null ? null : [(L + i * bw + bw / 2).toFixed(1), yc(v).toFixed(1)]).filter(Boolean);
    line = `<line x1="${L}" x2="${W - R}" y1="${yc(CFG.targetCpl)}" y2="${yc(CFG.targetCpl)}" stroke="var(--good)" stroke-dasharray="4 4"/><text x="${W - R + 4}" y="${yc(CFG.targetCpl) + 4}" style="fill:var(--good)">${money(CFG.targetCpl)}</text>`
      + `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="var(--warn)" stroke-width="2.5" stroke-linejoin="round"/>`
      + pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="${n > 40 ? 0 : 2.8}" fill="var(--warn)"/>`).join('');
  }
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Kunlik grafik">${g}${bars}${line}</svg></div>
  <div class="legend"><span><b style="background:var(--acc)"></b>${mode === 'sales' ? 'Sotuvlar' : mode === 'spend' ? 'Sarf' : mode === 'qual' ? 'Sifatli lidlar' : 'Lidlar'}</span>${mode === 'leads' && n > 1 ? '<span><b style="background:var(--warn)"></b>Lid narxi</span><span><b style="background:var(--good)"></b>Maqsad narx</span>' : ''}</div>`;
}
function funnel(t) {
  const st = [['Lidlar', t.leads, 'Formadan kelgan'], ["Bog'lanildi", t.contacted, "Sotuvchi qo'ng'iroq qildi"], ['Sifatli', t.qual, 'Real xaridor'], ['Sotildi', t.sales, 'Pul to\'landi']];
  const m = Math.max(1, t.leads);
  return `<div class="funnel">${st.map(([n, v, h], i) => `<div class="frow"><div class="t">${n}</div><div class="b" title="${h}"><i style="width:${(v / m * 100).toFixed(1)}%;opacity:${1 - i * .17}"></i></div><div class="n num">${int(v)}<small>${i ? pct(v / m) + ' lidlardan' : money(t.leads ? t.spend / t.leads : null) + ' / lid'}</small></div></div>`).join('')}</div>`;
}
const hbars = (rows, fmt) => { const m = Math.max(1e-9, ...rows.map(r => r[1])); return `<div class="hb">${rows.map(([t, v, s]) => `<div class="hbr"><span class="t">${esc(t)}</span><span class="n num">${fmt(v)}${s ? ` <span class="fl" style="font-weight:500">${s}</span>` : ''}</span><span class="b"><i style="width:${(v / m * 100).toFixed(1)}%"></i></span></div>`).join('')}</div>`; };
function statusPill(cpl) {
  const t = CFG.targetCpl;
  if (cpl == null) return '<span class="pill p-mut">lid yo\'q</span>';
  return cpl <= t ? '<span class="pill p-good">Yaxshi</span>' : cpl <= t * 1.3 ? '<span class="pill p-warn">O\'rtacha</span>' : '<span class="pill p-bad">Qimmat</span>';
}
const pbar = (title, withPeriod = true) => `<div class="pbar"><h2>${title}</h2>${withPeriod ? `<div class="seg" id="per">${PERIODS.map(([k, l]) => `<button data-p="${k}" class="${k === PERIOD ? 'on' : ''}">${l}</button>`).join('')}</div>` : ''}</div>`;

/* ---------- bo'limlar ---------- */
const TABS = [['umumiy', 'Umumiy', null, 'grid'], ['kampaniyalar', 'Kampaniyalar', null, 'mega'], ['lidlar', 'Lidlar', null, 'users'], ['sifat', 'Sifatli lidlar', null, 'star'], ['sotuvchilar', 'Sotuvchilar', null, 'headset'], ['sozlamalar', 'Sozlamalar', 'admin', 'gear'], ['taqdimot', 'Tizim haqida', null, 'info']];
let chartMode = 'leads';

function vUmumiy() {
  const R = range(), A = aggregate(R.from, R.to), P = aggregate(R.prev.from, R.prev.to), t = A.tot;
  const cpl = div(t.spend, t.leads), [vt, vc] = verdictOf(cpl);
  const ads = Object.entries(A.byAd).map(([id, a]) => { const [cid, i] = id.split('-'); return { name: ADW[cid][+i].name, camp: C.campaigns.find(c => c.id === cid).name, ...a }; }).filter(a => a.sales);
  ads.sort((a, b) => a.spend / a.sales - b.spend / b.sales);
  const prod = {}; C.campaigns.forEach(c => { const b = A.byCamp[c.id]; if (!b) return; (prod[c.product] ||= ZERO()); addTo(prod[c.product], b); });
  const longDays = A.byDay.length > 1;
  return pbar(pLabel() + ': hisobot') + `
  <div class="card"><div class="hero">${speedo(cpl)}<div>
    <div class="verdict"><i style="background:${vc}"></i>${vt}</div>
    <div class="big">
      <div><div class="v num" data-k="h-sp">${money(t.spend)}</div><div class="k">reklamaga sarflandi</div></div>
      <div><div class="v num" data-k="h-ld">${int(t.leads)}</div><div class="k">lid keldi · ${pct(div(t.qual, t.leads))} sifatli</div></div>
      <div><div class="v num" data-k="h-sl">${int(t.sales)}</div><div class="k">sotuv · ${money(t.revenue)}</div></div>
    </div>
    ${PERIOD !== 'today' ? (() => { const d = aggregate(today(), today()).tot; return `<div class="todayl"><span class="dot"></span>Bugun hozirgacha: <b data-k="t-ld">${int(d.leads)}</b> lid · <b data-k="t-sp">${money(d.spend)}</b> sarf · <b data-k="t-sl">${int(d.sales)}</b> sotuv</div>`; })() : ''}
    <p class="cap" style="margin:14px 0 0">Har 1 ${cur} reklama ${x(div(t.revenue, t.spend))} sotuv olib keldi. Bitta sotuv ${money(div(t.spend, t.sales))} ga tushdi.</p>
  </div></div></div>
  <div class="mt">${kpiCards(A, P)}</div>
  <div class="grid g2 mt">
    ${longDays ? `<div class="card"><div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap"><div style="flex:1;min-width:160px"><h3>Kunlar kesimida</h3><p class="cap">Ustunga bosib turing — aniq raqam</p></div>
      <div class="seg" id="cm">${[['leads', 'Lid'], ['spend', 'Sarf'], ['sales', 'Sotuv']].map(([k, l]) => `<button data-m="${k}" class="${k === chartMode ? 'on' : ''}">${l}</button>`).join('')}</div></div>${dayChart(A.byDay, chartMode)}</div>` : ''}
    <div class="card"><h3>Sotuv voronkasi</h3><p class="cap">Lid kelgandan pul to'languncha — CRM ma'lumoti</p>${funnel(t)}</div>
    <div class="card"><h3>Mahsulot bo'yicha sotuv</h3><p class="cap">Qaysi yo'nalish ko'proq pul olib kelyapti</p>${hbars(Object.entries(prod).map(([k, v]) => [k, v.revenue, int(v.sales) + ' ta']).sort((a, b) => b[1] - a[1]), money)}</div>
    <div class="card"><h3>Eng foydali reklamalar</h3><p class="cap">Bitta sotuv eng arzon tushganlari</p><div class="tw"><table><thead><tr><th>Reklama</th><th class="r">Sotuv</th><th class="r">1 sotuv narxi</th></tr></thead><tbody>
      ${ads.slice(0, 5).map((a, i) => `<tr><td><b>${i + 1}. ${esc(a.name)}</b><div class="fl" style="font-size:12px">${esc(a.camp)}</div></td><td class="r num">${int(a.sales)}</td><td class="r num"><b>${money(a.spend / a.sales)}</b></td></tr>`).join('') || '<tr><td colspan="3" class="fl">Bu davrda sotuv yo\'q</td></tr>'}
    </tbody></table></div></div>
  </div>`;
}

let openCamp = null;
function vKampaniyalar() {
  const R = range(), A = aggregate(R.from, R.to), t = A.tot;
  const row = (name, a, extra = '') => { const cpl = div(a.spend, a.leads); return `<td class="r num">${money(a.spend)}</td><td class="r num">${int(a.leads)}</td><td class="r num"><b>${money(cpl)}</b></td><td class="r num">${pct(div(a.qual, a.leads))}</td><td class="r num">${int(a.sales)}</td><td class="r num">${pct(div(a.sales, a.leads))}</td><td class="r num">${money(div(a.spend, a.sales))}</td><td class="r num">${money(a.revenue)}</td><td class="r num">${x(div(a.revenue, a.spend))}</td>`; };
  const camps = C.campaigns.map(c => ({ c, a: A.byCamp[c.id] || ZERO() })).sort((p, q) => q.a.spend - p.a.spend);
  const best = camps.filter(p => p.a.sales).sort((p, q) => p.a.spend / p.a.sales - q.a.spend / q.a.sales)[0];
  const worst = camps.filter(p => p.a.leads).sort((p, q) => q.a.spend / q.a.leads - p.a.spend / p.a.leads)[0];
  return pbar('Kampaniyalar') + `
  ${best && worst ? `<div class="note" style="margin-bottom:14px">Eng foydali: <b>${esc(best.c.name)}</b> — bitta sotuv ${money(best.a.spend / best.a.sales)}. Eng qimmat lid: <b>${esc(worst.c.name)}</b> — ${money(worst.a.spend / worst.a.leads)}. Qatorni bossangiz ichidagi reklamalar ochiladi.</div>` : ''}
  <div class="card"><div class="tw"><table><thead><tr><th>Kampaniya</th><th>Holat</th><th class="r">Sarf</th><th class="r">Lid</th><th class="r">Lid narxi</th><th class="r">Sifatli</th><th class="r">Sotuv</th><th class="r">Konversiya</th><th class="r">1 sotuv narxi</th><th class="r">Summa</th><th class="r">ROAS</th></tr></thead><tbody>
  ${camps.map(({ c, a }) => `<tr class="click" data-c="${c.id}"><td><b>${openCamp === c.id ? '▾' : '▸'} ${esc(c.name)}</b></td><td>${statusPill(div(a.spend, a.leads))}</td>${row(c.name, a)}</tr>`
    + (openCamp === c.id ? ADW[c.id].map(ad => { const b = A.byAd[ad.id] || ZERO(); return `<tr class="sub"><td>${esc(ad.name)}</td><td>${statusPill(div(b.spend, b.leads))}</td>${row(ad.name, b)}</tr>`; }).join('') : '')).join('')}
  <tr><td><b>Jami</b></td><td></td>${row('', t).replace(/<td class="r num">/g, '<td class="r num" style="font-weight:800">')}</tr>
  </tbody></table></div></div>
  <div class="grid g2 mt">
    <div class="card"><h3>Lid narxi kampaniyalar bo'yicha</h3><p class="cap">Maqsad: ${money(CFG.targetCpl)}</p>${hbars(camps.map(({ c, a }) => [c.name, div(a.spend, a.leads) || 0]), money)}</div>
    <div class="card"><h3>Sotuv summasi kampaniyalar bo'yicha</h3><p class="cap">CRM'dagi bitimlar</p>${hbars(camps.map(({ c, a }) => [c.name, a.revenue, int(a.sales) + ' ta']).sort((p, q) => q[1] - p[1]), money)}</div>
  </div>`;
}

const NAMES = ['Javohir', 'Madina', 'Bekzod', 'Nilufar', 'Sherzod', 'Dilshod', 'Gulnoza', 'Otabek', 'Sevara', 'Jasur', 'Kamola', 'Ulugbek', 'Shahnoza', 'Rustam', 'Zarina', 'Akmal', 'Feruza', 'Timur', 'Laylo', 'Doniyor', 'Asal', 'Sanjar', 'Mohira', 'Islom'];
const MODELS = { iPhone: ['iPhone 17 Pro 256GB', 'iPhone 17 Pro Max', 'iPhone 16 128GB', 'iPhone 15 128GB', 'iPhone 17 Pro 512GB'], MacBook: ['MacBook Air M4 13"', 'MacBook Air M4 15"', 'MacBook Pro 14"'], Aksessuar: ['AirPods Pro 3', 'Apple Watch S11', 'AirPods 4', 'Apple Watch SE'], iPad: ['iPad 11', 'iPad Air M3', 'iPad Pro 13"'], Aralash: ['iPhone 17 Pro', 'MacBook Air M4', 'AirPods Pro 3', 'iPad Air M3'] };
const BADR = [['Faqat narx so\'radi', .34], ['Javob bermadi (3 marta)', .27], ['Boshqa viloyatdan', .16], ['Raqam xato', .12], ['Bo\'lib to\'lashga mos emas', .11]];
const ST = { new: ['Yangi', 'p-acc'], cont: ["Bog'lanildi", 'p-mut'], qual: ['Sifatli', 'p-warn'], sale: ['Sotildi', 'p-good'], bad: ['Sifatsiz', 'p-bad'] };
function leadList(from, to, limit = 400) {
  const out = [], nowM = nowMin(), T = today();
  for (let ds = to; ds >= from && out.length < limit; ds = addDays(ds, -1)) {
    const F = fullDay(ds), day = [];
    F.ads.forEach(a => {
      const c = C.campaigns.find(k => k.id === a.camp), ad = ADW[a.camp].find(k => k.id === a.ad);
      const times = leadTimes(ds, a), pS = a.leads ? a.sales / a.leads : 0, pQ = a.leads ? a.qual / a.leads : 0, pC = a.leads ? a.contacted / a.leads : 0;
      for (let i = 0; i < a.leads; i++) {
        const m = times[i], isToday = ds === T;
        if (isToday && m > nowM) break;
        const r = rng(ds + a.ad + i), z = r();
        let st = z < pS ? 'sale' : z < pQ ? 'qual' : z < pC ? 'bad' : (r() < .5 ? 'bad' : 'cont');
        const age = isToday ? nowM - m : 9999;
        const sel = (() => { let y = r(), k = 0; for (; k < SW.length - 1; k++) { y -= SW[k].share; if (y < 0) break; } return SW[k]; })();
        const resp = sel.resp * (.3 + r() * 1.6);
        if (age < resp) st = 'new';
        else if (st === 'sale' && age < 90) st = 'qual';
        else if (st === 'bad' && age < resp + 6) st = 'cont';
        day.push({ id: ds + a.ad + i, ds, m: Math.floor(m), age, name: NAMES[Math.floor(r() * NAMES.length)], phone: '+998 9' + Math.floor(r() * 10) + ' *** ** ' + pad(Math.floor(r() * 100)),
          model: MODELS[c.product][Math.floor(r() * MODELS[c.product].length)], camp: c.name, ad: ad.name, seller: sel.name, resp: st === 'new' ? null : resp, st,
          why: st === 'bad' ? BADR[Math.floor(Math.pow(r(), 1.3) * BADR.length)][0] : '' });
      }
    });
    day.sort((p, q) => q.m - p.m);
    out.push(...day);
  }
  return out.slice(0, limit);
}
let lf = { st: '', camp: '', q: '' }, lshow = 40;
function vLidlar() {
  const R = range(), A = aggregate(R.from, R.to), t = A.tot;
  const L = leadList(R.from, R.to, 600);
  const fresh = L.filter(l => l.st === 'new').length;
  const bad = t.contacted - t.qual;
  const why = BADR.map(([n, w]) => [n, Math.round(bad * w)]);
  const F = L.filter(l => (!lf.st || l.st === lf.st) && (!lf.camp || l.camp === lf.camp) && (!lf.q || (l.name + l.model + l.phone).toLowerCase().includes(lf.q.toLowerCase())));
  return pbar('Lidlar') + `
  <div class="kpis">
    <div class="kpi"><div class="k">Jami lid</div><div class="v num">${int(t.leads)}</div><div class="d fl">${money(div(t.spend, t.leads))} / lid</div></div>
    <div class="kpi"><div class="k">Sifatli</div><div class="v num">${int(t.qual)}</div><div class="d up">${pct(div(t.qual, t.leads))}</div></div>
    <div class="kpi"><div class="k">Sifatsiz</div><div class="v num">${int(bad)}</div><div class="d dn">${pct(div(bad, t.leads))}</div></div>
    <div class="kpi"><div class="k">Sotildi</div><div class="v num">${int(t.sales)}</div><div class="d up">${pct(div(t.sales, t.leads))} lidlardan</div></div>
    <div class="kpi"><div class="k">Hali qo'ng'iroq qilinmagan</div><div class="v num" style="color:${fresh ? 'var(--bad)' : 'inherit'}">${int(fresh)}</div><div class="d fl">bugungi yangi lidlar</div></div>
  </div>
  <div class="grid g2 mt">
    <div class="card"><h3>Nega sifatsiz?</h3><p class="cap">Sotuvchi CRM'da belgilagan sabab</p>${hbars(why, int)}</div>
    <div class="card"><h3>Lid holatlari</h3><p class="cap">Har bir lid hozir qaysi bosqichda</p>${hbars([['Sotildi', t.sales], ['Sifatli (sotuv jarayonida)', t.qual - t.sales], ['Sifatsiz', bad], ["Bog'lanib bo'lmadi", t.leads - t.contacted]], int)}</div>
  </div>
  <div class="card mt"><h3>Oxirgi lidlar</h3><p class="cap">Demo: ismlar va raqamlar to'qima. Haqiqiy tizimda CRM'dan keladi.</p>
    <div class="filters">
      <input class="in" id="lq" placeholder="Ism, model yoki raqam" value="${esc(lf.q)}">
      <select class="in" id="lst"><option value="">Barcha holatlar</option>${Object.entries(ST).map(([k, [n]]) => `<option value="${k}" ${lf.st === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <select class="in" id="lcamp"><option value="">Barcha kampaniyalar</option>${C.campaigns.map(c => `<option ${lf.camp === c.name ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    </div>
    <div class="tw"><table><thead><tr><th>Vaqt</th><th>Mijoz</th><th>Qiziqish</th><th>Kampaniya</th><th>Sotuvchi</th><th class="r">Javob</th><th>Holat</th></tr></thead><tbody>
    ${F.slice(0, lshow).map(l => `<tr><td class="num">${l.age < 3 ? '<span class="pill p-acc">hozirgina</span>' : l.age < 60 ? Math.floor(l.age) + ' daq oldin' : human(l.ds) + ' ' + pad(Math.floor(l.m / 60)) + ':' + pad(l.m % 60)}</td><td><b>${l.name}</b><div class="fl num" style="font-size:12px">${l.phone}</div></td><td>${esc(l.model)}</td><td><span style="font-size:12.5px">${esc(l.camp)}</span><div class="fl" style="font-size:12px">${esc(l.ad)}</div></td><td>${l.seller}</td><td class="r num">${l.resp == null ? '<span class="dn">kutmoqda</span>' : mins(l.resp)}</td><td><span class="pill ${ST[l.st][1]}">${ST[l.st][0]}</span>${l.why ? `<div class="fl" style="font-size:11.5px">${esc(l.why)}</div>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="fl">Hech narsa topilmadi</td></tr>'}
    </tbody></table></div>
    ${F.length > lshow ? `<div style="text-align:center;margin-top:12px"><button class="btn g" id="more">Yana ko'rsatish (${F.length - lshow})</button></div>` : ''}
  </div>`;
}

function vSotuvchilar() {
  const R = range(), A = aggregate(R.from, R.to), S = A.sellers.slice().sort((a, b) => b.sales - a.sales), t = A.tot;
  const bands = [['5 daqiqagacha', .128], ['5–15 daqiqa', .097], ['15–60 daqiqa', .066], ['1 soatdan ko\'p', .031]];
  const fastest = S.slice().sort((a, b) => a.resp - b.resp)[0], slowest = S.slice().sort((a, b) => b.resp - a.resp)[0];
  return pbar('Sotuvchilar') + `
  <div class="kpis">
    <div class="kpi"><div class="k">O'rtacha javob vaqti</div><div class="v num">${mins(t.resp)}</div><div class="d fl">lid tushgandan qo'ng'iroqqacha</div></div>
    <div class="kpi"><div class="k">5 daqiqada javob</div><div class="v num">${pct(div(S.reduce((a, s) => a + s.fast * s.leads, 0), t.leads))}</div><div class="d fl">lidlar ulushi</div></div>
    <div class="kpi"><div class="k">Eng tezkor</div><div class="v">${fastest.name}</div><div class="d up">${mins(fastest.resp)}</div></div>
    <div class="kpi"><div class="k">Eng kech javob</div><div class="v">${slowest.name}</div><div class="d dn">${mins(slowest.resp)}</div></div>
  </div>
  <div class="card mt"><h3>Har bir sotuvchi</h3><p class="cap">Kimga qancha lid berildi va nechtasi pulga aylandi</p><div class="tw"><table><thead><tr><th>Sotuvchi</th><th class="r">Lid</th><th class="r">Javob vaqti</th><th class="r">5 daq ichida</th><th class="r">Sifatli</th><th class="r">Sotuv</th><th class="r">Konversiya</th><th class="r">Summa</th></tr></thead><tbody>
  ${S.map(s => { const cv = div(s.sales, s.leads); return `<tr><td><b>${s.name}</b></td><td class="r num">${int(s.leads)}</td><td class="r num"><span class="pill ${s.resp <= 5 ? 'p-good' : s.resp <= 12 ? 'p-warn' : 'p-bad'}">${mins(s.resp)}</span></td><td class="r num">${pct(s.fast)}</td><td class="r num">${int(s.qual)}</td><td class="r num"><b>${int(s.sales)}</b></td><td class="r num">${pct(cv)}</td><td class="r num">${money(s.revenue)}</td></tr>`; }).join('')}
  </tbody></table></div></div>
  <div class="grid g2 mt">
    <div class="card"><h3>Tez javob = ko'proq sotuv</h3><p class="cap">Javob tezligi bo'yicha lid → sotuv konversiyasi</p>${hbars(bands.map(([n, v]) => [n, v]), pct)}
      <div class="note mt">5 daqiqada qo'ng'iroq qilingan lid 1 soatdan keyin qilinganidan <b>${(bands[0][1] / bands[3][1]).toFixed(1)} barobar</b> ko'p sotuvga aylanadi.</div></div>
    <div class="card"><h3>Sotuvlar ulushi</h3><p class="cap">Davr: ${pLabel().toLowerCase()}</p>${hbars(S.map(s => [s.name, s.sales, pct(div(s.sales, t.sales))]), int)}</div>
  </div>`;
}

/* ---------- ikonkalar (umumiy belgilar, brend logotipi emas) ---------- */
const IC = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  mega: '<path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M19 6a8 8 0 0 1 0 12"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14a6 6 0 0 1 3.5 6"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  db: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  fx: '<path d="M10 4H8a2 2 0 0 0-2 2v14M3 11h6M13 9l7 8M20 9l-7 8"/>',
  palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="16" cy="10" r="1.2"/><path d="M12 21a2.5 2.5 0 0 1 0-5h2a3 3 0 0 0 3-3"/>',
  plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>'
};
const ico = (k, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k] || IC.info}</svg>`;
function integTiles() {
  return `<div class="integ">${(C.integrations || []).map(g => `<div class="itile"><span class="ilogo" style="--c:${g.color}">${ico(g.icon, 22)}${g.logo ? `<img src="${esc(g.logo)}" alt="" onerror="this.remove()">` : ''}</span>
    <div class="t"><b>${esc(g.name)}</b><small>${esc(g.desc)}</small></div><span class="pill p-good">ulangan</span></div>`).join('')}</div>`;
}
const tgLink = () => `<a class="btn" href="${esc(C.pitch.contactUrl)}" target="_blank" rel="noopener">${ico('chat', 16)} ${esc(C.pitch.contactLabel)}</a>`;

/* ---------- Sifatli lidlar ---------- */
function vSifat() {
  const R = range(), A = aggregate(R.from, R.to), P = aggregate(R.prev.from, R.prev.to), t = A.tot, pt = P.tot;
  const rate = div(t.qual, t.leads);
  const K = [['Sifatli lidlar', 'int', t.qual, pt.qual, 1], ['Sifatli lid ulushi', 'pct', rate, div(pt.qual, pt.leads), 1], ['Bitta sifatli lid narxi', 'money', div(t.spend, t.qual), div(pt.spend, pt.qual), -1], ['Sifatli lid → sotuv', 'pct', div(t.sales, t.qual), div(pt.sales, pt.qual), 1]];
  const camps = C.campaigns.map(c => ({ c, a: A.byCamp[c.id] || ZERO() })).filter(p => p.a.leads).map(p => ({ ...p, r: p.a.qual / p.a.leads })).sort((p, q) => q.r - p.r);
  const grade = r => r >= .58 ? '<span class="pill p-good">Yuqori</span>' : r >= .53 ? '<span class="pill p-warn">O\'rtacha</span>' : '<span class="pill p-bad">Past</span>';
  const ads = Object.entries(A.byAd).filter(([, a]) => a.leads >= 5).map(([id, a]) => { const [cid, i] = id.split('-'); return [ADW[cid][+i].name, a.qual / a.leads, int(a.qual) + ' ta']; }).sort((p, q) => q[1] - p[1]);
  const tod = [['Ertalab (08–12)', 1.07], ['Kunduzi (12–17)', 1.04], ['Kechqurun (17–22)', .97], ['Tunda (22–08)', .79]].map(([n, k]) => [n, Math.min(.95, (rate || 0) * k)]);
  const best = camps[0], worst = camps[camps.length - 1];
  return pbar('Sifatli lidlar') + `
  <div class="card qdef"><div><h3>Sifatli lid nima?</h3><p class="cap" style="margin:0">Sotuvchi gaplashgandan keyin CRM'da belgilaydi. Uchala shart bajarilsa — lid sifatli.</p></div>
    <div class="qchk">${['Telefonni ko\'tardi va gaplashdi', 'Aniq model va narxga qiziqdi', 'Xarid qila oladi: shu shaharda, to\'lov usuli mos'].map(s => `<span>${ico('check', 16)}${s}</span>`).join('')}</div></div>
  <div class="kpis mt">${K.map(([n, f, v, pv, g]) => `<div class="kpi"><div class="k">${n}</div><div class="v num" data-k="q-${n}">${FMT[f](v)}</div>${delta({ good: g }, v, pv)}</div>`).join('')}</div>
  ${best && worst ? `<div class="note mt">Eng sifatli lid: <b>${esc(best.c.name)}</b> — ${pct(best.r)}. Eng past: <b>${esc(worst.c.name)}</b> — ${pct(worst.r)}. Past kampaniyada auditoriya va forma savollarini qayta ko'ramiz.</div>` : ''}
  <div class="card mt"><h3>Kampaniyalar bo'yicha sifat</h3><p class="cap">Qaysi reklama "real xaridor" olib kelyapti</p><div class="tw"><table><thead><tr><th>Kampaniya</th><th class="r">Lid</th><th class="r">Sifatli</th><th style="min-width:140px">Ulush</th><th class="r">Sifatli lid narxi</th><th class="r">Sifatli → sotuv</th><th>Baho</th></tr></thead><tbody>
  ${camps.map(({ c, a, r }) => `<tr><td><b>${esc(c.name)}</b></td><td class="r num">${int(a.leads)}</td><td class="r num">${int(a.qual)}</td><td><div class="mbar"><i style="width:${(r * 100).toFixed(0)}%"></i></div><span class="num" style="font-size:12.5px">${pct(r)}</span></td><td class="r num"><b>${money(div(a.spend, a.qual))}</b></td><td class="r num">${pct(div(a.sales, a.qual))}</td><td>${grade(r)}</td></tr>`).join('')}
  </tbody></table></div></div>
  <div class="grid g2 mt">
    ${A.byDay.length > 1 ? `<div class="card"><h3>Kunlar bo'yicha sifatli lidlar</h3><p class="cap">Har kuni nechta real xaridor keldi</p>${dayChart(A.byDay, 'qual')}</div>` : ''}
    <div class="card"><h3>Eng sifatli reklamalar</h3><p class="cap">Sifatli lid ulushi bo'yicha</p>${hbars(ads.slice(0, 6), pct)}</div>
    <div class="card"><h3>Kun vaqti bo'yicha</h3><p class="cap">Lid qaysi paytda kelsa, sifatliroq</p>${hbars(tod, pct)}<div class="note mt">Tunda kelgan lidlar sifati past. Shuning uchun byudjetning ko'p qismi kunduzgi soatlarga qo'yiladi.</div></div>
    <div class="card"><h3>Sifatli lid qayerga ketdi</h3><p class="cap">${int(t.qual)} ta sifatli lid taqdiri</p>${hbars([['Sotildi', t.sales], ['O\'ylab ko\'ryapti / qayta qo\'ng\'iroq', Math.round((t.qual - t.sales) * .62)], ['Boshqa joydan oldi', Math.round((t.qual - t.sales) * .23)], ['Narx to\'g\'ri kelmadi', Math.round((t.qual - t.sales) * .15)]], int)}</div>
  </div>`;
}

/* ---------- Sozlamalar ---------- */
let setMsg = {}, SETTAB = 'profil';
const SETS = [['profil', "Kirish ma'lumotlari", 'user'], ['users', 'Foydalanuvchilar', 'users'], ['metrics', "Ko'rsatkichlar", 'sliders'], ['custom', "O'z ko'rsatkichingiz", 'fx'], ['brand', "Ko'rinish", 'palette'], ['integr', 'Integratsiyalar', 'plug']];
function vSozlamalar(us) {
  if (USER.role !== 'admin') return pbar('Sozlamalar', false) + '<div class="card">Bu bo\'lim faqat administrator uchun.</div>';
  const all = allMetrics(), on = CFG.metrics.filter(k => all.some(m => m.key === k)), off = all.filter(m => !on.includes(m.key));
  const ordered = on.map(k => all.find(m => m.key === k)).concat(off);
  const COLORS = ['#0a7cff', '#111827', '#16a34a', '#e0413a', '#7c3aed', '#f97316', '#0891b2', '#db2777'];
  const R = range(), A = aggregate(R.from, R.to);
  const S = {
    profil: `<div class="card"><h3>Kirish ma'lumotlari</h3><p class="cap">Siz: <b>${esc(USER.login)}</b>. Login yoki parolni almashtirish uchun joriy parolni kiriting.</p>
    <form id="fme"><div class="row2"><div class="fld"><label>Yangi login</label><input class="in" name="login" value="${esc(USER.login)}" required minlength="3" autocomplete="username"></div>
    <div class="fld"><label>Ism</label><input class="in" name="name" value="${esc(USER.name || '')}"></div></div>
    <div class="row2"><div class="fld"><label>Yangi parol</label><input class="in" name="np" type="password" minlength="6" placeholder="o'zgartirmaslik uchun bo'sh" autocomplete="new-password"></div>
    <div class="fld"><label>Joriy parol</label><input class="in" name="op" type="password" required autocomplete="current-password"></div></div>
    <div class="err">${setMsg.me_e || ''}</div><div class="ok">${setMsg.me || ''}</div><button class="btn">Saqlash</button></form></div>`,
    users: `<div class="card"><h3>Foydalanuvchilar</h3><p class="cap">Rahbar, sotuv bo'limi yoki hamkorga alohida login bering. "Ko'ruvchi" sozlamalarni o'zgartira olmaydi.</p>
    <div class="tw"><table><thead><tr><th>Ism</th><th>Login</th><th>Rol</th><th></th></tr></thead><tbody>
    ${us.map((u, i) => `<tr><td>${esc(u.name || '—')}</td><td><b>${esc(u.login)}</b></td><td><span class="pill ${u.role === 'admin' ? 'p-acc' : 'p-mut'}">${u.role === 'admin' ? 'Administrator' : "Ko'ruvchi"}</span></td><td class="r">${u.login === USER.login ? '<span class="fl">siz</span>' : `<button class="btn d s" data-du="${i}">O'chirish</button>`}</td></tr>`).join('')}
    </tbody></table></div>
    <form id="fadd" class="mt"><div class="row2"><div class="fld"><label>Ism</label><input class="in" name="name" placeholder="Masalan: Rahbar"></div><div class="fld"><label>Rol</label><select class="in" name="role"><option value="viewer">Ko'ruvchi</option><option value="admin">Administrator</option></select></div></div>
    <div class="row2"><div class="fld"><label>Login</label><input class="in" name="login" required minlength="3" autocomplete="off"></div><div class="fld"><label>Parol</label><input class="in" name="p" required minlength="6" autocomplete="new-password"></div></div>
    <div class="err">${setMsg.add_e || ''}</div><div class="ok">${setMsg.add || ''}</div><button class="btn">Foydalanuvchi qo'shish</button></form></div>`,
    metrics: `<div class="card"><h3>Ko'rsatkichlar</h3><p class="cap">Umumiy sahifada qaysi raqamlar va qaysi tartibda chiqsin</p>
    <div class="mlist">${ordered.map(m => { const i = on.indexOf(m.key), act = i >= 0; return `<div class="mi ${act ? '' : 'off'}"><label class="sw"><input type="checkbox" data-mk="${esc(m.key)}" ${act ? 'checked' : ''}><span></span></label>
      <div class="t">${esc(m.label)}${m.custom ? ' <span class="tagc">o\'zim</span>' : ''}<small>${esc(m.hint)}</small></div>
      <span class="num fl" style="font-size:13px">${FMT[m.fmt](m.f(A.tot))}</span>
      ${act ? `<button class="ib" data-up="${esc(m.key)}" ${i === 0 ? 'disabled' : ''} aria-label="Yuqoriga">↑</button><button class="ib" data-dn="${esc(m.key)}" ${i === on.length - 1 ? 'disabled' : ''} aria-label="Pastga">↓</button>` : ''}
      ${m.custom ? `<button class="ib" data-dc="${esc(m.key)}" aria-label="O'chirish">×</button>` : ''}</div>`; }).join('')}</div>
    <button class="btn g s mt" id="mreset">Standart holatga qaytarish</button></div>`,
    custom: `<div class="card"><h3>O'z ko'rsatkichingizni qo'shing</h3><p class="cap">Biznesingizga kerak raqamni formula bilan yarating</p>
    <form id="fcm"><div class="fld"><label>Nomi</label><input class="in" name="name" required placeholder="Masalan: Bitta sifatli lid narxi"></div>
    <div class="fld"><label>Formula</label><input class="in" name="f" id="cmf" required placeholder="sarf / sifatli"></div>
    <div class="vars">${Object.keys(VARS).map(v => `<button type="button" data-v="${v}">${v}</button>`).concat(['/', '*', '+', '-', '(', ')'].map(o => `<button type="button" data-v=" ${o} ">${o}</button>`)).join('')}</div>
    <div class="row2"><div class="fld"><label>Ko'rinishi</label><select class="in" name="fmt"><option value="money">Pul (${cur})</option><option value="int">Son</option><option value="pct">Foiz (%)</option><option value="x">Barobar (×)</option><option value="num">Kasr son</option></select></div>
    <div class="fld"><label>Hozirgi qiymat</label><div class="in num" id="cmprev" style="background:var(--soft)">—</div></div></div>
    <div class="err">${setMsg.cm_e || ''}</div><div class="ok">${setMsg.cm || ''}</div><button class="btn">Qo'shish</button></form>
    <div class="note mt">Misollar: <b>daromad / sarf</b> (ROAS), <b>sotuv / sifatli</b> (sifatli lid → sotuv), <b>sarf / (lid - sifatli)</b> (sifatsiz lidga ketgan pul).</div></div>`,
    brand: `<div class="card"><h3>Ko'rinish</h3><p class="cap">Do'kon nomi, rang va maqsad lid narxi</p>
    <form id="fbr"><div class="row2"><div class="fld"><label>Do'kon nomi</label><input class="in" name="brand" value="${esc(CFG.brand)}" required></div>
    <div class="fld"><label>Maqsad lid narxi (${cur})</label><input class="in" name="tcpl" type="number" step="0.05" min="0.1" value="${CFG.targetCpl}" required></div></div>
    <div class="fld"><label>Asosiy rang</label><div class="colors">${COLORS.map(c => `<button type="button" data-col="${c}" class="${c === CFG.accent ? 'on' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div></div>
    <div class="ok">${setMsg.br || ''}</div><button class="btn">Saqlash</button></form></div>`,
    integr: `<div class="card"><h3>Integratsiyalar</h3><p class="cap">Ma'lumot shu manbalardan avtomatik o'qiladi</p>${integTiles()}
    <button class="btn d s mt" id="reset">Demoni boshlang'ich holatga qaytarish</button></div>`
  };
  if (!S[SETTAB]) SETTAB = 'profil';
  return pbar('Sozlamalar', false) + `<div class="setw"><nav class="smenu">${SETS.map(([k, l, i]) => `<button data-st="${k}" class="${k === SETTAB ? 'on' : ''}">${ico(i)}<span>${l}</span></button>`).join('')}</nav><div class="sbody">${S[SETTAB]}</div></div>`;
}

/* ---------- Taqdimot ---------- */
function vTaqdimot() {
  const A = aggregate(addDays(today(), -29), today()), t = A.tot, p = C.pitch;
  return `<div class="pitch">
  <section class="phero"><div class="eyebrow">${esc(p.agency)} · Target + hisobot</div>
    <h2>Reklamangiz qancha sotuv olib kelayotganini bitta sahifada ko'ring</h2>
    <p class="lead">Biz Meta reklamangizni yuritamiz va sizga shaxsiy hisobot sayt beramiz. Telefoningizdan ochasiz — 1 daqiqada hammasi tushunarli.</p>
    <div class="pbtns">${tgLink()}${USER ? '' : '<a class="btn g" href="#">Demoni ochish</a>'}</div></section>

  <section><div class="eyebrow">Qanday ishlaydi</div><h3>3 qadam</h3>
    <div class="steps">
      <div><span class="sn">1</span><b>Reklama</b><p>Meta'da reklama yuritamiz. Har bir lid qaysi reklamadan kelgani belgilanadi.</p></div>
      <div><span class="sn">2</span><b>CRM</b><p>Lid CRM'ingizga tushadi. Sotuvchi gaplashib, holatini belgilaydi.</p></div>
      <div><span class="sn">3</span><b>Hisobot</b><p>Sarf, lid, sifatli lid va sotuv — hammasi shu saytda, jonli.</p></div>
    </div></section>

  <section><div class="eyebrow">Nima o'zgaradi</div><h3>Oldin va hozir</h3>
    <div class="ba">
      <div class="bef"><b>Oldin</b>${['Lid ko\'p, nechtasi sotilganini bilmaysiz', 'Hisobotni kutasiz yoki o\'zingiz yig\'asiz', 'Qaysi reklama pul olib kelyapti — taxmin', 'Sotuvchi lidga qachon qo\'ng\'iroq qilgani noma\'lum'].map(s => `<span>${ico('x', 16)}${s}</span>`).join('')}</div>
      <div class="aft"><b>Hozir</b>${['Har bir lidning taqdiri ko\'rinib turadi', 'Hisobot har doim tayyor, telefonda ham', 'Har bir reklamaning bitta sotuv narxi ma\'lum', 'Sotuvchilarning javob tezligi nazoratda'].map(s => `<span>${ico('check', 16)}${s}</span>`).join('')}</div>
    </div></section>

  <section><div class="eyebrow">Demo misol · 30 kun</div><h3>${esc(CFG.brand)}</h3>
    <div class="case">
      <div><div class="v num">${money(t.spend)}</div><div class="k">reklamaga ketdi</div></div>
      <div><div class="v num">${int(t.leads)}</div><div class="k">lid keldi (${money(div(t.spend, t.leads))} dan)</div></div>
      <div><div class="v num">${pct(div(t.qual, t.leads))}</div><div class="k">lidlar sifatli</div></div>
      <div><div class="v num">${int(t.sales)}</div><div class="k">sotuv — bittasi ${money(div(t.spend, t.sales))} ga</div></div>
    </div>
    <p class="cap" style="margin-top:12px">Raqamlar namunaviy.</p></section>

  <section><div class="eyebrow">Integratsiyalar</div><h3>Siz ishlatayotgan tizimlar bilan ulanadi</h3>${integTiles()}</section>

  <section><div class="pack"><div><div class="eyebrow">Paket</div><h3 style="margin:6px 0 10px;color:var(--bg)">Target + shaxsiy hisobot sayt</h3>
      <div class="price">${esc(p.price)}</div><p class="muted">Aniq narx byudjet va yo'nalishlar soniga qarab.</p>${tgLink()}</div>
    <ul><li>Meta reklamani to'liq yuritish</li><li>Kreativ ssenariylar</li><li>Lid sayt yoki forma</li><li>CRM bilan ulash</li><li>Shaxsiy hisobot sayt (login-parol)</li><li>Har hafta tahlil va tavsiyalar</li></ul></div></section>
  </div>`;
}

/* ---------- render ---------- */
async function render(live) {
  const before = {};
  if (live) document.querySelectorAll('#view [data-k]').forEach(e => before[e.dataset.k] = e.textContent);
  document.body.classList.toggle('noanim', !!live);
  const h = (location.hash || '').slice(1);
  if (!USER) {
    if (h === 'taqdimot') { $('#login').hidden = true; $('#app').hidden = true; const po = $('#pitchOnly'); po.hidden = false;
      po.innerHTML = `<div class="wrap"><div class="toplink"><div class="logo">${esc((CFG.brand[0] || 'H').toUpperCase())}</div><b style="flex:1">${esc(CFG.brand)} · hisobot tizimi</b><a class="btn s" href="#">Demoga kirish</a></div>${vTaqdimot()}<div class="foot">Demo versiya</div></div>`; window.scrollTo(0, 0); return; }
    $('#pitchOnly').hidden = true; $('#app').hidden = true; $('#login').hidden = false;
    const us = await users();
    $('#lhint').innerHTML = us.some(u => u.login === C.defaultLogin) ? `Demo kirish: login <b>${esc(C.defaultLogin)}</b>, parol <b>${esc(C.defaultPassword)}</b>` : 'Login va parolni administratoringizdan oling.';
    return;
  }
  $('#login').hidden = true; $('#pitchOnly').hidden = true; $('#app').hidden = false;
  TAB = TABS.some(t => t[0] === h) ? h : 'umumiy';
  if (TAB === 'sozlamalar' && USER.role !== 'admin') TAB = 'umumiy';
  $('#tabs').innerHTML = TABS.filter(t => !t[2] || USER.role === t[2]).map(([k, l, , i]) => `<a href="#${k}" class="${k === TAB ? 'on' : ''} ${k === 'taqdimot' ? 'pitch' : ''}">${ico(i)}<span>${l}</span></a>`).join('');
  document.body.classList.remove('menu');
  $('#whoami').textContent = USER.name || USER.login;
  const V = { umumiy: vUmumiy, kampaniyalar: vKampaniyalar, lidlar: vLidlar, sotuvchilar: vSotuvchilar, sozlamalar: vSozlamalar, taqdimot: vTaqdimot, sifat: vSifat };
  $('#view').innerHTML = TAB === 'sozlamalar' ? vSozlamalar(await users()) : V[TAB]() + '<div class="foot">Demo ma\'lumot · ' + esc(CFG.brand) + '</div>';
  setMsg = {};
  if (live) document.querySelectorAll('#view [data-k]').forEach(e => { if (before[e.dataset.k] != null && before[e.dataset.k] !== e.textContent) e.classList.add('bump'); });
  stamp();
}
const stamp = () => { const e = $('#livet'); if (e) { const n = new Date(); e.textContent = pad(n.getHours()) + ':' + pad(n.getMinutes()) + ':' + pad(n.getSeconds()); } };

/* ---------- jonli rejim ---------- */
let seen = null;
function toast(l) {
  const box = $('#toasts'); if (!box) return;
  const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = `<span class="dot"></span><div><b>Yangi lid: ${esc(l.name)}</b><small>${esc(l.model)} · ${esc(l.camp)}</small></div>`;
  box.appendChild(el); setTimeout(() => el.classList.add('out'), 5200); setTimeout(() => el.remove(), 5800);
}
function tick() {
  if (!USER || document.hidden) return;
  const top = leadList(today(), today(), 6);
  if (seen) top.filter(l => !seen.has(l.id)).slice(0, 2).reverse().forEach(toast);
  seen = new Set(top.map(l => l.id).concat(seen ? [...seen] : []));
  const a = document.activeElement, typing = a && /INPUT|SELECT|TEXTAREA/.test(a.tagName);
  if (['umumiy', 'kampaniyalar', 'lidlar', 'sifat', 'sotuvchilar'].includes(TAB) && !typing) render(true); else stamp();
}
setInterval(tick, 15000);

/* ---------- hodisalar ---------- */
$('#lform').addEventListener('submit', async e => {
  e.preventDefault();
  const lg = $('#lu').value.trim(), p = $('#lp').value, us = await users();
  const hsh = await passHash(lg, p), u = us.find(x => x.login.toLowerCase() === lg.toLowerCase() && x.hash === hsh);
  if (!u) { $('#lerr').textContent = 'Login yoki parol noto\'g\'ri'; return; }
  $('#lerr').textContent = ''; $('#lp').value = '';
  USER = { login: u.login, name: u.name, role: u.role }; sess.set(USER, true);
  if (location.hash === '#taqdimot' || !location.hash) location.hash = 'umumiy'; else render();
});
$('#logout').addEventListener('click', () => { sess.clear(); USER = null; location.hash = ''; render(); });
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

document.addEventListener('click', async e => {
  const b = e.target.closest('button,tr.click'); if (!b) return;
  if (b.dataset.st) { SETTAB = b.dataset.st; render(); return; }
  if (b.id === 'mbtn') { document.body.classList.toggle('menu'); return; }
  if (b.dataset.p) { PERIOD = b.dataset.p; store.set('period', PERIOD); lshow = 40; render(); return; }
  if (b.dataset.m) { chartMode = b.dataset.m; render(); return; }
  if (b.dataset.c) { openCamp = openCamp === b.dataset.c ? null : b.dataset.c; render(); return; }
  if (b.id === 'more') { lshow += 60; render(); return; }
  if (b.dataset.up || b.dataset.dn) { const k = b.dataset.up || b.dataset.dn, i = CFG.metrics.indexOf(k), j = b.dataset.up ? i - 1 : i + 1; [CFG.metrics[i], CFG.metrics[j]] = [CFG.metrics[j], CFG.metrics[i]]; saveCfg(); render(); return; }
  if (b.dataset.dc) { CFG.custom = CFG.custom.filter(m => m.id !== b.dataset.dc); CFG.metrics = CFG.metrics.filter(k => k !== b.dataset.dc); saveCfg(); render(); return; }
  if (b.id === 'mreset') { CFG.metrics = DEFAULT_METRICS.slice(); saveCfg(); render(); return; }
  if (b.dataset.col) { CFG.accent = b.dataset.col; saveCfg(); render(); return; }
  if (b.dataset.v) { const f = $('#cmf'); f.value = (f.value + b.dataset.v).replace(/\s+/g, ' '); f.focus(); f.dispatchEvent(new Event('input', { bubbles: true })); return; }
  if (b.dataset.du) { const us = await users(), u = us[+b.dataset.du]; if (!u || u.login === USER.login) return;
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Aniqmi? Bosing'; return; }
    store.set('users', us.filter((_, i) => i !== +b.dataset.du)); render(); return; }
  if (b.id === 'reset') { if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Hammasi o\'chadi. Yana bir bosing'; return; }
    store.del('cfg'); store.del('users'); store.del('period'); sess.clear(); location.hash = ''; location.reload(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.mk) { const k = t.dataset.mk; CFG.metrics = t.checked ? CFG.metrics.concat(k) : CFG.metrics.filter(x => x !== k); saveCfg(); render(); }
  if (t.id === 'lst') { lf.st = t.value; lshow = 40; render(); }
  if (t.id === 'lcamp') { lf.camp = t.value; lshow = 40; render(); }
});
let qT;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'lq') { clearTimeout(qT); qT = setTimeout(() => { lf.q = t.value; lshow = 40; render().then(() => { const i = $('#lq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }); }, 300); }
  if (t.id === 'cmf') { const fn = compileFormula(t.value), R = range(), A = aggregate(R.from, R.to), fmt = t.form.fmt.value; $('#cmprev').textContent = fn ? FMT[fmt](fn(A.tot)) : (t.value ? 'formula xato' : '—'); }
});
document.addEventListener('submit', async e => {
  const f = e.target, F = new FormData(f); if (f.id === 'lform') return; e.preventDefault();
  if (f.id === 'fme') {
    const us = await users(), i = us.findIndex(u => u.login === USER.login), u = us[i];
    if (u.hash !== await passHash(u.login, F.get('op'))) { setMsg.me_e = 'Joriy parol noto\'g\'ri'; return render(); }
    const nl = F.get('login').trim();
    if (us.some((x, j) => j !== i && x.login.toLowerCase() === nl.toLowerCase())) { setMsg.me_e = 'Bu login band'; return render(); }
    const np = F.get('np') || F.get('op');
    us[i] = { ...u, login: nl, name: F.get('name').trim(), hash: await passHash(nl, np) };
    store.set('users', us); USER = { login: nl, name: us[i].name, role: u.role }; sess.set(USER, true);
    setMsg.me = 'Saqlandi. Keyingi kirishda yangi ma\'lumotlardan foydalaning.'; return render();
  }
  if (f.id === 'fadd') {
    const us = await users(), lg = F.get('login').trim();
    if (us.some(x => x.login.toLowerCase() === lg.toLowerCase())) { setMsg.add_e = 'Bu login band'; return render(); }
    us.push({ login: lg, name: F.get('name').trim(), role: F.get('role'), hash: await passHash(lg, F.get('p')) });
    store.set('users', us); setMsg.add = `"${esc(lg)}" qo'shildi. Login va parolni o'sha odamga yuboring.`; return render();
  }
  if (f.id === 'fcm') {
    if (!compileFormula(F.get('f'))) { setMsg.cm_e = 'Formulada faqat yuqoridagi so\'zlar, raqamlar va + − × ÷ ( ) bo\'lsin'; return render(); }
    const id = 'u' + Date.now().toString(36);
    CFG.custom.push({ id, name: F.get('name').trim().slice(0, 40), formula: F.get('f').trim(), fmt: F.get('fmt') }); CFG.metrics.push(id);
    saveCfg(); setMsg.cm = 'Qo\'shildi va Umumiy sahifaga chiqarildi.'; return render();
  }
  if (f.id === 'fbr') {
    CFG.brand = F.get('brand').trim() || C.brand; CFG.targetCpl = Math.max(.1, +F.get('tcpl') || C.targetCpl);
    saveCfg(); setMsg.br = 'Saqlandi.'; return render();
  }
});

/* ---------- oq / qora rejim ---------- */
const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
function applyTheme() {
  const t = store.get('theme', null);
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  const dark = t ? t === 'dark' : !!(mq && mq.matches);
  document.documentElement.classList.toggle('isdark', dark);
}
document.addEventListener('click', e => {
  if (!e.target.closest('[data-thm]')) return;
  store.set('theme', document.documentElement.classList.contains('isdark') ? 'light' : 'dark'); applyTheme();
});
if (mq && mq.addEventListener) mq.addEventListener('change', applyTheme);
applyTheme();

/* ---------- start ---------- */
applyBrand();
(async () => {
  const s = sess.get(), us = await users();
  if (s && us.some(u => u.login === s.login)) { const u = us.find(x => x.login === s.login); USER = { login: u.login, name: u.name, role: u.role }; }
  render();
})();
})();
