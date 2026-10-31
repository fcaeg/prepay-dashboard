/* ---------- Sale Analysis ---------- */
const SA = (() => {
  const D = 864e5, iso = (x) => x.toISOString().slice(0, 10), add = (ds, n) => iso(new Date(Date.parse(ds + 'T00:00:00Z') + n * D)), diff = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / D);
  const isoW = (ds) => { const d = new Date(ds + 'T00:00:00Z'); const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day + 3); const y = d.getUTCFullYear(); const f = new Date(Date.UTC(y, 0, 4)); return { y, w: 1 + Math.round(((d - f) / D - 3 + ((f.getUTCDay() + 6) % 7)) / 7) }; };
  const wRange = (y, w) => { const f = new Date(Date.UTC(y, 0, 4)); const mon = new Date(f.getTime() - ((f.getUTCDay() + 6) % 7) * D + (w - 1) * 7 * D); return [iso(mon), iso(new Date(mon.getTime() + 6 * D))]; };
  const LV = { zone: 'Region', area: 'Area', shop: 'สาขา', emp: 'พนักงาน', group: 'กลุ่มประเภทซิม', sub: 'ประเภทซิม (รุ่นย่อย)', mat: 'ชนิดซิม (Matcode)' };
  const info = () => { const r = PC.rows('enriched'); if (!r || !r.length) return null; const today = r.reduce((a, x) => (x.date > a ? x.date : a), ''); const cur = isoW(today);
    const pr = dash.params(); const pd = pr.saperiod || 'mtd'; const wk = Math.min(+(pr.saweek || cur.w), cur.w); let from, to = today, pf = null, pt = null, label, plabel;
    if (pd === 'today') { from = today; pf = pt = add(today, -7); label = 'Today ' + PC.day(today); plabel = 'วันเดียวกันสัปดาห์ก่อน (' + PC.day(pf) + ')'; }
    else if (pd === 'week') { const [a, b] = wRange(cur.y, wk); from = a; to = b < today ? b : today; pf = add(a, -7); pt = add(to, -7); label = 'Week ' + wk; plabel = 'Week ' + (wk - 1) + ' (ช่วงวันเดียวกัน)'; }
    else if (pd === 'ytd') { from = today.slice(0, 4) + '-01-01'; label = 'YTD ' + (+today.slice(0, 4) + 543); plabel = null; }
    else { from = today.slice(0, 8) + '01'; const y = +today.slice(0, 4), m = +today.slice(5, 7); const pm = m === 1 ? (y - 1) + '-12' : y + '-' + String(m - 1).padStart(2, '0'); const pdays = new Date(Date.UTC(+pm.slice(0, 4), +pm.slice(5, 7), 0)).getUTCDate();
      pf = pm + '-01'; pt = pm + '-' + String(Math.min(+today.slice(8, 10), pdays)).padStart(2, '0'); label = 'MTD ' + PC.mon(today.slice(0, 7)); plabel = 'เดือนก่อนช่วงเดียวกัน (' + PC.day(pf) + ' – ' + PC.day(pt) + ')'; }
    return { today, cur, pd, wk, from, to, pf, pt, label, plabel, lvl: pr.salevel || 'zone' }; };
  const base = () => { const r = PC.rows('enriched'), I = info(); if (!r || !I) return null; const p = PC.P();
    return r.filter((x) => PCin(x.area, p.area) && (p.stype === 'ALL' || x.stype === p.stype) && (p.group === 'ALL' || x.group === p.group) && ((x.date >= I.from && x.date <= I.to) || (I.pf && x.date >= I.pf && x.date <= I.pt))); };
  const simList = () => { const r = base(), I = info(); if (!r) return []; const N = PC.isNet(); const m = new Map(); for (const x of r) if (x.date >= I.from && x.date <= I.to) m.set(x.group, (m.get(x.group) || 0) + (N ? x.net : x.units)); return [...m.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]); };
  const sim = () => { if (PC.P().group !== 'ALL') return PC.P().group; const v = dash.params().sasim; const l = simList(); return l.includes(v) ? v : 'ALL'; };
  const memo = new Map();
  const aggBy = (LVL) => { const I = info(), r = base(); if (!I || !r) return null; const s = sim(); const k = JSON.stringify([LVL, I, s, PC.P(), PC.isNet(), (PC.rows('enriched') || []).length]); if (memo.has(k)) return memo.get(k); if (memo.size > 40) memo.clear();
    const staff = new Map((PC.rows('staff') || []).map((x) => [String(x.emp), x])), shops = new Map((PC.rows('shops') || []).map((x) => [String(x.shop), x]));
    const lvl = LVL === 'group' && s !== 'ALL' ? 'sub' : LVL; const mats = new Map((PC.rows('matcodes') || []).map((x) => [String(x.matcode), x]));
    const key = (x) => (lvl === 'zone' ? PCzone(x.area) || '-' : lvl === 'area' ? x.area : lvl === 'shop' ? String(x.shop) : lvl === 'emp' ? String(x.emp) : lvl === 'sub' ? x.simtype : lvl === 'mat' ? String(x.matcode) : x.group);
    const lab = (k) => (lvl === 'shop' ? (shops.get(k) || {}).name || k : lvl === 'emp' ? ((staff.get(k) || {}).name || k) : lvl === 'mat' ? String((mats.get(k) || {}).name || k).replace(/^TMH\d /, '').replace(/_VAS| MULTI/g, '') : k);
    const sub = (k, x) => (lvl === 'shop' ? x.area : lvl === 'emp' ? ((shops.get(String((staff.get(k) || {}).shop || x.shop)) || {}).name || '') : lvl === 'area' ? PCzone(x.area) : lvl === 'mat' ? x.group + ' · ฿' + PC.nf((mats.get(String(x.matcode)) || {}).price || 0) : lvl === 'sub' ? x.group : '');
    const m = new Map(), dc = new Map(), dp = new Map(); const T = { cu: 0, cn: 0, pu: 0, pn: 0 };
    for (const x of r) { if (s !== 'ALL' && x.group !== s) continue; const k = key(x); const a = m.get(k) || { key: k, label: lab(k), sub: sub(k, x), cu: 0, cn: 0, pu: 0, pn: 0, shops: new Set() };
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
  return { info, agg, aggBy, base, simList, sim, LV, add, diff, wRange };
})();
const saC = (A) => (A.N ? A.T.cn : A.T.cu), saP = (A) => (A.N ? A.T.pn : A.T.pu);
const saPct = (v) => (v == null ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + PC.pf(Math.abs(v)));
const saCol = (v) => (v == null ? 'var(--color-fg-muted)' : v >= 0 ? 'var(--color-ok)' : 'var(--color-bad)');
const saLvlName = () => { const A = SA.agg(); return A ? (A.lvl === 'sub' && A.s !== 'ALL' ? 'ประเภทซิม (รุ่นย่อย) ใน ' + A.s : SA.LV[A.lvl]) : ''; };
dash.draw('f_saweek', (sel) => { const I = SA.info(); if (!I) return; const o = []; for (let w = I.cur.w; w >= 1; w--) { const [a, b] = SA.wRange(I.cur.y, w); o.push(new Option('Week ' + w + ' · ' + PC.day(a) + ' – ' + PC.day(b < I.today ? b : I.today), String(w))); } sel.replaceChildren(...o); sel.value = String(I.wk); sel.onchange = () => dash.setParams({ saweek: +sel.value }); });
dash.draw('f_sasim', (sel) => { const l = SA.simList(); const cur = SA.sim(); sel.replaceChildren(new Option('ทุกประเภทซิม', 'ALL'), ...l.map((g, i) => new Option(g + (i === 0 ? ' (ขายดีที่สุด)' : ' (อันดับ ' + (i + 1) + ')'), g))); sel.value = cur; sel.disabled = PC.P().group !== 'ALL'; sel.onchange = () => dash.setParams({ sasim: sel.value }); });
dash.draw('sa_range', (el) => { const I = SA.info(); el.textContent = I ? I.label + ': ' + PC.day(I.from) + (I.to !== I.from ? ' – ' + PC.day(I.to) : '') + (I.plabel ? ' · เทียบกับ ' + I.plabel : ' · YTD ไม่มีข้อมูลปีก่อน จึงเทียบกับ Target') + ' · สัปดาห์นับจันทร์–อาทิตย์ (ISO)' : ''; });
for (const n of ['sa_lvl1', 'sa_lvl2', 'sa_lvl3']) dash.draw(n, (el) => { el.textContent = saLvlName(); });
dash.draw('sa_net', (el) => { const A = SA.agg(); el.textContent = A ? '฿' + PC.nf(Math.round(A.T.cn)) : '—'; });
dash.draw('sa_net_sub', (el) => { const A = SA.agg(); if (!A) { el.textContent = ''; return; } const g = A.I.pf && A.T.pn > 0 ? A.T.cn / A.T.pn - 1 : null; el.textContent = A.I.pf ? 'ช่วงก่อน ฿' + PC.nf(Math.round(A.T.pn)) + ' · ' + saPct(g) : 'ไม่มีช่วงเทียบ'; el.style.color = saCol(g); });
dash.draw('sa_qty', (el) => { const A = SA.agg(); el.textContent = A ? PC.nf(A.T.cu) : '—'; });
dash.draw('sa_qty_sub', (el) => { const A = SA.agg(); if (!A) { el.textContent = ''; return; } const g = A.I.pf && A.T.pu > 0 ? A.T.cu / A.T.pu - 1 : null; el.textContent = A.I.pf ? 'ช่วงก่อน ' + PC.nf(A.T.pu) + ' · ' + saPct(g) : ''; el.style.color = saCol(g); });
dash.draw('sa_asp', (el) => { const A = SA.agg(); el.textContent = A && A.T.cu > 0 ? '฿' + PC.nf(Math.round(A.T.cn / A.T.cu)) : '—'; });
dash.draw('sa_asp_sub', (el) => { const A = SA.agg(); if (!A) { el.textContent = ''; return; } const a1 = A.T.cu > 0 ? A.T.cn / A.T.cu : null, a0 = A.T.pu > 0 ? A.T.pn / A.T.pu : null; const g = a1 != null && a0 ? a1 / a0 - 1 : null; el.textContent = a0 ? 'ช่วงก่อน ฿' + PC.nf(Math.round(a0)) + ' · ' + saPct(g) : 'Net Amount ÷ QTY'; el.style.color = saCol(g); });
dash.draw('sa_tgt_l', (el) => { const A = SA.agg(); el.textContent = A && A.tgt ? (A.I.pd === 'mtd' ? 'Run-rate สิ้นเดือน เทียบ Target' : 'เทียบ Target ช่วงนี้') : 'Target'; });
dash.draw('sa_tgt', (el) => { const A = SA.agg(); if (!A || !A.tgt) { el.textContent = '—'; el.style.color = ''; return; } const N = A.N; let v;
  if (A.I.pd === 'mtd' && A.tgt.month) v = (saC(A) / A.tgt.el) * A.tgt.mdays / A.tgt.month; else { const t = N ? A.tgt.tn : A.tgt.tu; v = t ? saC(A) / t : null; }
  el.textContent = v == null ? '—' : PC.pf(v); el.style.color = v == null ? '' : v >= 1 ? 'var(--color-ok)' : v >= 0.9 ? 'var(--color-warn)' : 'var(--color-bad)'; });
