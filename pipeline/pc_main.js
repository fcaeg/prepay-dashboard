/* ---------- ranking ---------- */
const rkCol = (a) => (a == null ? 'var(--cds-chart-muted)' : a >= 1 ? 'var(--color-ok)' : a >= 0.9 ? 'var(--color-warn)' : 'var(--color-bad)');
const rkF = () => (PC.isNet() ? { ach: 'ach_net', act: 'act_net', ttd: 'ttd_net', tgt: 'target_net', tpd: 'tpd_net', need: 'need_net', gap: 'gap_net', avg: 'avg_net', full: 'full_net', d: 'net' } : { ach: 'ach_units', act: 'act_units', ttd: 'ttd_units', tgt: 'target_units', tpd: 'tpd_units', need: 'need_units', gap: 'gap_units', avg: 'avg_units', full: 'full_units', d: 'units' });
const rDates = () => { const r = PC.rows('area_day'); return r ? [...new Set(r.map((x) => x.date))].sort() : []; };
const rDate = () => { const ds = rDates(); const v = dash.params().rdate; return ds.includes(v) ? v : ds[ds.length - 1]; };
const rkRows = () => { const all = PC.rows('area_rank'); if (!all) return null; const st = PC.P().stype, f = rkF();
  const sel = PC.P().area, zsel = window.PC_ZONES.includes(sel) ? sel : null; const r = all.filter((x) => x.stype === st && x.area !== 'ALL' && !window.PC_ZONES.includes(x.area) && (!zsel || PCzone(x.area) === zsel) && x[f.tgt] > 0).sort((a, b) => (b[f.ach] ?? -1) - (a[f.ach] ?? -1));
  return r.map((x, i) => ({ ...x, rank: i + 1 })); };
const rdRows = () => { const all = PC.rows('area_day'); if (!all) return null; const st = PC.P().stype, d = rDate(), f = rkF();
  const sel = PC.P().area, zsel = window.PC_ZONES.includes(sel) ? sel : null; const r = all.filter((x) => x.stype === st && x.area !== 'ALL' && !window.PC_ZONES.includes(x.area) && (!zsel || PCzone(x.area) === zsel) && x.date === d && x[f.tpd] > 0).sort((a, b) => (b[f.ach] ?? -1) - (a[f.ach] ?? -1) || b[f.d] - a[f.d]);
  return r.map((x, i) => ({ ...x, drank: i + 1 })); };
const rkTot = (id) => { const all = PC.rows(id); const st = PC.P().stype; if (!all) return null; const tk = window.PC_ZONES.includes(PC.P().area) ? PC.P().area : 'ALL'; return all.find((x) => x.stype === st && x.area === tk && (id !== 'area_day' || x.date === rDate())) || null; };
const rkVal = (el, id, key, fmt) => { const f = rkF(); const fld = f[key] || key; const r = rkTot(id);
  el.dataset.field = fld; el.dataset.where = PC.where({ stype: PC.P().stype, area: 'ALL', ...(id === 'area_day' && r ? { date: r.date } : {}) });
  const v = r ? r[fld] : null; el.textContent = v == null ? '—' : fmt ? fmt(v) : PC.mfmt(v); return v; };
dash.draw('r_dlabel', (el) => { const d = rDate(); el.textContent = d ? PC.day(d) : '—'; });
dash.draw('r_dach', (el) => { const v = rkVal(el, 'area_day', 'ach', PC.pf); el.style.color = v == null ? '' : rkCol(v); });
dash.draw('r_dact', (el) => rkVal(el, 'area_day', 'd'));
dash.draw('r_ach', (el) => { const v = rkVal(el, 'area_rank', 'ach', PC.pf); el.style.color = v == null ? '' : rkCol(v); });
dash.draw('r_act', (el) => rkVal(el, 'area_rank', 'act'));
dash.draw('r_ttd', (el) => rkVal(el, 'area_rank', 'ttd'));
dash.draw('r_tgt', (el) => rkVal(el, 'area_rank', 'tgt'));
dash.draw('r_tpd', (el) => rkVal(el, 'area_rank', 'tpd'));
dash.draw('r_need', (el) => rkVal(el, 'area_rank', 'need'));
dash.draw('r_days', (el) => { const all = PC.rows('area_rank'); const r = all && all[0]; el.dataset.field = 'elapsed'; el.textContent = r ? r.elapsed + ' / ' + r.days + ' วัน' : '—'; });
dash.draw('r_date', (el) => { const all = PC.rows('area_rank'); const r = all && all[0]; el.dataset.field = 'today'; el.textContent = r ? PC.day(r.today) : '—'; });
dash.draw('f_rdate', (sel) => { const ds = rDates(); sel.replaceChildren(...ds.slice().reverse().map((d) => new Option(PC.day(d), d))); sel.value = rDate() || ''; sel.onchange = () => dash.setParams({ rdate: sel.value }); });
const rankList = (el, r, achK, actK, tgtK, rankK, tgtLabel, extra, win) => {
  el.replaceChildren(); if (!r || !r.length) return; const sel = PC.P().area;
  const max = Math.max(1.2, d3.max(r, (d) => d[achK] || 0) * 1.05);
  const hd = document.createElement('div'); hd.className = 'pc-rhead'; for (const s of ['#', 'Area · ยอด / ' + tgtLabel, 'เทียบ Target (เส้น = 100%)', '%']) { const x = document.createElement('span'); x.textContent = s; hd.append(x); } el.append(hd);
  for (const d of r) { const row = document.createElement('div'); row.className = 'pc-rrow' + (sel !== 'ALL' && !window.PC_ZONES.includes(sel) ? (d.area === sel ? ' sel' : ' dim') : '');
    row.dataset.where = PC.where({ stype: d.stype, area: d.area, ...(extra ? extra(d) : {}) });
    const n = document.createElement('span'); n.className = 'n'; n.textContent = d[rankK];
    const l = document.createElement('span'); l.className = 'l'; const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = d.area.replace(/^UPC - /, ''); const sb = document.createElement('span'); sb.className = 'sb'; sb.textContent = PC.mfmt(d[actK]) + ' / ' + PC.mfmt(d[tgtK]); l.append(nm, sb); if (win && window.RKSUB) { const s2 = document.createElement('span'); s2.className = 'sb'; s2.textContent = window.RKSUB(d.area, win).replace(/^ · /, ''); if (s2.textContent) l.append(s2); }
    const t = document.createElement('span'); t.className = 't';
    const fl = document.createElement('span'); fl.className = 'f'; fl.style.width = Math.min(100, (Math.max(0, d[achK] || 0) / max) * 100) + '%'; fl.style.background = rkCol(d[achK]);
    const mk = document.createElement('span'); mk.className = 'm'; mk.style.left = (1 / max) * 100 + '%'; t.append(fl, mk);
    const v = document.createElement('span'); v.className = 'v'; const b = document.createElement('b'); b.textContent = d[achK] == null ? '–' : PC.pf(d[achK]); b.style.color = rkCol(d[achK]); v.append(b);
    row.title = d.area + ' · ยอด ' + PC.mfmt(d[actK]) + ' · ' + tgtLabel + ' ' + PC.mfmt(d[tgtK]);
    row.append(n, l, t, v); el.append(row); }
};
dash.draw('c_rank_zone', (el) => { el.replaceChildren(); const all = PC.rows('area_rank'), ad = PC.rows('area_day'); if (!all) return; const st = PC.P().stype, f = rkF(), N = PC.isNet(), d = rDate();
  const r = all.filter((x) => x.stype === st && window.PC_ZONES.includes(x.area)).sort((a, b) => (b[f.ach] ?? -1) - (a[f.ach] ?? -1));
  const sel = PC.P().area;
  r.forEach((x, i) => { const y = (ad || []).find((z) => z.stype === st && z.area === x.area && z.date === d) || {}; const areas = new Set(all.filter((z) => z.stype === st && !window.PC_ZONES.includes(z.area) && z.area !== 'ALL' && PCzone(z.area) === x.area).map((z) => z.area)).size;
    const c = document.createElement('div'); c.className = 'pc-zc'; c.style.setProperty('--zc', rkCol(x[f.ach])); if (window.PC_ZONES.includes(sel) && sel !== x.area) c.style.opacity = '.5';
    c.dataset.where = PC.where({ stype: st, area: x.area });
    const top = document.createElement('div'); top.className = 'zt'; const zn = document.createElement('span'); zn.className = 'zn'; zn.textContent = '#' + (i + 1) + ' ' + x.area; const zr = document.createElement('span'); zr.className = 'zr'; zr.textContent = PC.nf(areas) + ' Area · ' + PC.nf(x.shops) + ' สาขา'; top.append(zn, zr);
    const big = document.createElement('div'); const zb = document.createElement('span'); zb.className = 'zb'; zb.textContent = x[f.ach] == null ? '–' : PC.pf(x[f.ach]); zb.style.color = rkCol(x[f.ach]); const zbl = document.createElement('span'); zbl.className = 'zbl'; zbl.textContent = '  ยอดสะสมเทียบ Target ถึงวันนี้'; big.append(zb, zbl);
    const dl = document.createElement('dl'); const mom = x[N ? 'mom_net' : 'mom_units'];
    const rows = [['Target ถึงวันนี้', PC.mfmt(x[f.ttd])], ['ยอดสะสม', PC.mfmt(x[f.act])], ['ยอด ' + (d ? PC.day(d) : 'วันล่าสุด'), PC.mfmt(y[f.d] ?? 0) + (y[f.ach] == null ? '' : ' (' + PC.pf(y[f.ach]) + ')')], ['เทียบเดือนก่อน (MoM)', mom == null ? '–' : (mom > 0 ? '+' : mom < 0 ? '−' : '') + PC.pf(Math.abs(mom))], ['Target ทั้งเดือน', PC.mfmt(x[f.tgt])], ['ต้องทำต่อวัน', x[f.need] == null ? '—' : PC.mfmt(x[f.need])]];
    for (const [a, b] of rows) { const dt = document.createElement('dt'); dt.textContent = a; const dd = document.createElement('dd'); dd.textContent = b; dl.append(dt, dd); }
    const mo = dl.children[7]; if (mom != null) mo.style.color = mom >= 0 ? 'var(--color-ok)' : 'var(--color-bad)';
    const dv = dl.children[5]; if (y[f.ach] != null) dv.style.color = rkCol(y[f.ach]);
    c.append(top, big, dl); if (window.ZDAY) ZDAY(c, x.area); el.append(c); }); });
