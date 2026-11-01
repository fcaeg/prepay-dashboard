/* ---------- Sale Analysis ---------- */
const SA = (() => {
  const D = 864e5, iso = (x) => x.toISOString().slice(0, 10), add = (ds, n) => iso(new Date(Date.parse(ds + 'T00:00:00Z') + n * D)), diff = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / D);
  const isoW = (ds) => { const d = new Date(ds + 'T00:00:00Z'); const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day + 3); const y = d.getUTCFullYear(); const f = new Date(Date.UTC(y, 0, 4)); return { y, w: 1 + Math.round(((d - f) / D - 3 + ((f.getUTCDay() + 6) % 7)) / 7) }; };
  const wRange = (y, w) => { const f = new Date(Date.UTC(y, 0, 4)); const mon = new Date(f.getTime() - ((f.getUTCDay() + 6) % 7) * D + (w - 1) * 7 * D); return [iso(mon), iso(new Date(mon.getTime() + 6 * D))]; };
  const LV = { zone: 'Region', area: 'Area', shop: 'สาขา', emp: 'พนักงาน', group: 'กลุ่มประเภทซิม', sub: 'ประเภทซิม (รุ่นย่อย)', mat: 'ชนิดซิม (Matcode)' };
  const info = () => { const pr = dash.params(); return period(pr.saperiod || 'mtd', pr.saweek); };
  const period = (pd0, wk0) => { const r = PC.rows('enriched'); if (!r || !r.length) return null; const today = r.reduce((a, x) => (x.date > a ? x.date : a), ''); const cur = isoW(today);
    const pr = dash.params(); const pd = pd0 || 'mtd'; const wk = Math.min(+(wk0 || cur.w), cur.w); let from, to = today, pf = null, pt = null, label, plabel, cs, ps;
    if (pd === 'today') { from = today; pf = pt = add(today, -7); label = 'Today ' + PC.day(today); plabel = 'Same Day LW = วันเดียวกันของสัปดาห์ก่อน (' + PC.day(pf) + ')'; cs = 'Today'; ps = 'Same Day LW'; }
    else if (pd === 'week') { const [a, b] = wRange(cur.y, wk); from = a; to = b < today ? b : today; pf = add(a, -7); pt = add(to, -7); label = 'Week ' + wk; plabel = 'W' + (wk - 1) + ' = สัปดาห์ก่อน ช่วงวันเดียวกัน'; cs = 'W' + wk; ps = 'W' + (wk - 1); }
    else if (pd === 'ytd') { from = today.slice(0, 4) + '-01-01'; label = 'YTD ' + (+today.slice(0, 4) + 543); plabel = null; cs = 'YTD'; ps = null; }
    else { from = today.slice(0, 8) + '01'; const y = +today.slice(0, 4), m = +today.slice(5, 7); const pm = m === 1 ? (y - 1) + '-12' : y + '-' + String(m - 1).padStart(2, '0'); const pdays = new Date(Date.UTC(+pm.slice(0, 4), +pm.slice(5, 7), 0)).getUTCDate();
      pf = pm + '-01'; pt = pm + '-' + String(Math.min(+today.slice(8, 10), pdays)).padStart(2, '0'); label = 'MTD ' + PC.mon(today.slice(0, 7)); plabel = 'LMTD = เดือนก่อน ช่วงวันเดียวกัน (' + PC.day(pf) + ' – ' + PC.day(pt) + ')'; cs = 'MTD'; ps = 'LMTD'; }
    return { today, cur, pd, wk, from, to, pf, pt, label, plabel, cs, ps, lvl: pr.salevel || 'zone' }; };
  const base = () => { const r = PC.rows('enriched'), I = info(); if (!r || !I) return null; const p = PC.P();
    return r.filter((x) => PCin(x.area, p.area) && (p.stype === 'ALL' || x.stype === p.stype) && (p.group === 'ALL' || x.group === p.group) && ((x.date >= I.from && x.date <= I.to) || (I.pf && x.date >= I.pf && x.date <= I.pt))); };
  const simList = () => { const r = base(), I = info(); if (!r) return []; const N = PC.isNet(); const m = new Map(); for (const x of r) if (x.date >= I.from && x.date <= I.to) m.set(x.group, (m.get(x.group) || 0) + (N ? x.net : x.units)); return [...m.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]); };
  const sim = () => { if (PC.P().group !== 'ALL') return PC.P().group; if ((dash.params().salevel || 'zone') === 'group') return 'ALL'; const v = dash.params().sasim; const l = simList(); return l.includes(v) ? v : 'ALL'; };
  const subList = () => { const r = base(), I = info(); if (!r) return []; const s = sim(); const N = PC.isNet(); const m = new Map(); for (const x of r) if (x.date >= I.from && x.date <= I.to && (s === 'ALL' || x.group === s)) m.set(x.simtype, (m.get(x.simtype) || 0) + (N ? x.net : x.units)); return [...m.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]); };
  const subSel = () => { if ((dash.params().salevel || 'zone') !== 'mat') return 'ALL'; const v = dash.params().sasub; return subList().includes(v) ? v : 'ALL'; };
  const memo = new Map();
  const aggBy = (LVL) => { const I = info(), r = base(); if (!I || !r) return null; const s = sim(); const k = JSON.stringify([LVL, I, s, subSel(), PC.P(), PC.isNet(), (PC.rows('enriched') || []).length]); if (memo.has(k)) return memo.get(k); const sb = subSel(); if (memo.size > 40) memo.clear();
    const staff = new Map((PC.rows('staff') || []).map((x) => [String(x.emp), x])), shops = new Map((PC.rows('shops') || []).map((x) => [String(x.shop), x]));
    const lvl = LVL === 'group' && s !== 'ALL' ? 'sub' : LVL; const mats = new Map((PC.rows('matcodes') || []).map((x) => [String(x.matcode), x]));
    const key = (x) => (lvl === 'zone' ? PCzone(x.area) || '-' : lvl === 'area' ? x.area : lvl === 'shop' ? String(x.shop) : lvl === 'emp' ? String(x.emp) : lvl === 'sub' ? x.simtype : lvl === 'mat' ? String(x.matcode) : x.group);
    const lab = (k) => (lvl === 'shop' ? (shops.get(k) || {}).name || k : lvl === 'emp' ? ((staff.get(k) || {}).name || k) : lvl === 'mat' ? String((mats.get(k) || {}).name || k).replace(/^TMH\d /, '').replace(/_VAS| MULTI/g, '') : k);
    const sub = (k, x) => (lvl === 'shop' ? x.area : lvl === 'emp' ? ((shops.get(String((staff.get(k) || {}).shop || x.shop)) || {}).name || '') : lvl === 'area' ? PCzone(x.area) : lvl === 'mat' ? x.group + ' · ฿' + PC.nf((mats.get(String(x.matcode)) || {}).price || 0) : lvl === 'sub' ? x.group : '');
    const m = new Map(), dc = new Map(), dp = new Map(); const T = { cu: 0, cn: 0, pu: 0, pn: 0 };
    for (const x of r) { if (s !== 'ALL' && x.group !== s) continue; if (sb !== 'ALL' && x.simtype !== sb) continue; const k = key(x); const a = m.get(k) || { key: k, label: lab(k), sub: sub(k, x), cu: 0, cn: 0, pu: 0, pn: 0, shops: new Set() };
      if (x.date >= I.from && x.date <= I.to) { a.cu += x.units; a.cn += x.net; T.cu += x.units; T.cn += x.net; if (x.units > 0) a.shops.add(x.shop); const d = dc.get(x.date) || { u: 0, n: 0 }; d.u += x.units; d.n += x.net; dc.set(x.date, d); }
      else { a.pu += x.units; a.pn += x.net; T.pu += x.units; T.pn += x.net; const d = dp.get(x.date) || { u: 0, n: 0 }; d.u += x.units; d.n += x.net; dp.set(x.date, d); }
      m.set(k, a); }
    const N = PC.isNet(); const rows = [...m.values()].map((a) => { const c = N ? a.cn : a.cu, pv = N ? a.pn : a.pu; return { ...a, shops: a.shops.size, c, pv, delta: c - pv, growth: I.pf && pv > 0 ? c / pv - 1 : null, share: (N ? T.cn : T.cu) ? c / (N ? T.cn : T.cu) : 0, asp: a.cu > 0 ? a.cn / a.cu : null }; })
      .filter((a) => a.cu !== 0 || a.cn !== 0 || a.pu !== 0 || a.pn !== 0).sort((a, b) => b.c - a.c);
    // target (all SIM PRE only)
    let tgt = null; const tg = PC.rows('targets'); const p = PC.P();
    if (tg && s === 'ALL' && PC.P().group === 'ALL') { const dim = (ds) => new Date(Date.UTC(+ds.slice(0, 4), +ds.slice(5, 7), 0)).getUTCDate(); const tm = new Map();
      for (const t of tg) { const S = shops.get(String(t.shop)); if (!S || !PCin(S.area, p.area) || (p.stype !== 'ALL' && S.stype !== p.stype) || (p.shop !== 'ALL' && String(t.shop) !== p.shop)) continue; const k = t.month; const o = tm.get(k) || { u: 0, n: 0 }; o.u += +t.target_units || 0; o.n += +t.target_net || 0; tm.set(k, o); }
      let tu = 0, tn = 0; for (let d = I.from; d <= I.to; d = add(d, 1)) { const o = tm.get(d.slice(0, 7)); if (o) { tu += o.u / dim(d); tn += o.n / dim(d); } }
      const mo = tm.get(I.today.slice(0, 7)); tgt = { tu, tn, month: mo ? (N ? mo.n : mo.u) : null, mdays: dim(I.today), el: +I.today.slice(8, 10) }; }
    const v = { I, s, lvl, rows, T, N, dc, dp, tgt }; memo.set(k, v); return v; };
  const agg = () => { const I = info(); return I ? aggBy(I.lvl) : null; };
  return { info, period, isoW, agg, aggBy, base, simList, sim, subList, subSel, LV, add, diff, wRange };
})();
const saC = (A) => (A.N ? A.T.cn : A.T.cu), saP = (A) => (A.N ? A.T.pn : A.T.pu);
const saPct = (v) => (v == null ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + PC.pf(Math.abs(v)));
const saCol = (v) => (v == null ? 'var(--color-fg-muted)' : v >= 0 ? 'var(--color-ok)' : 'var(--color-bad)');
const saLvlName = () => { const A = SA.agg(); return A ? (A.lvl === 'sub' && A.s !== 'ALL' ? 'ประเภทซิม (รุ่นย่อย) ใน ' + A.s : SA.LV[A.lvl]) : ''; };
dash.draw('f_saweek', (sel) => { const I = SA.info(); if (!I) return; const o = []; for (let w = I.cur.w; w >= 1; w--) { const [a, b] = SA.wRange(I.cur.y, w); o.push(new Option('Week ' + w + ' · ' + PC.day(a) + ' – ' + PC.day(b < I.today ? b : I.today), String(w))); } sel.replaceChildren(...o); sel.value = String(I.wk); sel.onchange = () => dash.setParams({ saweek: +sel.value }); });
dash.draw('f_sasim', (sel) => { const l = SA.simList(); const cur = SA.sim(); sel.replaceChildren(new Option('ทุกประเภทซิม', 'ALL'), ...l.map((g, i) => new Option(g + (i === 0 ? ' (ขายดีที่สุด)' : ' (อันดับ ' + (i + 1) + ')'), g))); sel.value = cur; sel.disabled = PC.P().group !== 'ALL'; sel.onchange = () => dash.setParams({ sasim: sel.value, sasub: 'ALL' }); });
dash.draw('f_sasub', (sel) => { const l = SA.subList(); const cur = SA.subSel(); sel.replaceChildren(new Option('ทุกรุ่นย่อย', 'ALL'), ...l.map((g) => new Option(g, g))); sel.value = cur; sel.onchange = () => dash.setParams({ sasub: sel.value }); });
dash.draw('sa_range', (el) => { const I = SA.info(); el.textContent = I ? I.label + ': ' + PC.day(I.from) + (I.to !== I.from ? ' – ' + PC.day(I.to) : '') + (I.plabel ? ' · เทียบกับ ' + I.plabel : ' · YTD ไม่มีข้อมูลปีก่อน จึงเทียบกับ Target') + ' · สัปดาห์นับจันทร์–อาทิตย์ (ISO)' : ''; });
for (const n of ['sa_lvl1', 'sa_lvl2', 'sa_lvl3']) dash.draw(n, (el) => { el.textContent = saLvlName(); });
dash.draw('sa_net', (el) => { const A = SA.agg(); el.textContent = A ? '฿' + PC.nf(Math.round(A.T.cn)) : '—'; });
dash.draw('sa_net_sub', (el) => { const A = SA.agg(); if (!A) { el.textContent = ''; return; } const g = A.I.pf && A.T.pn > 0 ? A.T.cn / A.T.pn - 1 : null; el.textContent = A.I.pf ? A.I.ps + ' ฿' + PC.nf(Math.round(A.T.pn)) + ' · ' + saPct(g) : 'ไม่มีช่วงเทียบ'; el.style.color = saCol(g); });
dash.draw('sa_qty', (el) => { const A = SA.agg(); el.textContent = A ? PC.nf(A.T.cu) : '—'; });
dash.draw('sa_qty_sub', (el) => { const A = SA.agg(); if (!A) { el.textContent = ''; return; } const g = A.I.pf && A.T.pu > 0 ? A.T.cu / A.T.pu - 1 : null; el.textContent = A.I.pf ? A.I.ps + ' ' + PC.nf(A.T.pu) + ' · ' + saPct(g) : ''; el.style.color = saCol(g); });
dash.draw('sa_asp', (el) => { const A = SA.agg(); el.textContent = A && A.T.cu > 0 ? '฿' + PC.nf(Math.round(A.T.cn / A.T.cu)) : '—'; });
dash.draw('sa_asp_sub', (el) => { const A = SA.agg(); if (!A) { el.textContent = ''; return; } const a1 = A.T.cu > 0 ? A.T.cn / A.T.cu : null, a0 = A.T.pu > 0 ? A.T.pn / A.T.pu : null; const g = a1 != null && a0 ? a1 / a0 - 1 : null; el.textContent = a0 ? A.I.ps + ' ฿' + PC.nf(Math.round(a0)) + ' · ' + saPct(g) : 'Net Amount ÷ QTY'; el.style.color = saCol(g); });
dash.draw('sa_tgt_l', (el) => { const A = SA.agg(); el.textContent = A && A.tgt ? (A.I.pd === 'mtd' ? 'คาดการณ์สิ้นเดือน เทียบ Target' : 'เทียบ Target ' + A.I.cs) : 'Target'; });
dash.draw('sa_tgt', (el) => { const A = SA.agg(); if (!A || !A.tgt) { el.textContent = '—'; el.style.color = ''; return; } const N = A.N; let v;
  if (A.I.pd === 'mtd' && A.tgt.month) v = (saC(A) / A.tgt.el) * A.tgt.mdays / A.tgt.month; else { const t = N ? A.tgt.tn : A.tgt.tu; v = t ? saC(A) / t : null; }
  el.textContent = v == null ? '—' : PC.pf(v); el.style.color = v == null ? '' : v >= 1 ? 'var(--color-ok)' : v >= 0.9 ? 'var(--color-warn)' : 'var(--color-bad)'; });
dash.draw('sa_tgt_sub', (el) => { const A = SA.agg(); if (!A || !A.tgt) { el.textContent = A && A.s !== 'ALL' ? 'Target มีเฉพาะซิม PRE รวมทุกประเภท (เลือก "ทุกประเภทซิม")' : ''; return; } const N = A.N, t = N ? A.tgt.tn : A.tgt.tu;
  el.textContent = A.I.pd === 'mtd' && A.tgt.month ? 'คาดการณ์สิ้นเดือน ' + PC.mfmt(Math.round((saC(A) / A.tgt.el) * A.tgt.mdays)) + ' / Target ' + PC.mfmt(Math.round(A.tgt.month)) : 'Target ' + A.I.cs + ' ' + PC.mfmt(Math.round(t)) + ' · ทำได้ ' + PC.mfmt(Math.round(saC(A))); });
// ranking bars with previous-period marker
dash.draw('c_sa_rank', (el) => { el.replaceChildren(); const A = SA.agg(); if (!A) return; const d = A.rows.slice(0, 15); if (!d.length) { el.append(Object.assign(document.createElement('p'), { className: 'pc-note', textContent: 'ไม่มียอดขายในช่วงที่เลือก' })); return; }
  const max = Math.max(1, ...d.map((x) => Math.max(x.c, x.pv)));
  for (const x of d) { const row = document.createElement('div'); row.className = 'pc-hrow'; const l = document.createElement('span'); l.className = 'l'; l.textContent = x.label; l.title = x.label + (x.sub ? ' · ' + x.sub : '');
    const t = document.createElement('span'); t.className = 't'; t.style.position = 'relative'; const f = document.createElement('span'); f.className = 'f'; f.style.display = 'block'; f.style.width = Math.max(0, x.c / max) * 100 + '%'; f.style.background = dash.colors[0]; t.append(f);
    if (A.I.pf) { const mk = document.createElement('span'); mk.style.cssText = 'position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--color-fg);left:' + Math.max(0, Math.min(100, (x.pv / max) * 100)) + '%'; mk.title = ((SA.info() || {}).ps || '') + ' ' + PC.mfmt(Math.round(x.pv)); t.append(mk); }
    const v = document.createElement('span'); v.className = 'v'; v.append(PC.mfmt(Math.round(x.c)) + ' · '); const g = document.createElement('b'); g.textContent = A.I.pf ? saPct(x.growth) : PC.pf(x.share); g.style.color = A.I.pf ? saCol(x.growth) : ''; v.append(g);
    row.append(l, t, v); el.append(row); } });