dash.draw('sa_tgt_sub', (el) => { const A = SA.agg(); if (!A || !A.tgt) { el.textContent = A && A.s !== 'ALL' ? 'Target มีเฉพาะซิม PRE รวมทุกประเภท (เลือก "ทุกประเภทซิม")' : ''; return; } const N = A.N, t = N ? A.tgt.tn : A.tgt.tu;
  el.textContent = A.I.pd === 'mtd' && A.tgt.month ? 'คาดการณ์สิ้นเดือน ' + PC.mfmt(Math.round((saC(A) / A.tgt.el) * A.tgt.mdays)) + ' / Target ' + PC.mfmt(Math.round(A.tgt.month)) : 'Target ช่วงนี้ ' + PC.mfmt(Math.round(t)) + ' · ทำได้ ' + PC.mfmt(Math.round(saC(A))); });
// ranking bars with previous-period marker
dash.draw('c_sa_rank', (el) => { el.replaceChildren(); const A = SA.agg(); if (!A) return; const d = A.rows.slice(0, 15); if (!d.length) { el.append(Object.assign(document.createElement('p'), { className: 'pc-note', textContent: 'ไม่มียอดขายในช่วงนี้' })); return; }
  const max = Math.max(1, ...d.map((x) => Math.max(x.c, x.pv)));
  for (const x of d) { const row = document.createElement('div'); row.className = 'pc-hrow'; const l = document.createElement('span'); l.className = 'l'; l.textContent = x.label; l.title = x.label + (x.sub ? ' · ' + x.sub : '');
    const t = document.createElement('span'); t.className = 't'; t.style.position = 'relative'; const f = document.createElement('span'); f.className = 'f'; f.style.display = 'block'; f.style.width = Math.max(0, x.c / max) * 100 + '%'; f.style.background = dash.colors[0]; t.append(f);
    if (A.I.pf) { const mk = document.createElement('span'); mk.style.cssText = 'position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--color-fg);left:' + Math.max(0, Math.min(100, (x.pv / max) * 100)) + '%'; mk.title = 'ช่วงก่อน ' + PC.mfmt(Math.round(x.pv)); t.append(mk); }
    const v = document.createElement('span'); v.className = 'v'; v.append(PC.mfmt(Math.round(x.c)) + ' · '); const g = document.createElement('b'); g.textContent = A.I.pf ? saPct(x.growth) : PC.pf(x.share); g.style.color = A.I.pf ? saCol(x.growth) : ''; v.append(g);
    row.append(l, t, v); el.append(row); } });