const rfNote = (el, daily) => { const all = PC.rows('area_rank'); const r = all && all[0]; const d = rDate(); const st = PC.P(); const bits = ['Prepay Dashboard', PC.isNet() ? 'Net Amount' : 'QTY'];
  if (daily && d) bits.push('วันที่ ' + PC.day(d)); else if (r) bits.push('ข้อมูลถึง ' + PC.day(r.today) + ' (' + r.elapsed + '/' + r.days + ' วัน)');
  if (st.area !== 'ALL') bits.push(st.area); el.textContent = bits.join(' · '); };
dash.draw('rf_1', (el) => rfNote(el, false));
dash.draw('rf_2', (el) => rfNote(el, true));
dash.draw('rf_3', (el) => rfNote(el, false));
dash.draw('rf_4', (el) => rfNote(el, true));
/* ---------- Alert Issue (Top 3): selected day vs average of the 7 days before, same time of day ---------- */
const ALERT = (() => {
  let key = null, val = null;
  const D = (id) => { const d = dash.data(id); return d.status === 'ok' ? d.data : null; };
  const addD = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  return () => {
    const en = D('enriched'), shops = D('shops'); if (!en || !shops) return null;
    const hr = D('sales_hourly') || [], stock = D('stock_by_shop') || [], mats = D('matcodes') || [];
    const d = rDate(); if (!d) return null;
    const P = PC.P(), N = PC.isNet(), SIG = 0.15;
    const k = [d, P.stype, P.area, N].join('|'); if (k === key && val && val.en === en) return val;
    const sh = new Map(shops.map((s) => [String(s.shop), s])), mm = new Map(mats.map((m) => [String(m.matcode), m]));
    const inScope = (s) => s && s.area && s.area !== '-' && !/Unidentified/i.test(s.area) && +(s.stype_order ?? 9) < 90 && PCin(s.area, P.area) && (P.stype === 'ALL' || s.stype === P.stype);
    // the 7 days before d (only days that have any sales in the file count)
    const have = new Set(en.map((r) => r.date)); const W = []; for (let i = 1; i <= 7; i++) { const x = addD(d, -i); if (have.has(x)) W.push(x); }
    if (!W.length) return null; const W7 = new Set(W), nd = W.length;
    // time of day: selected day still running -> compare with the same hours of the earlier days
    let frac = 1, cut = null; const hMax = hr.reduce((a, r) => (r.date > a ? r.date : a), '');
    if (d === hMax) {
      const H = Math.max(...hr.filter((r) => r.date === d).map((r) => +r.hour));
      const meta = String((window.PC_META || {}).sales_asof || ''); const mf = meta.slice(0, 10) === d && +meta.slice(11, 13) === H ? Math.max(0.05, (+meta.slice(14, 16) || 0) / 60) : 1;
      let up = 0, tot = 0;
      for (const r of hr) { if (r.date >= d || !W7.has(r.date)) continue; const s = sh.get(String(r.shop)); if (!inScope(s)) continue; const v = N ? +r.net : +r.units; tot += v; if (+r.hour < H) up += v; else if (+r.hour === H) up += v * mf; }
      if (tot > 0) frac = up / tot; if (frac > 0.97) frac = 1; else cut = meta.slice(0, 10) === d ? meta.slice(11, 16) : String(H + 1).padStart(2, '0') + ':00';
    }
    // stock snapshot -> estimated stock now = stock − sales after the stock time
    const sAsof = String((stock[0] || {}).asof || ''), sDay = sAsof.slice(0, 10), sHr = +sAsof.slice(11, 13) || 0; const stockOk = sDay && sDay <= d;
    const stk = new Map(), stShops = new Set(); for (const r of stock) { const s = String(r.shop); stShops.add(s); const kk = s + '|' + r.matcode; stk.set(kk, (stk.get(kk) || 0) + (+r.qty || 0)); }
    const after = new Map();
    if (stockOk) { const hrDays = new Set(hr.map((r) => r.date));
      for (const r of en) if (r.date > sDay && r.date <= d) { const kk = String(r.shop) + '|' + r.matcode; after.set(kk, (after.get(kk) || 0) + r.units); }
      if (hrDays.has(sDay)) for (const r of hr) if (r.date === sDay && +r.hour >= sHr) { const kk = String(r.shop) + '|' + r.matcode; after.set(kk, (after.get(kk) || 0) + (+r.units)); } }
    // per shop and shop × matcode: selected day and the 7-day sum
    const S = new Map(), SM = new Map();
    for (const r of en) { if (r.date !== d && !W7.has(r.date)) continue; const s0 = String(r.shop); const s = sh.get(s0); if (!inScope(s)) continue; const v = N ? r.net : r.units, t = r.date === d;
      const a = S.get(s0) || { shop: s0, name: s.name || s0, area: s.area, t: 0, s7: 0 }; if (t) a.t += v; else a.s7 += v; S.set(s0, a);
      const km = s0 + '|' + r.matcode; const b = SM.get(km) || { shop: s0, mat: String(r.matcode), t: 0, s7: 0, tu: 0, s7u: 0 }; if (t) { b.t += v; b.tu += r.units; } else { b.s7 += v; b.s7u += r.units; } SM.set(km, b); }
    for (const a of S.values()) { a.exp = (a.s7 / nd) * frac; a.dv = a.t - a.exp; a.pct = a.exp > 0 ? a.dv / a.exp : null; }
    // stock issues per shop
    const SI = new Map();
    if (stockOk) for (const b of SM.values()) { if (!(b.s7u > 0) || !stShops.has(b.shop)) continue; const est = (stk.get(b.shop + '|' + b.mat) || 0) - (after.get(b.shop + '|' + b.mat) || 0); const perDay = b.s7u / nd;
      const kind = est <= 0 && b.tu === 0 ? 'out' : est > 0 && est < perDay * 3 ? 'low' : null; if (!kind) continue;
      const x = SI.get(b.shop) || { shop: b.shop, out: [], low: [], lost: 0 }; const m = mm.get(b.mat) || {}; const it = { mat: b.mat, name: m.name || b.mat, est: Math.max(0, est), perDay, lost: Math.max(0, (b.s7 / nd) * frac - b.t) };
      x[kind].push(it); if (kind === 'out') x.lost += it.lost; SI.set(b.shop, x); }
    for (const x of SI.values()) { x.out.sort((a, b) => b.lost - a.lost); x.low.sort((a, b) => a.est / a.perDay - b.est / b.perDay); const s = S.get(x.shop) || {}; Object.assign(x, { name: s.name || (sh.get(x.shop) || {}).name || x.shop, area: s.area || (sh.get(x.shop) || {}).area, t: s.t || 0, exp: s.exp || 0, dv: s.dv || 0, pct: s.pct ?? null }); }
    // per Area
    const A = new Map(); for (const a of S.values()) { const z = A.get(a.area) || { area: a.area, t: 0, exp: 0, shops: [] }; z.t += a.t; z.exp += a.exp; z.shops.push(a); A.set(a.area, z); }
    const areas = [...A.values()].filter((z) => z.exp > 0).map((z) => ({ ...z, dv: z.t - z.exp, pct: (z.t - z.exp) / z.exp }));
    const down = areas.slice().sort((a, b) => a.pct - b.pct), up = areas.slice().sort((a, b) => b.pct - a.pct);
    const tot = areas.reduce((o, z) => ({ t: o.t + z.t, exp: o.exp + z.exp }), { t: 0, exp: 0 });
    const stockList = [...SI.values()].filter((x) => x.out.length).sort((a, b) => b.lost - a.lost || b.out.length - a.out.length);
    const lowList = [...SI.values()].filter((x) => !x.out.length && x.low.length).sort((a, b) => b.low.length - a.low.length);
    val = { en, d, W, nd, frac, cut, sAsof, stockOk, down, up, tot, SI, stockList, lowList, SIG, N }; key = k; return val; };
})();
dash.draw('al_note', (el) => { const A = ALERT(); if (!A) { el.textContent = ''; return; } const r = [A.W[A.W.length - 1], A.W[0]];
  el.textContent = 'วันที่ ' + PC.day(A.d) + (A.cut ? ' ถึง ' + A.cut + ' น.' : '') + ' เทียบค่าเฉลี่ย ' + A.nd + ' วันก่อนหน้า (' + PC.day(r[0]) + ' – ' + PC.day(r[1]) + ')' + (A.cut ? ' ช่วงเวลาเดียวกัน' : '') +
    ' · ' + (A.N ? 'Net Amount' : 'QTY') + (A.stockOk ? ' · Stock ณ ' + PC.day(A.sAsof.slice(0, 10)) + (A.sAsof.length > 10 ? ' ' + A.sAsof.slice(11, 16) + ' น.' : '') + ' หักยอดขายหลังจากนั้นแล้ว' + ((Date.parse(A.d) - Date.parse(A.sAsof.slice(0, 10))) / 864e5 >= 2 ? ' (ไฟล์ Stock เก่ากว่า 2 วัน สาขาอาจได้รับของเพิ่มแล้ว ควรเช็กกับสาขา)' : '') : ''); });