// SVG helpers
const saSvg = (el, H) => { el.replaceChildren(); const W = Math.max(280, el.clientWidth); const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`); return { svg, W, H }; };
const saTip = (el) => { const tip = document.createElement('div'); tip.className = 'pc-tip'; tip.hidden = true; el.append(tip); return (ev, lines) => { if (!lines) { tip.hidden = true; return; } tip.hidden = false; tip.replaceChildren(...lines.flatMap((l, i) => (i ? [document.createElement('br'), l] : [l]))); const r = el.getBoundingClientRect(); let lx = ev.clientX - r.left + 12; if (lx + tip.offsetWidth > r.width) lx = ev.clientX - r.left - tip.offsetWidth - 12; tip.style.left = Math.max(0, lx) + 'px'; tip.style.top = Math.max(0, ev.clientY - r.top - 40) + 'px'; }; };
const saFmtAx = (v) => (Math.abs(v) >= 1e6 ? d3.format('.3~s')(v).replace('G', 'B') : Math.abs(v) >= 1e4 ? d3.format('.3~s')(v) : PC.nf(Math.round(v)));
dash.draw('c_sa_pvm', (el) => { const A = SA.agg(); if (!A) { el.replaceChildren(); return; } if (!A.I.pf) { el.replaceChildren(Object.assign(document.createElement('p'), { className: 'pc-note', textContent: 'YTD ไม่มีข้อมูลปีก่อนให้เทียบ เลือก Today / Week / MTD เพื่อดูว่ายอดเปลี่ยนเพราะจำนวนชิ้นหรือราคา' })); return; }
  const T = A.T, asp0 = T.pu > 0 ? T.pn / T.pu : 0, vol = (T.cu - T.pu) * asp0, pm = T.cn - T.pn - vol;
  const steps = [[(SA.info() || {}).ps || 'Prev', 0, T.pn, 'base'], ['จำนวนชิ้น', T.pn, T.pn + vol, vol >= 0 ? 'up' : 'down'], ['ราคา/สัดส่วน', T.pn + vol, T.cn, pm >= 0 ? 'up' : 'down'], [(SA.info() || {}).cs || 'Now', 0, T.cn, 'base']];
  const { svg, W, H } = saSvg(el, 240); const tip = saTip(el); const lo = Math.min(0, ...steps.map((s) => Math.min(s[1], s[2]))), hi = Math.max(...steps.map((s) => Math.max(s[1], s[2])));
  const y = d3.scaleLinear([lo, hi * 1.08], [H - 28, 12]).nice(); const x = d3.scaleBand(steps.map((s) => s[0]), [56, W - 8]).padding(0.35);
  svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1', 56).attr('x2', W - 8).attr('y1', (d) => y(d)).attr('y2', (d) => y(d)).attr('stroke', 'var(--cds-chart-grid)');
  svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x', 50).attr('y', (d) => y(d) + 4).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text(saFmtAx);
  const col = { base: dash.colors[0], up: 'var(--color-ok)', down: 'var(--color-bad)' };
  const g = svg.append('g').selectAll('g').data(steps).join('g');
  g.append('rect').attr('x', (s) => x(s[0])).attr('width', x.bandwidth()).attr('y', (s) => y(Math.max(s[1], s[2]))).attr('height', (s) => Math.max(1, Math.abs(y(s[1]) - y(s[2])))).attr('rx', 3).attr('fill', (s) => col[s[3]])
    .on('pointerdown pointermove', (ev, s) => tip(ev, [s[0], (s[3] === 'base' ? '฿' : (s[2] - s[1] >= 0 ? '+฿' : '−฿')) + PC.nf(Math.round(Math.abs(s[3] === 'base' ? s[2] : s[2] - s[1])))])).on('pointerleave', (ev) => { if (ev.pointerType === 'mouse') tip(ev, null); });
  g.append('text').attr('x', (s) => x(s[0]) + x.bandwidth() / 2).attr('y', (s) => y(Math.max(s[1], s[2])) - 5).attr('text-anchor', 'middle').attr('font-size', 11).attr('font-weight', 600).attr('fill', 'var(--color-fg)')
    .text((s) => (s[3] === 'base' ? saFmtAx(s[2]) : (s[2] - s[1] >= 0 ? '+' : '−') + saFmtAx(Math.abs(s[2] - s[1]))));
  svg.append('g').selectAll('text').data(steps).join('text').attr('x', (s) => x(s[0]) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', 'var(--color-fg-muted)').text((s) => s[0]);
  svg.append('line').attr('x1', 56).attr('x2', W - 8).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', 'var(--cds-chart-axis)'); });
dash.draw('c_sa_trend', (el) => { const A = SA.agg(); if (!A) { el.replaceChildren(); return; } const N = A.N; const n = SA.diff(A.I.from, A.I.to) + 1;
  const cur = d3.range(n).map((i) => { const d = SA.add(A.I.from, i); const v = A.dc.get(d); return { i, d, v: v ? (N ? v.n : v.u) : 0 }; });
  const prv = A.I.pf ? d3.range(SA.diff(A.I.pf, A.I.pt) + 1).map((i) => { const d = SA.add(A.I.pf, i); const v = A.dp.get(d); return { i, d, v: v ? (N ? v.n : v.u) : 0 }; }) : [];
  const { svg, W, H } = saSvg(el, 240); const tip = saTip(el); const all = cur.concat(prv); const y = d3.scaleLinear([0, (d3.max(all, (d) => d.v) || 1) * 1.1], [H - 24, 10]).nice();
  if (n === 1) { const data = [{ k: (SA.info() || {}).cs || '', v: cur[0].v, c: dash.colors[0] }, ...(prv.length ? [{ k: (SA.info() || {}).ps || '', v: prv[0].v, c: 'var(--cds-chart-muted)' }] : [])]; const x = d3.scaleBand(data.map((d) => d.k), [56, W - 8]).padding(0.4);
    svg.append('g').selectAll('rect').data(data).join('rect').attr('x', (d) => x(d.k)).attr('width', x.bandwidth()).attr('y', (d) => y(d.v)).attr('height', (d) => y(0) - y(d.v)).attr('rx', 3).attr('fill', (d) => d.c);
    svg.append('g').selectAll('text').data(data).join('text').attr('x', (d) => x(d.k) + x.bandwidth() / 2).attr('y', (d) => y(d.v) - 5).attr('text-anchor', 'middle').attr('font-size', 12).attr('font-weight', 600).attr('fill', 'var(--color-fg)').text((d) => PC.mfmt(Math.round(d.v)));
    svg.append('g').selectAll('text.l').data(data).join('text').attr('x', (d) => x(d.k) + x.bandwidth() / 2).attr('y', H - 6).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', 'var(--color-fg-muted)').text((d) => d.k); return; }
  const x = d3.scaleLinear([0, Math.max(n, prv.length) - 1], [56, W - 10]);
  svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1', 56).attr('x2', W - 10).attr('y1', (d) => y(d)).attr('y2', (d) => y(d)).attr('stroke', 'var(--cds-chart-grid)');
  svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x', 50).attr('y', (d) => y(d) + 4).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text(saFmtAx);
  const every = Math.max(1, Math.ceil(n / Math.floor((W - 66) / 46)));
  svg.append('g').selectAll('text').data(cur.filter((d, i) => i % every === 0)).join('text').attr('x', (d) => x(d.i)).attr('y', H - 6).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text((d) => +d.d.slice(8, 10) + '/' + +d.d.slice(5, 7));
  const line = d3.line().x((d) => x(d.i)).y((d) => y(d.v));
  if (prv.length) svg.append('path').attr('d', line(prv)).attr('fill', 'none').attr('stroke', 'var(--color-fg-muted)').attr('stroke-dasharray', '4 4').attr('stroke-width', 1.5);
  svg.append('path').attr('d', line(cur)).attr('fill', 'none').attr('stroke', dash.colors[0]).attr('stroke-width', 2.5);
  svg.append('g').selectAll('circle').data(cur).join('circle').attr('cx', (d) => x(d.i)).attr('cy', (d) => y(d.v)).attr('r', n > 60 ? 1.5 : 3).attr('fill', dash.colors[0]);
  svg.append('rect').attr('x', 56).attr('y', 0).attr('width', W - 66).attr('height', H - 24).attr('fill', 'transparent').on('pointerdown pointermove', (ev) => { const [mx] = d3.pointer(ev); const i = Math.max(0, Math.min(n - 1, Math.round(x.invert(mx)))); const c = cur[i], q = prv[i];
    tip(ev, [PC.day(c.d) + ' · ' + PC.mfmt(Math.round(c.v)), ...(q ? [((SA.info() || {}).ps || '') + ' ' + PC.day(q.d) + ' · ' + PC.mfmt(Math.round(q.v))] : [])]); }).on('pointerleave', (ev) => { if (ev.pointerType === 'mouse') tip(ev, null); }); });
dash.draw('c_sa_pareto', (el) => { const A = SA.agg(); if (!A) { el.replaceChildren(); return; } const d = A.rows.filter((x) => x.c > 0); const tot = d3.sum(d, (x) => x.c); if (!d.length || !tot) { el.replaceChildren(Object.assign(document.createElement('p'), { className: 'pc-note', textContent: 'ไม่มียอดขายในช่วงที่เลือก' })); return; }
  let c = 0; const data = d.map((x, i) => { c += x.c; return { ...x, i, cum: c / tot }; });
  const { svg, W, H } = saSvg(el, 240); const tip = saTip(el); const x = d3.scaleBand(data.map((x) => x.i), [56, W - 40]).padding(data.length > 40 ? 0.05 : 0.2); const y = d3.scaleLinear([0, data[0].c * 1.05], [H - 24, 10]).nice(); const y2 = d3.scaleLinear([0, 1], [H - 24, 10]);
  svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x', 50).attr('y', (v) => y(v) + 4).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text(saFmtAx);
  svg.append('g').selectAll('text').data([0, 0.5, 0.8, 1]).join('text').attr('x', W - 36).attr('y', (v) => y2(v) + 4).attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text((v) => Math.round(v * 100) + '%');
  svg.append('line').attr('x1', 56).attr('x2', W - 40).attr('y1', y2(0.8)).attr('y2', y2(0.8)).attr('stroke', 'var(--color-warn)').attr('stroke-dasharray', '4 4');
  const k80 = data.findIndex((x) => x.cum >= 0.8);
  svg.append('g').selectAll('rect').data(data).join('rect').attr('x', (v) => x(v.i)).attr('width', x.bandwidth()).attr('y', (v) => y(v.c)).attr('height', (v) => y(0) - y(v.c)).attr('fill', (v) => (v.i <= k80 ? dash.colors[0] : 'var(--cds-chart-muted)'))
    .on('pointerdown pointermove', (ev, v) => tip(ev, [(v.i + 1) + '. ' + v.label, PC.mfmt(Math.round(v.c)) + ' · สะสม ' + PC.pf(v.cum)])).on('pointerleave', (ev) => { if (ev.pointerType === 'mouse') tip(ev, null); });
  svg.append('path').attr('d', d3.line().x((v) => x(v.i) + x.bandwidth() / 2).y((v) => y2(v.cum))(data)).attr('fill', 'none').attr('stroke', 'var(--color-fg)').attr('stroke-width', 1.5);
  svg.append('text').attr('x', 60).attr('y', H - 6).attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text((k80 + 1) + ' จาก ' + data.length + ' รายการ (' + PC.pf((k80 + 1) / data.length) + ') ทำยอด 80%'); });
dash.draw('c_sa_contrib', (el) => { el.replaceChildren(); const A = SA.agg(); if (!A) return; if (!A.I.pf) { el.append(Object.assign(document.createElement('p'), { className: 'pc-note', textContent: 'YTD ไม่มีข้อมูลปีก่อนให้เทียบ' })); return; }
  const up = A.rows.filter((x) => x.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 8), dn = A.rows.filter((x) => x.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 8); const max = Math.max(1, ...[...up, ...dn].map((x) => Math.abs(x.delta)));
  const tot = saC(A) - saP(A);
  for (const [lst, ttl] of [[up, 'เพิ่มขึ้นมากที่สุด'], [dn, 'ลดลงมากที่สุด']]) { const h = document.createElement('h4'); h.className = 'pc-h4'; h.textContent = ttl + (lst.length ? '' : ' — ไม่มี'); el.append(h);
    for (const x of lst) { const row = document.createElement('div'); row.className = 'pc-hrow'; const l = document.createElement('span'); l.className = 'l'; l.textContent = x.label; l.title = x.label + (x.sub ? ' · ' + x.sub : '');
      const t = document.createElement('span'); t.className = 't'; const f = document.createElement('span'); f.className = 'f'; f.style.display = 'block'; f.style.width = (Math.abs(x.delta) / max) * 100 + '%'; f.style.background = x.delta >= 0 ? 'var(--color-ok)' : 'var(--color-bad)'; t.append(f);
      const v = document.createElement('span'); v.className = 'v'; v.textContent = (x.delta >= 0 ? '+' : '−') + PC.mfmt(Math.round(Math.abs(x.delta))) + (tot ? ' · ' + PC.pf(Math.abs(x.delta / tot)) + ' ของส่วนต่างรวม' : ''); row.append(l, t, v); el.append(row); } } });
const QTH = { Star: 'ดาวเด่น', 'Cash Cow': 'ฐานหลัก', 'Question Mark': 'ดาวรุ่ง', Dog: 'ต้องฟื้นฟู', '-': '-' };
const QADV = { Star: 'รักษามาตรฐานและขยายผล', 'Cash Cow': 'ยอดหลักแต่โตช้า ต้องกระตุ้น', 'Question Mark': 'กำลังโต ควรลงทุนเพิ่ม', Dog: 'หาสาเหตุและทำแผนแก้ไข' };
const saQuad = (A) => { if (!A.I.pf) return () => '-'; const n = A.rows.filter((x) => x.c > 0).length || 1; const g0 = saP(A) > 0 ? saC(A) / saP(A) - 1 : 0; return (x) => { const hs = x.share >= 1 / n, hg = x.growth == null ? true : x.growth >= g0; return hs && hg ? 'Star' : hs ? 'Cash Cow' : hg ? 'Question Mark' : 'Dog'; }; };
dash.draw('c_sa_bcg', (el) => { const A = SA.agg(); if (!A) { el.replaceChildren(); return; } if (!A.I.pf) { el.replaceChildren(Object.assign(document.createElement('p'), { className: 'pc-note', textContent: 'YTD ไม่มีข้อมูลปีก่อน จึงคำนวณการเติบโตไม่ได้' })); return; }
  const d = A.rows.filter((x) => x.c > 0 && x.growth != null); if (!d.length) { el.replaceChildren(Object.assign(document.createElement('p'), { className: 'pc-note', textContent: 'ข้อมูลไม่พอสำหรับจัดกลุ่ม' })); return; }
  const { svg, W, H } = saSvg(el, 280); const tip = saTip(el); const n = A.rows.filter((x) => x.c > 0).length; const g0 = saP(A) > 0 ? saC(A) / saP(A) - 1 : 0; const q = saQuad(A);
  const gx = d.map((v) => Math.max(-1, Math.min(2, v.growth))); const x = d3.scaleLinear([0, d3.max(d, (v) => v.share) * 1.1], [56, W - 12]); const y = d3.scaleLinear([Math.min(-0.2, d3.min(gx)), Math.max(0.2, d3.max(gx))], [H - 28, 12]).nice(); const r = d3.scaleSqrt([0, d3.max(d, (v) => v.c)], [3, 18]);
  svg.append('g').selectAll('text').data(y.ticks(5)).join('text').attr('x', 50).attr('y', (v) => y(v) + 4).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text((v) => Math.round(v * 100) + '%');
  svg.append('g').selectAll('text').data(x.ticks(4)).join('text').attr('x', (v) => x(v)).attr('y', H - 10).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text((v) => Math.round(v * 1000) / 10 + '%');
  svg.append('line').attr('x1', x(1 / n)).attr('x2', x(1 / n)).attr('y1', 12).attr('y2', H - 28).attr('stroke', 'var(--cds-chart-axis)').attr('stroke-dasharray', '4 4');
  svg.append('line').attr('x1', 56).attr('x2', W - 12).attr('y1', y(g0)).attr('y2', y(g0)).attr('stroke', 'var(--cds-chart-axis)').attr('stroke-dasharray', '4 4');
  for (const [t, xx, yy, a] of [['ดาวเด่น', W - 14, 24, 'end'], ['ดาวรุ่ง', 60, 24, 'start'], ['ฐานหลัก', W - 14, H - 34, 'end'], ['ต้องฟื้นฟู', 60, H - 34, 'start']]) svg.append('text').attr('x', xx).attr('y', yy).attr('text-anchor', a).attr('font-size', 11).attr('font-weight', 600).attr('fill', 'var(--color-fg-muted)').text(t);
  const QC = { Star: 'var(--color-ok)', 'Cash Cow': dash.colors[0], 'Question Mark': 'var(--color-warn)', Dog: 'var(--color-bad)' };
  svg.append('g').selectAll('circle').data(d).join('circle').attr('cx', (v) => x(v.share)).attr('cy', (v) => y(Math.max(-1, Math.min(2, v.growth)))).attr('r', (v) => r(v.c)).attr('fill', (v) => QC[q(v)]).attr('fill-opacity', 0.55).attr('stroke', (v) => QC[q(v)])
    .on('pointerdown pointermove', (ev, v) => tip(ev, [v.label, QTH[q(v)] + ' — ' + QADV[q(v)], 'สัดส่วน ' + PC.pf(v.share) + ' · โต ' + saPct(v.growth) + ' · ' + PC.mfmt(Math.round(v.c))])).on('pointerleave', (ev) => { if (ev.pointerType === 'mouse') tip(ev, null); });
  if (d.length <= 25) svg.append('g').selectAll('text').data(d.slice(0, 10)).join('text').attr('x', (v) => x(v.share) + r(v.c) + 3).attr('y', (v) => y(Math.max(-1, Math.min(2, v.growth))) + 4).attr('font-size', 10).attr('fill', 'var(--color-fg)').text((v) => String(v.label).replace(/^True (Shop|shop|Move Shop) /, '').slice(0, 18)); });
dash.draw('tb_sa', (el) => { const A = SA.agg(); const q = A ? saQuad(A) : null; const rows = A && A.rows.map((x, i) => ({ ...x, rank: i + 1, quad: QTH[q(x)], cn: Math.round(x.cn), pn: Math.round(x.pn), asp: x.asp == null ? null : Math.round(x.asp), d: Math.round(x.delta) }));
  const lv = A ? A.lvl : 'zone';
  PC.table(el, 'tb_sa', rows, { key: ['key'], def: 'rank', dir: 1, limit: 2000, cols: [
    { f: 'rank', label: '#', num: true, fmt: PC.nf }, { f: 'label', label: saLvlName(), wrap: true }, ...(['shop', 'emp', 'area', 'mat', 'sub'].includes(lv) ? [{ f: 'sub', label: lv === 'emp' ? 'สาขาหลัก' : lv === 'shop' ? 'Area' : lv === 'mat' ? 'Type Sim · ราคา' : lv === 'sub' ? 'Type Sim' : 'Region', wrap: lv === 'shop' || lv === 'emp' }] : []),
    { f: 'cn', label: 'Net Amount', num: true, fmt: PC.nf, bar: A && A.N }, { f: 'cu', label: 'QTY', num: true, fmt: PC.nf, bar: A && !A.N }, { f: 'share', label: '% สัดส่วน', num: true, fmt: PC.pf }, { f: 'asp', label: 'ราคาเฉลี่ย/ชิ้น', num: true, fmt: PC.nf },
    ...(A && A.I.pf ? [{ f: 'pn', label: 'Net ' + A.I.ps, num: true, fmt: PC.nf }, { f: 'pu', label: 'QTY ' + A.I.ps, num: true, fmt: PC.nf }, { f: 'growth', label: '% เปลี่ยนแปลง', num: true, pill: (d) => (d.growth == null ? ['mute', 'ใหม่'] : [d.growth >= 0 ? 'ok' : d.growth > -0.1 ? 'warn' : 'bad', saPct(d.growth)]) },
      { f: 'd', label: 'ส่วนต่าง', num: true, fmt: (v) => (v > 0 ? '+' : '') + PC.nf(v) }, { f: 'quad', label: 'กลุ่มผลงาน' }] : []),
    ...(lv !== 'emp' ? [{ f: 'shops', label: 'สาขาที่ขาย', num: true, fmt: PC.nf }] : []) ] }); });
dash.draw('sa_alerts', (el) => { el.replaceChildren(); const S = SA.aggBy('shop'), E = SA.aggBy('emp'), M = SA.aggBy('mat'); if (!S || !E || !M) return; const I = S.I, N = S.N; const sh = (s) => String(s).replace(/^True (Shop|shop|Move Shop) /, '');
  const box = (cls, title, items, empty) => { const b = document.createElement('div'); b.className = 'pc-abox ' + cls; const h = document.createElement('h4'); h.textContent = title; b.append(h); const ol = document.createElement('ol');
    for (const parts of items) { const li = document.createElement('li'); for (const p of parts) { if (Array.isArray(p)) { const x = document.createElement('b'); x.textContent = p[0]; if (p[1]) x.style.color = p[1]; li.append(x); } else if (p && p.m) { const x = document.createElement('span'); x.className = 'm'; x.textContent = p.m; li.append(x); } else li.append(p); } ol.append(li); }
    if (!items.length) { const li = document.createElement('li'); li.className = 'm'; li.textContent = empty; ol.append(li); } b.append(ol); el.append(b); };
  const raw = SA.base() || []; const s = S.s; const sb = SA.subSel(); const inCur = (x) => x.date >= I.from && x.date <= I.to && (s === 'ALL' || x.group === s) && (sb === 'ALL' || x.simtype === sb);
  const shopMat = new Map(), shopEmp = new Map(); for (const x of raw) { if (!inCur(x)) continue; const k = String(x.shop), v = N ? x.net : x.units; const a = shopMat.get(k) || new Map(); a.set(String(x.matcode), (a.get(String(x.matcode)) || 0) + v); shopMat.set(k, a); const e = shopEmp.get(k) || new Map(); e.set(String(x.emp), (e.get(String(x.emp)) || 0) + v); shopEmp.set(k, e); }
  const matName = new Map(M.rows.map((x) => [x.key, x.label])), matShare = new Map(M.rows.map((x) => [x.key, x.share])), empName = new Map(E.rows.map((x) => [x.key, x.label]));
  const aspAll = S.T.cu > 0 ? S.T.cn / S.T.cu : 0; const g0 = I.pf && saP(S) > 0 ? saC(S) / saP(S) - 1 : null; const med = d3.median(S.rows.filter((x) => x.c > 0), (x) => x.c) || 0;
  // 1) model shops
  const good = S.rows.filter((x) => x.c > 0 && x.c >= med && (g0 == null || (x.growth != null && x.growth >= g0))).sort((a, b) => (I.pf ? b.delta - a.delta : b.c - a.c)).slice(0, 5);
  box('good', 'สาขาที่ทำได้ดี (ต้นแบบ)', good.map((x) => { const mm = [...(shopMat.get(x.key) || new Map()).entries()].sort((a, b) => b[1] - a[1]); const tot = d3.sum(mm, (m) => m[1]) || 1;
    const idx = mm.map(([k, v]) => ({ k, sh: v / tot, ix: (v / tot) / Math.max(0.001, matShare.get(k) || 0) })).filter((m) => m.sh >= 0.05).sort((a, b) => b.ix - a.ix)[0];
    const top = mm[0]; const em = [...(shopEmp.get(x.key) || new Map()).entries()].sort((a, b) => b[1] - a[1])[0];
    return [[sh(x.label)], ' ' + PC.mfmt(Math.round(x.c)) + (I.pf ? ' (' + saPct(x.growth) + ')' : ''), { m: ' · ราคาเฉลี่ย ฿' + PC.nf(Math.round(x.asp || 0)) + (aspAll ? (x.asp > aspAll * 1.1 ? ' สูงกว่าเฉลี่ย' : x.asp < aspAll * 0.9 ? ' ต่ำกว่าเฉลี่ย' : '') : '') },
      document.createElement('br'), { m: 'ถอดแบบ: ' + (top ? 'ขาย ' + matName.get(top[0]) + ' มากสุด ' + PC.pf(top[1] / tot) : '') + (idx && idx.ix > 1.3 && (!top || idx.k !== top[0]) ? ' · เน้น ' + matName.get(idx.k) + ' ' + PC.pf(idx.sh) + ' (ค่าเฉลี่ย ' + PC.pf(matShare.get(idx.k) || 0) + ')' : '') + (em ? ' · พนักงานหลัก ' + (empName.get(em[0]) || em[0]) + ' (' + PC.pf(em[1] / tot) + ' ของสาขา)' : '') }]; }), 'ยังไม่มีสาขาที่โดดเด่นในช่วงที่เลือก');
  // 2) top staff
  const te = E.rows.filter((x) => x.c > 0).slice(0, 5);
  box('good', 'พนักงานที่ขายได้ดี', te.map((x) => [[x.label], ' ' + PC.mfmt(Math.round(x.c)) + ' · ' + PC.nf(x.cu) + ' ชิ้น', { m: ' · ' + sh(x.sub || '') + (I.pf ? ' · ' + saPct(x.growth) : '') + ' · ราคาเฉลี่ย ฿' + PC.nf(Math.round(x.asp || 0)) }]), 'ไม่มีข้อมูล');
  // 3) SIM items
  const minC = saC(M) * 0.01; const topM = M.rows.filter((x) => x.c > 0).slice(0, 3); const rising = I.pf ? M.rows.filter((x) => x.c >= minC && x.growth != null && x.growth > 0.1).sort((a, b) => b.growth - a.growth).slice(0, 3) : [];
  box('info', 'ชนิดซิมที่ขายได้ดี / กำลังโต', [...topM.map((x) => [['ขายดี: ' + x.label], ' ' + PC.mfmt(Math.round(x.c)) + ' · ' + PC.pf(x.share), { m: ' · ' + x.sub + (I.pf ? ' · ' + saPct(x.growth) : '') }]),
    ...rising.map((x) => [['กำลังโต: ' + x.label, 'var(--color-ok)'], ' ' + saPct(x.growth), { m: ' · ' + PC.mfmt(Math.round(x.c)) + ' · ' + x.sub + ' → เตรียม Stock ให้พอ' }])], 'ไม่มีข้อมูล');
  // 4) watch / improve
  const W = [];
  if (I.pf) { S.rows.filter((x) => x.delta < 0 && x.pv > 0).sort((a, b) => a.delta - b.delta).slice(0, 4).forEach((x) => W.push([['สาขา ' + sh(x.label), 'var(--color-bad)'], ' ' + saPct(x.growth) + ' (−' + PC.mfmt(Math.round(-x.delta)) + ')', { m: ' → ตรวจ Stock / พนักงาน / Traffic' }]));
    E.rows.filter((x) => x.delta < 0 && x.pv >= med / 3).sort((a, b) => a.delta - b.delta).slice(0, 2).forEach((x) => W.push([['พนักงาน ' + x.label, 'var(--color-bad)'], ' ' + saPct(x.growth), { m: ' · ' + sh(x.sub || '') + ' → โค้ช/ทบทวนเป้ารายบุคคล' }]));
    M.rows.filter((x) => x.pv >= minC && x.growth != null && x.growth < -0.15).sort((a, b) => a.delta - b.delta).slice(0, 2).forEach((x) => W.push([['ซิม ' + x.label, 'var(--color-warn)'], ' ' + saPct(x.growth), { m: ' · ' + x.sub + ' → เช็ก Stock ขาด/ราคา/โปรโมชัน' }])); }
  if (aspAll) S.rows.filter((x) => x.cu >= 10 && x.asp != null && x.asp < aspAll * 0.7).sort((a, b) => a.asp - b.asp).slice(0, 2).forEach((x) => W.push([['ราคาเฉลี่ยต่ำ: ' + sh(x.label), 'var(--color-warn)'], ' ฿' + PC.nf(Math.round(x.asp)) + ' (เฉลี่ย ฿' + PC.nf(Math.round(aspAll)) + ')', { m: ' → แนะนำแพ็กเกจราคาสูง/ระยะยาว' }]));
  const tg = PC.rows('targets'), shopsD = new Map((PC.rows('shops') || []).map((x) => [String(x.shop), x]));
  if (tg && s === 'ALL' && PC.P().group === 'ALL') { const dim = (ds) => new Date(Date.UTC(+ds.slice(0, 4), +ds.slice(5, 7), 0)).getUTCDate(); const tm = new Map(); for (const t of tg) tm.set(t.month + '|' + t.shop, N ? +t.target_net || 0 : +t.target_units || 0);
    const low = S.rows.map((x) => { let tt = 0; for (let d = I.from; d <= I.to; d = SA.add(d, 1)) tt += (tm.get(d.slice(0, 7) + '|' + x.key) || 0) / dim(d); return { ...x, tt, at: tt > 0 ? x.c / tt : null }; }).filter((x) => x.at != null && x.tt >= 1 && x.at < 0.7).sort((a, b) => a.at - b.at).slice(0, 3);
    low.forEach((x) => W.push([['ต่ำกว่า Target: ' + sh(x.label), 'var(--color-bad)'], ' ' + PC.pf(x.at) + ' ของ Target ' + ((SA.info() || {}).cs || ''), { m: ' → วางแผนเร่งยอด/กระจาย Stock' }])); }
  box('watch', 'ต้องจับตา / Improve', W, 'ไม่มีกลุ่มที่น่ากังวลในช่วงที่เลือก');
});
dash.draw('sa_text', (el) => { el.replaceChildren(); const A = SA.agg(); if (!A) return; const li = (parts) => { const l = document.createElement('li'); for (const p of parts) { if (Array.isArray(p)) { const b = document.createElement('b'); b.textContent = p[0]; if (p[1]) b.style.color = p[1]; l.append(b); } else l.append(p); } el.append(l); };
  const T = A.T, N = A.N, I = A.I, cur = saC(A), prv = saP(A), lvn = saLvlName(); const sh = (s) => String(s).replace(/^True (Shop|shop|Move Shop) /, '');
  if (!A.rows.length) { li(['ไม่มียอดขายในช่วงที่เลือกตามตัวกรอง']); return; }
  li([I.label + (A.s !== 'ALL' ? ' · ' + A.s : '') + ': Net Amount ', ['฿' + PC.nf(Math.round(T.cn))], ' จาก ', [PC.nf(T.cu) + ' ชิ้น'], ' ราคาเฉลี่ย ', ['฿' + PC.nf(T.cu ? Math.round(T.cn / T.cu) : 0)],
    ...(I.pf ? [' · เทียบ ' + I.ps + ' ', [saPct(prv > 0 ? cur / prv - 1 : null), saCol(prv > 0 ? cur / prv - 1 : null)], ' (' + (cur - prv >= 0 ? '+' : '−') + PC.mfmt(Math.round(Math.abs(cur - prv))) + ')'] : [])]);
  if (I.pf && T.pu > 0) { const asp0 = T.pn / T.pu, vol = (T.cu - T.pu) * asp0, pm = T.cn - T.pn - vol; const main = Math.abs(vol) >= Math.abs(pm) ? 'จำนวนชิ้นที่ขายได้' : 'ราคาเฉลี่ยต่อชิ้น/สัดส่วนสินค้า';
    li(['ยอดเปลี่ยนเพราะอะไร: ยอดขายเปลี่ยน ', [(T.cn - T.pn >= 0 ? '+' : '−') + '฿' + PC.nf(Math.round(Math.abs(T.cn - T.pn)))], ' มาจากจำนวนชิ้น ', [(vol >= 0 ? '+' : '−') + '฿' + PC.nf(Math.round(Math.abs(vol))), saCol(vol)], ' และราคา/สัดส่วนสินค้า ', [(pm >= 0 ? '+' : '−') + '฿' + PC.nf(Math.round(Math.abs(pm))), saCol(pm)], ' → ตัวขับหลักคือ ', [main],
      pm < 0 && vol > 0 ? ' (ขายได้ชิ้นมากขึ้นแต่เป็นซิมราคาต่ำลง ควรดันซิมราคาสูง/แพ็กเกจยาว)' : pm > 0 && vol < 0 ? ' (ชิ้นลดลงแต่ขายซิมราคาสูงได้มากขึ้น ควรเพิ่ม Traffic/จำนวนชิ้น)' : '']); }
  if (A.tgt) { const t = N ? A.tgt.tn : A.tgt.tu; if (I.pd === 'mtd' && A.tgt.month) { const proj = (cur / A.tgt.el) * A.tgt.mdays, need = Math.max(0, (A.tgt.month - cur) / Math.max(1, A.tgt.mdays - A.tgt.el));
      li(['คาดการณ์สิ้นเดือน: ถ้าขายในอัตราเดิม สิ้นเดือนจะได้ ', [PC.mfmt(Math.round(proj))], ' = ', [PC.pf(proj / A.tgt.month), proj >= A.tgt.month ? 'var(--color-ok)' : 'var(--color-bad)'], ' ของ Target เดือน', proj >= A.tgt.month ? ' (คาดว่าทำได้ตามเป้า)' : ' · ต้องทำเพิ่มวันละ ' + PC.mfmt(Math.round(need)) + ' ในวันที่เหลือ']); }
    else if (t) li(['เทียบ Target ' + ((SA.info() || {}).cs || '') + ' (เฉลี่ยตามวัน): ทำได้ ', [PC.pf(cur / t), cur >= t ? 'var(--color-ok)' : 'var(--color-bad)'], ' (' + PC.mfmt(Math.round(cur)) + ' / ' + PC.mfmt(Math.round(t)) + ')']); }
  const pos = A.rows.filter((x) => x.c > 0); let c = 0, k = 0; const tot = d3.sum(pos, (x) => x.c); for (const x of pos) { c += x.c; k++; if (c / tot >= 0.8) break; }
  if (pos.length > 2) li(['กฎ 80/20: ', [k + ' จาก ' + pos.length + ' ' + lvn], ' (' + PC.pf(k / pos.length) + ') ทำยอด 80% ', k / pos.length <= 0.3 ? '→ ยอดกระจุกตัวสูง ควรดูแลกลุ่มหลักใกล้ชิดและพัฒนากลุ่มที่เหลือ' : '→ ยอดกระจายตัวดี', ' · อันดับ 1 คือ ', [sh(pos[0].label)], ' (' + PC.pf(pos[0].share) + ')']);
  if (I.pf) { const up = A.rows.filter((x) => x.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3), dn = A.rows.filter((x) => x.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);
    if (up.length) li(['ดันยอดขึ้นมากที่สุด: ', ...up.flatMap((x, i) => [(i ? ' · ' : ''), [sh(x.label)], ' +' + PC.mfmt(Math.round(x.delta)) + (x.growth != null ? ' (' + saPct(x.growth) + ')' : '')])]);
    if (dn.length) li(['ฉุดยอดลงมากที่สุด: ', ...dn.flatMap((x, i) => [(i ? ' · ' : ''), [sh(x.label), 'var(--color-bad)'], ' −' + PC.mfmt(Math.round(-x.delta)) + (x.growth != null ? ' (' + saPct(x.growth) + ')' : '')]), ' → ควรตรวจสาเหตุ (Stock, พนักงาน, Traffic)']);
    const q = saQuad(A); const grp = d3.group(A.rows.filter((x) => x.c > 0), q); const nm = (g) => (grp.get(g) || []).slice(0, 3).map((x) => sh(x.label)).join(', ');
    const cnt = (g) => (grp.get(g) || []).length;
    li(['จัดกลุ่มผลงาน: ', ['ดาวเด่น ' + cnt('Star'), 'var(--color-ok)'], cnt('Star') ? ' (' + nm('Star') + ') → รักษามาตรฐาน ใช้เป็นต้นแบบและขยายผล' : '']);
    if (cnt('Cash Cow')) li([['ฐานหลัก ' + cnt('Cash Cow'), '#3b7dd8'], ' (' + nm('Cash Cow') + ') → ยอดใหญ่แต่โตช้ากว่าค่าเฉลี่ย ควรกระตุ้นด้วยโปรโมชันและดูแล Stock ให้พอขาย']);
    if (cnt('Question Mark')) li([['ดาวรุ่ง ' + cnt('Question Mark'), 'var(--color-warn)'], ' (' + nm('Question Mark') + ') → กำลังโตเร็ว ควรลงทุนเพิ่ม เช่น เติม Stock เพิ่มกำลังขาย']);
    if (cnt('Dog')) li([['ต้องฟื้นฟู ' + cnt('Dog'), 'var(--color-bad)'], ' (' + nm('Dog') + ') → ยอดน้อยและหดตัว ควรหาสาเหตุ (Stock / พนักงาน / ทำเล) และทำแผนแก้ไข']); }
  if (A.lvl === 'emp' || A.lvl === 'shop') { const act = A.rows.filter((x) => x.cu > 0).length; li(['ผลงานเฉลี่ย: ', [act + ' ' + lvn], ' มียอดขาย เฉลี่ย ', [PC.mfmt(Math.round(cur / Math.max(1, act)))], ' ต่อ' + (A.lvl === 'emp' ? 'คน' : 'สาขา') + ' · ค่ากลาง ', [PC.mfmt(Math.round(d3.median(A.rows.filter((x) => x.cu > 0), (x) => x.c) || 0))]]); }
});
dash.onData(() => { const lv = dash.params().salevel || 'zone'; document.querySelectorAll('#wrap-sasim').forEach((n) => { n.hidden = lv === 'group'; }); document.querySelectorAll('#wrap-sasub').forEach((n) => { n.hidden = lv !== 'mat'; }); document.querySelectorAll('#f-saperiod').forEach((s) => { s.value = dash.params().saperiod || 'mtd'; }); document.querySelectorAll('#f-salevel').forEach((s) => { s.value = dash.params().salevel || 'zone'; }); document.querySelectorAll('#wrap-saweek').forEach((n) => { n.hidden = (dash.params().saperiod || 'mtd') !== 'week'; }); });
document.querySelectorAll('#f-saperiod').forEach((s) => s.addEventListener('change', () => dash.setParams({ saperiod: s.value })));
document.querySelectorAll('#f-salevel').forEach((s) => s.addEventListener('change', () => dash.setParams({ salevel: s.value })));


/* ---------- Staff tab: period ---------- */
dash.draw('f_stweek', (sel) => { const I = SA.period('week', dash.params().stweek); if (!I) return; const o = []; for (let w = I.cur.w; w >= 1; w--) { const [a, b] = SA.wRange(I.cur.y, w); o.push(new Option('Week ' + w + ' · ' + PC.day(a) + ' – ' + PC.day(b < I.today ? b : I.today), String(w))); } sel.replaceChildren(...o); sel.value = String(I.wk); sel.onchange = () => dash.setParams({ stweek: +sel.value }); });
const stInfo = () => SA.period(dash.params().stperiod || 'mtd', dash.params().stweek);
dash.draw('st_range', (el) => { const I = stInfo(); el.textContent = I ? I.label + ': ' + PC.day(I.from) + (I.to !== I.from ? ' – ' + PC.day(I.to) : '') + (I.plabel ? ' · เทียบกับ ' + I.plabel : '') : ''; });
dash.draw('st_label', (el) => { const I = stInfo(); el.textContent = I ? I.label : ''; });
const stAgg = () => { const r = PC.rows('enriched'), I = stInfo(); if (!r || !I) return null; const p = PC.P();
  const staff = new Map((PC.rows('staff') || []).map((x) => [String(x.emp), x])), shops = new Map((PC.rows('shops') || []).map((x) => [String(x.shop), x]));
  const m = new Map(); let tot = 0;
  for (const x of r) { if (!(PCin(x.area, p.area) && (p.stype === 'ALL' || x.stype === p.stype) && (p.group === 'ALL' || x.group === p.group))) continue;
    const cur = x.date >= I.from && x.date <= I.to, prv = I.pf && x.date >= I.pf && x.date <= I.pt; if (!cur && !prv) continue;
    const k = String(x.emp); const a = m.get(k) || { emp: k, units: 0, net: 0, pu: 0, pn: 0, mc: new Set(), days: new Set(), shops: new Map() };
    if (cur) { a.units += x.units; a.net += x.net; if (x.units > 0) { a.mc.add(x.matcode); a.days.add(x.date); } a.shops.set(String(x.shop), (a.shops.get(String(x.shop)) || 0) + x.units); tot += PC.isNet() ? x.net : x.units; } else { a.pu += x.units; a.pn += x.net; }
    m.set(k, a); }
  const N = PC.isNet();
  return [...m.values()].filter((a) => a.units !== 0 || a.net !== 0).map((a) => { const e = staff.get(a.emp) || {}; const main = [...a.shops.entries()].sort((x, y) => y[1] - x[1])[0]; const shop = shops.get(String(main ? main[0] : e.shop)) || {};
    const c = N ? a.net : a.units, pv = N ? a.pn : a.pu;
    return { emp: a.emp, name: e.name || a.emp, shop: shop.name || (main ? main[0] : '-'), area: shop.area || '-', units: a.units, net: Math.round(a.net), share: tot ? c / tot : 0, asp: a.units > 0 ? Math.round(a.net / a.units) : null,
      matcodes: a.mc.size, days: a.days.size, prev: I.pf ? Math.round(pv) : null, growth: I.pf && pv > 0 ? c / pv - 1 : null }; }); };
dash.draw('tb_staff', (el) => { const I = stInfo(); const N = PC.isNet(); const r = stAgg(); const rows = r && r.sort((a, b) => (N ? b.net - a.net : b.units - a.units)).map((x, i) => ({ ...x, rank: i + 1 }));
  PC.table(el, 'tb_staff', rows, { key: ['emp'], def: 'rank', dir: 1, q: 'staff', limit: 3000, cols: [
    { f: 'rank', label: '#', num: true, fmt: PC.nf }, { f: 'emp', label: 'รหัส' }, { f: 'name', label: 'ชื่อ' }, { f: 'shop', label: 'สาขาหลัก (' + ((I && I.cs) || '') + ')', wrap: true }, { f: 'area', label: 'Area' },
    { f: 'units', label: 'QTY', num: true, fmt: PC.nf, bar: !N }, { f: 'net', label: 'Net Amount (บาท)', num: true, fmt: PC.nf, bar: N }, { f: 'share', label: '% สัดส่วน', num: true, fmt: PC.pf },
    ...(I && I.pf ? [{ f: 'prev', label: (N ? 'Net Amount' : 'QTY') + ' ' + I.ps, num: true, fmt: PC.nf }, { f: 'growth', label: 'vs ' + I.ps, num: true, pill: (d) => (d.growth == null ? ['mute', 'ใหม่'] : [d.growth >= 0 ? 'ok' : d.growth > -0.1 ? 'warn' : 'bad', (d.growth > 0 ? '+' : d.growth < 0 ? '−' : '') + PC.pf(Math.abs(d.growth))]) }] : []),
    { f: 'asp', label: 'ราคาเฉลี่ย/ชิ้น', num: true, fmt: PC.nf }, { f: 'matcodes', label: 'จำนวน Matcode', num: true, fmt: PC.nf }, { f: 'days', label: 'วันที่มียอด', num: true, fmt: PC.nf } ] }); });
const stRoster = () => { const r = PC.rows('enriched'), I = stInfo(); if (!r || !I) return null; const p = PC.P(); const from = SA.add(I.to, -59);
  const shops = new Map((PC.rows('shops') || []).map((x) => [String(x.shop), x])), staff = new Map((PC.rows('staff') || []).map((x) => [String(x.emp), x]));
  const m = new Map(), sold = new Set();
  for (const x of r) { if (!(PCin(x.area, p.area) && (p.stype === 'ALL' || x.stype === p.stype) && (p.group === 'ALL' || x.group === p.group))) continue;
    if (x.date >= I.from && x.date <= I.to && x.units > 0) sold.add(String(x.emp));
    if (x.date >= from && x.date <= I.to && x.units > 0) { const k = String(x.emp); const a = m.get(k) || { emp: k, units: 0, net: 0, last: '', shops: new Map() }; a.units += x.units; a.net += x.net; if (x.date > a.last) a.last = x.date; a.shops.set(String(x.shop), (a.shops.get(String(x.shop)) || 0) + x.units); m.set(k, a); } }
  const none = [...m.values()].filter((a) => !sold.has(a.emp)).map((a) => { const main = [...a.shops.entries()].sort((x, y) => y[1] - x[1])[0]; const s = shops.get(main[0]) || {};
    return { emp: a.emp, name: (staff.get(a.emp) || {}).name || a.emp, shop: s.name || main[0], area: s.area || '-', last: a.last, idle: SA.diff(a.last, I.to), units60: a.units, net60: Math.round(a.net) }; });
  return { roster: m.size, sold: [...m.keys()].filter((k) => sold.has(k)).length, soldAll: sold.size, none, from }; };
dash.draw('st_sum', (el) => { const r = stAgg(), R = stRoster(); if (!r || !R) { el.textContent = ''; return; } const act = r.filter((x) => x.units > 0); const N = PC.isNet(); const tot = d3.sum(act, (x) => (N ? x.net : x.units));
  el.textContent = 'พนักงานที่มียอด ' + PC.nf(act.length) + ' คน · ยังไม่มียอด ' + PC.nf(R.none.length) + ' คน (จากพนักงานที่เคยขายใน 60 วันล่าสุด ' + PC.nf(R.roster) + ' คน) · ยอดรวม ' + PC.mfmt(Math.round(tot)) + ' · เฉลี่ยต่อคนที่มียอด ' + PC.mfmt(Math.round(tot / Math.max(1, act.length))) + ' · ค่ากลาง ' + PC.mfmt(Math.round(d3.median(act, (x) => (N ? x.net : x.units)) || 0)); });
dash.draw('st_none_sum', (el) => { const R = stRoster(); el.textContent = R ? 'ดูรายชื่อพนักงานที่ยังไม่มียอด ' + ((stInfo() || {}).cs || '') + ' (' + PC.nf(R.none.length) + ' คน)' : 'ดูรายชื่อพนักงานที่ยังไม่มียอด'; });
dash.draw('tb_staff_none', (el) => { const R = stRoster(); PC.table(el, 'tb_staff_none', R && R.none, { key: ['emp'], def: 'net60', q: 'staff', limit: 3000, cols: [
  { f: 'emp', label: 'รหัส' }, { f: 'name', label: 'ชื่อ' }, { f: 'shop', label: 'สาขาหลัก (60 วัน)', wrap: true }, { f: 'area', label: 'Area' },
  { f: 'last', label: 'ขายล่าสุด', fmt: (v) => PC.day(v) }, { f: 'idle', label: 'ไม่มียอดมาแล้ว (วัน)', num: true, fmt: PC.nf }, { f: 'units60', label: 'QTY 60 วัน', num: true, fmt: PC.nf }, { f: 'net60', label: 'Net Amount 60 วัน', num: true, fmt: PC.nf, bar: true } ] }); });
dash.onData(() => { document.querySelectorAll('#f-stperiod').forEach((s) => { s.value = dash.params().stperiod || 'mtd'; }); document.querySelectorAll('#wrap-stweek').forEach((n) => { n.hidden = (dash.params().stperiod || 'mtd') !== 'week'; }); });
document.querySelectorAll('#f-stperiod').forEach((s) => s.addEventListener('change', () => dash.setParams({ stperiod: s.value })));

/* ---------- Shops tab: period ---------- */
dash.draw('f_shweek', (sel) => { const I = SA.period('week', dash.params().shweek); if (!I) return; const o = []; for (let w = I.cur.w; w >= 1; w--) { const [a, b] = SA.wRange(I.cur.y, w); o.push(new Option('Week ' + w + ' · ' + PC.day(a) + ' – ' + PC.day(b < I.today ? b : I.today), String(w))); } sel.replaceChildren(...o); sel.value = String(I.wk); sel.onchange = () => dash.setParams({ shweek: +sel.value }); });
const shInfo = () => SA.period(dash.params().shperiod || 'mtd', dash.params().shweek);
dash.draw('sh_range', (el) => { const I = shInfo(); el.textContent = I ? I.label + ': ' + PC.day(I.from) + (I.to !== I.from ? ' – ' + PC.day(I.to) : '') + (I.plabel ? ' · เทียบกับ ' + I.plabel : '') : ''; });
for (const n of ['sh_label', 'sh_label2']) dash.draw(n, (el) => { const I = shInfo(); el.textContent = I ? I.label : ''; });
const shAgg = () => { const r = PC.rows('enriched'), I = shInfo(), shops = PC.rows('shops'), tg = PC.rows('targets'), st = PC.rows('stock_by_shop'); if (!r || !I || !shops) return null; const p = PC.P(), N = PC.isNet();
  const S = new Map(shops.map((x) => [String(x.shop), x])); const m = new Map();
  const g = (k) => { if (!m.has(k)) { const s = S.get(k) || {}; m.set(k, { shop: k, name: s.name || k, area: s.area || '-', zone: PCzone(s.area) || '-', type: s.stype || '-', units: 0, net: 0, pu: 0, pn: 0, emps: new Set(), tu: 0, tn: 0, stock: 0, aged: 0 }); } return m.get(k); };
  for (const x of r) { if (!(PCin(x.area, p.area) && (p.stype === 'ALL' || x.stype === p.stype) && (p.group === 'ALL' || x.group === p.group))) continue; const cur = x.date >= I.from && x.date <= I.to, prv = I.pf && x.date >= I.pf && x.date <= I.pt; if (!cur && !prv) continue;
    const a = g(String(x.shop)); if (cur) { a.units += x.units; a.net += x.net; if (x.units > 0) a.emps.add(x.emp); } else { a.pu += x.units; a.pn += x.net; } }
  if (tg && p.group === 'ALL') { const dim = (ds) => new Date(Date.UTC(+ds.slice(0, 4), +ds.slice(5, 7), 0)).getUTCDate(); const tm = new Map(); for (const t of tg) tm.set(t.month + '|' + String(t.shop), t);
    const days = []; for (let d = I.from; d <= I.to; d = SA.add(d, 1)) days.push(d);
    for (const s of shops) { const k = String(s.shop); if (+s.stype_order >= 90 || !PCin(s.area, p.area) || (p.stype !== 'ALL' && s.stype !== p.stype) || (p.shop !== 'ALL' && k !== p.shop)) continue; let tu = 0, tn = 0;
      for (const d of days) { const t = tm.get(d.slice(0, 7) + '|' + k); if (t) { tu += (+t.target_units || 0) / dim(d); tn += (+t.target_net || 0) / dim(d); } } if (tu || tn) { const a = g(k); a.tu = tu; a.tn = tn; } } }
  if (st) for (const s of st) { const k = String(s.shop); if (!m.has(k)) continue; const a = m.get(k); a.stock += +s.qty || 0; a.aged += (+s.a271_365 || 0) + (+s.a365p || 0); }
  if (p.shop !== 'ALL') for (const k of [...m.keys()]) if (k !== p.shop) m.delete(k);
  return [...m.values()].map((a) => { const c = N ? a.net : a.units, pv = N ? a.pn : a.pu, t = N ? a.tn : a.tu;
    return { ...a, net: Math.round(a.net), pn: Math.round(a.pn), staff: a.emps.size, c, pv, target: t ? Math.round(t * (N ? 1 : 10)) / (N ? 1 : 10) : null, ach: t ? c / t : null, growth: I.pf && pv > 0 ? c / pv - 1 : null, asp: a.units > 0 ? Math.round(a.net / a.units) : null }; })
    .filter((a) => a.units !== 0 || a.net !== 0 || a.target || a.stock); };
const shPill = (v) => (v == null ? ['mute', '–'] : [v >= 1 ? 'ok' : v >= 0.9 ? 'warn' : 'bad', PC.pf(v)]);
const shGrow = (d) => (d.growth == null ? ['mute', d.pv ? '–' : 'ใหม่'] : [d.growth >= 0 ? 'ok' : d.growth > -0.1 ? 'warn' : 'bad', (d.growth > 0 ? '+' : d.growth < 0 ? '−' : '') + PC.pf(Math.abs(d.growth))]);
const shCols = (I, N) => [{ f: 'target', label: 'Target ' + ((I && I.cs) || ''), num: true, fmt: PC.nf }, { f: 'c', label: (N ? 'Net Amount' : 'QTY') + ' ' + ((I && I.cs) || ''), num: true, fmt: (v) => PC.nf(Math.round(v)), bar: true }, { f: 'ach', label: '% Target', num: true, pill: (d) => shPill(d.ach) },
  ...(I && I.pf ? [{ f: 'pv', label: (N ? 'Net Amount' : 'QTY') + ' ' + I.ps, num: true, fmt: (v) => PC.nf(Math.round(v)) }, { f: 'growth', label: 'vs ' + I.ps, num: true, pill: shGrow }] : [])];
dash.draw('tb_region', (el) => { const r = shAgg(), I = shInfo(), N = PC.isNet(); let rows = null;
  if (r) { const m = new Map(); for (const x of r) { const a = m.get(x.area) || { area: x.area, zone: x.zone, shops: 0, sold: 0, units: 0, net: 0, c: 0, pv: 0, t: 0 }; a.shops++; if (x.units > 0) a.sold++; a.units += x.units; a.net += x.net; a.c += x.c; a.pv += x.pv; a.t += x.target || 0; m.set(x.area, a); }
    rows = [...m.values()].map((a) => ({ ...a, target: a.t ? Math.round(a.t) : null, ach: a.t ? a.c / a.t : null, growth: I && I.pf && a.pv > 0 ? a.c / a.pv - 1 : null })); }
  PC.table(el, 'tb_region', rows, { key: ['area'], def: 'c', cols: [{ f: 'area', label: 'Area' }, { f: 'zone', label: 'Region' }, { f: 'sold', label: 'สาขาที่มียอด', num: true, fmt: PC.nf }, ...shCols(I, N),
    { f: N ? 'units' : 'net', label: (N ? 'QTY ' : 'Net Amount ') + ((I && I.cs) || ''), num: true, fmt: PC.nf }] }); });
dash.draw('tb_shop', (el) => { const r = shAgg(), I = shInfo(), N = PC.isNet();
  PC.table(el, 'tb_shop', r, { key: ['shop'], def: 'c', q: 'shop', limit: 2000, cols: [{ f: 'shop', label: 'รหัส' }, { f: 'name', label: 'สาขา', wrap: true }, { f: 'area', label: 'Area' }, { f: 'type', label: 'ประเภทสาขา' }, ...shCols(I, N),
    { f: N ? 'units' : 'net', label: (N ? 'QTY ' : 'Net Amount ') + ((I && I.cs) || ''), num: true, fmt: PC.nf }, { f: 'asp', label: 'ราคาเฉลี่ย/ชิ้น', num: true, fmt: PC.nf }, { f: 'staff', label: 'พนักงานที่ขาย', num: true, fmt: PC.nf },
    { f: 'stock', label: 'Stock', num: true, fmt: PC.nf }, { f: 'aged', label: 'Stock เก่า', num: true, fmt: PC.nf }] }); });
dash.draw('sh_sum', (el) => { const r = shAgg(); if (!r) { el.textContent = ''; return; } const N = PC.isNet(); const sold = r.filter((x) => x.units > 0); const tc = d3.sum(r, (x) => x.c), tt = d3.sum(r, (x) => x.target || 0); const hit = r.filter((x) => x.ach != null && x.ach >= 1).length, wt = r.filter((x) => x.ach != null).length;
  el.textContent = 'สาขาที่มียอด ' + PC.nf(sold.length) + ' สาขา · ยอดรวม ' + PC.mfmt(Math.round(tc)) + (tt ? ' · Target ' + PC.mfmt(Math.round(tt)) + ' (' + PC.pf(tc / tt) + ') · ถึง Target ' + PC.nf(hit) + ' จาก ' + PC.nf(wt) + ' สาขา' : ''); });
dash.onData(() => { document.querySelectorAll('#f-shperiod').forEach((s) => { s.value = dash.params().shperiod || 'mtd'; }); document.querySelectorAll('#wrap-shweek').forEach((n) => { n.hidden = (dash.params().shperiod || 'mtd') !== 'week'; }); });
document.querySelectorAll('#f-shperiod').forEach((s) => s.addEventListener('change', () => dash.setParams({ shperiod: s.value })));

/* ---------- Ranking Area: export landscape image (Region + Daily + cumulative) ---------- */
const RKX = (() => {
  const C = { bg: '#ffffff', fg: '#1d1d1b', mu: '#6b6a66', line: '#e4e2dc', grid: '#ecebe6', ok: '#23874f', warn: '#b7791f', bad: '#c63d36' };
  const col = (a) => (a == null ? C.mu : a >= 1 ? C.ok : a >= 0.9 ? C.warn : C.bad);
  const zoneRows = () => { const all = PC.rows('area_rank'), ad = PC.rows('area_day'); if (!all) return []; const st = PC.P().stype, f = rkF(), N = PC.isNet(), d = rDate();
    return all.filter((x) => x.stype === st && window.PC_ZONES.includes(x.area)).sort((a, b) => (b[f.ach] ?? -1) - (a[f.ach] ?? -1)).map((x) => { const y = (ad || []).find((z) => z.stype === st && z.area === x.area && z.date === d) || {};
      return { ...x, areas: new Set(all.filter((z) => z.stype === st && !window.PC_ZONES.includes(z.area) && z.area !== 'ALL' && PCzone(z.area) === x.area).map((z) => z.area)).size, dval: y[f.d] ?? 0, dach: y[f.ach] ?? null, mom: x[N ? 'mom_net' : 'mom_units'] }; }); };
  const fit = (g, s, w) => { if (g.measureText(s).width <= w) return s; while (s.length > 1 && g.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; };
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const draw = async () => {
    try { await document.fonts.ready; } catch (e) {}
    const FF = getComputedStyle(document.body).fontFamily || 'sans-serif'; const F = (w, s) => w + ' ' + s + 'px ' + FF;
    const f = rkF(), N = PC.isNet(), d = rDate(), rk = rkRows() || [], rd = rdRows() || [], zr = zoneRows(); const ar = PC.rows('area_rank'); const r0 = ar && ar[0];
    const W = 2000, P = 48, GAP = 32, ROW = 46; const n = Math.max(rk.length, rd.length);
    const H = P + 110 + 50 + 250 + 40 + 50 + 34 + n * ROW + 14 + P; const S = 2;
    const cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S; const g = cv.getContext('2d'); g.scale(S, S); g.textBaseline = 'alphabetic';
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    // header
    let y = P + 34; g.fillStyle = C.fg; g.font = F(700, 34); g.fillText('Prepay Dashboard · Ranking Area · ' + (N ? 'Net Amount' : 'QTY'), P, y);
    const p = PC.P(); const meta = [r0 ? 'ข้อมูลถึง ' + PC.day(r0.today) + ' (' + r0.elapsed + '/' + r0.days + ' วัน)' : '', d ? 'Daily: ' + PC.day(d) : '', p.area !== 'ALL' ? 'Filter: ' + p.area : '', p.stype !== 'ALL' ? 'ประเภทสาขา: ' + p.stype : ''].filter(Boolean).join('  ·  ');
    g.font = F(400, 20); g.fillStyle = C.mu; g.textAlign = 'right'; g.fillText(meta, W - P, y); g.textAlign = 'left';
    const tot = rkTot('area_rank'), dtot = rkTot('area_day'); y += 44;
    if (tot) { g.font = F(400, 22); g.fillStyle = C.fg; let x = P; const seg = (s, c, w) => { g.fillStyle = c || C.fg; g.font = F(w || 400, 22); g.fillText(s, x, y); x += g.measureText(s).width; };
      seg('รวม  สะสม '); seg(PC.pf(tot[f.ach]), col(tot[f.ach]), 700); seg('  (' + PC.mfmt(tot[f.act]) + ' / Target ถึงวันนี้ ' + PC.mfmt(tot[f.ttd]) + ')', C.mu);
      if (dtot) { seg('     Daily '); seg(PC.pf(dtot[f.ach]), col(dtot[f.ach]), 700); seg('  (' + PC.mfmt(dtot[f.d]) + ' / Target ต่อวัน ' + PC.mfmt(dtot[f.tpd]) + ')', C.mu); }
      seg('     Target ทั้งเดือน ' + PC.mfmt(tot[f.tgt]), C.mu); }
    y += 26; g.fillStyle = C.line; g.fillRect(P, y, W - 2 * P, 2);
    // region cards
    y += 46; g.fillStyle = C.fg; g.font = F(700, 26); g.fillText('สรุปราย Region', P, y); y += 18;
    const cw = (W - 2 * P - 2 * GAP) / 3, ch = 236;
    zr.forEach((z, i) => { const x = P + i * (cw + GAP); g.fillStyle = C.bg; rr(g, x, y, cw, ch, 10); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
      g.save(); rr(g, x, y, cw, ch, 10); g.clip(); g.fillStyle = col(z[f.ach]); g.fillRect(x, y, cw, 7); g.restore();
      g.fillStyle = C.fg; g.font = F(700, 26); g.fillText('#' + (i + 1) + ' ' + z.area, x + 22, y + 46);
      g.font = F(400, 17); g.fillStyle = C.mu; g.textAlign = 'right'; g.fillText(PC.nf(z.areas) + ' Area · ' + PC.nf(z.shops) + ' สาขา', x + cw - 22, y + 46); g.textAlign = 'left';
      g.font = F(700, 50); g.fillStyle = col(z[f.ach]); const big = PC.pf(z[f.ach]); g.fillText(big, x + 22, y + 104); const bw = g.measureText(big).width; g.font = F(400, 17); g.fillStyle = C.mu; g.fillText('ยอดสะสมเทียบ Target ถึงวันนี้', x + 34 + bw, y + 102);
      const items = [['Target ถึงวันนี้', PC.mfmt(z[f.ttd])], ['ยอดสะสม', PC.mfmt(z[f.act])], ['ยอดรายวัน', PC.mfmt(z.dval) + (z.dach == null ? '' : ' (' + PC.pf(z.dach) + ')'), col(z.dach)], ['MoM', z.mom == null ? '–' : (z.mom > 0 ? '+' : z.mom < 0 ? '−' : '') + PC.pf(Math.abs(z.mom)), z.mom == null ? C.fg : z.mom >= 0 ? C.ok : C.bad], ['Target ทั้งเดือน', PC.mfmt(z[f.tgt])], ['ต้องทำต่อวัน', z[f.need] == null ? '—' : PC.mfmt(z[f.need])]];
      const hw = (cw - 44 - 24) / 2; items.forEach((it, k) => { const cx = x + 22 + (k % 2) * (hw + 24), cy = y + 146 + Math.floor(k / 2) * 30; g.font = F(400, 17); g.fillStyle = C.mu; g.fillText(it[0], cx, cy); g.font = F(600, 18); g.fillStyle = it[2] || C.fg; g.textAlign = 'right'; g.fillText(it[1], cx + hw, cy); g.textAlign = 'left'; }); });
    y += ch + 40;
    // two rankings
    const lw = (W - 2 * P - GAP) / 2;
    const list = (x, title, rows, rankK, actK, tgtK, tgtL) => { let yy = y + 10; g.fillStyle = C.fg; g.font = F(700, 26); g.fillText(fit(g, title, lw), x, yy); yy += 34;
      g.font = F(400, 15); g.fillStyle = C.mu; g.fillText('#', x, yy); g.fillText('Area · ยอด / ' + tgtL, x + 40, yy); const bx = x + lw * 0.47, bwid = lw * 0.4; g.fillText('เทียบ Target (เส้น = 100%)', bx, yy); g.textAlign = 'right'; g.fillText('%', x + lw, yy); g.textAlign = 'left';
      yy += 10; g.fillStyle = C.line; g.fillRect(x, yy, lw, 2); const mx = Math.max(1.2, d3.max(rows, (r) => r[f.ach] || 0) * 1.05);
      rows.forEach((r, i) => { const top = yy + i * ROW; if (i) { g.fillStyle = C.grid; g.fillRect(x, top, lw, 1); }
        g.font = F(600, 18); g.fillStyle = C.mu; g.textAlign = 'right'; g.fillText(String(r[rankK]), x + 26, top + 30); g.textAlign = 'left';
        g.font = F(500, 19); g.fillStyle = C.fg; g.fillText(fit(g, r.area.replace(/^UPC - /, ''), bx - x - 56), x + 40, top + 22); g.font = F(400, 15); g.fillStyle = C.mu; g.fillText(PC.mfmt(r[actK]) + ' / ' + PC.mfmt(r[tgtK]), x + 40, top + 40);
        const by = top + 15; g.fillStyle = C.grid; rr(g, bx, by, bwid, 16, 8); g.fill(); const a = Math.max(0, r[f.ach] || 0); const fw = Math.max(0, Math.min(1, a / mx)) * bwid; if (fw > 0) { g.fillStyle = col(r[f.ach]); rr(g, bx, by, Math.max(fw, 16), 16, 8); g.fill(); }
        g.fillStyle = C.fg; g.fillRect(bx + bwid / mx - 1, by - 4, 2.5, 24);
        g.font = F(700, 19); g.fillStyle = col(r[f.ach]); g.textAlign = 'right'; g.fillText(r[f.ach] == null ? '–' : PC.pf(r[f.ach]), x + lw, top + 30); g.textAlign = 'left'; }); };
    const ml = N ? 'Net Amount' : 'QTY';
    list(P, 'Daily Ranking · ' + ml + ' ' + (d ? PC.day(d) : '') + ' เทียบ Target ต่อวัน', rd, 'drank', f.d, f.tpd, 'Target ต่อวัน');
    list(P + lw + GAP, 'Ranking ยอดสะสม · ' + ml + ' เดือนนี้เทียบ Target ถึงวันนี้', rk, 'rank', f.act, f.ttd, 'Target ถึงวันนี้');
    g.font = F(400, 15); g.fillStyle = C.mu; g.fillText('สี: เขียว ≥ 100% · ส้ม 90–99% · แดง < 90%  ·  Target ต่อวัน = Target เดือน ÷ จำนวนวันในเดือน  ·  ส่งออกจาก Prepay Dashboard ' + new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }), P, H - P + 6);
    return { cv, name: 'Prepay_Ranking_' + (N ? 'Net' : 'QTY') + '_' + (d || 'latest') + (p.area !== 'ALL' ? '_' + p.area.replace(/[^\w]+/g, '') : '') + '.png' };
  };
  const show = (cv, name) => cv.toBlob((blob) => { const url = URL.createObjectURL(blob); const m = document.createElement('div'); m.className = 'pc-xmodal';
    const box = document.createElement('div'); box.className = 'pc-xbox'; const bt = document.createElement('div'); bt.className = 'pc-xbtns';
    const a = document.createElement('a'); a.className = 'pri'; a.href = url; a.download = name; a.textContent = '⬇ ดาวน์โหลด PNG';
    const file = new File([blob], name, { type: 'image/png' }); const sh = document.createElement('button'); sh.type = 'button'; sh.textContent = 'แชร์ / บันทึกลงรูปภาพ'; sh.onclick = () => navigator.share({ files: [file], title: name }).catch(() => {});
    const cl = document.createElement('button'); cl.type = 'button'; cl.textContent = '✕ ปิด'; const hint = document.createElement('span'); hint.className = 'hint'; hint.textContent = 'ถ้าดาวน์โหลดไม่ได้: กดค้างที่รูป (มือถือ) หรือคลิกขวา › บันทึกรูปภาพ (PC)';
    bt.append(a); if (navigator.canShare && navigator.canShare({ files: [file] })) bt.append(sh); bt.append(cl, hint);
    const img = new Image(); img.src = url; img.alt = name; box.append(bt, img); m.append(box); document.body.append(m);
    const close = () => { m.remove(); URL.revokeObjectURL(url); }; cl.onclick = close; m.onclick = (e) => { if (e.target === m) close(); };
    try { a.click(); } catch (e) {} }, 'image/png');
  return { draw, show, C, rr, fit };
})();
if (!window.PC_RKX_BOUND) { window.PC_RKX_BOUND = true;
  document.addEventListener('click', async (e) => { const b = e.target.closest && e.target.closest('#rk-export'); if (!b) return; b.disabled = true; const t = b.textContent; b.textContent = 'กำลังสร้างรูป…';
    try { const { cv, name } = await RKX.draw(); RKX.show(cv, name); } catch (err) { console.error(err); } finally { b.disabled = false; b.textContent = t; } }); }

/* ---------- Aging Sim (stock aging buckets + watch levels) ---------- */
const AG = [
  { k: 'a0_90', label: '0–90 วัน', lv: 'ปกติ', act: 'ขายตามปกติ', c: 'var(--ag0)' },
  { k: 'a91_180', label: '91–180 วัน', lv: 'เฝ้าระวัง', act: 'ติดตามและดันขายก่อนเกิน 180 วัน', c: 'var(--ag1)' },
  { k: 'a181_270', label: '181–270 วัน', lv: 'เสี่ยง', act: 'เร่งขาย / จัดโปร / โยกไปสาขาที่ขายดี', c: 'var(--ag2)' },
  { k: 'a271_365', label: '271–365 วัน', lv: 'เสี่ยงสูง', act: 'โยกด่วนไปสาขาที่ขายได้ / ให้พนักงานเสนอขายก่อน', c: 'var(--ag3)' },
  { k: 'a365p', label: 'เกิน 365 วัน', lv: 'วิกฤต', act: 'ตรวจสอบว่าซิมยังเปิดใช้งานได้ / ระบายเป็นลำดับแรก (ขายก่อนล็อตใหม่ จัดโปร หรือโยกสาขา)', c: 'var(--ag4)' } ];
const agBase = () => { const st = PC.rows('stock_by_shop'), sh = PC.rows('shops'), mt = PC.rows('matcodes'); if (!st || !sh || !mt) return null; const p = PC.P();
  const S = new Map(sh.map((r) => [String(r.shop), r])), M = new Map(mt.map((r) => [String(r.matcode), r])); const out = [];
  for (const r of st) { const s = S.get(String(r.shop)); if (!s) continue; const m = M.get(String(r.matcode)) || {}; const g = m.group || 'อื่น ๆ';
    if (!PCin(s.area, p.area) || (p.stype !== 'ALL' && s.stype !== p.stype) || (p.group !== 'ALL' && g !== p.group) || (p.shop !== 'ALL' && String(r.shop) !== p.shop)) continue;
    out.push({ shop: String(r.shop), name: s.name || r.shop, area: s.area || '-', zone: PCzone(s.area) || '-', group: g, price: +m.price || 0, b: AG.map((a) => +r[a.k] || 0), qty: +r.qty || 0 }); }
  return out; };
const agSum = (rows, keyf) => { const m = new Map(); for (const r of rows) { const k = keyf(r); const a = m.get(k) || { key: k, b: [0, 0, 0, 0, 0], v: [0, 0, 0, 0, 0], qty: 0 }; r.b.forEach((n, i) => { a.b[i] += n; a.v[i] += n * r.price; }); a.qty += r.qty; m.set(k, a); }
  return [...m.values()].map((a) => ({ ...a, old: a.b[2] + a.b[3] + a.b[4], oldp: a.qty ? (a.b[2] + a.b[3] + a.b[4]) / a.qty : 0 })); };
const agLevel = (b) => (b[4] > 0 ? 4 : b[3] > 0 ? 3 : b[2] > 0 ? 2 : b[1] > 0 ? 1 : 0);
dash.draw('t_expired', (el) => { const r = agBase(); el.dataset.field = 'qty'; el.textContent = r ? PC.nf(d3.sum(r, (x) => x.b[2] + x.b[3] + x.b[4])) : '—'; });
dash.draw('ag_asof', (el) => { const st = PC.rows('stock_by_shop'); const a = st && st[0] && st[0].asof; el.textContent = a ? 'Stock ณ ' + PC.day(a.slice(0, 10)) + (a.length > 10 ? ' ' + a.slice(11) + ' น.' : '') + ' · คำอธิบายระดับเฝ้าระวัง' : 'คำอธิบาย'; });
for (const n of ['ag_leg1', 'ag_leg2']) dash.draw(n, (el) => { el.replaceChildren(...AG.map((a) => { const s = document.createElement('span'); const i = document.createElement('i'); i.style.background = a.c; s.append(i, a.label + ' · ' + a.lv); return s; })); });
dash.draw('ag_take', (el) => { const r = agBase(); el.replaceChildren(); if (!r) return; const T = agSum(r, () => 'ALL')[0]; if (!T) { el.textContent = 'ไม่มีซิมในสต็อกตาม Filter'; return; }
  const ar = agSum(r, (x) => x.area).filter((a) => a.qty >= 50).sort((a, b) => b.oldp - a.oldp)[0]; const gr = agSum(r, (x) => x.group).sort((a, b) => b.old - a.old)[0];
  const B = (s) => { const b = document.createElement('b'); b.textContent = s; return b; };
  el.append('ซิมในระบบ ', B(PC.nf(T.qty)), ' ชิ้น · อายุไม่เกิน 90 วัน ', B(PC.pf(T.b[0] / T.qty)), ' · ต้องเฝ้าระวัง (91–180 วัน) ', B(PC.nf(T.b[1])), ' ชิ้น · อายุเกิน 180 วัน ', B(PC.nf(T.old) + ' ชิ้น (' + PC.pf(T.oldp) + ')'), ' มูลค่า ', B('฿' + PC.nf(Math.round(T.v[2] + T.v[3] + T.v[4]))), ' · ในจำนวนนี้เกิน 365 วัน ', B(PC.nf(T.b[4])), ' ชิ้น');
  if (ar && ar.old) el.append(' · Area ที่มีสัดส่วนซิมเกิน 180 วันสูงสุด ', B(ar.key + ' ' + PC.pf(ar.oldp)));
  if (gr && gr.old) el.append(' · Type Sim ที่ค้างมากสุด ', B(gr.key + ' ' + PC.nf(gr.old) + ' ชิ้น')); });
dash.draw('ag_tiles', (el) => { const r = agBase(); el.replaceChildren(); if (!r) return; const T = agSum(r, () => 'ALL')[0] || { b: [0, 0, 0, 0, 0], v: [0, 0, 0, 0, 0], qty: 0 };
  AG.forEach((a, i) => { const d = document.createElement('div'); d.className = 'pc-tile pc-agtile'; d.style.setProperty('--agc', a.c);
    const l = document.createElement('span'); l.className = 'pc-tile-l'; const lv = document.createElement('span'); lv.className = 'lv'; lv.textContent = a.lv; l.append(lv, ' · ' + a.label);
    const b = document.createElement('span'); b.className = 'pc-big'; b.textContent = PC.nf(T.b[i]);
    const s = document.createElement('span'); s.className = 'pc-sub'; s.textContent = (T.qty ? PC.pf(T.b[i] / T.qty) : '–') + ' ของ Stock · ฿' + PC.nf(Math.round(T.v[i]));
    const s2 = document.createElement('span'); s2.className = 'pc-sub'; s2.textContent = a.act; d.append(l, b, s, s2); el.append(d); }); });
const agBars = (el, rows, zoneHead) => { el.replaceChildren(); for (const a of rows) { const row = document.createElement('div'); row.className = 'pc-agrow' + (a.z ? ' z' : '');
    const l = document.createElement('span'); l.className = 'l'; l.textContent = a.label; l.title = a.label; const s = document.createElement('span'); s.className = 's';
    AG.forEach((g, i) => { if (!a.b[i]) return; const x = document.createElement('i'); x.style.width = (a.b[i] / a.qty) * 100 + '%'; x.style.background = g.c; x.title = g.label + ': ' + PC.nf(a.b[i]) + ' (' + PC.pf(a.b[i] / a.qty) + ')'; s.append(x); });
    const v = document.createElement('span'); v.className = 'v'; v.textContent = '>180: ' + PC.nf(a.old) + ' (' + PC.pf(a.oldp) + ')'; if (a.oldp >= 0.1) v.style.color = 'var(--ag3)'; else if (a.oldp >= 0.05) v.style.color = 'var(--ag2)';
    row.title = a.label + ' · Stock ' + PC.nf(a.qty) + ' · ' + AG.map((g, i) => g.label + ' ' + PC.nf(a.b[i])).join(' · '); row.append(l, s, v); el.append(row); } };
dash.draw('c_ag_area', (el) => { const r = agBase(); if (!r) { el.replaceChildren(); return; } const zs = agSum(r, (x) => x.zone).sort((a, b) => b.oldp - a.oldp), as = agSum(r, (x) => x.area); const out = [];
  for (const z of zs) { out.push({ ...z, label: z.key + ' (รวม)', z: true }); for (const a of as.filter((x) => PCzone(x.key) === z.key).sort((a, b) => b.oldp - a.oldp)) out.push({ ...a, label: a.key.replace(/^UPC - /, '') }); }
  agBars(el, out); });
dash.draw('c_ag_group', (el) => { const r = agBase(); if (!r) { el.replaceChildren(); return; } agBars(el, agSum(r, (x) => x.group).sort((a, b) => b.old - a.old || b.qty - a.qty).map((a) => ({ ...a, label: a.key }))); });
const agShops = () => { const r = agBase(), en = PC.rows('enriched'); if (!r) return null; const p = PC.P(); const lv = dash.params().aglv ?? 'risk';
  const today = en && en.reduce((a, x) => (x.date > a ? x.date : a), ''); const from = today ? SA.add(today, -27) : ''; const sold = new Map();
  if (en) for (const x of en) if (x.date >= from && (p.group === 'ALL' || x.group === p.group)) sold.set(String(x.shop), (sold.get(String(x.shop)) || 0) + x.units);
  const nm = new Map(r.map((x) => [x.shop, x])); return agSum(r, (x) => x.shop).map((a) => { const s = nm.get(a.key); const L = agLevel(a.b);
    return { shop: a.key, name: s.name, area: s.area, qty: a.qty, b0: a.b[0], b1: a.b[1], b2: a.b[2], b3: a.b[3], b4: a.b[4], old: a.old, oldp: a.oldp, oldv: Math.round(a.v[2] + a.v[3] + a.v[4]), sold28: sold.get(a.key) || 0, L, act: AG[L].act }; })
    .filter((x) => (lv === 'all' ? true : lv === 'risk' ? x.L >= 2 : x.L === +lv)); };
dash.draw('f_aglv', (sel) => { const o = [['risk', 'เสี่ยงขึ้นไป (เกิน 180 วัน)'], ['4', 'วิกฤต (เกิน 365 วัน)'], ['3', 'เสี่ยงสูง (271–365 วัน)'], ['2', 'เสี่ยง (181–270 วัน)'], ['1', 'เฝ้าระวัง (91–180 วัน)'], ['all', 'ทุกสาขา']];
  sel.replaceChildren(...o.map(([v, t]) => new Option(t, v))); sel.value = String(dash.params().aglv ?? 'risk'); sel.onchange = () => dash.setParams({ aglv: sel.value }); });
dash.draw('ag_shop_sum', (el) => { const r = agShops(); if (!r) { el.textContent = ''; return; } const c = [0, 0, 0, 0, 0]; r.forEach((x) => c[x.L]++);
  el.textContent = PC.nf(r.length) + ' สาขา · ' + AG.map((a, i) => (c[i] ? a.lv + ' ' + PC.nf(c[i]) : '')).filter(Boolean).reverse().join(' · ') + ' · ซิมเกิน 180 วันรวม ' + PC.nf(d3.sum(r, (x) => x.old)) + ' ชิ้น มูลค่า ฿' + PC.nf(d3.sum(r, (x) => x.oldv)); });
dash.draw('tb_ag_shop', (el) => PC.table(el, 'tb_ag_shop', agShops(), { key: ['shop'], def: 'old', q: 'agshop', cols: [
  { f: 'L', label: 'ระดับ', num: true, pill: (d) => ['ag' + d.L, AG[d.L].lv] }, { f: 'shop', label: 'รหัส' }, { f: 'name', label: 'สาขา', wrap: true }, { f: 'area', label: 'Area' }, { f: 'qty', label: 'Stock รวม', num: true, fmt: PC.nf },
  { f: 'b0', label: '0–90', num: true, fmt: PC.nf }, { f: 'b1', label: '91–180', num: true, fmt: PC.nf }, { f: 'b2', label: '181–270', num: true, fmt: PC.nf }, { f: 'b3', label: '271–365', num: true, fmt: PC.nf }, { f: 'b4', label: '> 365', num: true, fmt: PC.nf },
  { f: 'old', label: 'เกิน 180 วัน', num: true, fmt: PC.nf, bar: true }, { f: 'oldp', label: '% ของ Stock', num: true, fmt: PC.pf }, { f: 'oldv', label: 'มูลค่าเกิน 180 วัน (฿)', num: true, fmt: PC.nf }, { f: 'sold28', label: 'ขาย 28 วัน (QTY)', num: true, fmt: PC.nf } ] }));
const agSerials = () => { const a = PC.rows('aging_serials'), sh = PC.rows('shops'), mt = PC.rows('matcodes'); if (!a || !sh || !mt) return null; const p = PC.P(); const sv = String(dash.params().agser ?? 'all');
  const S = new Map(sh.map((r) => [String(r.shop), r])), M = new Map(mt.map((r) => [String(r.matcode), r])); const out = [];
  for (const r of a) { const s = S.get(String(r.shop)); if (!s) continue; const m = M.get(String(r.matcode)) || {}; const g = m.group || 'อื่น ๆ';
    if (!PCin(s.area, p.area) || (p.stype !== 'ALL' && s.stype !== p.stype) || (p.group !== 'ALL' && g !== p.group) || (p.shop !== 'ALL' && String(r.shop) !== p.shop)) continue;
    const L = r.aging > 365 ? 4 : r.aging > 270 ? 3 : 2; if (sv !== 'all' && L !== +sv) continue; out.push({ L, serial: r.serial, shop_name: s.name || r.shop, area: s.area, matcode: r.matcode, name: m.name || r.matcode, group: g, price: m.price ?? null, first: r.first, aging: r.aging, location: r.location }); }
  return out; };
dash.draw('ag_ser_sum', (el) => { const r = agSerQ(); if (!r) { el.textContent = ''; return; } const c = [0, 0, 0, 0, 0]; r.forEach((x) => c[x.L]++);
  el.textContent = PC.nf(r.length) + ' Serial' + (r.length > 1000 ? ' (ตารางแสดง 1,000 รายการแรก · Export CSV ได้ครบ)' : '') + ' · วิกฤต (เกิน 365 วัน) ' + PC.nf(c[4]) + ' · เสี่ยงสูง (271–365) ' + PC.nf(c[3]) + ' · เสี่ยง (180–270) ' + PC.nf(c[2]); });
dash.draw('tb_exp', (el) => PC.table(el, 'tb_exp', agSerials(), { key: ['serial'], def: 'aging', q: 'exp', limit: 1000, cols: [
  { f: 'L', label: 'ระดับ', num: true, pill: (d) => ['ag' + d.L, AG[d.L].lv] }, { f: 'aging', label: 'Aging (วัน)', num: true, fmt: PC.nf }, { f: 'serial', label: 'Serial' }, { f: 'shop_name', label: 'สาขา', wrap: true }, { f: 'area', label: 'Area' },
  { f: 'matcode', label: 'Matcode' }, { f: 'name', label: 'สินค้า', wrap: true }, { f: 'group', label: 'Type Sim' }, { f: 'price', label: 'ราคาป้าย', num: true, fmt: PC.nf }, { f: 'first', label: 'รับเข้าครั้งแรก', fmt: PC.day }, { f: 'location', label: 'ที่เก็บ' } ] }));

const AGS_COLS = [['L', 'ระดับ'], ['aging', 'Aging (วัน)'], ['serial', 'Serial'], ['shop_name', 'สาขา'], ['area', 'Area'], ['matcode', 'Matcode'], ['name', 'สินค้า'], ['group', 'Type Sim'], ['price', 'ราคาป้าย'], ['first', 'รับเข้าครั้งแรก'], ['location', 'ที่เก็บ']];
const agSerQ = () => { const r = agSerials(); if (!r) return null; const q = (PC.queries.exp || '').trim().toLowerCase(); return q ? r.filter((d) => AGS_COLS.some(([f]) => String(d[f] ?? '').toLowerCase().includes(q))) : r; };
dash.draw('f_agser', (sel) => { const o = [['all', 'ทั้งหมด (เกิน 180 วัน)'], ['4', 'วิกฤต · เกิน 365 วัน'], ['3', 'เสี่ยงสูง · 271–365 วัน'], ['2', 'เสี่ยง · 180–270 วัน']];
  sel.replaceChildren(...o.map(([v, t]) => new Option(t, v))); sel.value = String(dash.params().agser ?? 'all'); sel.onchange = () => dash.setParams({ agser: sel.value }); });
if (!window.PC_AGCSV_BOUND) { window.PC_AGCSV_BOUND = true;
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('#ag-csv'); if (!b) return; const r = (agSerQ() || []).slice().sort((x, y) => y.aging - x.aging); const p = PC.P();
    const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const lines = [AGS_COLS.map(([, l]) => l).join(',')].concat(r.map((d) => AGS_COLS.map(([f]) => f === 'L' ? AG[d.L].lv : f === 'serial' || f === 'matcode' ? '="' + d[f] + '"' : esc(d[f])).join(',')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }); const st = PC.rows('stock_by_shop'); const asof = (st && st[0] && st[0].asof || '').slice(0, 10);
    const sv = String(dash.params().agser ?? 'all'); const name = 'Aging_Serial_' + (sv === 'all' ? 'over180' : ['', '', '180-270', '271-365', 'over365'][+sv]) + (p.area !== 'ALL' ? '_' + p.area.replace(/[^\w]+/g, '') : '') + (asof ? '_' + asof : '') + '.csv';
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); }); }

/* ---------- watched serials: export PNG (overview / shop summary) ---------- */
const WXP = (() => {
  const C = RKX.C, rr = RKX.rr, fit = RKX.fit; const SC = { sold: C.ok, in_stock: C.bad, not_found: C.warn };
  const setup = async (W, H) => { try { await document.fonts.ready; } catch (e) {} const FF = getComputedStyle(document.body).fontFamily || 'sans-serif';
    const S = 2, cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S; const g = cv.getContext('2d'); g.scale(S, S); g.fillStyle = C.bg; g.fillRect(0, 0, W, H); return { cv, g, F: (w, s) => w + ' ' + s + 'px ' + FF }; };
  const asof = () => { const r = PC.rows('watch_serials'); const x = r && r[0]; return x ? 'ขายถึง ' + PC.day(x.sales_asof.slice(0, 10)) + ' ' + x.sales_asof.slice(11) + ' น. · Stock ณ ' + PC.day(x.stock_asof.slice(0, 10)) + ' ' + x.stock_asof.slice(11) + ' น.' : ''; };
  const head = (g, F, W, P, title) => { g.fillStyle = C.fg; g.font = F(700, 34); g.fillText(fit(g, title, W * 0.62), P, P + 34); g.font = F(400, 20); g.fillStyle = C.mu; g.textAlign = 'right';
    const p = PC.P(); g.fillText([asof(), p.area !== 'ALL' ? 'Filter: ' + p.area : '', p.shop !== 'ALL' ? 'สาขา ' + p.shop : ''].filter(Boolean).join('  ·  '), W - P, P + 34); g.textAlign = 'left'; g.fillStyle = C.line; g.fillRect(P, P + 56, W - 2 * P, 2); return P + 100; };
  const foot = (g, F, P, H) => { g.font = F(400, 15); g.fillStyle = C.mu; g.fillText('สี: เขียว = ขายแล้ว · แดง = ยังไม่ขาย (ยังอยู่ใน Stock) · ส้ม = ไม่พบใน Stock และยังไม่พบการขาย  ·  ส่งออกจาก Prepay Dashboard ' + new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }), P, H - P + 6); };
  const fname = (k) => 'Watch_Serial_' + k + '_' + new Date().toISOString().slice(0, 10) + '.png';
  const overview = async () => { const r = wRows() || []; const N = r.length || 1; const cnt = (s) => wCount(r, s);
    const by = new Map(); for (const x of r) { const a = by.get(x.area) || { area: x.area, n: 0, s: 0, nf: 0 }; a.n++; if (x.status === 'sold') a.s++; if (x.status === 'not_found') a.nf++; by.set(x.area, a); }
    const areas = [...by.values()].sort((a, b) => b.n - b.s - (a.n - a.s) || b.n - a.n);
    const sold = r.filter((x) => x.status === 'sold' && x.sold_date); const dmap = d3.rollup(sold, (v) => v.length, (x) => x.sold_date); let cum = 0; const days = [...dmap.keys()].sort().map((d) => { cum += dmap.get(d); return { d, n: dmap.get(d), c: cum }; });
    const W = 2000, P = 48, ROW = 40, nr = Math.max(areas.length, days.length, 1); const H = P + 100 + 170 + 40 + 120 + 60 + nr * ROW + 10 + P;
    const { cv, g, F } = await setup(W, H); let y = head(g, F, W, P, 'ติดตามซิมใกล้หมดอายุ · ' + (wList() || ''));
    // tiles
    const sv = sold.reduce((a, x) => a + (x.sold_net || 0), 0); const left = r.filter((x) => x.status === 'in_stock');
    const tiles = [['Serial ที่ติดตาม', PC.nf(r.length), C.fg, PC.nf(new Set(r.map((x) => x.shop)).size) + ' สาขา · ' + PC.nf(new Set(r.map((x) => x.area)).size) + ' Area'],
      ['ขายแล้ว', PC.nf(cnt('sold')), C.ok, PC.pf(cnt('sold') / N) + ' ของทั้งหมด · Net ฿' + PC.nf(Math.round(sv))], ['ยังไม่ขาย (ยังอยู่ใน Stock)', PC.nf(cnt('in_stock')), C.bad, PC.nf(new Set(left.map((x) => x.shop)).size) + ' สาขายังต้องขาย'],
      ['ไม่พบใน Stock และยังไม่พบการขาย', PC.nf(cnt('not_found')), C.warn, 'อาจโอนออก / ตัดสต็อก / Serial ไม่ถูกต้อง']];
    const tw = (W - 2 * P - 3 * 24) / 4; tiles.forEach(([l, v, c, s], i) => { const x = P + i * (tw + 24); rr(g, x, y, tw, 150, 10); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
      g.save(); rr(g, x, y, tw, 150, 10); g.clip(); g.fillStyle = c; g.fillRect(x, y, tw, 6); g.restore();
      g.font = F(400, 19); g.fillStyle = C.mu; g.fillText(fit(g, l, tw - 40), x + 22, y + 42); g.font = F(700, 52); g.fillStyle = c; g.fillText(v, x + 22, y + 102); g.font = F(400, 17); g.fillStyle = C.mu; g.fillText(fit(g, s, tw - 40), x + 22, y + 132); });
    y += 150 + 50;
    // progress bar
    g.fillStyle = C.fg; g.font = F(700, 26); g.fillText('ความคืบหน้าการขาย', P, y); y += 20; let bx = P; const BW = W - 2 * P;
    g.save(); rr(g, P, y, BW, 30, 8); g.clip(); g.fillStyle = C.grid; g.fillRect(P, y, BW, 30); for (const k of ['sold', 'in_stock', 'not_found']) { const w = (cnt(k) / N) * BW; g.fillStyle = SC[k]; g.fillRect(bx, y, w, 30); bx += w; } g.restore();
    y += 58; let lx = P; for (const k of ['sold', 'in_stock', 'not_found']) { g.fillStyle = SC[k]; g.fillRect(lx, y - 14, 16, 16); g.font = F(400, 19); g.fillStyle = C.fg; const s = WS[k][0] + ' ' + PC.nf(cnt(k)) + ' (' + PC.pf(cnt(k) / N) + ')'; g.fillText(s, lx + 24, y); lx += g.measureText(s).width + 60; }
    y += 50;
    // two columns
    const cw = (W - 2 * P - 48) / 2, x1 = P, x2 = P + cw + 48;
    g.fillStyle = C.fg; g.font = F(700, 22); g.fillText('ราย Area', x1, y); g.fillText('ขายได้รายวัน (สะสม)', x2, y); y += 16;
    const mx = Math.max(1, ...areas.map((a) => a.n)); areas.forEach((a, i) => { const ty = y + i * ROW; g.font = F(400, 18); g.fillStyle = C.fg; g.fillText(fit(g, a.area, cw * 0.32), x1, ty + 26);
      const bx0 = x1 + cw * 0.34, bw = cw * 0.4; g.fillStyle = C.grid; rr(g, bx0, ty + 12, bw, 18, 9); g.fill(); g.save(); rr(g, bx0, ty + 12, (a.n / mx) * bw, 18, 9); g.clip(); let xx = bx0;
      for (const [v, c] of [[a.s, C.ok], [a.n - a.s - a.nf, C.bad], [a.nf, C.warn]]) { const w = (v / mx) * bw; g.fillStyle = c; g.fillRect(xx, ty + 12, w, 18); xx += w; } g.restore();
      g.font = F(400, 17); g.fillStyle = C.mu; g.textAlign = 'right'; g.fillText('ขายแล้ว ' + a.s + ' / ' + a.n + ' · ' + PC.pf(a.s / a.n), x1 + cw, ty + 26); g.textAlign = 'left'; });
    if (!days.length) { g.font = F(400, 18); g.fillStyle = C.mu; g.fillText('ยังไม่พบ Serial ในรายการนี้ในรายงานการขาย', x2, y + 26); }
    days.forEach((d, i) => { const ty = y + i * ROW; g.font = F(400, 18); g.fillStyle = C.fg; g.fillText(PC.day(d.d), x2, ty + 26); const bx0 = x2 + cw * 0.22, bw = cw * 0.5;
      g.fillStyle = C.grid; rr(g, bx0, ty + 12, bw, 18, 9); g.fill(); g.fillStyle = C.ok; rr(g, bx0, ty + 12, Math.max(18, (d.c / N) * bw), 18, 9); g.fill();
      g.font = F(400, 17); g.fillStyle = C.mu; g.textAlign = 'right'; g.fillText('ขาย ' + d.n + ' · สะสม ' + d.c + ' (' + PC.pf(d.c / N) + ')', x2 + cw, ty + 26); g.textAlign = 'left'; });
    foot(g, F, P, H); return { cv, name: fname('Overview') }; };
  const shops = async () => { const r = wRows() || []; const by = new Map();
    for (const x of r) { const k = x.shop || x.shop_name; const a = by.get(k) || { name: x.shop_name, area: x.area, n: 0, s: 0, nf: 0 }; a.n++; if (x.status === 'sold') a.s++; if (x.status === 'not_found') a.nf++; by.set(k, a); }
    const rows = [...by.values()].map((a) => ({ ...a, left: a.n - a.s - a.nf, pct: a.s / a.n })).sort((a, b) => b.left - a.left || b.n - a.n || String(a.name).localeCompare(String(b.name), 'th'));
    const W = 2000, P = 48, ROW = 44; const H = P + 100 + 60 + 50 + rows.length * ROW + 40 + P; const { cv, g, F } = await setup(W, H);
    let y = head(g, F, W, P, 'ติดตามซิมใกล้หมดอายุ · สรุปรายสาขา · ' + (wList() || ''));
    const tot = { n: r.length, s: wCount(r, 'sold'), nf: wCount(r, 'not_found') }; g.font = F(400, 22); g.fillStyle = C.fg;
    g.fillText(PC.nf(rows.length) + ' สาขา · ติดตาม ' + PC.nf(tot.n) + ' Serial · ขายแล้ว ' + PC.nf(tot.s) + ' (' + PC.pf(tot.s / Math.max(1, tot.n)) + ') · ยังไม่ขาย ' + PC.nf(tot.n - tot.s - tot.nf) + ' · ไม่พบใน Stock ' + PC.nf(tot.nf), P, y); y += 50;
    const cols = [['#', 50, 'r'], ['สาขา', 560, 'l'], ['Area', 330, 'l'], ['ติดตาม', 130, 'r'], ['ยังไม่ขาย', 150, 'r'], ['ขายแล้ว', 140, 'r'], ['ไม่พบใน Stock', 170, 'r'], ['ความคืบหน้า', 374, 'l']];
    const xs = []; let cx = P; for (const c of cols) { xs.push(cx); cx += c[1]; }
    g.font = F(600, 18); g.fillStyle = C.mu; cols.forEach((c, i) => { if (c[2] === 'r') { g.textAlign = 'right'; g.fillText(c[0], xs[i] + c[1] - 12, y); } else { g.textAlign = 'left'; g.fillText(c[0], xs[i] + (i === 7 ? 24 : 0), y); } }); g.textAlign = 'left';
    y += 14; g.fillStyle = C.line; g.fillRect(P, y, W - 2 * P, 2);
    rows.forEach((d, i) => { const ty = y + i * ROW; if (i % 2) { g.fillStyle = '#f7f6f2'; g.fillRect(P, ty + 2, W - 2 * P, ROW); }
      const vals = [String(i + 1), d.name, d.area, PC.nf(d.n), PC.nf(d.left), PC.nf(d.s), d.nf ? PC.nf(d.nf) : '–'];
      vals.forEach((v, k) => { const c = cols[k]; g.font = F(k === 4 ? 700 : 400, 19); g.fillStyle = k === 4 && d.left ? C.bad : k === 5 && d.s ? C.ok : k === 0 ? C.mu : C.fg;
        if (c[2] === 'r') { g.textAlign = 'right'; g.fillText(v, xs[k] + c[1] - 12, ty + 30); } else { g.textAlign = 'left'; g.fillText(fit(g, v, c[1] - 16), xs[k], ty + 30); } }); g.textAlign = 'left';
      const bx0 = xs[7] + 24, bw = 230; g.fillStyle = C.grid; rr(g, bx0, ty + 15, bw, 16, 8); g.fill(); g.save(); rr(g, bx0, ty + 15, bw, 16, 8); g.clip(); let xx = bx0;
      for (const [v, c] of [[d.s, C.ok], [d.left, C.bad], [d.nf, C.warn]]) { const w = (v / d.n) * bw; g.fillStyle = c; g.fillRect(xx, ty + 15, w, 16); xx += w; } g.restore();
      g.font = F(700, 18); g.fillStyle = d.pct >= 1 ? C.ok : d.pct > 0 ? C.warn : C.bad; g.textAlign = 'right'; g.fillText(PC.pf(d.pct), W - P, ty + 30); g.textAlign = 'left'; });
    foot(g, F, P, H); return { cv, name: fname('Shops') }; };
  return { overview, shops };
})();
if (!window.PC_WXP_BOUND) { window.PC_WXP_BOUND = true;
  document.addEventListener('click', async (e) => { const b = e.target.closest && e.target.closest('#w-exp-ov, #w-exp-shop'); if (!b) return; b.disabled = true; const t = b.textContent; b.textContent = 'กำลังสร้างรูป…';
    try { const { cv, name } = await (b.id === 'w-exp-ov' ? WXP.overview() : WXP.shops()); RKX.show(cv, name); } catch (err) { console.error(err); } finally { b.disabled = false; b.textContent = t; } }); }

/* ---------- missing matcodes: simplified view (by shop / by matcode, chips) ---------- */
const gShort = (n) => String(n || '').replace(/^TMH\d /, '').replace(/_VAS| MULTI/g, '').trim();
const gShop = (n) => String(n || '').replace(/^True (Shop|shop|Move Shop) /, '');
const gQ = (r) => { const q = (PC.queries.gap || '').trim().toLowerCase(); return q ? r.filter((x) => [x.name, x.shop, x.matcode, x.mname, x.group, x.area].some((v) => String(v ?? '').toLowerCase().includes(q))) : r; };
const gTot = (lvl) => { const r = gapRows(false); if (!r) return null; const u = r.filter((x) => x.level === lvl); return { shops: new Set(u.map((x) => x.shop)).size, mats: new Set(u.map((x) => x.matcode)).size, n: u.length, sold: u.reduce((a, x) => a + (x.sold28_shop || 0), 0) }; };
dash.draw('g_urgent', (el) => { const g = gTot('urgent'); el.textContent = g ? PC.nf(g.shops) : '—'; });
dash.draw('g_urgent_sub', (el) => { const g = gTot('urgent'); el.textContent = g ? 'รวม ' + PC.nf(g.n) + ' รายการที่ต้องเติม (' + PC.nf(g.mats) + ' Matcode) · เคยขายรวม ' + PC.nf(g.sold) + ' ชิ้นใน 28 วัน' : ''; });
dash.draw('g_core', (el) => { const g = gTot('core'); el.textContent = g ? PC.nf(g.shops) : '—'; });
dash.draw('g_core_sub', (el) => { const g = gTot('core'); el.textContent = g ? 'รวม ' + PC.nf(g.n) + ' รายการที่ควรมี (' + PC.nf(g.mats) + ' Matcode)' : ''; });
dash.draw('g_shops', (el) => { const r = gapRows(true); el.textContent = r ? PC.nf(new Set(r.map((x) => x.shop)).size) : '—'; });
dash.draw('g_shops_sub', (el) => { const r = gapRows(true), s = gapScope(); el.textContent = r && s ? 'จาก ' + PC.nf(s.length) + ' สาขาที่เลือก' : ''; });
dash.draw('f_gview', (sel) => { sel.replaceChildren(new Option('ตามสาขา (สาขานี้ขาดอะไร)', 'shop'), new Option('ตาม Matcode (Matcode นี้ขาดที่สาขาไหน)', 'mat')); sel.value = dash.params().gview || 'shop'; sel.onchange = () => dash.setParams({ gview: sel.value }); });
const gChip = (cls, txt, tip) => { const c = document.createElement('span'); c.className = 'gchip ' + cls; c.textContent = txt; if (tip) c.title = tip; return c; };
const gGroups = () => { const r = gapRows(true); if (!r) return null; const v = dash.params().gview || 'shop'; const ord = { urgent: 0, core: 1, other: 2 };
  const by = new Map(); for (const x of gQ(r)) { const k = v === 'shop' ? x.shop : x.matcode; const a = by.get(k) || { k, x, items: [], u: 0, sold: 0 }; a.items.push(x); if (x.level === 'urgent') { a.u++; a.sold += x.sold28_shop || 0; } by.set(k, a); }
  const out = [...by.values()].sort((a, b) => b.u - a.u || b.items.length - a.items.length || b.sold - a.sold); out.forEach((a) => a.items.sort((p, q) => ord[p.level] - ord[q.level] || (q.sold28_shop || 0) - (p.sold28_shop || 0) || gapSort(p, q))); return { v, out }; };
const G_LIMIT = 150;
dash.draw('g_list_note', (el) => { const G = gGroups(); el.textContent = G ? (G.v === 'shop' ? PC.nf(G.out.length) + ' สาขา' : PC.nf(G.out.length) + ' Matcode') + ' · เรียงจากรายการด่วนมากสุด' + (G.out.length > G_LIMIT ? ' · แสดง ' + G_LIMIT + ' แรก (ค้นหาหรือดูตารางด้านล่างเพื่อดูทั้งหมด)' : '') : ''; });
dash.draw('c_gap_list', (el) => { el.replaceChildren(); const G = gGroups(); if (!G) return;
  if (!G.out.length) { const e = document.createElement('p'); e.className = 'pc-note'; e.style.padding = '12px'; e.textContent = 'ไม่มีสาขาที่ขาด Matcode ตามตัวกรองนี้ 👍'; el.append(e); return; }
  for (const a of G.out.slice(0, G_LIMIT)) { const row = document.createElement('div'); row.className = 'pc-grow'; const h = document.createElement('div'); h.className = 'h'; const b = document.createElement('b'); const s1 = document.createElement('span'); const s2 = document.createElement('span'); s2.className = 'cnt';
    const n = a.items.length, c = n - a.u;
    if (G.v === 'shop') { b.textContent = gShop(a.x.name); s1.textContent = a.x.area + ' · รหัส ' + a.x.shop; s2.append('ขาด ' + n + ' Matcode'); if (a.u) { const em = document.createElement('em'); em.textContent = ' · ด่วน ' + a.u; s2.append(em); } }
    else { b.textContent = gShort(a.x.mname); s1.textContent = a.x.group + ' · ' + priceTxt(a.x.price) + ' · มีใน ' + PC.pf(a.x.carry_pct) + ' ของสาขา · ขายทุกสาขา ' + PC.nf(a.x.sold28_all) + ' ชิ้น/28 วัน'; s2.append('ขาด ' + n + ' สาขา'); if (a.u) { const em = document.createElement('em'); em.textContent = ' · ด่วน ' + a.u; s2.append(em); } }
    h.append(b, s1, s2); const ch = document.createElement('div');
    for (const x of a.items) { const cls = x.level === 'urgent' ? 'u' : x.level === 'core' ? 'c' : 'o';
      const name = G.v === 'shop' ? gShort(x.mname) : gShop(x.name); const txt = name + (x.level === 'urgent' ? ' · เคยขาย ' + x.sold28_shop : '');
      const tip = (G.v === 'shop' ? x.group + ' · ' + priceTxt(x.price) + ' · Matcode ' + x.matcode : x.area + ' · รหัส ' + x.shop) + ' · ' + GL[x.level][0] + (x.level === 'urgent' ? ' (สาขานี้ขาย ' + x.sold28_shop + ' ชิ้นใน 28 วัน แต่ Stock = 0)' : '');
      ch.append(gChip(cls, txt, tip)); }
    row.append(h, ch); el.append(row); } });

/* ---------- Matcode lookup: shops that sold + when it sells best ---------- */
const MQ = (() => {
  const TH_WD = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const sel = () => { const mt = PC.rows('matcodes'); if (!mt) return null; const v = String(dash.params().mq || ''); let m = mt.find((x) => String(x.matcode) === v);
    if (!m) { const r = PC.rows('enriched'); if (!r) return null; const I = mInfo(); const by = d3.rollup(r.filter((x) => x.date >= (I ? I.from : '') && x.date <= (I ? I.to : '9')), (a) => d3.sum(a, (x) => x.units), (x) => x.matcode); const top = [...by.entries()].sort((a, b) => b[1] - a[1])[0]; m = top && mt.find((x) => String(x.matcode) === String(top[0])); if (m) m = { ...m, auto: true }; }
    return m || null; };
  const rows = (m, from, to) => { const r = PC.rows('enriched'); if (!r || !m) return []; const p = PC.P();
    return r.filter((x) => String(x.matcode) === String(m.matcode) && x.date >= from && x.date <= to && PCin(x.area, p.area) && (p.stype === 'ALL' || x.stype === p.stype) && (p.shop === 'ALL' || String(x.shop) === p.shop)); };
  const ytd = (m) => { const I = mInfo(); return I ? rows(m, I.today.slice(0, 4) + '-01-01', I.today) : []; };
  return { TH_WD, sel, rows, ytd };
})();
const mqInput = () => document.getElementById('q-mq');
dash.draw('dl_mq', (el) => { const mt = PC.rows('matcodes'); if (!mt) return; el.replaceChildren(...mt.filter((m) => m.status !== 'EOL' || true).map((m) => { const o = document.createElement('option'); o.value = m.matcode; o.label = m.name + ' · ' + (m.group || ''); o.textContent = m.matcode + ' · ' + m.name; return o; })); });
if (!window.PC_MQ_BOUND) { window.PC_MQ_BOUND = true;
  const apply = (inp) => { const v = inp.value.trim(); if (!v) { dash.setParams({ mq: '' }); return; } const mt = PC.rows('matcodes') || []; const lv = v.toLowerCase();
    const m = mt.find((x) => String(x.matcode) === v) || mt.find((x) => String(x.matcode).startsWith(v)) || mt.find((x) => String(x.name).toLowerCase() === lv) || mt.find((x) => String(x.name).toLowerCase().includes(lv));
    if (m) dash.setParams({ mq: String(m.matcode) }); };
  document.addEventListener('change', (e) => { if (e.target && e.target.id === 'q-mq') apply(e.target); });
  let mqT = 0; document.addEventListener('input', (e) => { if (!e.target || e.target.id !== 'q-mq') return; const inp = e.target; const v = inp.value.trim(); clearTimeout(mqT);
    if (!v) { dash.setParams({ mq: '' }); return; } const mt = PC.rows('matcodes') || [];
    if (mt.some((x) => String(x.matcode) === v)) { apply(inp); return; } mqT = setTimeout(() => { const lv = v.toLowerCase(); const hits = mt.filter((x) => String(x.matcode).startsWith(v) || String(x.name).toLowerCase().includes(lv)); if (hits.length === 1 || (v.length >= 4 && hits.length)) apply(inp); }, 600); });
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('#mq-go'); if (b) { const inp = document.getElementById('q-mq'); if (inp) apply(inp); } });
  document.addEventListener('keydown', (e) => { if (e.target && e.target.id === 'q-mq' && e.key === 'Enter') apply(e.target); }); }
dash.draw('mq_hint', (el) => { const m = MQ.sel(); el.textContent = m ? (m.auto ? 'ยังไม่ได้เลือก · แสดง Matcode ที่ขายดีที่สุดของช่วงนี้ก่อน: ' : 'กำลังดู: ') + m.matcode + ' · ' + m.name : 'พิมพ์ Matcode หรือชื่อสินค้า แล้วกด Enter'; });
dash.draw('mq_plabel', (el) => { const I = mInfo(); el.textContent = I ? I.label : ''; });
const mqShops = () => { const m = MQ.sel(), I = mInfo(); if (!m || !I) return null; const r = MQ.rows(m, I.from, I.to); const sh = new Map((PC.rows('shops') || []).map((x) => [String(x.shop), x]));
  const st = new Map(); for (const x of PC.rows('stock_by_shop') || []) if (String(x.matcode) === String(m.matcode)) st.set(String(x.shop), (st.get(String(x.shop)) || 0) + (+x.qty || 0));
  const by = new Map(); for (const x of r) { const k = String(x.shop); const a = by.get(k) || { shop: k, units: 0, net: 0, last: '', emps: new Set(), days: new Set() }; a.units += x.units; a.net += x.net; if (x.units > 0) { if (x.date > a.last) a.last = x.date; a.emps.add(x.emp); a.days.add(x.date); } by.set(k, a); }
  const tot = d3.sum([...by.values()], (a) => a.units) || 1; const N = PC.isNet(); const totN = d3.sum([...by.values()], (a) => a.net) || 1;
  return [...by.values()].filter((a) => a.units > 0).map((a) => { const s = sh.get(a.shop) || {}; return { shop: a.shop, name: String(s.name || a.shop).replace(/^True (Shop|shop|Move Shop) /, ''), area: s.area || '-', units: a.units, net: Math.round(a.net), share: N ? a.net / totN : a.units / tot, last: a.last, emps: a.emps.size, days: a.days.size, stock: st.get(a.shop) || 0 }; })
    .sort((a, b) => (N ? b.net - a.net : b.units - a.units)).map((x, i) => ({ ...x, rank: i + 1 })); };
dash.draw('mq_take', (el) => { el.replaceChildren(); const m = MQ.sel(), I = mInfo(), r = mqShops(); if (!m || !I || !r) return; const B = (s) => { const b = document.createElement('b'); b.textContent = s; return b; };
  const p = PC.P(); const scope = (PC.rows('shops') || []).filter((s) => +s.stype_order < 90 && PCin(s.area, p.area) && (p.stype === 'ALL' || s.stype === p.stype) && (p.shop === 'ALL' || String(s.shop) === p.shop)).length;
  const stk = d3.sum((PC.rows('stock_by_shop') || []).filter((x) => String(x.matcode) === String(m.matcode)), (x) => +x.qty || 0);
  el.append(B(m.name), ' (' + m.matcode + ' · ' + (m.group || '') + (m.price ? ' · ฿' + PC.nf(m.price) : '') + (m.status === 'EOL' ? ' · EOL' : '') + ') · ' + I.label + ': ขายได้ ', B(PC.nf(d3.sum(r, (x) => x.units)) + ' ชิ้น'), ' Net ', B('฿' + PC.nf(d3.sum(r, (x) => x.net))), ' จาก ', B(PC.nf(r.length) + ' สาขา'), ' (จาก ' + PC.nf(scope) + ' สาขาที่เลือก)');
  if (r[0]) el.append(' · ขายมากสุด ', B(r[0].name + ' ' + PC.nf(r[0].units) + ' ชิ้น'));
  el.append(' · Stock คงเหลือทุกสาขา ', B(PC.nf(stk) + ' ชิ้น')); });
dash.draw('tb_mq_shop', (el) => { const r = mqShops(); const N = PC.isNet();
  PC.table(el, 'tb_mq_shop', r, { key: ['shop'], def: 'rank', dir: 1, limit: 500, cols: [
    { f: 'rank', label: '#', num: true, fmt: PC.nf }, { f: 'name', label: 'สาขา', wrap: true }, { f: 'area', label: 'Area' }, { f: 'units', label: 'QTY', num: true, fmt: PC.nf, bar: !N }, { f: 'net', label: 'Net Amount', num: true, fmt: PC.nf, bar: N },
    { f: 'share', label: '% สัดส่วน', num: true, fmt: PC.pf }, { f: 'days', label: 'วันที่ขายได้', num: true, fmt: PC.nf }, { f: 'last', label: 'ขายล่าสุด', fmt: PC.day }, { f: 'emps', label: 'พนักงานที่ขาย', num: true, fmt: PC.nf }, { f: 'stock', label: 'Stock ตอนนี้', num: true, fmt: PC.nf } ] }); });
const mqWhen = () => { const m = MQ.sel(); if (!m) return null; const r = MQ.ytd(m); const I = mInfo(); if (!I) return null; const y0 = I.today.slice(0, 4) + '-01-01';
  const byD = d3.rollup(r, (a) => ({ units: d3.sum(a, (x) => x.units), net: d3.sum(a, (x) => x.net) }), (x) => x.date);
  const days = []; for (let d = y0; d <= I.today; d = SA.add(d, 1)) { const v = byD.get(d) || { units: 0, net: 0 }; days.push({ d, ...v, wd: new Date(d + 'T00:00:00Z').getUTCDay(), dom: +d.slice(8, 10), w: SA.isoW(d).w }); }
  const wk = [...d3.rollup(days, (a) => ({ units: d3.sum(a, (x) => x.units), net: d3.sum(a, (x) => x.net), n: a.length }), (x) => x.w).entries()].map(([w, v]) => ({ w, ...v })).sort((a, b) => a.w - b.w);
  const wd = [1, 2, 3, 4, 5, 6, 0].map((k) => { const a = days.filter((x) => x.wd === k); return { k, label: MQ.TH_WD[k], avg: a.length ? d3.sum(a, (x) => x.units) / a.length : 0, avgN: a.length ? d3.sum(a, (x) => x.net) / a.length : 0 }; });
  const md = [['ต้นเดือน (1–10)', 1, 10], ['กลางเดือน (11–20)', 11, 20], ['ปลายเดือน (21–สิ้นเดือน)', 21, 31]].map(([label, a, b]) => { const x = days.filter((d) => d.dom >= a && d.dom <= b); return { label, avg: x.length ? d3.sum(x, (d) => d.units) / x.length : 0, avgN: x.length ? d3.sum(x, (d) => d.net) / x.length : 0 }; });
  const mo = [...d3.rollup(days, (a) => [d3.sum(a, (x) => x.units), d3.sum(a, (x) => x.net)], (x) => x.d.slice(0, 7)).entries()].map(([k, v]) => [k, v[0], v[1]]);
  return { m, days, wk, wd, md, mo, tot: d3.sum(days, (x) => x.units) }; };
dash.draw('c_mq_week', (el) => { const W = mqWhen(); if (!W || !W.tot) { el.replaceChildren(); return; } const N = PC.isNet(); const best = W.wk.reduce((a, b) => ((N ? b.net : b.units) > (N ? a.net : a.units) ? b : a), W.wk[0]);
  PC.vbar(el, W.wk.map((x) => ({ w: x.w, units: x.units, net: Math.round(x.net) })), { xk: 'w', xf: (w) => 'W' + w, tipf: (w) => 'Week ' + w, hl: best.w, avg: d3.mean(W.wk, (x) => (N ? x.net : x.units)) }); });
dash.draw('c_mq_wd', (el) => { const W = mqWhen(); if (!W || !W.tot) { el.replaceChildren(); return; } const N = PC.isNet(); const tot = d3.sum(W.wd, (x) => (N ? x.avgN : x.avg)) || 1;
  PC.hbar(el, W.wd.map((x) => ({ ...x, v: N ? x.avgN : x.avg, s: (N ? x.avgN : x.avg) / tot })), { label: 'label', value: 'v', sub: (d) => (N ? '฿' + PC.nf(Math.round(d.v)) : d3.format(',.1f')(d.v) + ' ชิ้น') }); });
dash.draw('c_mq_md', (el) => { const W = mqWhen(); if (!W || !W.tot) { el.replaceChildren(); return; } const N = PC.isNet();
  PC.hbar(el, W.md.map((x) => ({ ...x, v: N ? x.avgN : x.avg })), { label: 'label', value: 'v', sub: (d) => (N ? '฿' + PC.nf(Math.round(d.v)) : d3.format(',.1f')(d.v) + ' ชิ้น') }); });
dash.draw('mq_when', (el) => { el.replaceChildren(); const W = mqWhen(); if (!W) return; if (!W.tot) { el.textContent = 'ยังไม่มียอดขาย Matcode นี้ตั้งแต่ต้นปีตาม Filter ที่เลือก'; return; }
  const B = (s) => { const b = document.createElement('b'); b.textContent = s; return b; }; const N = PC.isNet(); const V = (x) => (N ? x.net : x.units);
  const bw = W.wk.reduce((a, b) => (V(b) > V(a) ? b : a), W.wk[0]); const [wa, wb] = SA.wRange(+W.days[0].d.slice(0, 4), bw.w);
  const F = (v) => (N ? '฿' + PC.nf(Math.round(v)) : PC.nf(v) + ' ชิ้น'); const A = (x) => (N ? x.avgN : x.avg); const avgAll = d3.mean(W.wd, A) || 0; const wdS = W.wd.slice().sort((a, b) => A(b) - A(a)); const mdS = W.md.slice().sort((a, b) => A(b) - A(a));
  const bm = W.mo.reduce((a, b) => ((N ? b[2] > a[2] : b[1] > a[1]) ? b : a), W.mo[0]); const top3 = W.days.slice().sort((a, b) => V(b) - V(a)).slice(0, 3).filter((x) => x.units > 0);
  const last4 = W.wk.slice(-5, -1), prev4 = W.wk.slice(-9, -5); const g = d3.sum(prev4, V) ? d3.sum(last4, V) / d3.sum(prev4, V) - 1 : null;
  el.append('สัปดาห์ที่ขายดีที่สุด ', B('Week ' + bw.w + ' (' + PC.day(wa) + ' – ' + PC.day(wb) + ') ' + F(V(bw))), ' · เดือนที่ขายดีสุด ', B(PC.mon(bm[0]) + ' ' + F(N ? bm[2] : bm[1])),
    ' · วันที่ขายดีในสัปดาห์ ', B(wdS[0].label + (avgAll ? ' (' + (A(wdS[0]) / avgAll - 1 >= 0 ? '+' : '') + PC.pf(A(wdS[0]) / avgAll - 1) + ' จากค่าเฉลี่ย)' : '')), ' รองลงมา ', B(wdS[1].label),
    ' · ช่วงของเดือนที่ขายดี ', B(mdS[0].label));
  if (top3.length) el.append(' · วันที่ขายได้มากที่สุด ', B(top3.map((x) => PC.day(x.d) + ' (' + F(V(x)) + ')').join(', ')));
  if (g != null) el.append(' · 4 สัปดาห์ล่าสุด (ไม่นับสัปดาห์นี้) เทียบ 4 สัปดาห์ก่อนหน้า ', B((g >= 0 ? '+' : '') + PC.pf(g))); });