// SVG helpers
const saSvg = (el, H) => { el.replaceChildren(); const W = Math.max(280, el.clientWidth); const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`); return { svg, W, H }; };
const saTip = (el) => { const tip = document.createElement('div'); tip.className = 'pc-tip'; tip.hidden = true; el.append(tip); return (ev, lines) => { if (!lines) { tip.hidden = true; return; } tip.hidden = false; tip.replaceChildren(...lines.flatMap((l, i) => (i ? [document.createElement('br'), l] : [l]))); const r = el.getBoundingClientRect(); let lx = ev.clientX - r.left + 12; if (lx + tip.offsetWidth > r.width) lx = ev.clientX - r.left - tip.offsetWidth - 12; tip.style.left = Math.max(0, lx) + 'px'; tip.style.top = Math.max(0, ev.clientY - r.top - 40) + 'px'; }; };
const saFmtAx = (v) => (Math.abs(v) >= 1e6 ? d3.format('.3~s')(v).replace('G', 'B') : Math.abs(v) >= 1e4 ? d3.format('.3~s')(v) : PC.nf(Math.round(v)));
dash.draw('c_sa_pvm', (el) => { const A = SA.agg(); if (!A) { el.replaceChildren(); return; } if (!A.I.pf) { el.replaceChildren(Object.assign(document.createElement('p'), { className: 'pc-note', textContent: 'YTD ไม่มีข้อมูลปีก่อนให้เทียบ เลือก Today / Week / MTD เพื่อดู Price-Volume-Mix' })); return; }
  const T = A.T, asp0 = T.pu > 0 ? T.pn / T.pu : 0, vol = (T.cu - T.pu) * asp0, pm = T.cn - T.pn - vol;
  const steps = [['ช่วงก่อน', 0, T.pn, 'base'], ['Volume', T.pn, T.pn + vol, vol >= 0 ? 'up' : 'down'], ['Price-Mix', T.pn + vol, T.cn, pm >= 0 ? 'up' : 'down'], ['ช่วงนี้', 0, T.cn, 'base']];
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
  if (n === 1) { const data = [{ k: 'ช่วงนี้', v: cur[0].v, c: dash.colors[0] }, ...(prv.length ? [{ k: 'ช่วงก่อน', v: prv[0].v, c: 'var(--cds-chart-muted)' }] : [])]; const x = d3.scaleBand(data.map((d) => d.k), [56, W - 8]).padding(0.4);
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
    tip(ev, [PC.day(c.d) + ' · ' + PC.mfmt(Math.round(c.v)), ...(q ? ['ช่วงก่อน ' + PC.day(q.d) + ' · ' + PC.mfmt(Math.round(q.v))] : [])]); }).on('pointerleave', (ev) => { if (ev.pointerType === 'mouse') tip(ev, null); }); });
dash.draw('c_sa_pareto', (el) => { const A = SA.agg(); if (!A) { el.replaceChildren(); return; } const d = A.rows.filter((x) => x.c > 0); const tot = d3.sum(d, (x) => x.c); if (!d.length || !tot) { el.replaceChildren(Object.assign(document.createElement('p'), { className: 'pc-note', textContent: 'ไม่มียอดขายในช่วงนี้' })); return; }
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
dash.draw('c_sa_contrib', (el) => { el.replaceChildren(); const A = SA.agg(); if (!A) return; if (!A.I.pf) { el.append(Object.assign(document.createElement('p'), { className: 'pc-note', textContent: 'YTD ไม่มีช่วงก่อนหน้าให้เทียบ' })); return; }
  const up = A.rows.filter((x) => x.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 8), dn = A.rows.filter((x) => x.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 8); const max = Math.max(1, ...[...up, ...dn].map((x) => Math.abs(x.delta)));
  const tot = saC(A) - saP(A);
  for (const [lst, ttl] of [[up, 'เพิ่มขึ้นมากที่สุด'], [dn, 'ลดลงมากที่สุด']]) { const h = document.createElement('h4'); h.className = 'pc-h4'; h.textContent = ttl + (lst.length ? '' : ' — ไม่มี'); el.append(h);
    for (const x of lst) { const row = document.createElement('div'); row.className = 'pc-hrow'; const l = document.createElement('span'); l.className = 'l'; l.textContent = x.label; l.title = x.label + (x.sub ? ' · ' + x.sub : '');
      const t = document.createElement('span'); t.className = 't'; const f = document.createElement('span'); f.className = 'f'; f.style.display = 'block'; f.style.width = (Math.abs(x.delta) / max) * 100 + '%'; f.style.background = x.delta >= 0 ? 'var(--color-ok)' : 'var(--color-bad)'; t.append(f);
      const v = document.createElement('span'); v.className = 'v'; v.textContent = (x.delta >= 0 ? '+' : '−') + PC.mfmt(Math.round(Math.abs(x.delta))) + (tot ? ' · ' + PC.pf(Math.abs(x.delta / tot)) + ' ของส่วนต่างรวม' : ''); row.append(l, t, v); el.append(row); } } });
const QTH = { Star: 'ดาวเด่น', 'Cash Cow': 'ฐานหลัก', 'Question Mark': 'ดาวรุ่ง', Dog: 'ต้องฟื้นฟู', '-': '-' };
const QADV = { Star: 'รักษามาตรฐานและขยายผล', 'Cash Cow': 'ยอดหลักแต่โตช้า ต้องกระตุ้น', 'Question Mark': 'กำลังโต ควรลงทุนเพิ่ม', Dog: 'หาสาเหตุและทำแผนแก้ไข' };
const saQuad = (A) => { if (!A.I.pf) return () => '-'; const n = A.rows.filter((x) => x.c > 0).length || 1; const g0 = saP(A) > 0 ? saC(A) / saP(A) - 1 : 0; return (x) => { const hs = x.share >= 1 / n, hg = x.growth == null ? true : x.growth >= g0; return hs && hg ? 'Star' : hs ? 'Cash Cow' : hg ? 'Question Mark' : 'Dog'; }; };
dash.draw('c_sa_bcg', (el) => { const A = SA.agg(); if (!A) { el.replaceChildren(); return; } if (!A.I.pf) { el.replaceChildren(Object.assign(document.createElement('p'), { className: 'pc-note', textContent: 'YTD ไม่มีช่วงก่อนหน้าให้คำนวณการเติบโต' })); return; }
  const d = A.rows.filter((x) => x.c > 0 && x.growth != null); if (!d.length) { el.replaceChildren(Object.assign(document.createElement('p'), { className: 'pc-note', textContent: 'ข้อมูลไม่พอสำหรับ Matrix' })); return; }
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
    { f: 'cn', label: 'Net Amount', num: true, fmt: PC.nf, bar: A && A.N }, { f: 'cu', label: 'QTY', num: true, fmt: PC.nf, bar: A && !A.N }, { f: 'share', label: '% สัดส่วน', num: true, fmt: PC.pf }, { f: 'asp', label: 'ASP', num: true, fmt: PC.nf },
    ...(A && A.I.pf ? [{ f: 'pn', label: 'Net ช่วงก่อน', num: true, fmt: PC.nf }, { f: 'pu', label: 'QTY ช่วงก่อน', num: true, fmt: PC.nf }, { f: 'growth', label: '% เปลี่ยนแปลง', num: true, pill: (d) => (d.growth == null ? ['mute', 'ใหม่'] : [d.growth >= 0 ? 'ok' : d.growth > -0.1 ? 'warn' : 'bad', saPct(d.growth)]) },
      { f: 'd', label: 'ส่วนต่าง', num: true, fmt: (v) => (v > 0 ? '+' : '') + PC.nf(v) }, { f: 'quad', label: 'กลุ่ม (Matrix)' }] : []),
    ...(lv !== 'emp' ? [{ f: 'shops', label: 'สาขาที่ขาย', num: true, fmt: PC.nf }] : []) ] }); });
dash.draw('sa_alerts', (el) => { el.replaceChildren(); const S = SA.aggBy('shop'), E = SA.aggBy('emp'), M = SA.aggBy('mat'); if (!S || !E || !M) return; const I = S.I, N = S.N; const sh = (s) => String(s).replace(/^True (Shop|shop|Move Shop) /, '');
  const box = (cls, title, items, empty) => { const b = document.createElement('div'); b.className = 'pc-abox ' + cls; const h = document.createElement('h4'); h.textContent = title; b.append(h); const ol = document.createElement('ol');
    for (const parts of items) { const li = document.createElement('li'); for (const p of parts) { if (Array.isArray(p)) { const x = document.createElement('b'); x.textContent = p[0]; if (p[1]) x.style.color = p[1]; li.append(x); } else if (p && p.m) { const x = document.createElement('span'); x.className = 'm'; x.textContent = p.m; li.append(x); } else li.append(p); } ol.append(li); }
    if (!items.length) { const li = document.createElement('li'); li.className = 'm'; li.textContent = empty; ol.append(li); } b.append(ol); el.append(b); };
  const raw = SA.base() || []; const s = S.s; const inCur = (x) => x.date >= I.from && x.date <= I.to && (s === 'ALL' || x.group === s);
  const shopMat = new Map(), shopEmp = new Map(); for (const x of raw) { if (!inCur(x)) continue; const k = String(x.shop), v = N ? x.net : x.units; const a = shopMat.get(k) || new Map(); a.set(String(x.matcode), (a.get(String(x.matcode)) || 0) + v); shopMat.set(k, a); const e = shopEmp.get(k) || new Map(); e.set(String(x.emp), (e.get(String(x.emp)) || 0) + v); shopEmp.set(k, e); }
  const matName = new Map(M.rows.map((x) => [x.key, x.label])), matShare = new Map(M.rows.map((x) => [x.key, x.share])), empName = new Map(E.rows.map((x) => [x.key, x.label]));
  const aspAll = S.T.cu > 0 ? S.T.cn / S.T.cu : 0; const g0 = I.pf && saP(S) > 0 ? saC(S) / saP(S) - 1 : null; const med = d3.median(S.rows.filter((x) => x.c > 0), (x) => x.c) || 0;
  // 1) model shops
  const good = S.rows.filter((x) => x.c > 0 && x.c >= med && (g0 == null || (x.growth != null && x.growth >= g0))).sort((a, b) => (I.pf ? b.delta - a.delta : b.c - a.c)).slice(0, 5);
  box('good', 'สาขาที่ทำได้ดี (ต้นแบบ)', good.map((x) => { const mm = [...(shopMat.get(x.key) || new Map()).entries()].sort((a, b) => b[1] - a[1]); const tot = d3.sum(mm, (m) => m[1]) || 1;
    const idx = mm.map(([k, v]) => ({ k, sh: v / tot, ix: (v / tot) / Math.max(0.001, matShare.get(k) || 0) })).filter((m) => m.sh >= 0.05).sort((a, b) => b.ix - a.ix)[0];
    const top = mm[0]; const em = [...(shopEmp.get(x.key) || new Map()).entries()].sort((a, b) => b[1] - a[1])[0];
    return [[sh(x.label)], ' ' + PC.mfmt(Math.round(x.c)) + (I.pf ? ' (' + saPct(x.growth) + ')' : ''), { m: ' · ASP ฿' + PC.nf(Math.round(x.asp || 0)) + (aspAll ? (x.asp > aspAll * 1.1 ? ' สูงกว่าเฉลี่ย' : x.asp < aspAll * 0.9 ? ' ต่ำกว่าเฉลี่ย' : '') : '') },
      document.createElement('br'), { m: 'ถอดแบบ: ' + (top ? 'ขาย ' + matName.get(top[0]) + ' มากสุด ' + PC.pf(top[1] / tot) : '') + (idx && idx.ix > 1.3 && (!top || idx.k !== top[0]) ? ' · เน้น ' + matName.get(idx.k) + ' ' + PC.pf(idx.sh) + ' (ค่าเฉลี่ย ' + PC.pf(matShare.get(idx.k) || 0) + ')' : '') + (em ? ' · พนักงานหลัก ' + (empName.get(em[0]) || em[0]) + ' (' + PC.pf(em[1] / tot) + ' ของสาขา)' : '') }]; }), 'ยังไม่มีสาขาที่โดดเด่นในช่วงนี้');
  // 2) top staff
  const te = E.rows.filter((x) => x.c > 0).slice(0, 5);
  box('good', 'พนักงานที่ขายได้ดี', te.map((x) => [[x.label], ' ' + PC.mfmt(Math.round(x.c)) + ' · ' + PC.nf(x.cu) + ' ชิ้น', { m: ' · ' + sh(x.sub || '') + (I.pf ? ' · ' + saPct(x.growth) : '') + ' · ASP ฿' + PC.nf(Math.round(x.asp || 0)) }]), 'ไม่มีข้อมูล');
  // 3) SIM items
  const minC = saC(M) * 0.01; const topM = M.rows.filter((x) => x.c > 0).slice(0, 3); const rising = I.pf ? M.rows.filter((x) => x.c >= minC && x.growth != null && x.growth > 0.1).sort((a, b) => b.growth - a.growth).slice(0, 3) : [];
  box('info', 'ชนิดซิมที่ขายได้ดี / กำลังโต', [...topM.map((x) => [['ขายดี: ' + x.label], ' ' + PC.mfmt(Math.round(x.c)) + ' · ' + PC.pf(x.share), { m: ' · ' + x.sub + (I.pf ? ' · ' + saPct(x.growth) : '') }]),
    ...rising.map((x) => [['กำลังโต: ' + x.label, 'var(--color-ok)'], ' ' + saPct(x.growth), { m: ' · ' + PC.mfmt(Math.round(x.c)) + ' · ' + x.sub + ' → เตรียม Stock ให้พอ' }])], 'ไม่มีข้อมูล');
  // 4) watch / improve
  const W = [];
  if (I.pf) { S.rows.filter((x) => x.delta < 0 && x.pv > 0).sort((a, b) => a.delta - b.delta).slice(0, 4).forEach((x) => W.push([['สาขา ' + sh(x.label), 'var(--color-bad)'], ' ' + saPct(x.growth) + ' (−' + PC.mfmt(Math.round(-x.delta)) + ')', { m: ' → ตรวจ Stock / พนักงาน / Traffic' }]));
    E.rows.filter((x) => x.delta < 0 && x.pv >= med / 3).sort((a, b) => a.delta - b.delta).slice(0, 2).forEach((x) => W.push([['พนักงาน ' + x.label, 'var(--color-bad)'], ' ' + saPct(x.growth), { m: ' · ' + sh(x.sub || '') + ' → โค้ช/ทบทวนเป้ารายบุคคล' }]));
    M.rows.filter((x) => x.pv >= minC && x.growth != null && x.growth < -0.15).sort((a, b) => a.delta - b.delta).slice(0, 2).forEach((x) => W.push([['ซิม ' + x.label, 'var(--color-warn)'], ' ' + saPct(x.growth), { m: ' · ' + x.sub + ' → เช็ก Stock ขาด/ราคา/โปรโมชัน' }])); }
  if (aspAll) S.rows.filter((x) => x.cu >= 10 && x.asp != null && x.asp < aspAll * 0.7).sort((a, b) => a.asp - b.asp).slice(0, 2).forEach((x) => W.push([['ASP ต่ำ: ' + sh(x.label), 'var(--color-warn)'], ' ฿' + PC.nf(Math.round(x.asp)) + ' (เฉลี่ย ฿' + PC.nf(Math.round(aspAll)) + ')', { m: ' → แนะนำแพ็กเกจราคาสูง/ระยะยาว' }]));
  const tg = PC.rows('targets'), shopsD = new Map((PC.rows('shops') || []).map((x) => [String(x.shop), x]));
  if (tg && s === 'ALL' && PC.P().group === 'ALL') { const dim = (ds) => new Date(Date.UTC(+ds.slice(0, 4), +ds.slice(5, 7), 0)).getUTCDate(); const tm = new Map(); for (const t of tg) tm.set(t.month + '|' + t.shop, N ? +t.target_net || 0 : +t.target_units || 0);
    const low = S.rows.map((x) => { let tt = 0; for (let d = I.from; d <= I.to; d = SA.add(d, 1)) tt += (tm.get(d.slice(0, 7) + '|' + x.key) || 0) / dim(d); return { ...x, tt, at: tt > 0 ? x.c / tt : null }; }).filter((x) => x.at != null && x.tt >= 1 && x.at < 0.7).sort((a, b) => a.at - b.at).slice(0, 3);
    low.forEach((x) => W.push([['ต่ำกว่า Target: ' + sh(x.label), 'var(--color-bad)'], ' ' + PC.pf(x.at) + ' ของ Target ช่วงนี้', { m: ' → วางแผนเร่งยอด/กระจาย Stock' }])); }
  box('watch', 'ต้องจับตา / Improve', W, 'ไม่มีกลุ่มที่น่ากังวลในช่วงนี้');
});
dash.draw('sa_text', (el) => { el.replaceChildren(); const A = SA.agg(); if (!A) return; const li = (parts) => { const l = document.createElement('li'); for (const p of parts) { if (Array.isArray(p)) { const b = document.createElement('b'); b.textContent = p[0]; if (p[1]) b.style.color = p[1]; l.append(b); } else l.append(p); } el.append(l); };
  const T = A.T, N = A.N, I = A.I, cur = saC(A), prv = saP(A), lvn = saLvlName(); const sh = (s) => String(s).replace(/^True (Shop|shop|Move Shop) /, '');
  if (!A.rows.length) { li(['ไม่มียอดขายในช่วงนี้ตามตัวกรองที่เลือก']); return; }
  li([I.label + (A.s !== 'ALL' ? ' · ' + A.s : '') + ': Net Amount ', ['฿' + PC.nf(Math.round(T.cn))], ' จาก ', [PC.nf(T.cu) + ' ชิ้น'], ' ราคาเฉลี่ย ', ['฿' + PC.nf(T.cu ? Math.round(T.cn / T.cu) : 0)],
    ...(I.pf ? [' · เทียบ' + I.plabel + ' ', [saPct(prv > 0 ? cur / prv - 1 : null), saCol(prv > 0 ? cur / prv - 1 : null)], ' (' + (cur - prv >= 0 ? '+' : '−') + PC.mfmt(Math.round(Math.abs(cur - prv))) + ')'] : [])]);
  if (I.pf && T.pu > 0) { const asp0 = T.pn / T.pu, vol = (T.cu - T.pu) * asp0, pm = T.cn - T.pn - vol; const main = Math.abs(vol) >= Math.abs(pm) ? 'จำนวนชิ้น (Volume)' : 'ราคาเฉลี่ย/สัดส่วนสินค้า (Price-Mix)';
    li(['Price-Volume-Mix: ยอด Net เปลี่ยน ', [(T.cn - T.pn >= 0 ? '+' : '−') + '฿' + PC.nf(Math.round(Math.abs(T.cn - T.pn)))], ' มาจาก Volume ', [(vol >= 0 ? '+' : '−') + '฿' + PC.nf(Math.round(Math.abs(vol))), saCol(vol)], ' และ Price-Mix ', [(pm >= 0 ? '+' : '−') + '฿' + PC.nf(Math.round(Math.abs(pm))), saCol(pm)], ' → ตัวขับหลักคือ ', [main],
      pm < 0 && vol > 0 ? ' (ขายได้ชิ้นมากขึ้นแต่เป็นซิมราคาต่ำลง ควรดันซิมราคาสูง/แพ็กเกจยาว)' : pm > 0 && vol < 0 ? ' (ชิ้นลดลงแต่ขายซิมราคาสูงได้มากขึ้น ควรเพิ่ม Traffic/จำนวนชิ้น)' : '']); }
  if (A.tgt) { const t = N ? A.tgt.tn : A.tgt.tu; if (I.pd === 'mtd' && A.tgt.month) { const proj = (cur / A.tgt.el) * A.tgt.mdays, need = Math.max(0, (A.tgt.month - cur) / Math.max(1, A.tgt.mdays - A.tgt.el));
      li(['Run-rate: ถ้าขายในอัตราเดิม สิ้นเดือนจะได้ ', [PC.mfmt(Math.round(proj))], ' = ', [PC.pf(proj / A.tgt.month), proj >= A.tgt.month ? 'var(--color-ok)' : 'var(--color-bad)'], ' ของ Target เดือน', proj >= A.tgt.month ? ' (คาดว่าทำได้ตามเป้า)' : ' · ต้องทำเพิ่มวันละ ' + PC.mfmt(Math.round(need)) + ' ในวันที่เหลือ']); }
    else if (t) li(['เทียบ Target ช่วงนี้ (เฉลี่ยตามวัน): ทำได้ ', [PC.pf(cur / t), cur >= t ? 'var(--color-ok)' : 'var(--color-bad)'], ' (' + PC.mfmt(Math.round(cur)) + ' / ' + PC.mfmt(Math.round(t)) + ')']); }
  const pos = A.rows.filter((x) => x.c > 0); let c = 0, k = 0; const tot = d3.sum(pos, (x) => x.c); for (const x of pos) { c += x.c; k++; if (c / tot >= 0.8) break; }
  if (pos.length > 2) li(['Pareto: ', [k + ' จาก ' + pos.length + ' ' + lvn], ' (' + PC.pf(k / pos.length) + ') ทำยอด 80% ', k / pos.length <= 0.3 ? '→ ยอดกระจุกตัวสูง ควรดูแลกลุ่มหลักใกล้ชิดและพัฒนากลุ่มที่เหลือ' : '→ ยอดกระจายตัวดี', ' · อันดับ 1 คือ ', [sh(pos[0].label)], ' (' + PC.pf(pos[0].share) + ')']);
  if (I.pf) { const up = A.rows.filter((x) => x.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3), dn = A.rows.filter((x) => x.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);
    if (up.length) li(['ดันยอดขึ้นมากที่สุด: ', ...up.flatMap((x, i) => [(i ? ' · ' : ''), [sh(x.label)], ' +' + PC.mfmt(Math.round(x.delta)) + (x.growth != null ? ' (' + saPct(x.growth) + ')' : '')])]);
    if (dn.length) li(['ฉุดยอดลงมากที่สุด: ', ...dn.flatMap((x, i) => [(i ? ' · ' : ''), [sh(x.label), 'var(--color-bad)'], ' −' + PC.mfmt(Math.round(-x.delta)) + (x.growth != null ? ' (' + saPct(x.growth) + ')' : '')]), ' → ควรตรวจสาเหตุ (Stock, พนักงาน, Traffic)']);
    const q = saQuad(A); const grp = d3.group(A.rows.filter((x) => x.c > 0), q); const nm = (g) => (grp.get(g) || []).slice(0, 3).map((x) => sh(x.label)).join(', ');
    const cnt = (g) => (grp.get(g) || []).length;
    li(['Growth-Share Matrix: ', ['ดาวเด่น ' + cnt('Star'), 'var(--color-ok)'], cnt('Star') ? ' (' + nm('Star') + ') → รักษามาตรฐาน ใช้เป็นต้นแบบและขยายผล' : '']);
    if (cnt('Cash Cow')) li([['ฐานหลัก ' + cnt('Cash Cow'), '#3b7dd8'], ' (' + nm('Cash Cow') + ') → ยอดใหญ่แต่โตช้ากว่าค่าเฉลี่ย ควรกระตุ้นด้วยโปรโมชันและดูแล Stock ให้พอขาย']);
    if (cnt('Question Mark')) li([['ดาวรุ่ง ' + cnt('Question Mark'), 'var(--color-warn)'], ' (' + nm('Question Mark') + ') → กำลังโตเร็ว ควรลงทุนเพิ่ม เช่น เติม Stock เพิ่มกำลังขาย']);
    if (cnt('Dog')) li([['ต้องฟื้นฟู ' + cnt('Dog'), 'var(--color-bad)'], ' (' + nm('Dog') + ') → ยอดน้อยและหดตัว ควรหาสาเหตุ (Stock / พนักงาน / ทำเล) และทำแผนแก้ไข']); }
  if (A.lvl === 'emp' || A.lvl === 'shop') { const act = A.rows.filter((x) => x.cu > 0).length; li(['Productivity: ', [act + ' ' + lvn], ' มียอดขาย เฉลี่ย ', [PC.mfmt(Math.round(cur / Math.max(1, act)))], ' ต่อ' + (A.lvl === 'emp' ? 'คน' : 'สาขา') + ' · ค่ากลาง (Median) ', [PC.mfmt(Math.round(d3.median(A.rows.filter((x) => x.cu > 0), (x) => x.c) || 0))]]); }
});
dash.onData(() => { document.querySelectorAll('#f-saperiod').forEach((s) => { s.value = dash.params().saperiod || 'mtd'; }); document.querySelectorAll('#f-salevel').forEach((s) => { s.value = dash.params().salevel || 'zone'; }); document.querySelectorAll('#wrap-saweek').forEach((n) => { n.hidden = (dash.params().saperiod || 'mtd') !== 'week'; }); });
document.querySelectorAll('#f-saperiod').forEach((s) => s.addEventListener('change', () => dash.setParams({ saperiod: s.value })));
document.querySelectorAll('#f-salevel').forEach((s) => s.addEventListener('change', () => dash.setParams({ salevel: s.value })));