dash.draw('c_rank_alert', (el) => { el.replaceChildren(); const A = ALERT(); if (!A) return; const N = A.N;
  const K = (v) => (Math.abs(v) >= 1000 ? (Math.round(v / 100) / 10).toLocaleString('en-US') + 'K' : PC.nf(Math.round(v * 10) / 10)); const F = (v) => (N ? '฿' : '') + K(v) + (N ? '' : ' ชิ้น');
  const SF = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + F(Math.abs(v)), SP = (p) => (p == null ? '' : (p > 0 ? '+' : p < 0 ? '−' : '') + Math.round(Math.abs(p) * 100) + '%');
  const mn = (s) => String(s || '').replace(/_VAS.*$/i, '').replace(/\s+MULTI$/i, ''); const sn = (s) => String(s || '').replace(/^True Shop\s*/i, ''), an = (a) => String(a || '').replace(/^UPC - /, '');
  const dl = A.d === rDates().slice(-1)[0] ? 'วันนี้' : 'วันที่ ' + PC.day(A.d);
  const ol = document.createElement('ol'); ol.className = 'pc-alist'; el.append(ol);
  // parts: string | [text, cls] -> 'b' bold, 'bad' / 'ok' / 'warn' coloured bold
  const item = (cls, label, parts) => { const li = document.createElement('li'); li.className = cls; const k = document.createElement('span'); k.className = 'k'; k.textContent = label + ':'; li.append(k, ' ');
    for (const x of parts) { if (typeof x === 'string') li.append(x); else { const b = document.createElement('b'); if (x[1] && x[1] !== 'b') b.className = x[1]; b.textContent = x[0]; li.append(b); } } ol.append(li); };
  const shops = (list, cls) => list.flatMap((s, i) => [(i ? (i === list.length - 1 ? ' และ ' : ', ') : ''), [sn(s.name), 'b'], ' (', [SF(s.dv), cls], ')']);
  const area = (z, cls) => [[an(z.area), 'b'], ' ', [SP(z.pct), cls], ' เทียบเฉลี่ย 7 วัน (' + F(z.t) + ' / ' + F(z.exp) + ')'];
  // 1) Best Performance
  { const z = A.up[0];
    if (!z || z.pct <= 0) item('mute', 'Best Performance', ['ยังไม่มี Area ที่ทำได้สูงกว่าค่าเฉลี่ย 7 วัน']);
    else { const dr = z.shops.filter((s) => s.dv > 0).sort((a, b) => b.dv - a.dv).slice(0, 2);
      item('ok', 'Best Performance', [...area(z, 'ok'), ...(dr.length ? [' จาก ', ...shops(dr, 'ok')] : [])]); } }
  // 2) Need Improve
  { const z = A.down[0];
    if (!z || z.pct >= 0) item('ok', 'Need Improve', ['ทุก Area ทำยอดได้ไม่ต่ำกว่าค่าเฉลี่ย 7 วัน']);
    else { const dr = z.shops.filter((s) => s.dv < 0).sort((a, b) => a.dv - b.dv).slice(0, 2);
      item('bad', 'Need Improve', [...area(z, 'bad'), ...(dr.length ? [' จาก ', ...shops(dr, 'bad')] : [])]); } }
  // 3) Stock Issue: 3 shops whose regular Matcode has no stock today and dropped the most vs its 7-day average
  { if (!A.stockOk) item('warn', 'Stock Issue', ['ไฟล์ Stock ล่าสุดเป็นข้อมูลหลังวันที่เลือก จึงไม่ประเมิน Stock Issue ของวันนั้น']);
    else { const L = A.stockList.map((x) => ({ ...x, m: x.out[0] })).filter((x) => x.m && x.m.lost > 0).sort((a, b) => b.m.lost - a.m.lost);
      if (!L.length) item('ok', 'Stock Issue', ['ไม่พบสาขาที่ยอดตกเพราะ Matcode ขายประจำหมด Stock']);
      else { const lostAll = L.reduce((a, x) => a + x.lost, 0);
        item('warn', 'Stock Issue', ['ยอดตกเพราะไม่มี Stock: ', ...L.slice(0, 3).flatMap((x, i, a) => [(i ? (i === a.length - 1 ? ' และ ' : ', ') : ''), [sn(x.name), 'b'], ' – ' + mn(x.m.name) + ' (', [SF(-x.m.lost), 'warn'], ')']),
          ' · รวม ' + PC.nf(L.length) + ' สาขา อาจหาย ', [F(lostAll), 'warn']]); } } }
});
if (!window.PC_FULL_BOUND) { window.PC_FULL_BOUND = true;
  const close = () => { document.querySelectorAll('.pc-full').forEach((c) => c.classList.remove('pc-full')); document.body.classList.remove('pc-noscroll'); };
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('.pc-expand'); if (!b) return; const c = b.closest('.pc-canfull'); const on = !c.classList.contains('pc-full'); close();
    if (on) { c.classList.add('pc-full'); document.body.classList.add('pc-noscroll'); c.scrollTop = 0; } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); }); }
dash.draw('c_rank_daily', (el) => { if (PC.failed(el, 'area_day')) return; const f = rkF(); rankList(el, rdRows(), f.ach, f.d, f.tpd, 'drank', 'Target ต่อวัน', (d) => ({ date: d.date }), [rDate(), rDate()]); });
dash.draw('c_rank', (el) => { if (PC.failed(el, 'area_rank')) return; const f = rkF(); const r0 = (PC.rows('area_rank') || [])[0]; rankList(el, rkRows(), f.ach, f.act, f.ttd, 'rank', 'Target ถึงวันนี้', null, r0 ? [r0.today.slice(0, 8) + '01', r0.today] : null); });
dash.draw('c_rank_heat', (el) => {
  if (PC.failed(el, 'area_day')) return; el.replaceChildren();
  const all = PC.rows('area_day'), rk = rkRows(); if (!all || !rk || !rk.length) return;
  const st = PC.P().stype, f = rkF(), ds = rDates(), cur = rDate();
  const by = new Map(all.filter((x) => x.stype === st).map((x) => [x.area + '|' + x.date, x]));
  const narrow = window.matchMedia('(max-width: 640px)').matches; el.style.gridTemplateColumns = (narrow ? 'minmax(6.5rem, 9rem)' : 'minmax(9rem, max-content)') + ' repeat(' + ds.length + ', minmax(' + (narrow ? '2.2rem' : '2.6rem') + ', 1fr))';
  const blank = document.createElement('div'); blank.className = 'hl'; el.append(blank);
  for (const d of ds) { const h = document.createElement('div'); h.className = 'hh'; h.textContent = +d.slice(8, 10); el.append(h); }
  const cell = (x) => { const c = document.createElement('div'); c.className = 'hc' + (x && x.date === cur ? ' sel' : ''); const a = x ? x[f.ach] : null;
    c.style.background = a == null ? 'transparent' : 'color-mix(in srgb, ' + rkCol(a) + ' ' + (a >= 1 ? Math.min(85, 35 + (a - 1) * 50) : a >= 0.9 ? 45 : Math.max(25, 75 - a * 50)) + '%, transparent)';
    c.textContent = a == null ? '' : Math.round(a * 100); if (x) { c.dataset.where = PC.where({ stype: st, area: x.area, date: x.date }); c.title = x.area + ' · ' + PC.day(x.date) + ' · ' + PC.mfmt(x[f.d]) + ' / Target ' + PC.mfmt(x[f.tpd]) + ' (' + (a == null ? '–' : PC.pf(a)) + ')'; c.onclick = () => dash.setParams({ rdate: x.date }); }
    return c; };
  const TK = window.PC_ZONES.includes(PC.P().area) ? PC.P().area : 'ALL'; for (const a of [{ area: TK, rank: '' }, ...rk]) { const l = document.createElement('div'); l.className = 'hl'; l.textContent = a.area === TK ? (TK === 'ALL' ? 'รวมทุก Area' : 'รวม ' + TK) : a.rank + '. ' + a.area; if (a.area === TK) l.style.fontWeight = '600'; el.append(l);
    for (const d of ds) el.append(cell(by.get(a.area + '|' + d))); }
});
dash.draw('tb_rank', (el) => {
  const r0 = rkRows(); const f = rkF(); const N = PC.isNet(); const fm = (v) => (v == null ? '' : N ? PC.nf(Math.round(v)) : PC.nf(v));
  const dd = new Map((rdRows() || []).map((x) => [x.area, x])); const dl = rDate() ? PC.day(rDate()) : '';
  const r = r0 && r0.map((x) => { const y = dd.get(x.area) || {}; return { ...x, drank: y.drank ?? null, dval: y[f.d] ?? null, dach: y[f.ach] ?? null }; });
  const pill = (k) => (d) => (d[k] == null ? ['mute', '–'] : [d[k] >= 1 ? 'ok' : d[k] >= 0.9 ? 'warn' : 'bad', PC.pf(d[k])]);
  PC.table(el, 'tb_rank', r, { key: ['stype', 'area'], def: 'rank', dir: 1, cols: [
    { f: 'rank', label: 'อันดับสะสม', num: true, fmt: PC.nf }, { f: 'drank', label: 'อันดับรายวัน', num: true, fmt: PC.nf }, { f: 'area', label: 'Area', wrap: true }, { f: N ? 'pm_net' : 'pm_units', label: 'เดือนก่อน (ช่วงเดียวกัน)', num: true, fmt: fm }, { f: N ? 'mom_net' : 'mom_units', label: 'เทียบเดือนก่อน', num: true, pill: (d) => momPill(d[N ? 'mom_net' : 'mom_units']) },
    { f: f.tpd, label: 'Target ต่อวัน', num: true, fmt: fm }, { f: 'dval', label: 'ยอด ' + dl, num: true, fmt: fm }, { f: 'dach', label: '% รายวัน', num: true, pill: pill('dach') },
    { f: f.ttd, label: 'Target ถึงวันนี้', num: true, fmt: fm }, { f: f.act, label: 'ยอดสะสม', num: true, fmt: fm, bar: true }, { f: f.ach, label: '% สะสม', num: true, pill: pill(f.ach) },
    { f: f.gap, label: 'ส่วนต่างสะสม', num: true, fmt: (v) => (v > 0 ? '+' : '') + fm(v) }, { f: f.tgt, label: 'Target ทั้งเดือน', num: true, fmt: fm },
    { f: f.need, label: 'ต้องทำต่อวัน', num: true, fmt: fm }, { f: f.full, label: '% ของ Target ทั้งเดือน', num: true, fmt: PC.pf } ] });
});

/* ---------- shops that sold ---------- */
const PERIOD_L = { today: 'วันนี้', mtd: 'เดือนนี้ (MTD)', ytd: 'ตั้งแต่ต้นปี (YTD)' };
const soldRows = () => { const pd = dash.params().period || 'today'; const r = PC.pick('shop_sales', { period: pd }); if (!r) return null;
  const vk = PC.isNet() ? 'net' : 'qty'; const tot = r.reduce((s, x) => s + x[vk], 0);
  return r.slice().sort((a, b) => b[vk] - a[vk] || b.qty - a.qty).map((x, i) => ({ ...x, rank: i + 1, share: tot ? x[vk] / tot : null })); };
const scopeShops = () => { const s = PC.rows('shops'); if (!s) return null; const p = PC.P();
  return s.filter((r) => +r.stype_order < 90 && PCin(r.area, p.area) && (p.stype === 'ALL' || r.stype === p.stype) && (p.shop === 'ALL' || String(r.shop) === p.shop)); };
const noSold = () => { const r = soldRows(), s = scopeShops(); if (!r || !s) return null; const got = new Set(r.filter((x) => x.qty > 0).map((x) => x.shop));
  return s.filter((x) => !got.has(String(x.shop))).sort((a, b) => String(a.area).localeCompare(String(b.area)) || String(a.name).localeCompare(String(b.name), 'th')); };
dash.draw('sold_period', (el) => { el.textContent = PERIOD_L[dash.params().period || 'today']; });
dash.draw('sold_note', (el) => { const r = soldRows(), s = scopeShops(); if (!r || !s) { el.textContent = '—'; return; }
  const n = r.filter((x) => x.qty > 0).length; el.textContent = 'ขายได้ ' + PC.nf(n) + ' จาก ' + PC.nf(s.length) + ' สาขา'; });
dash.draw('nosold_sum', (el) => { const r = noSold(); el.textContent = r ? 'ดูสาขาที่ยังไม่มียอดขายในช่วงที่เลือก (' + PC.nf(r.length) + ' สาขา)' : 'ดูสาขาที่ยังไม่มียอดขายในช่วงที่เลือก'; });
dash.draw('tb_shopsold', (el) => {
  const N = PC.isNet();
  PC.table(el, 'tb_shopsold', soldRows(), { key: ['area', 'stype', 'group', 'period', 'shop'], def: 'rank', dir: 1, cols: [
    { f: 'rank', label: 'อันดับ', num: true, fmt: PC.nf }, { f: 'shop', label: 'รหัส' }, { f: 'name', label: 'สาขา', wrap: true },
    { f: 'shop_type', label: 'ประเภทสาขา' }, { f: 'shop_area', label: 'Area' },
    { f: 'net', label: 'Net Amount (บาท)', num: true, fmt: PC.nf, bar: N }, { f: 'qty', label: 'QTY', num: true, fmt: PC.nf, bar: !N },
    { f: 'share', label: '% ของยอดรวม', num: true, fmt: PC.pf }, { f: 'staff', label: 'พนักงานที่ขาย', num: true, fmt: PC.nf } ] });
});
dash.draw('tb_nosold', (el) => PC.table(el, 'tb_nosold', noSold(), { key: ['shop'], def: 'area', dir: 1, cols: [
  { f: 'shop', label: 'รหัส' }, { f: 'name', label: 'สาขา', wrap: true }, { f: 'stype', label: 'ประเภทสาขา' }, { f: 'area', label: 'Area' } ] }));

/* ---------- stock ---------- */
const ST = { out: ['หมด', 'var(--color-bad)', 'bad'], low: ['เสี่ยงขาด (< 1 สัปดาห์)', 'var(--color-bad)', 'bad'], short: ['ไม่พอ 4 สัปดาห์', 'var(--color-warn)', 'warn'], ok: ['พอ (4–8 สัปดาห์)', 'var(--color-ok)', 'ok'], over: ['เกิน (> 8 สัปดาห์)', '#6b7fd7', 'mute'], idle: ['ไม่มียอดขาย 4 สัปดาห์', 'var(--cds-chart-muted)', 'mute'] };
const ST_ORDER = ['out', 'low', 'short', 'ok', 'over', 'idle'];
const stRows = (level) => { const r = PC.rows('stock_cover'); if (!r) return null; const p = PC.P();
  return r.filter((x) => x.level === (level || 'group') && PCin(x.area, p.area) && (p.stype === 'ALL' || x.stype === p.stype) && (p.shop === 'ALL' || x.shop === p.shop) && (p.group === 'ALL' || x.group === p.group)); };
const stTot = () => { const r = stRows('group'); if (!r) return null; const s = r.reduce((a, x) => a + x.stock, 0), q = r.reduce((a, x) => a + x.sold28, 0); return { s, q, cover: q > 0 ? s / (q / 28) : null, r }; };
const coverTxt = (d) => (d == null ? '–' : d / 7 > 52 ? '> 52 สัปดาห์' : d3.format(',.1f')(d / 7) + ' สัปดาห์');
const wkTxt = (w) => (w == null ? '–' : w > 52 ? '> 52' : d3.format(',.1f')(w));
const trendPill = (v) => (v == null ? ['mute', '–'] : [v > 0.2 ? 'bad' : v < -0.2 ? 'mute' : 'ok', (v > 0 ? '▲ +' : v < 0 ? '▼ −' : '') + PC.pf(Math.abs(v))]);
const stRowsArea = (level) => { const r = PC.rows('stock_cover'); if (!r) return null; const p = PC.P();
  return r.filter((x) => x.level === level && PCin(x.area, p.area) && (p.stype === 'ALL' || x.stype === p.stype) && (p.group === 'ALL' || x.group === p.group)); };
const shortByType = () => { const r = stRows('group'); if (!r) return null; const by = new Map();
  for (const x of r) { const a = by.get(x.key) || { key: x.key, stock: 0, sold: 0, out: [], low: [], short: [], need: 0 }; a.stock += x.stock; a.sold += x.sold28;
    if (x.status === 'out' || x.status === 'low' || x.status === 'short') { a[x.status].push(x); a.need += x.need28; } by.set(x.key, a); }
  return [...by.values()].map((a) => { const pri = [...a.out, ...a.low].sort((p, q) => q.avg_week - p.avg_week);
    return { key: a.key, stock: a.stock, avg_week: Math.round((a.sold / 4) * 10) / 10, cover_wk: a.sold > 0 ? Math.round((a.stock / (a.sold / 4)) * 10) / 10 : null, n_out: a.out.length, n_low: a.low.length, n_short: a.short.length, need: a.need,
      first: pri.slice(0, 5).map((x) => x.name.replace(/^True (Shop|shop|Move Shop) /, '') + ' (' + (x.status === 'out' ? 'หมด' : x.stock) + ', ขาย ' + d3.format(',.1f')(x.avg_week) + '/สป.)').join(' · ') + (pri.length > 5 ? ' …' : '') }; })
    .sort((p, q) => q.n_out + q.n_low - (p.n_out + p.n_low) || q.n_short - p.n_short); };
const hotRows = () => { const r = stRows('mat'); if (!r) return null; const by = new Map();
  for (const x of r) { const a = by.get(x.key) || { key: x.key, label: x.label, group: x.group, stock: 0, sold28: 0, sold7: 0, risk: 0, shops: 0 }; a.stock += x.stock; a.sold28 += x.sold28; a.sold7 += x.sold7;
    if (x.status === 'out' || x.status === 'low') a.risk++; if (x.sold28 > 0) a.shops++; by.set(x.key, a); }
  const tot = [...by.values()].reduce((s, a) => s + a.sold28, 0);
  return [...by.values()].filter((a) => a.sold28 > 0).map((a) => { const w = a.sold28 / 4, cw = w > 0 ? a.stock / w : null, pw = (a.sold28 - a.sold7) / 3, tr = pw > 0 ? a.sold7 / pw - 1 : null;
    const sig = (cw != null && cw < 2) || (tr != null && tr > 0.2 && cw < 4) ? 'urgent' : (cw < 4 || a.risk >= 3 || (tr != null && tr > 0.2)) ? 'watch' : 'ok';
    return { ...a, avg_week: Math.round(w * 10) / 10, cover_wk: cw == null ? null : Math.round(cw * 10) / 10, trend: tr == null ? null : Math.round(tr * 1000) / 1000, share: tot ? a.sold28 / tot : 0, sig, srt: { urgent: 0, watch: 1, ok: 2 }[sig] * 1e7 - a.sold28 }; }); };
const moveRows = () => { const r = stRowsArea('mat'); if (!r) return null; const p = PC.P(); const groups = new Map(); const PV = new Map((PC.rows('shops') || []).map((s) => [s.shop, s.province || '']));
  for (const x of r) { const k = x.area + '|' + x.key; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); }
  const out = [];
  for (const [k, xs] of groups) { const donors = xs.filter((x) => (x.status === 'over' || x.status === 'idle') && x.stock > 0).map((x) => ({ x, left: x.sold28 <= 0 ? Math.floor(x.stock * 0.8) : Math.max(0, x.stock - Math.ceil(x.avg_week * 6)) })).filter((d) => d.left > 0).sort((a, b) => b.left - a.left);
    const needs = xs.filter((x) => ['out', 'low', 'short'].includes(x.status)).map((x) => ({ x, need: Math.max(0, Math.ceil(x.avg_week * 4) - x.stock) })).filter((n) => n.need > 0).sort((a, b) => b.x.avg_week - a.x.avg_week);
    for (const n of needs) { const pv = PV.get(n.x.shop); for (const d of donors.slice().sort((a, b) => (PV.get(a.x.shop) === pv ? 0 : 1) - (PV.get(b.x.shop) === pv ? 0 : 1))) { if (n.need <= 0) break; if (d.left <= 0) continue; const q = Math.min(n.need, d.left); n.need -= q; d.left -= q;
      out.push({ near: PV.get(d.x.shop) === pv && pv ? 'จังหวัดเดียวกัน (' + pv + ')' : 'Area เดียวกัน', area: n.x.area, key: n.x.key, label: n.x.label, from: d.x.shop, from_name: d.x.name, from_stock: d.x.stock, from_cover: d.x.cover_wk == null ? 999 : d.x.cover_wk, to: n.x.shop, to_name: n.x.name, to_stock: n.x.stock, to_week: n.x.avg_week, to_status: n.x.status, qty: q }); } } }
  return p.shop === 'ALL' ? out : out.filter((m) => m.from === p.shop || m.to === p.shop); };
dash.draw('tb_s_short', (el) => PC.table(el, 'tb_s_short', shortByType(), { key: ['key'], def: 'n_out', cols: [
  { f: 'key', label: 'Type Sim' }, { f: 'stock', label: 'Stock', num: true, fmt: PC.nf }, { f: 'avg_week', label: 'ขาย/สัปดาห์', num: true, fmt: (v) => d3.format(',.1f')(v) }, { f: 'cover_wk', label: 'Cover (สัปดาห์)', num: true, fmt: wkTxt },
  { f: 'n_out', label: 'หมด (สาขา)', num: true, fmt: (v) => (v ? PC.nf(v) : '–') }, { f: 'n_low', label: 'เสี่ยงขาด (สาขา)', num: true, fmt: (v) => (v ? PC.nf(v) : '–') }, { f: 'n_short', label: 'ไม่พอ 4 สป. (สาขา)', num: true, fmt: (v) => (v ? PC.nf(v) : '–') },
  { f: 'need', label: 'ต้องเติมรวม', num: true, fmt: PC.nf, bar: true }, { f: 'first', label: 'สาขาที่ควรเติมก่อน (Stock, ขาย/สัปดาห์)', wrap: true } ] }));
dash.draw('tb_s_hot', (el) => { const SG = { urgent: ['bad', 'เร่งเติม'], watch: ['warn', 'จับตา'], ok: ['ok', 'ปกติ'] };
  PC.table(el, 'tb_s_hot', hotRows(), { key: ['key'], def: 'srt', dir: 1, limit: 300, cols: [
    { f: 'srt', label: 'สัญญาณ', num: true, pill: (d) => SG[d.sig] }, { f: 'label', label: 'Matcode', wrap: true }, { f: 'group', label: 'Type Sim' },
    { f: 'sold28', label: 'ขาย 4 สัปดาห์', num: true, fmt: PC.nf, bar: true }, { f: 'share', label: '% ยอดขาย', num: true, fmt: PC.pf }, { f: 'avg_week', label: 'ขาย/สัปดาห์', num: true, fmt: (v) => d3.format(',.1f')(v) },
    { f: 'trend', label: 'แนวโน้ม 7 วัน', num: true, pill: (d) => trendPill(d.trend) }, { f: 'stock', label: 'Stock', num: true, fmt: PC.nf }, { f: 'cover_wk', label: 'Cover (สัปดาห์)', num: true, fmt: wkTxt },
    { f: 'risk', label: 'สาขาหมด/เสี่ยงขาด', num: true, fmt: (v) => (v ? PC.nf(v) : '–') }, { f: 'shops', label: 'สาขาที่ขายได้', num: true, fmt: PC.nf } ] }); });
dash.draw('s_move_sum', (el) => { const m = moveRows(); if (!m) { el.textContent = ''; return; } const q = m.reduce((s, x) => s + x.qty, 0);
  el.textContent = m.length ? 'โอนได้ ' + PC.nf(m.length) + ' รายการ รวม ' + PC.nf(q) + ' ชิ้น โดยไม่ต้องสั่งของเพิ่ม' : 'ไม่มีสาขาที่โอนย้ายระหว่างกันได้ตาม Filter นี้'; });
dash.draw('tb_s_move', (el) => PC.table(el, 'tb_s_move', moveRows(), { key: ['area', 'key', 'from', 'to'], def: 'qty', limit: 500, cols: [
  { f: 'area', label: 'Area' }, { f: 'label', label: 'Matcode', wrap: true }, { f: 'from_name', label: 'จากสาขา (Stock เกิน)', wrap: true }, { f: 'from_stock', label: 'Stock ต้นทาง', num: true, fmt: PC.nf },
  { f: 'from_cover', label: 'Cover ต้นทาง (สป.)', num: true, fmt: (v) => (v >= 999 ? 'ไม่มียอดขาย' : wkTxt(v)) }, { f: 'to_name', label: 'ไปสาขา (ขาด)', wrap: true }, { f: 'near', label: 'ความใกล้' }, { f: 'to_stock', label: 'Stock ปลายทาง', num: true, fmt: PC.nf },
  { f: 'to_week', label: 'ปลายทางขาย/สป.', num: true, fmt: (v) => d3.format(',.1f')(v) }, { f: 'qty', label: 'แนะนำโอน', num: true, fmt: PC.nf, bar: true } ] }));
dash.draw('s_insight', (el) => { el.replaceChildren(); const t0 = stTot(); if (!t0) return; const r = t0.r; const li = (parts) => { const l = document.createElement('li'); for (const p of parts) { if (Array.isArray(p)) { const b = document.createElement('b'); b.textContent = p[0]; if (p[1]) b.style.color = p[1]; l.append(b); } else l.append(p); } el.append(l); };
  if (!r.length) { li(['ไม่มีข้อมูล Stock หรือยอดขายตาม Filter นี้']); return; }
  const cw = t0.cover == null ? null : t0.cover / 7;
  li(['ภาพรวม Stock ', [PC.nf(t0.s)], ' ชิ้น ขายเฉลี่ย ', [d3.format(',.0f')(t0.q / 4)], ' ชิ้น/สัปดาห์ → Cover ', [cw == null ? '–' : d3.format(',.1f')(cw) + ' สัปดาห์', cw == null ? '' : cw < 1 ? 'var(--color-bad)' : cw < 4 ? 'var(--color-warn)' : 'var(--color-ok)'], cw == null ? '' : cw > 8 ? ' (Stock สูงเกินยอดขาย)' : cw < 4 ? ' (ไม่พอขาย 4 สัปดาห์)' : ' (อยู่ในระดับพอดี)']);
  const sb = shortByType() || []; const worst = sb.filter((a) => a.n_out + a.n_low > 0);
  if (worst.length) li(['ซิมที่ขาดมากที่สุด: ', ...worst.slice(0, 3).flatMap((a, i) => [(i ? ' · ' : ''), [a.key.replace(/^SIM /, '')], ' หมด ' + a.n_out + ' / เสี่ยง ' + a.n_low + ' สาขา'])]);
  else li(['ไม่มีสาขาที่หมดหรือเสี่ยงขาดในกลุ่มที่เลือก']);
  const low = sb.filter((a) => a.cover_wk != null).sort((a, b) => a.cover_wk - b.cover_wk)[0]; if (low) li(['Type Sim ที่ Cover ต่ำสุด: ', [low.key.replace(/^SIM /, '')], ' ' + wkTxt(low.cover_wk) + ' สัปดาห์ (Stock ' + PC.nf(low.stock) + ' / ขาย ' + d3.format(',.0f')(low.avg_week) + ' ต่อสัปดาห์)']);
  const hot = (hotRows() || []).filter((a) => a.sig === 'urgent').sort((a, b) => b.sold28 - a.sold28);
  if (hot.length) li(['ซิมขายดีที่ต้องเร่งเติม ', [hot.length + ' รายการ', 'var(--color-bad)'], ': ', ...hot.slice(0, 3).flatMap((a, i) => [(i ? ' · ' : ''), [a.label.replace(/^\d+ (TMH\d )?/, '')], ' (ขาย ' + d3.format(',.0f')(a.avg_week) + '/สป., Cover ' + wkTxt(a.cover_wk) + ' สป.' + (a.trend != null && a.trend > 0.2 ? ', ยอดโต +' + PC.pf(a.trend) : '') + ')'])]);
  const up = (hotRows() || []).filter((a) => a.trend != null && a.trend > 0.2 && a.sold28 >= 20).sort((a, b) => b.trend - a.trend);
  if (up.length) li(['ยอดขาย 7 วันล่าสุดโตเกิน 20%: ', ...up.slice(0, 3).flatMap((a, i) => [(i ? ' · ' : ''), [a.label.replace(/^\d+ (TMH\d )?/, '')], ' +' + PC.pf(a.trend)])]);
  const shopsRisk = new Map(); for (const x of r) if (x.status === 'out' || x.status === 'low') shopsRisk.set(x.name, (shopsRisk.get(x.name) || 0) + 1);
  const topS = [...shopsRisk.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3); if (topS.length) li([topS[0][1] > 1 ? 'สาขาที่หมด/เสี่ยงขาดหลาย Type Sim: ' : 'สาขาที่หมด/เสี่ยงขาด (' + shopsRisk.size + ' สาขา) เช่น ', ...topS.flatMap(([n, c], i) => [(i ? ' · ' : ''), [n.replace(/^True (Shop|shop|Move Shop) /, '')], ' (' + c + ' ประเภท)'])]);
  const idle = r.filter((x) => x.status === 'idle'), over = r.filter((x) => x.status === 'over'); const idleQ = idle.reduce((s, x) => s + x.stock, 0), overQ = over.reduce((s, x) => s + x.stock, 0);
  li(['Stock ไม่เคลื่อนไหวใน 4 สัปดาห์ ', [PC.nf(idleQ) + ' ชิ้น'], ' (' + (t0.s ? PC.pf(idleQ / t0.s) : '–') + ' ของ Stock) และ Stock เกิน 8 สัปดาห์อีก ', [PC.nf(overQ) + ' ชิ้น'], ' — ควรระบายหรือโอนย้าย']);
  const mv = moveRows() || []; if (mv.length) li(['โอนย้ายภายใน Area ได้ ', [PC.nf(mv.reduce((s, x) => s + x.qty, 0)) + ' ชิ้น', 'var(--color-ok)'], ' (' + mv.length + ' รายการ) ช่วยลดการขาดของได้โดยไม่ต้องสั่งเพิ่ม — ดูตาราง "แนะนำโอนย้าย"']);
});
dash.draw('s_asof', (el) => { const r = PC.rows('stock_by_shop'); const v = r && r[0] && r[0].asof; el.textContent = v ? PC.day(v.slice(0, 10)) + (v.length > 10 ? ' ' + v.slice(11) + ' น.' : '') : '—'; });
dash.draw('s_stock', (el) => { const t = stTot(); el.textContent = t ? PC.nf(t.s) : '—'; });
dash.draw('s_sold', (el) => { const t = stTot(); el.textContent = t ? PC.nf(t.q) : '—'; });
dash.draw('s_window', (el) => { const r = PC.rows('stock_cover'); const x = r && r[0]; el.textContent = x ? PC.day(x.from) + ' – ' + PC.day(x.to) + ' · เฉลี่ย ' + PC.nf(Math.round((stTot().q / 28) * 10) / 10) + ' ต่อวัน' : ''; });
dash.draw('s_cover', (el) => { const t = stTot(); el.textContent = t ? coverTxt(t.cover) : '—'; el.style.color = !t || t.cover == null ? '' : t.cover < 7 ? 'var(--color-bad)' : t.cover < 28 ? 'var(--color-warn)' : 'var(--color-ok)'; });
dash.draw('s_risk', (el) => { const t = stTot(); el.textContent = t ? PC.nf(t.r.filter((x) => x.status === 'out' || x.status === 'low').length) : '—'; });
dash.draw('s_risk_sub', (el) => { const t = stTot(); if (!t) { el.textContent = ''; return; } const c = (k) => t.r.filter((x) => x.status === k).length;
  el.textContent = 'หมด ' + PC.nf(c('out')) + ' · เสี่ยงขาด ' + PC.nf(c('low')) + ' · ไม่พอ 4 สัปดาห์ ' + PC.nf(c('short')); });
dash.draw('c_s_type', (el) => {
  if (PC.failed(el, 'stock_cover')) return; el.replaceChildren(); const r = stRows('group'); if (!r) return;
  const by = new Map(); for (const x of r) { const a = by.get(x.key) || { key: x.key, stock: 0, sold: 0 }; a.stock += x.stock; a.sold += x.sold28; by.set(x.key, a); }
  const data = [...by.values()].sort((a, b) => b.sold - a.sold || b.stock - a.stock); const max = d3.max(data, (d) => Math.max(d.stock, d.sold)) || 1;
  for (const d of data) { const cover = d.sold > 0 ? d.stock / (d.sold / 28) : null; const col = cover == null ? ST.idle[1] : cover < 7 ? ST.low[1] : cover < 28 ? ST.short[1] : cover <= 56 ? ST.ok[1] : ST.over[1];
    const row = document.createElement('div'); row.className = 'pc-hrow';
    const l = document.createElement('span'); l.className = 'l'; l.textContent = d.key; l.title = d.key;
    const dual = document.createElement('span'); dual.className = 'pc-dual';
    for (const [v, c, o] of [[d.stock, col, 1], [d.sold, 'var(--color-fg-muted)', 0.35]]) { const tr = document.createElement('span'); tr.className = 't'; const f = document.createElement('span'); f.className = 'f'; f.style.display = 'block'; f.style.width = Math.max(0, (v / max) * 100) + '%'; f.style.background = c; f.style.opacity = o; tr.append(f); dual.append(tr); }
    const v = document.createElement('span'); v.className = 'v'; v.textContent = 'Stock ' + PC.nf(d.stock) + ' · ขาย ' + PC.nf(d.sold) + ' · Cover ' + coverTxt(cover);
    row.append(l, dual, v); el.append(row); }
});
dash.draw('c_s_status', (el) => {
  if (PC.failed(el, 'stock_cover')) return; el.replaceChildren(); const r = stRows('group'); if (!r) return;
  const cur = dash.params().sstatus || 'ALL'; const max = Math.max(1, ...ST_ORDER.map((k) => r.filter((x) => x.status === k).length));
  for (const k of ST_ORDER) { const n = r.filter((x) => x.status === k).length; const fk = k === 'out' || k === 'low' ? 'risk' : k;
    const row = document.createElement('div'); row.className = 'pc-hrow click' + (cur === fk ? ' on' : ''); row.tabIndex = 0; row.setAttribute('role', 'button');
    const l = document.createElement('span'); l.className = 'l'; l.textContent = ST[k][0];
    const tr = document.createElement('span'); tr.className = 't'; const f = document.createElement('span'); f.className = 'f'; f.style.display = 'block'; f.style.width = (n / max) * 100 + '%'; f.style.background = ST[k][1]; tr.append(f);
    const v = document.createElement('span'); v.className = 'v'; v.textContent = PC.nf(n) + ' รายการ · ' + (r.length ? PC.pf(n / r.length) : '–');
    const go = () => dash.setParams({ sstatus: cur === fk ? 'ALL' : fk }); row.onclick = go; row.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    row.append(l, tr, v); el.append(row); }
});
dash.draw('c_s_matrix', (el) => {
  if (PC.failed(el, 'stock_cover')) return; el.replaceChildren(); const r = stRows('group'); if (!r || !r.length) return;
  const types = [...new Set(r.map((x) => x.key))].sort(); const shopsM = new Map();
  for (const x of r) { const a = shopsM.get(x.shop) || { shop: x.shop, name: x.name, cells: {}, risk: 0, short: 0 }; a.cells[x.key] = x; if (x.status === 'out' || x.status === 'low') a.risk++; if (x.status === 'short') a.short++; shopsM.set(x.shop, a); }
  const list = [...shopsM.values()].sort((a, b) => b.risk - a.risk || b.short - a.short || String(a.name).localeCompare(String(b.name), 'th'));
  const narrow = window.matchMedia('(max-width: 640px)').matches;
  el.style.gridTemplateColumns = (narrow ? 'minmax(7rem, 9rem)' : 'minmax(12rem, max-content)') + ' repeat(' + types.length + ', minmax(5.6rem, 1fr))';
  const h0 = document.createElement('div'); h0.className = 'hl'; h0.textContent = 'สาขา (' + list.length + ')'; el.append(h0);
  for (const ty of types) { const h = document.createElement('div'); h.className = 'hh'; h.textContent = ty.replace(/^SIM /, ''); h.title = ty; el.append(h); }
  for (const s of list) { const l = document.createElement('div'); l.className = 'hl'; l.textContent = s.name; l.title = s.name + ' · ' + s.shop; el.append(l);
    for (const ty of types) { const x = s.cells[ty]; const c = document.createElement('div'); c.className = 'hc';
      if (x) { const st = ST[x.status]; c.style.background = 'color-mix(in srgb, ' + st[1] + ' ' + (x.status === 'idle' ? 25 : 40) + '%, transparent)';
        const cellTxt = () => (x.status === 'out' ? 'หมด · ขาย ' + PC.nf(x.sold28) : PC.nf(x.stock) + ' / ' + (x.cover_wk == null ? '–' : wkTxt(x.cover_wk) + ' W')); c.textContent = cellTxt();
        c.title = s.name + ' · ' + ty + '\nStock ' + PC.nf(x.stock) + ' · ขาย 28 วัน ' + PC.nf(x.sold28) + ' · Cover ' + coverTxt(x.cover_days) + ' · ' + st[0] + (x.need28 ? ' · ควรเติม ' + PC.nf(x.need28) : '');
        c.onclick = () => { c.textContent = c.textContent === cellTxt() ? 'ขาย 28 วัน ' + PC.nf(x.sold28) : cellTxt(); }; }
      el.append(c); } }
});
dash.draw('tb_stock', (el) => {
  const lv = dash.params().slevel || 'mat', sf = dash.params().sstatus || 'ALL'; let r = stRows(lv);
  if (r && sf !== 'ALL') r = r.filter((x) => (sf === 'risk' ? x.status === 'out' || x.status === 'low' : x.status === sf));
  const rank = (s) => ST_ORDER.indexOf(s);
  r = r && r.map((x) => ({ ...x, srank: rank(x.status) * 1e6 + (x.cover_days ?? 1e5) }));
  PC.table(el, 'tb_stock', r, { key: ['shop', 'level', 'key'], def: 'srank', dir: 1, q: 'stock', limit: 2000, cols: [
    { f: 'shop', label: 'รหัส' }, { f: 'name', label: 'สาขา', wrap: true }, { f: 'area', label: 'Area' },
    { f: 'label', label: lv === 'group' ? 'Type Sim' : lv === 'sub' ? 'ประเภทซิม (รุ่นย่อย)' : 'Matcode', wrap: lv === 'mat' },
    { f: 'stock', label: 'Stock', num: true, fmt: PC.nf, bar: true }, { f: 'sold28', label: 'ขาย 28 วัน', num: true, fmt: PC.nf },
    { f: 'avg_week', label: 'เฉลี่ย/สัปดาห์', num: true, fmt: (v) => d3.format(',.1f')(v) }, { f: 'cover_wk', label: 'Cover (สัปดาห์)', num: true, fmt: wkTxt }, { f: 'trend', label: 'แนวโน้ม 7 วัน', num: true, pill: (d) => trendPill(d.trend) },
    { f: 'srank', label: 'สถานะ', num: true, pill: (d) => [ST[d.status][2], ST[d.status][0]] }, { f: 'need28', label: 'ควรเติม (ให้พอ 4 สัปดาห์)', num: true, fmt: (v) => (v ? PC.nf(v) : '–') } ] });
});

/* ---------- missing matcodes ---------- */
const GL = { urgent: ['ด่วน', 'bad', 'var(--color-bad)'], core: ['ควรมี', 'warn', 'var(--color-warn)'], other: ['อื่น ๆ', 'mute', 'var(--cds-chart-muted)'] };
const gapRows = (useLevel) => { const r = PC.rows('assort_gap'); if (!r) return null; const p = PC.P(), sc = dash.params().ascope || 'current', lv = dash.params().alevel || 'core';
  return r.filter((x) => PCin(x.area, p.area) && (p.stype === 'ALL' || x.stype === p.stype) && (p.shop === 'ALL' || x.shop === p.shop) && (p.group === 'ALL' || x.group === p.group)
    && (sc === 'all' || (sc === 'core' ? x.carry_pct >= 0.5 : x.status !== 'EOL'))
    && (!useLevel || lv === 'ALL' || (lv === 'urgent' ? x.level === 'urgent' : x.level !== 'other'))); };
const gapScope = () => { const s = PC.rows('shops'); if (!s) return null; const p = PC.P(); return s.filter((r) => +r.stype_order < 90 && PCin(r.area, p.area) && (p.stype === 'ALL' || r.stype === p.stype) && (p.shop === 'ALL' || String(r.shop) === p.shop)); };
const gapSort = (a, b) => String(a.group).localeCompare(String(b.group)) || String(a.sub).localeCompare(String(b.sub)) || (a.price ?? 1e9) - (b.price ?? 1e9) || String(a.mname).localeCompare(String(b.mname));
const shortName = (s) => String(s).replace(/^TMH\d /, '').replace(/_VAS| MULTI/g, '').trim();
const priceTxt = (v) => (v == null ? 'ไม่ทราบราคา' : '฿' + PC.nf(v));
dash.draw('tb_gap', (el) => {
  const r = gapRows(true); const ord = { urgent: 0, core: 1, other: 2 };
  PC.table(el, 'tb_gap', r && [...r].sort((a, b) => gapSort(a, b) || ord[a.level] - ord[b.level] || b.sold28_shop - a.sold28_shop).map((x) => ({ ...x, lrank: ord[x.level] * 1e6 - x.sold28_shop * 1000 - x.carry_pct * 100 })), { key: ['shop', 'matcode'], def: 'group', dir: 1, q: 'gap', limit: 3000, cols: [
    { f: 'group', label: 'Type Sim' }, { f: 'sub', label: 'ประเภทซิม (รุ่นย่อย)' }, { f: 'price', label: 'ราคา', num: true, fmt: priceTxt },
    { f: 'lrank', label: 'ระดับ', num: true, pill: (d) => [GL[d.level][1], GL[d.level][0]] }, { f: 'shop', label: 'รหัส' }, { f: 'name', label: 'สาขา', wrap: true }, { f: 'area', label: 'Area' },
    { f: 'matcode', label: 'Matcode' }, { f: 'mname', label: 'สินค้า', wrap: true },
    { f: 'sold28_shop', label: 'สาขานี้ขาย 28 วัน', num: true, fmt: (v) => (v ? PC.nf(v) : '–') }, { f: 'carry_pct', label: 'สาขาที่มี Matcode นี้', num: true, fmt: PC.pf },
    { f: 'sold28_all', label: 'ขายทุกสาขา 28 วัน', num: true, fmt: PC.nf } ] });
});

/* ---------- watched serials ---------- */
const WS = { sold: ['ขายแล้ว', 'ok', 'var(--color-ok)'], in_stock: ['ยังไม่ขาย', 'bad', 'var(--color-bad)'], not_found: ['ไม่พบใน Stock', 'warn', 'var(--color-warn)'] };
const WTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const wKey = (l) => { const m = String(l).match(/(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*(\d{2})/); return m ? (2500 + +m[2] - 543) * 100 + WTH.indexOf(m[1]) + 1 : 999999; };
const wLists = () => { const r = PC.rows('watch_serials'); return r ? [...new Set(r.map((x) => x.list))].sort((a, b) => wKey(a) - wKey(b)) : []; };
const wList = () => { const ls = wLists(); const v = dash.params().wlist; if (v === 'ALL' || ls.includes(v)) return v; const r = PC.rows('enriched'); const t = r ? r.reduce((a, x) => (x.date > a ? x.date : a), '') : ''; const cur = t ? +t.slice(0, 4) * 100 + +t.slice(5, 7) : 0; return ls.find((l) => wKey(l) >= cur) || ls[ls.length - 1]; };
const wRows = () => { const r = PC.rows('watch_serials'); if (!r) return null; const p = PC.P(), l = wList();
  return r.filter((x) => (l === 'ALL' || x.list === l) && PCin(x.area, p.area) && (p.shop === 'ALL' || String(x.shop) === p.shop || String(x.sold_shop) === p.shop)
    && (p.stype === 'ALL' || (PC.rows('shops') || []).some((s) => String(s.shop) === String(x.shop) && s.stype === p.stype))); };
const wCount = (r, s) => r.filter((x) => x.status === s).length;
dash.draw('f_wlist', (sel) => { const ls = wLists(); const cnt = d3.rollup(PC.rows('watch_serials') || [], (v) => v.length, (x) => x.list); sel.replaceChildren(...ls.map((l) => new Option(l + ' (' + PC.nf(cnt.get(l) || 0) + ')', l)), new Option('ทุกเดือน (รวม)', 'ALL')); sel.value = wList() || ''; sel.onchange = () => dash.setParams({ wlist: sel.value }); });
dash.draw('w_asof', (el) => { const r = PC.rows('watch_serials'); const x = r && r[0]; el.textContent = x ? 'ตรวจกับรายงานการขายถึง ' + PC.day(x.sales_asof.slice(0, 10)) + ' ' + x.sales_asof.slice(11) + ' น. · Stock ณ ' + PC.day(x.stock_asof.slice(0, 10)) + ' ' + x.stock_asof.slice(11) + ' น.' : ''; });
dash.draw('w_total', (el) => { const r = wRows(); el.textContent = r ? PC.nf(r.length) : '—'; });
dash.draw('w_total_sub', (el) => { const r = wRows(); el.textContent = r ? PC.nf(new Set(r.map((x) => x.shop)).size) + ' สาขา · ' + PC.nf(new Set(r.map((x) => x.area)).size) + ' Area' : ''; });
dash.draw('w_sold', (el) => { const r = wRows(); el.textContent = r ? PC.nf(wCount(r, 'sold')) : '—'; });
dash.draw('w_sold_sub', (el) => { const r = wRows(); if (!r || !r.length) { el.textContent = ''; return; } const s = r.filter((x) => x.status === 'sold'); el.textContent = PC.pf(s.length / r.length) + ' ของทั้งหมด · Net ฿' + PC.nf(Math.round(s.reduce((a, x) => a + (x.sold_net || 0), 0))); });
dash.draw('w_left', (el) => { const r = wRows(); el.textContent = r ? PC.nf(wCount(r, 'in_stock')) : '—'; });
dash.draw('w_left_sub', (el) => { const r = wRows(); if (!r) { el.textContent = ''; return; } const l = r.filter((x) => x.status === 'in_stock'); el.textContent = PC.nf(new Set(l.map((x) => x.shop)).size) + ' สาขายังต้องขาย'; });
dash.draw('w_nf', (el) => { const r = wRows(); el.textContent = r ? PC.nf(wCount(r, 'not_found')) : '—'; });
dash.draw('c_w_total', (el) => { el.replaceChildren(); const r = wRows(); if (!r || !r.length) return;
  const bar = document.createElement('div'); bar.className = 'bar'; const lg = document.createElement('div'); lg.className = 'lg';
  for (const k of ['sold', 'in_stock', 'not_found']) { const n = wCount(r, k); const s = document.createElement('span'); s.style.width = (n / r.length) * 100 + '%'; s.style.background = WS[k][2]; s.title = WS[k][0] + ' ' + n; bar.append(s);
    const g = document.createElement('span'); const i = document.createElement('i'); i.style.background = WS[k][2]; g.append(i, WS[k][0] + ' ' + PC.nf(n) + ' (' + PC.pf(n / r.length) + ')'); lg.append(g); }
  el.append(bar, lg); });
dash.draw('c_w_area', (el) => { el.replaceChildren(); const r = wRows(); if (!r) return; const by = new Map();
  for (const x of r) { const a = by.get(x.area) || { area: x.area, n: 0, s: 0, nf: 0 }; a.n++; if (x.status === 'sold') a.s++; if (x.status === 'not_found') a.nf++; by.set(x.area, a); }
  const d = [...by.values()].sort((a, b) => WALAST(a.area) - WALAST(b.area) || b.n - b.s - (a.n - a.s) || b.n - a.n); const max = Math.max(1, ...d.map((x) => x.n));
  for (const x of d) { const row = document.createElement('div'); row.className = 'pc-hrow'; const l = document.createElement('span'); l.className = 'l'; l.textContent = x.area || 'ไม่พบใน Stock (SLoc)'; l.title = l.textContent;
    const t = document.createElement('span'); t.className = 't'; t.style.display = 'flex'; t.style.overflow = 'hidden';
    for (const [v, c] of [[x.s, WS.sold[2]], [x.n - x.s - x.nf, WS.in_stock[2]], [x.nf, WS.not_found[2]]]) { const f = document.createElement('span'); f.style.cssText = 'display:block;height:100%;width:' + (v / max) * 100 + '%;background:' + c; t.append(f); }
    const v = document.createElement('span'); v.className = 'v'; v.textContent = 'ขายแล้ว ' + x.s + ' / ' + x.n + ' · ' + PC.pf(x.s / x.n); row.append(l, t, v); el.append(row); } });
dash.draw('c_w_daily', (el) => { el.replaceChildren(); const r = wRows(); if (!r) return; const s = r.filter((x) => x.status === 'sold' && x.sold_date);
  if (!s.length) { const e = document.createElement('p'); e.className = 'pc-note'; e.textContent = 'ยังไม่พบ Serial ในรายการนี้ในรายงานการขาย เมื่อมีการขาย กราฟจะแสดงยอดสะสมรายวัน'; el.append(e); return; }
  const by = d3.rollup(s, (v) => v.length, (x) => x.sold_date); let c = 0;
  const data = [...by.keys()].sort().map((d) => { c += by.get(d); return { date: PC.day(d), cum: c, n: by.get(d), share: c / r.length }; });
  PC.hbar(el, data, { label: 'date', value: 'cum', share: 'share', sub: (d) => 'ขาย ' + d.n + ' · สะสม ' + d.cum, color: 'var(--color-ok)' }); });
dash.draw('tb_w_shop', (el) => { const r = wRows(); const by = new Map();
  if (r) for (const x of r) { const a = by.get(x.shop || x.shop_name) || { shop: x.shop || x.shop_name, name: x.shop_name, area: x.area, n: 0, s: 0, nf: 0 }; a.n++; if (x.status === 'sold') a.s++; else if (x.expiry && (!a.ex || x.expiry < a.ex)) a.ex = x.expiry; if (x.status === 'not_found') a.nf++; by.set(x.shop || x.shop_name, a); }
  const rows = r && [...by.values()].map((a) => ({ ...a, left: a.n - a.s - a.nf, pct: a.s / a.n }));
  PC.table(el, 'tb_w_shop', rows, { key: ['shop'], def: 'left', last: WLAST, cols: [
    { f: 'name', label: 'สาขา', wrap: true }, { f: 'area', label: 'Area' }, { f: 'n', label: 'ติดตาม', num: true, fmt: PC.nf },
    { f: 'left', label: 'ยังไม่ขาย', num: true, fmt: PC.nf, bar: true }, { f: 's', label: 'ขายแล้ว', num: true, fmt: PC.nf }, { f: 'nf', label: 'ไม่พบใน Stock', num: true, fmt: (v) => (v ? PC.nf(v) : '–') }, { f: 'ex', label: 'หมดอายุใกล้สุด (ที่ยังไม่ขาย)', fmt: WEX },
    { f: 'pct', label: 'ความคืบหน้า', num: true, pill: (d) => [d.pct >= 1 ? 'ok' : d.pct > 0 ? 'warn' : 'bad', PC.pf(d.pct)] } ] }); });
dash.draw('tb_w_serial', (el) => { const sf = dash.params().wstatus || 'ALL'; let r = wRows(); if (r && sf !== 'ALL') r = r.filter((x) => x.status === sf);
  const ord = { in_stock: 0, not_found: 1, sold: 2 };
  PC.table(el, 'tb_w_serial', r && r.map((x) => ({ ...x, srank: ord[x.status] })), { key: ['list', 'serial'], def: 'srank', dir: 1, q: 'watch', limit: 5000, cols: [
    { f: 'srank', label: 'สถานะ', num: true, pill: (d) => [WS[d.status][1], WS[d.status][0]] }, ...(wList() === 'ALL' ? [{ f: 'list', label: 'เดือนหมดอายุ' }] : []), { f: 'serial', label: 'Serial' }, { f: 'expiry', label: 'วันหมดอายุ', fmt: (v) => (v ? PC.day(v) : '–') }, { f: 'area', label: 'Area' }, { f: 'shop_name', label: 'สาขา', wrap: true },
    { f: 'matcode', label: 'Matcode' }, { f: 'product', label: 'สินค้า', wrap: true }, { f: 'price', label: 'ราคา (บาท)', num: true, fmt: (v) => (v == null ? '–' : PC.nf(v)) }, { f: 'aging', label: 'วันในสต็อก', num: true, fmt: PC.nf }, { f: 'location', label: 'ที่เก็บ' },
    { f: 'sold_date', label: 'วันที่ขาย', fmt: (v) => PC.day(v) }, { f: 'sold_shop_name', label: 'สาขาที่ขาย', wrap: true }, { f: 'sold_emp_name', label: 'พนักงาน' }, { f: 'sold_net', label: 'Net Amount', num: true, fmt: PC.nf } ] }); });

/* ---------- today charts ---------- */
dash.draw('c_today_type', (el) => {
  if (PC.failed(el, 'kpi')) return;
  const all = PC.rows('kpi'); if (!all) { el.replaceChildren(); return; }
  const p = PC.P(), vk = PC.isNet() ? 'today_net' : 'today_units';
  const tot = all.find((x) => x.area === p.area && x.group === p.group && x.stype === 'ALL');
  const r = all.filter((x) => x.area === p.area && x.group === p.group && x.stype !== 'ALL' && (x.ord < 90 || x.today_units !== 0) && (p.stype === 'ALL' || x.stype === p.stype))
    .map((x) => ({ ...x, share: tot && tot[vk] ? x[vk] / tot[vk] : 0 })).sort((a, b) => a.ord - b.ord);
  PC.hbar(el, r, { label: 'stype', value: vk, share: 'share', sub: (d) => PC.mfmt(d[vk]) + ' · ' + PC.nf(d.today_shops) + ' สาขา' });
});
dash.draw('c_today_trend', (el) => {
  if (PC.failed(el, 'daily')) return;
  const r0 = PC.pick('daily'); if (!r0) { el.replaceChildren(); return; }
  const today = r0.reduce((a, r) => (r.date > a ? r.date : a), ''); const m = today.slice(0, 7);
  const r = r0.filter((x) => x.date.startsWith(m)).sort((a, b) => a.date.localeCompare(b.date));
  const vk = PC.isNet() ? 'net' : 'units'; const full = r.filter((x) => x.date !== today);
  const avg = full.length ? full.reduce((s, x) => s + x[vk], 0) / full.length : null;
  PC.vbar(el, r, { xk: 'date', xf: (d) => String(+d.slice(8, 10)), tipf: PC.day, hl: today, avg });
});
const bandOrderBd = ['≤ 49', '50–299', '300–599', '600–999', '1,000–1,999', '2,000+', 'ไม่ทราบราคา'];
const bdColor = { area: 0, simtype: 1, simgroup: 1, band: 2 };
for (const [name, dim] of [['bd_zone', 'zone'], ['bd_area', 'area'], ['bd_simtype', 'simtype'], ['bd_simgroup', 'simgroup'], ['bd_band', 'band']])
  dash.draw('c_' + name, (el) => {
    if (PC.failed(el, 'breakdown')) return;
    const r0 = PC.pick('breakdown', { period: dash.params().period || 'today', dim }); if (!r0) { el.replaceChildren(); return; }
    const N = PC.isNet(), vk = N ? 'net' : 'qty', sk = N ? 'share_net' : 'share_qty';
    let r = r0.filter((x) => x.qty !== 0 || x.net !== 0);
    r = dim === 'band' ? r.sort((a, b) => bandOrderBd.indexOf(a.key) - bandOrderBd.indexOf(b.key)) : r.sort((a, b) => b[vk] - a[vk]);
    if (dim === 'simgroup') r = r.slice(0, 10);
    PC.hbar(el, r, { label: 'key', value: vk, share: sk, sub: (d) => PC.mfmt(d[vk]), color: dash.colors[bdColor[dim]] });
    if (!r.length) { const e = document.createElement('p'); e.className = 'pc-note'; e.textContent = 'ไม่มียอดขายในช่วงที่เลือก'; el.append(e); }
  });

/* ---------- tables ---------- */
dash.draw('tb_today', (el) => {
  const all = PC.rows('kpi'); const p = PC.P();
  const r = all && all.filter((x) => x.area === p.area && x.group === p.group && (p.stype === 'ALL' || x.stype === p.stype || x.stype === 'ALL') && (x.stype === 'ALL' || x.ord < 90 || x.today_units !== 0));
  PC.table(el, 'tb_today', r, { key: ['area', 'stype', 'group'], def: 'ord', dir: 1, cols: [
    { f: 'stype', label: 'ประเภทสาขา', fmt: (v) => (v === 'ALL' ? 'รวมทุกประเภทสาขา' : v) },
    { f: 'today_net', label: 'Net Amount วันนี้', num: true, fmt: PC.nf, bar: PC.isNet() }, { f: 'today_units', label: 'QTY วันนี้', num: true, fmt: PC.nf, bar: !PC.isNet() },
    { f: 'today_shops', label: 'สาขาที่ขาย', num: true, fmt: PC.nf },
    ...(PC.isNet() ? [{ f: 'target_net', label: 'Target เดือนนี้', num: true, fmt: PC.nf }, { f: 'tgt_shop_net', label: 'Net Amount เดือนนี้', num: true, fmt: PC.nf }, { f: 'ach_net', label: '% Target', num: true, pill: (d) => achPill({ ach: d.ach_net }) }, { f: 'mtd_units', label: 'QTY เดือนนี้', num: true, fmt: PC.nf }]
      : [{ f: 'target_units', label: 'Target เดือนนี้', num: true, fmt: PC.nf }, { f: 'tgt_shop_units', label: 'QTY เดือนนี้', num: true, fmt: PC.nf }, { f: 'ach', label: '% Target', num: true, pill: (d) => achPill(d) }, { f: 'mtd_net', label: 'Net Amount เดือนนี้', num: true, fmt: PC.nf }]) ] });
  el.querySelectorAll('tbody tr').forEach((tr) => { if (tr.dataset.key.includes(',ALL,')) tr.style.fontWeight = '600'; });
});
const bdCols = (label) => [{ f: 'key', label }, { f: 'net', label: 'Net Amount (บาท)', num: true, fmt: PC.nf, bar: PC.isNet() }, { f: 'share_net', label: '% Net', num: true, fmt: PC.pf },
  { f: 'qty', label: 'QTY', num: true, fmt: PC.nf, bar: !PC.isNet() }, { f: 'share_qty', label: '% QTY', num: true, fmt: PC.pf }];
const bdRows = (dim) => PC.pick('breakdown', { period: dash.params().period || 'today', dim });
for (const [name, dim, label, def, dir] of [['bd_zone', 'zone', 'Region', 'm', -1], ['bd_area', 'area', 'Area', 'm', -1], ['bd_simtype', 'simtype', 'Type Sim (Custom Model)', 'm', -1], ['bd_simgroup', 'simgroup', 'ประเภทซิม (รุ่นย่อย)', 'm', -1], ['bd_band', 'band', 'กลุ่มราคา', 'ord', 1]])
  dash.draw(name, (el) => PC.table(el, name, bdRows(dim), { key: ['area', 'stype', 'group', 'period', 'dim', 'key'], def: def === 'm' ? (PC.isNet() ? 'net' : 'qty') : def, dir, cols: bdCols(label) }));
const momPill = (v) => (v == null ? ['mute', '–'] : [v >= 0 ? 'ok' : v > -0.1 ? 'warn' : 'bad', (v > 0 ? '+' : v < 0 ? '−' : '') + PC.pf(Math.abs(v))]);
const momCols = (rows) => { const N = PC.isNet(); const r0 = rows && rows[0]; const lbl = r0 && r0.pm_to ? PC.day(r0.pm_to.slice(0, 8) + '01').replace(/^1 /, '1–' + (+r0.pm_to.slice(8)) + ' ') : 'เดือนก่อน';
  return [{ f: N ? 'mtd_all_net' : 'mtd_all', label: (N ? 'Net Amount' : 'QTY') + ' เดือนนี้', num: true, fmt: PC.nf }, { f: N ? 'pm_net' : 'pm_units', label: 'เดือนก่อน (' + lbl + ')', num: true, fmt: PC.nf },
    { f: N ? 'mom_net' : 'mom_units', label: 'เทียบเดือนก่อน', num: true, pill: (d) => momPill(d[N ? 'mom_net' : 'mom_units']) }]; };
const tgtCols = () => { const N = PC.isNet(); const pill = (k) => (d) => achPill({ ach: d[k] }); const m = N ? 'Net Amount' : 'QTY';
  return N ? [{ f: 'target_net', label: 'Target เดือนล่าสุด', num: true, fmt: PC.nf }, { f: 'mtd_net', label: m + ' เดือนล่าสุด', num: true, fmt: PC.nf }, { f: 'ach_net', label: '% Target', num: true, pill: pill('ach_net') },
      { f: 'ytd_target_net', label: 'Target สะสม', num: true, fmt: PC.nf }, { f: 'ytd_net', label: m + ' สะสม', num: true, fmt: PC.nf }, { f: 'ytd_ach_net', label: '% Target สะสม', num: true, pill: pill('ytd_ach_net') }]
    : [{ f: 'target', label: 'Target เดือนล่าสุด', num: true, fmt: PC.nf }, { f: 'mtd', label: m + ' เดือนล่าสุด', num: true, fmt: PC.nf }, { f: 'ach', label: '% Target', num: true, pill: pill('ach') },
      { f: 'ytd_target', label: 'Target สะสม', num: true, fmt: PC.nf }, { f: 'ytd_units', label: m + ' สะสม', num: true, fmt: PC.nf }, { f: 'ytd_ach', label: '% Target สะสม', num: true, pill: pill('ytd_ach') }]; };
const achPill = (d) => d.ach == null ? ['mute', '–'] : [d.ach >= 0.95 ? 'ok' : d.ach >= 0.8 ? 'warn' : 'bad', PC.pf(d.ach)];
dash.draw('tb_mat', (el) => PC.table(el, 'tb_mat', mAgg(), { key: ['matcode'], def: PC.isNet() ? 'net' : 'units', q: 'mat', cols: [
  { f: 'matcode', label: 'Matcode' }, { f: 'name', label: 'ชื่อสินค้า', wrap: true }, { f: 'sim_group', label: 'Type Sim' }, { f: 'status', label: 'สถานะ' },
  { f: 'price', label: 'ราคาป้าย', num: true, fmt: PC.nf }, { f: 'units', label: 'QTY', num: true, fmt: PC.nf, bar: !PC.isNet() }, { f: 'net', label: 'Net Amount (บาท)', num: true, fmt: PC.nf, bar: PC.isNet() },
  { f: PC.isNet() ? 'share_n' : 'share_u', label: PC.isNet() ? '% Net' : '% QTY', num: true, fmt: PC.pf }, { f: 'stock', label: 'Stock คงเหลือ', num: true, fmt: PC.nf }, { f: 'cover_wk', label: 'Cover (สัปดาห์)', num: true, fmt: (v) => (v > 52 ? '> 52' : d3.format(',.1f')(v)) } ] }));
