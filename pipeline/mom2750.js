/* ---------- MoM ซิมรายปี 2,750: ติดตามสาขาที่ %MoM ติดลบ ช่วง 10 วันสุดท้ายของเดือน ----------
   รายชื่อสาขา + ยอดเดือนก่อน (LM) มาจากไฟล์ HQ "Prepaid_Sales_By_Store_<ddmmyyyy>.xlsx" (pipeline/mom2750.py -> mom2750_data.js)
   ยอดขายนับจาก TSM (sales_daily) เฉพาะ Matcode 3000122199 / 3000122191 / 3000122169 ทุกสาขา และ 3000143085 เฉพาะ Dtac COCO / Dtac Hall
   Target (Gap) = LM − ยอดขาย 1 ถึงวันก่อนเริ่มติดตาม (TSM) · ยังขาด = LM − ยอดขายเดือนนี้ทั้งหมด (TSM) */
(() => {
  const css = `
.mm-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; margin: 4px 0 14px; }
.mm-tile { background: var(--color-panel); border: 1px solid var(--color-border-line); border-radius: var(--cds-radius); padding: 10px 14px; }
.mm-tile span { display: block; font-size: 12px; color: var(--color-fg-muted); }
.mm-tile b { display: block; font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1.3; }
.mm-tile b small { font-size: 14px; font-weight: 400; color: var(--color-fg-muted); }
.mm-tile small { font-size: 12px; color: var(--color-fg-muted); }
.mm-ok { color: var(--color-good, #1d7a4a); } .mm-bad { color: var(--color-bad, #b4382c); }
.mm-leg { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; font-size: 12px; color: var(--color-fg-muted); margin-bottom: 8px; }
.mm-leg i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; vertical-align: -2px; margin-right: 4px; }
.mm-grid { display: grid; gap: 4px; }
.mm-row { display: grid; grid-template-columns: 6.5rem 1fr 1fr; gap: 6px 16px; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--color-border-line); }
.mm-row.mm-hd { font-size: 12px; color: var(--color-fg-muted); border-bottom-width: 0; }
.mm-row.now .mm-dt { font-weight: 600; }
.mm-row.mm-tot { border-top: 1.5px solid var(--color-fg); border-bottom: 0; padding-top: 8px; font-weight: 600; }
.mm-dt small { margin-left: 6px; font-size: 11px; font-weight: 400; color: var(--color-fg-muted); }
.mm-pb { display: grid; grid-template-columns: 1fr 9.5rem; gap: 8px; align-items: center; font-size: 13px; font-variant-numeric: tabular-nums; }
.mm-pb span { white-space: nowrap; } .mm-pb em { font-style: normal; color: var(--color-fg-muted); }
.mm-tr { height: 14px; background: var(--color-border-line); border-radius: 7px; overflow: hidden; }
.mm-tr i { display: block; height: 100%; border-radius: 7px; }
.mm-row.fut .mm-tr { opacity: .5; }
.mm-leg i.g, .mm-tr i.g { background: #2e9e5b; } .mm-leg i.a, .mm-tr i.a { background: #e3a21a; } .mm-leg i.r, .mm-tr i.r { background: #d8513f; }
b.mm-g { color: #1d7a4a; } b.mm-a { color: #a86d00; } b.mm-r { color: #b4382c; }
.mm-note { font-size: 12px; color: var(--color-fg-muted); font-weight: 400; }
@media (max-width: 640px) {
  .mm-row { grid-template-columns: 1fr 1fr; } .mm-row .mm-dt { grid-column: 1 / -1; } .mm-row.mm-hd span:first-child { display: none; }
  .mm-pb { grid-template-columns: 1fr; gap: 2px; } .mm-row.mm-tot .mm-note { grid-column: 1 / -1; }
}
[data-draw="tb_mom_area"] tbody tr:last-child td { font-weight: 700; border-top: 2px solid var(--color-fg); background: var(--color-panel); }
.mm-zones { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 12px; }
.mm-zone { background: var(--color-panel); border: 1px solid var(--color-border-line); border-radius: var(--cds-radius); padding: 12px 16px; }
.mm-zh { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.mm-zh h4 { margin: 0; font-size: 20px; } .mm-zh small { font-size: 12px; color: var(--color-fg-muted); }
.mm-zp { font-size: 28px; font-weight: 700; line-height: 1.1; }
.mm-zn { display: grid; grid-template-columns: .8fr .8fr 1.3fr 1fr .9fr; gap: 6px; margin-top: 10px; font-variant-numeric: tabular-nums; }
.mm-zn div { display: flex; flex-direction: column; min-width: 0; } .mm-zn b { font-size: 18px; font-weight: 600; white-space: nowrap; } .mm-zn b small { font-size: 13px; font-weight: 400; }
.mm-zn span { font-size: 11.5px; color: var(--color-fg-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 400px) { .mm-zn { grid-template-columns: 1fr 1fr 1fr; } }
.mm-packs { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 12px; }
.mm-pack { display: flex; gap: 16px; align-items: center; background: var(--color-panel); border: 1px solid var(--color-border-line); border-left: 4px solid var(--pk); border-radius: var(--cds-radius); padding: 12px 14px; }
.mm-pack img { height: 130px; width: auto; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,.18); flex: none; }
.mm-pi h4 { margin: 0; font-size: 16px; color: var(--pk); } .mm-pi > small { color: var(--color-fg-muted); font-size: 12px; }
.mm-pn { display: flex; gap: 22px; margin: 8px 0 6px; flex-wrap: wrap; } .mm-pn div { display: flex; flex-direction: column; }
.mm-pn b { font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1.2; } .mm-pn span { font-size: 12px; color: var(--color-fg-muted); }
.mm-pm { display: block; font-size: 11.5px; color: var(--color-fg-muted); }
@media (max-width: 480px) { .mm-pack img { height: 96px; } .mm-pn { gap: 14px; } .mm-pn b { font-size: 20px; } }
.mm-days { display: grid; grid-template-columns: repeat(auto-fit, minmax(44px, 1fr)); gap: 6px; align-items: end; }
.mm-day { text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; }
.mm-day i { display: block; margin: 2px auto 3px; width: 70%; min-height: 2px; background: var(--color-accent, #3b78d4); border-radius: 3px 3px 0 0; }
.mm-day.fut i { background: var(--color-border-line); }
.mm-day em { font-style: normal; color: var(--color-fg-muted); }
.mm-seg { display: inline-flex; border: 1px solid var(--color-border-line); border-radius: 8px; overflow: hidden; }
.mm-seg button { font: inherit; font-size: 13px; border: 0; background: none; color: var(--color-fg); padding: 6px 12px; cursor: pointer; }
.mm-seg button[aria-pressed="true"] { background: var(--color-fg); color: var(--color-bg); }
.mm-bar { height: 8px; background: var(--color-border-line); border-radius: 4px; overflow: hidden; margin-top: 6px; }
.mm-bar i { display: block; height: 100%; background: var(--color-good, #1d7a4a); }
@media (max-width: 640px) { .mm-tiles { grid-template-columns: 1fr 1fr; gap: 8px; } .mm-tile b { font-size: 20px; } }
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const nf = (v) => Math.round(v || 0).toLocaleString('en-US');
  const TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const dTH = (s) => (s ? (+s.slice(8, 10)) + ' ' + TH[+s.slice(5, 7) - 1] : '–');
  const add = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
  let view = 'gap';   // default: shops whose MoM is still negative

  // one pass over the data, shared by every card of the tab
  const calc = () => {
    const M = window.MOM2750; if (!M || !window.PC) return null;
    const p = PC.P(); const shops = PC.rows('shops') || []; const sales = PC.rows('sales_daily') || [];
    const sm = new Map(shops.map((r) => [String(r.shop), r]));
    const dtac = new Set(M.dtac); shops.forEach((r) => { if (/^dtac/i.test(String(r.stype || ''))) dtac.add(String(r.shop)); });
    const mats = new Set(M.mats);
    const ok = (c, area, stype) => (p.shop !== 'ALL' ? String(c) === String(p.shop) : window.PCin(area, p.area) && (p.stype === 'ALL' || stype === p.stype));
    const rows = new Map();
    for (const s of M.shops) {
      const x = sm.get(s.c) || {}; const area = x.area || x.region || s.area, stype = x.stype || s.ch;
      if (!ok(s.c, area, stype)) continue;
      rows.set(s.c, { shop: s.c, name: x.name || s.n, area, stype, lm: s.lm, src: s.src, hqmom: s.mom, stock: s.stock, note: s.rem, before: 0, win: 0, mtd: 0, netw: 0, byDay: {} });
    }
    let last = ''; const pk = {};
    let lastAll = ''; for (const r of sales) { const d = String(r.date); if (d.slice(0, 7) === M.month && d > lastAll) lastAll = d; }
    const daily = {};
    for (const r of sales) {
      const d = String(r.date); if (d.slice(0, 7) !== M.month) continue; if (d > last) last = d;
      const m = String(r.matcode); if (!mats.has(m)) continue;
      const c = String(r.shop); if (m === M.dtac_only && !dtac.has(c)) continue;
      const x = rows.get(c); if (!x) continue;
      const u = +r.units || 0; x.mtd += u;
      x.byDay[d] = (x.byDay[d] || 0) + u; if (d >= M.from && d <= M.to) { const k = pk[m] || (pk[m] = { s: 0, w: 0, t: 0 }); k.w += u; if (d === lastAll) k.t += u; }
      if (d < M.from) x.before += u; else if (d <= M.to) { x.win += u; x.netw += +r.net || 0; daily[d] = (daily[d] || 0) + u; }
    }
    // real stock of the 2,750 SIMs from the latest stock file (Drive) - 3000143085 only where it can be sold
    let stockAsof = '';
    for (const r of (PC.rows('stock_by_shop') || [])) { const m = String(r.matcode); if (!mats.has(m)) continue; const c = String(r.shop);
      if (!stockAsof && r.asof) stockAsof = String(r.asof); if (m === M.dtac_only && !dtac.has(c)) continue; const x = rows.get(c); if (x) { x.stk = (x.stk || 0) + (+r.qty || 0); (pk[m] || (pk[m] = { s: 0, w: 0, t: 0 })).s += +r.qty || 0; } }
    const left = !last || last < M.from ? days(M.from, M.to) + 1 : Math.max(1, days(last, M.to) + 1); // today counts as a selling day (files come in during the day)
    const out = [...rows.values()].map((x) => {
      const tgt = Math.max(0, x.lm - x.before), rem = Math.max(0, x.lm - x.mtd);
      // TG per day, rollover: (Gap − sold in the window before the latest day) ÷ days left including the latest day
      const today = last >= M.from ? (x.byDay[last] || 0) : 0, dl = last >= M.from ? days(last, M.to) + 1 : days(M.from, M.to) + 1, tpd = Math.max(0, tgt - (x.win - today)) / dl;
      return { ...x, tgt, rem, tpd, today, short: last >= M.from ? Math.max(0, tpd - today) : null, ach: tgt ? x.win / tgt : null, mom: x.lm ? x.mtd / x.lm - 1 : null, need: rem / left, done: x.mtd >= x.lm };
    });
    return { M, rows: out, last, left, daily, stockAsof, pk };
  };
  window.MOM_CALC = calc;

  dash.draw('mom_head', (el) => {
    const C = calc(); if (!C) { el.innerHTML = '<p class="pc-note">ยังไม่มีไฟล์ Prepaid_Sales_By_Store จาก HQ</p>'; return; }
    const { M, rows, last, left } = C;
    const T = (f) => rows.reduce((s, x) => s + f(x), 0);
    const tgt = T((x) => x.tgt), win = T((x) => x.win), rem = T((x) => x.rem), done = rows.filter((x) => x.done).length;
    const ach = tgt ? win / tgt : 0;
    // daily TG and the latest day's result
    const nd = days(M.from, M.to) + 1, tpd = rows.reduce((a, x) => a + x.tpd, 0), on = last && last >= M.from, dn = on ? days(M.from, last) + 1 : 0, dl = on ? days(last, M.to) + 1 : nd;
    const today = on ? (C.daily[last] || 0) : 0, rt = tpd ? today / tpd : 0, ctg = tgt / nd * dn, rc = ctg ? win / ctg : 0;
    const cl = (r) => (r >= 1 ? 'mm-ok' : 'mm-bad');
    el.innerHTML = '<div class="pc-head"><h2 class="pc-title">โฟกัสซิมรายปีปิดเดือน · สาขา %MoM ติดลบ · ซิมรายปี 2,750 บาท</h2>'
      + '<p class="pc-take">ช่วงติดตาม ' + dTH(M.from) + ' – ' + dTH(M.to) + ' ' + (+M.month.slice(0, 4) + 543)
      + ' · รายชื่อสาขาและยอดเดือนก่อน (LM ' + TH[+M.lmonth.slice(5, 7) - 1] + ') จากไฟล์ HQ ณ ' + dTH(M.asof)
      + ' · ยอดขายจาก TSM ถึง ' + dTH(last) + ' · เหลือ ' + left + ' วัน</p></div>'
      + '<div class="mm-tiles">'
      + '<div class="mm-tile"><span>สาขาที่ติดตาม</span><b>' + nf(rows.length) + '</b><small>%MoM ติดลบในไฟล์ HQ</small></div>'
      + '<div class="mm-tile"><span>Target (Gap) ' + dTH(M.from) + '–' + dTH(M.to) + '</span><b>' + nf(tgt) + '</b><small>ซิม · LM − ยอด 1–' + (+add(M.from, -1).slice(8)) + ' ' + TH[+M.month.slice(5, 7) - 1] + '</small></div>'
      + '<div class="mm-tile"><span>TG รายวัน (Rollover) ' + (on ? dTH(last) : '') + '</span><b>' + tpd.toFixed(1) + '</b><small>ซิม/วัน · (TG − ยอดก่อนวันนี้) ÷ ' + dl + ' วันที่เหลือ</small></div>'
      + '<div class="mm-tile"><span>ยอดขาย ' + (on ? dTH(last) : 'วันนี้') + '</span><b class="' + (on ? cl(rt) : '') + '">' + nf(today) + ' <small>/ ' + tpd.toFixed(0) + '</small></b><small>' + (on ? Math.round(rt * 100) + '% ของ TG รายวัน · ' + (today >= tpd ? 'ครบ' : 'ขาด ' + (tpd - today).toFixed(0)) : 'ยังไม่ถึงช่วงติดตาม') + '</small><div class="mm-bar"><i style="width:' + Math.min(100, rt * 100) + '%;background:' + (rt >= 1 ? '' : '#d8513f') + '"></i></div></div>'
      + '<div class="mm-tile"><span>ยอดสะสม vs TG สะสม (' + dn + ' วัน)</span><b class="' + (on ? cl(rc) : '') + '">' + nf(win) + ' <small>/ ' + nf(ctg) + '</small></b><small>' + (on ? Math.round(rc * 100) + '% · ' + (win >= ctg ? 'เกิน ' + nf(win - ctg) : 'ขาด ' + nf(ctg - win)) : '') + '</small><div class="mm-bar"><i style="width:' + Math.min(100, rc * 100) + '%;background:' + (rc >= 1 ? '' : '#d8513f') + '"></i></div></div>'
      + '<div class="mm-tile"><span>%ACH (Gap)</span><b class="' + (ach >= 1 ? 'mm-ok' : '') + '">' + (tgt ? Math.round(ach * 100) + '%' : '–') + '</b><div class="mm-bar"><i style="width:' + Math.min(100, ach * 100) + '%"></i></div></div>'
      + '<div class="mm-tile"><span>สาขาที่ MoM กลับมาเป็นบวก</span><b class="' + (done ? 'mm-ok' : '') + '">' + nf(done) + ' / ' + nf(rows.length) + '</b><small>ยอดเดือนนี้ ≥ LM</small></div>'
      + '<div class="mm-tile"><span>ยังขาดอีก</span><b class="' + (rem ? 'mm-bad' : 'mm-ok') + '">' + nf(rem) + '</b><small>ซิม · เฉลี่ย ' + (rem / left).toFixed(1) + ' ซิม/วัน</small></div>'
      + '</div>';
  });

  // colour bars per day: daily sales vs daily TG (Gap ÷ days of the window) and cumulative sales vs cumulative TG
  dash.draw('mom_daily', (el) => {
    const C = calc(); if (!C) { el.innerHTML = ''; return; }
    const { M, daily, last, rows } = C; const ds = []; for (let d = M.from; d <= M.to; d = add(d, 1)) ds.push(d);
    const gap = rows.reduce((a, x) => a + x.tgt, 0), tg = gap / ds.length;
    const col = (r) => (r >= 1 ? 'g' : r >= 0.7 ? 'a' : 'r');
    const bar = (v, t, fut) => { const r = t ? v / t : 0;
      return '<div class="mm-pb' + (fut ? ' fut' : '') + '"><div class="mm-tr"><i class="' + (fut ? '' : col(r)) + '" style="width:' + (fut ? 0 : Math.min(100, r * 100)) + '%"></i></div>'
        + '<span>' + (fut ? '<em>TG ' + nf(t) + '</em>' : '<b>' + nf(v) + '</b> / ' + nf(t) + ' <b class="mm-' + col(r) + '">' + Math.round(r * 100) + '%</b>') + '</span></div>'; };
    let cum = 0;
    const body = ds.map((d, k) => { const fut = !last || d > last; const v = daily[d] || 0; if (!fut) cum += v;
      return '<div class="mm-row' + (fut ? ' fut' : '') + (d === last ? ' now' : '') + '"><span class="mm-dt">' + dTH(d) + (d === last ? '<small>ล่าสุด</small>' : '') + '</span>'
        + bar(v, tg, fut) + bar(cum, tg * (k + 1), fut) + '</div>'; }).join('');
    const doneDays = ds.filter((d) => last && d <= last).length;
    el.innerHTML = '<div class="mm-leg"><span><i class="g"></i>≥ 100%</span><span><i class="a"></i>70–99%</span><span><i class="r"></i>&lt; 70%</span>'
      + '<span class="mm-note">TG รายวัน = Target (Gap) ' + nf(gap) + ' ÷ ' + ds.length + ' วัน = ' + tg.toFixed(1) + ' ซิม/วัน · TG สะสม = TG รายวัน × จำนวนวัน</span></div>'
      + '<div class="mm-grid"><div class="mm-row mm-hd"><span>วันที่</span><span>ยอดขายรายวัน / TG รายวัน</span><span>ยอดขายสะสม / TG สะสม</span></div>' + body
      + '<div class="mm-row mm-tot"><span class="mm-dt">รวมทั้งช่วง</span>' + bar(cum, gap, false) + '<span class="mm-note">ผ่านมา ' + doneDays + ' วัน · ควรได้สะสม ' + nf(tg * doneDays) + ' · ทำได้ ' + nf(cum) + (cum < tg * doneDays ? ' · ขาดไป ' + nf(tg * doneDays - cum) : '') + '</span></div></div>';
  });

  // Region (BMA / UPC I / UPC II) totals of the shops in the list
  const zones = (C) => ['BMA', 'UPC I', 'UPC II'].map((z) => { const r = C.rows.filter((x) => window.PCzone(x.area) === z), S = (f) => r.reduce((a, x) => a + (x[f] || 0), 0);
    const o = { z, n: r.length, done: r.filter((x) => x.done).length, tgt: S('tgt'), tpd: S('tpd'), today: S('today'), win: S('win'), rem: S('rem'), areas: new Set(r.map((x) => x.area)).size }; o.ach = o.tgt ? o.win / o.tgt : 0; return o; });
  dash.draw('mom_zone', (el) => {
    const C = calc(); if (!C) { el.innerHTML = ''; return; }
    const td = C.last >= C.M.from ? dTH(C.last) : 'วันนี้', zs = zones(C).filter((o) => o.n);
    el.innerHTML = '<div class="mm-zones">' + zs.map((o) => { const c = o.ach >= 1 ? 'mm-ok' : 'mm-bad', tc = o.today >= o.tpd ? 'mm-ok' : 'mm-bad';
      return '<article class="mm-zone"><div class="mm-zh"><div><h4>' + o.z + '</h4><small>' + o.areas + ' Area · ' + o.n + ' สาขา · ผ่านแล้ว <b class="' + (o.done ? 'mm-ok' : '') + '">' + o.done + '/' + o.n + '</b></small></div><b class="mm-zp ' + c + '">' + Math.round(o.ach * 100) + '%</b></div>'
        + '<div class="mm-bar"><i style="width:' + Math.min(100, o.ach * 100) + '%;background:' + (o.ach >= 1 ? '' : '#d8513f') + '"></i></div>'
        + '<div class="mm-zn"><div><b>' + nf(o.tgt) + '</b><span>Target</span></div><div><b>' + o.tpd.toFixed(1) + '</b><span>เป้า/วัน</span></div><div><b class="' + tc + '">' + nf(o.today) + ' <small>/ ' + o.tpd.toFixed(1) + '</small></b><span>วันนี้ (' + td + ') / เป้า</span></div><div><b>' + nf(o.win) + '</b><span>ขายสะสม</span></div><div><b class="' + (o.rem ? 'mm-bad' : 'mm-ok') + '">' + nf(o.rem) + '</b><span>ยังขาด</span></div></div></article>'; }).join('') + '</div>';
  });

  // SIM package pictures + stock / sales of the shops in the list
  const PACKS = [
    { name: 'True ซิมรายปี 2,750 บาท', sub: '15Mbps 100GB/รอบ · 12 รอบ · ทุกประเภทสาขา', mats: ['3000122199', '3000122191', '3000122169'], img: '3000122199', c: '#9b3fc4' },
    { name: 'dtac คงกระพัน+ 2,750 บาท', sub: '15Mbps 100GB/รอบ · 12 รอบ · เฉพาะ Dtac COCO / Hall', mats: ['3000143085'], img: '3000143085', c: '#1a8fd4' },
  ];
  window.MOM_PACKS = PACKS;
  dash.draw('mom_pack', (el) => {
    const C = calc(); if (!C) { el.innerHTML = ''; return; }
    const IMG = window.PROMO_IMG || {}, g = (m, f) => (C.pk[m] || {})[f] || 0, td = C.last >= C.M.from ? dTH(C.last) : 'Today';
    el.innerHTML = '<div class="mm-packs">' + PACKS.map((P) => { const S = (f) => P.mats.reduce((a, m) => a + g(m, f), 0);
      return '<article class="mm-pack" style="--pk:' + P.c + '">' + (IMG[P.img] ? '<img src="' + IMG[P.img] + '" alt="ปกซิม ' + esc(P.name) + '" loading="lazy">' : '') + '<div class="mm-pi"><h4>' + esc(P.name) + '</h4><small>' + esc(P.sub) + '</small>'
        + '<div class="mm-pn"><div><b class="' + (S('s') ? '' : 'mm-bad') + '">' + nf(S('s')) + '</b><span>Stock สาขาในรายการ</span></div><div><b>' + nf(S('t')) + '</b><span>ขาย ' + td + '</span></div><div><b>' + nf(S('w')) + '</b><span>ขาย ' + (+C.M.from.slice(8)) + '–' + (+C.M.to.slice(8)) + '</span></div></div>'
        + '<small class="mm-pm">' + P.mats.filter((m) => g(m, 's') > 0).map((m) => 'Matcode ' + m + ' · Stock ' + nf(g(m, 's'))).join('<br>') + '</small></div></article>'; }).join('')
      + '</div><p class="pc-note">Stock ณ ไฟล์ล่าสุด ' + (C.stockAsof ? dTH(C.stockAsof.slice(0, 10)) + ' ' + C.stockAsof.slice(11, 16) + ' น.' : '') + ' · นับเฉพาะ ' + nf(C.rows.length) + ' สาขาในรายการตามตัวกรอง</p>';
  });

  // PNG of the Area table (with the SIM packages and stock on top)
  const areaRows = () => { const C = calc(); if (!C) return null; const M = C.M, nd = days(M.from, M.to) + 1, m = new Map();
    for (const x of C.rows) { const a = m.get(x.area) || { area: x.area, n: 0, done: 0, tgt: 0, today: 0, tpd: 0, win: 0, rem: 0 }; a.n++; a.done += x.done ? 1 : 0; a.tgt += x.tgt; a.today += x.today || 0; a.tpd += x.tpd; a.win += x.win; a.rem += x.rem; m.set(x.area, a); }
    return { C, rows: [...m.values()].filter((a) => a.rem > 0).map((a) => ({ ...a, ach: a.tgt ? a.win / a.tgt : null })).sort((a, b) => b.rem - a.rem) }; };
  const loadImg = (src) => new Promise((ok) => { if (!src) return ok(null); const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  const areaPNG = async () => {
    try { await document.fonts.ready; } catch (e) {}
    const { C, rows } = areaRows(); const M = C.M, K = RKX.C, rr = RKX.rr, fit = RKX.fit, IMG = window.PROMO_IMG || {};
    const td = C.last >= M.from ? dTH(C.last) : 'Today', w = (+M.from.slice(8)) + '–' + (+M.to.slice(8)) + ' ' + TH[+M.month.slice(5, 7) - 1];
    const cols = [['Area', 300, 'l'], ['สาขาผ่านแล้ว', 150], ['Target ' + w, 170], ['Target/วัน', 120], ['ขาย ' + td + ' / เป้าวัน', 200], ['ขาย ' + w, 150], ['%ACH', 100], ['ยังขาด (ซิม)', 140]];
    const W = 48 + cols.reduce((a, c) => a + c[1], 0), RH = 44, PH = 210, ZH = 190, top = 130 + PH + 24 + ZH + 30, H = top + RH * (rows.length + 2) + 90, sc = 2;
    const cv = document.createElement('canvas'); cv.width = W * sc; cv.height = H * sc; const g = cv.getContext('2d'); g.scale(sc, sc);
    const F = (wt, z) => wt + ' ' + z + 'px "Noto Sans Thai", "IBM Plex Sans Thai", system-ui, sans-serif';
    g.fillStyle = K.bg; g.fillRect(0, 0, W, H);
    g.fillStyle = K.fg; g.font = F(700, 30); g.fillText('โฟกัสซิมรายปีปิดเดือน · ซิม 2,750 บาท · สรุปราย Area', 24, 52);
    const p = PC.P(); g.fillStyle = K.mu; g.font = F(400, 17);
    g.fillText('สาขา %MoM ติดลบ ' + nf(C.rows.length) + ' สาขา · ช่วงติดตาม ' + w + ' ' + (+M.month.slice(0, 4) + 543) + ' · ยอดขาย TSM ถึง ' + dTH(C.last) + (p.area !== 'ALL' ? ' · ' + p.area : '') + (p.stype !== 'ALL' ? ' · ' + p.stype : '') + ' · Stock ' + (C.stockAsof ? dTH(C.stockAsof.slice(0, 10)) + ' ' + C.stockAsof.slice(11, 16) + ' น.' : ''), 24, 84);
    // KPI line
    const T = (f) => C.rows.reduce((a, x) => a + f(x), 0), tg = T((x) => x.tgt), wi = T((x) => x.win), tdS = rows.reduce((a, x) => a + x.today, 0) + 0;
    g.font = F(600, 18); g.fillStyle = K.fg; g.fillText('Target ' + nf(tg) + ' ซิม (' + (tg / (days(M.from, M.to) + 1)).toFixed(1) + '/วัน) · ขายแล้ว ' + nf(wi) + ' (' + (tg ? Math.round(100 * wi / tg) : 0) + '%) · ยังขาด ' + nf(T((x) => x.rem)) + ' · ผ่านแล้ว ' + C.rows.filter((x) => x.done).length + '/' + C.rows.length + ' สาขา', 24, 114);
    // packages
    const imgs = await Promise.all(PACKS.map((P) => loadImg(IMG[P.img]))); const pw = (W - 48 - 20) / 2;
    PACKS.forEach((P, i) => { const x = 24 + i * (pw + 20), y = 130; g.fillStyle = '#faf9f6'; rr(g, x, y, pw, PH, 12); g.fill(); g.strokeStyle = P.c; g.lineWidth = 2; rr(g, x, y, pw, PH, 12); g.stroke();
      let tx = x + 18; const im = imgs[i]; if (im) { const ih = PH - 30, iw = im.width * ih / im.height; g.drawImage(im, x + 15, y + 15, iw, ih); tx = x + 15 + iw + 20; }
      const S = (f) => P.mats.reduce((a, m) => a + ((C.pk[m] || {})[f] || 0), 0);
      g.fillStyle = P.c; g.font = F(700, 22); g.fillText(fit(g, P.name, x + pw - tx - 12), tx, y + 40); g.fillStyle = K.mu; g.font = F(400, 14); g.fillText(fit(g, P.sub, x + pw - tx - 12), tx, y + 64);
      [['Stock', S('s'), S('s') ? K.fg : K.bad], ['ขาย ' + td, S('t'), K.fg], ['ขาย ' + w, S('w'), K.fg]].forEach(([l, v, c], j) => { const bx = tx + j * 150; g.fillStyle = c; g.font = F(700, 34); g.fillText(nf(v), bx, y + 120); g.fillStyle = K.mu; g.font = F(400, 14); g.fillText(l, bx, y + 144); });
      g.font = F(400, 13); g.fillStyle = K.mu; g.fillText(fit(g, P.mats.filter((m) => ((C.pk[m] || {}).s || 0) > 0).map((m) => m + ': ' + nf((C.pk[m] || {}).s || 0)).join(' · '), x + pw - tx - 12), tx, y + 180); });
    // zone cards: BMA / UPC I / UPC II
    { const zs = zones(C);
      const zw = (W - 48 - 40) / 3, zy = 130 + PH + 24;
      zs.forEach((o, i) => { const x = 24 + i * (zw + 20); g.fillStyle = '#ffffff'; rr(g, x, zy, zw, ZH, 12); g.fill(); g.strokeStyle = K.line; g.lineWidth = 1.5; rr(g, x, zy, zw, ZH, 12); g.stroke();
        g.fillStyle = K.fg; g.font = F(700, 24); g.fillText(o.z, x + 18, zy + 38); g.fillStyle = K.mu; g.font = F(400, 14); g.fillText(o.areas + ' Area · ' + o.n + ' สาขา · ผ่านแล้ว ' + o.done + '/' + o.n, x + 18, zy + 60);
        g.textAlign = 'right'; g.font = F(700, 34); g.fillStyle = o.ach >= 1 ? K.ok : K.bad; g.fillText(Math.round(o.ach * 100) + '%', x + zw - 18, zy + 46); g.textAlign = 'left';
        const by = zy + 78, bw = zw - 36; g.fillStyle = K.grid; rr(g, x + 18, by, bw, 12, 6); g.fill(); if (o.ach > 0) { g.fillStyle = o.ach >= 1 ? K.ok : K.bad; rr(g, x + 18, by, Math.max(12, bw * Math.min(1, o.ach)), 12, 6); g.fill(); }
        const fr = [0.17, 0.17, 0.26, 0.2, 0.2]; let cx = x + 18;
        [['Target', nf(o.tgt)], ['เป้า/วัน', o.tpd.toFixed(1)], ['วันนี้ / เป้าวัน', nf(o.today) + ' / ' + o.tpd.toFixed(1)], ['ขายสะสม', nf(o.win)], ['ยังขาด', nf(o.rem)]].forEach(([l, v], j) => {
          const cw = bw * fr[j]; g.fillStyle = j === 2 ? (o.today >= o.tpd ? K.ok : K.bad) : j === 4 ? (o.rem ? K.bad : K.ok) : K.fg; g.font = F(700, 20); g.fillText(fit(g, v, cw - 8), cx, zy + 130); g.fillStyle = K.mu; g.font = F(400, 13); g.fillText(fit(g, l, cw - 8), cx, zy + 152); cx += cw; }); });
    }
    // table
    let y = top; g.fillStyle = '#f3f2ee'; g.fillRect(24, y, W - 48, RH);
    const cell = (txt, i, yy, opt = {}) => { let x = 24; for (let k = 0; k < i; k++) x += cols[k][1]; const c = cols[i]; g.font = F(opt.b ? 700 : opt.h ? 600 : 400, opt.h ? 15 : 17);
      if (opt.pill) { const tw = g.measureText(txt).width + 22, px = c[2] === 'l' ? x + 10 : x + c[1] - 12 - tw; g.strokeStyle = opt.pill; g.lineWidth = 1.5; rr(g, px, yy + 9, tw, RH - 18, (RH - 18) / 2); g.stroke(); g.fillStyle = opt.pill; g.textAlign = 'left'; g.fillText(txt, px + 11, yy + RH / 2 + 6); return; }
      g.fillStyle = opt.c || (opt.h ? K.mu : K.fg); g.textAlign = c[2] === 'l' ? 'left' : 'right'; g.fillText(c[2] === 'l' ? fit(g, txt, c[1] - 20) : txt, c[2] === 'l' ? x + 10 : x + c[1] - 12, yy + RH / 2 + 6); g.textAlign = 'left'; };
    cols.forEach((c, i) => cell(c[0], i, y, { h: 1 })); y += RH;
    const row = (a, b) => { cell(a.area, 0, y, { b });
      cell((a.done ? '✓ ' : '') + a.done + ' / ' + a.n, 1, y, { pill: a.done ? K.ok : K.mu }); cell(nf(a.tgt), 2, y, { b }); cell(a.tpd.toFixed(1), 3, y, { b });
      cell(nf(a.today) + ' / ' + a.tpd.toFixed(1), 4, y, { pill: a.today >= a.tpd ? K.ok : K.bad }); cell(nf(a.win), 5, y, { b });
      cell(a.ach == null ? '–' : Math.round(a.ach * 100) + '%', 6, y, { pill: a.ach >= 1 ? K.ok : K.bad }); cell(a.rem ? nf(a.rem) : 'ครบ', 7, y, { pill: a.rem ? K.bad : K.ok });
      g.strokeStyle = K.line; g.lineWidth = 1; g.beginPath(); g.moveTo(24, y + RH); g.lineTo(W - 24, y + RH); g.stroke(); y += RH; };
    rows.forEach((a) => row(a));
    const S = (f) => rows.reduce((s, a) => s + a[f], 0), tot = { area: 'รวม ' + rows.length + ' Area', n: S('n'), done: S('done'), tgt: S('tgt'), tpd: S('tpd'), today: S('today'), win: S('win'), rem: S('rem') }; tot.ach = tot.tgt ? tot.win / tot.tgt : null;
    g.strokeStyle = K.fg; g.lineWidth = 2; g.beginPath(); g.moveTo(24, y); g.lineTo(W - 24, y); g.stroke(); row(tot, true);
    g.fillStyle = K.mu; g.font = F(400, 14); g.fillText('เฉพาะ Area ที่ยังขาด TG · Target = ยอดเดือนก่อน (HQ) − ยอดขาย 1–' + (+add(M.from, -1).slice(8)) + ' ' + TH[+M.month.slice(5, 7) - 1] + ' · Target/วัน แบบ Rollover = (Target − ยอดขายในช่วงก่อนวันล่าสุด) ÷ วันที่เหลือรวมวันล่าสุด', 24, H - 44);
    g.fillText('Matcode 3000122199 / 3000122191 / 3000122169 ทุกสาขา + 3000143085 เฉพาะ Dtac COCO / Hall · Stock เฉพาะสาขาในรายการ · Prepay Dashboard', 24, H - 20);
    return { cv, name: 'Focus_SIM2750_Area_' + (C.last || M.from) + '.png' };
  };
  if (!window.MOM_PNG_BOUND) { window.MOM_PNG_BOUND = true;
    document.addEventListener('click', async (e) => { const b = e.target.closest && e.target.closest('#mom-area-png'); if (!b) return; const t = b.textContent; b.disabled = true; b.textContent = 'กำลังสร้างรูป…';
      try { const { cv, name } = await areaPNG(); RKX.show(cv, name); } catch (err) { console.error(err); } finally { b.disabled = false; b.textContent = t; } }); }

  dash.draw('tb_mom_area', (el) => {
    const C = calc(); if (!C) { el.innerHTML = ''; return; }
    const M = window.MOM2750, w = (+M.from.slice(8)) + '–' + (+M.to.slice(8)) + ' ' + TH[+M.month.slice(5, 7) - 1], td = C.last >= M.from ? dTH(C.last) : 'Today';
    const m = new Map();
    for (const x of C.rows) { const a = m.get(x.area) || { area: x.area, n: 0, done: 0, tgt: 0, today: 0, tpd: 0, win: 0, rem: 0 }; a.n++; a.done += x.done ? 1 : 0; a.tgt += x.tgt; a.today += x.today || 0; a.tpd += x.tpd; a.win += x.win; a.rem += x.rem; m.set(x.area, a); }
    const nd = days(M.from, M.to) + 1;
    const rows = [...m.values()].filter((a) => a.rem > 0).map((a) => ({ ...a, ach: a.tgt ? a.win / a.tgt : null }));   // only Areas still short
    const S = (f) => rows.reduce((a, x) => a + x[f], 0);
    if (rows.length) { const t = { area: 'รวม ' + rows.length + ' Area', _tot: true, n: S('n'), done: S('done'), tgt: S('tgt'), tpd: S('tpd'), today: S('today'), win: S('win'), rem: S('rem') }; t.ach = t.tgt ? t.win / t.tgt : null; rows.push(t); }
    PC.table(el, 'tb_mom_area', rows, { last: (r) => r._tot,  key: ['area'], def: 'rem', limit: 100, cols: [
      { f: 'area', label: 'Area', wrap: true },
      { f: 'done', label: 'สาขาผ่านแล้ว', num: true, pill: (d) => [d.done ? 'ok' : 'mute', (d.done ? '✓ ' : '') + d.done + ' / ' + d.n + ' สาขา'] },
      { f: 'tgt', label: 'Target ' + w + ' (จำนวนซิม)', num: true, fmt: PC.nf },
      { f: 'tpd', label: 'Target ต่อวัน', num: true, fmt: (v) => v.toFixed(1) },
      { f: 'today', label: 'ยอดขาย Today (' + td + ') / เป้าวัน', num: true, pill: (d) => [d.today >= d.tpd ? 'ok' : 'bad', PC.nf(d.today) + ' / ' + d.tpd.toFixed(1)] },
      { f: 'win', label: 'ยอดขาย ' + w, num: true, pill: (d) => [d.win ? 'ok' : 'mute', PC.nf(d.win)] },
      { f: 'ach', label: '%ACH', num: true, pill: (d) => (d.ach == null ? ['mute', '–'] : [d.ach >= 1 ? 'ok' : d.ach < 0.5 ? 'bad' : 'mute', Math.round(d.ach * 100) + '%']) },
      { f: 'rem', label: 'ยังขาด (ซิม)', num: true, pill: (d) => (d.rem ? ['bad', PC.nf(d.rem)] : ['ok', 'ครบ']) }] });
  });

  dash.draw('mom_seg', (el) => {
    el.innerHTML = [['gap', 'MoM ยังลบ'], ['done', 'MoM บวกแล้ว'], ['all', 'ทุกสาขา']].map(([k, l]) => '<button type="button" data-v="' + k + '" aria-pressed="' + (view === k) + '">' + l + '</button>').join('');
    el.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; view = b.dataset.v; dash.draw('mom_seg'); dash.draw('tb_mom'); };
  });

  const shopRows = () => { const C = calc(); if (!C) return null; return C.rows.filter((x) => (view === 'gap' ? !x.done : view === 'done' ? x.done : true)); };
  dash.draw('tb_mom', (el) => {
    const r = shopRows(); if (!r) { el.innerHTML = ''; return; }
    const M = window.MOM2750, b4 = '1–' + (+add(M.from, -1).slice(8));
    const C = calc(), td = C.last >= M.from ? dTH(C.last) : 'วันนี้', w = (+M.from.slice(8)) + '–' + (+M.to.slice(8));
    const f1 = (v) => (v == null ? '–' : v.toFixed(1));
    PC.table(el, 'tb_mom', r, { key: ['shop'], def: 'rem', limit: 2000, q: 'mom', cols: [
      { f: 'shop', label: 'รหัส' }, { f: 'name', label: 'สาขา', wrap: true }, { f: 'area', label: 'Area' }, { f: 'stype', label: 'ประเภท' },
      { f: 'tgt', label: 'Target ' + w + ' (จำนวนซิม)', num: true, fmt: PC.nf },
      { f: 'tpd', label: 'TG ต่อวัน', num: true, fmt: f1 },
      { f: 'today', label: 'ขาย ' + td, num: true, fmt: PC.nf },
      { f: 'short', label: 'ขาด ' + td, num: true, pill: (d) => (d.short == null ? ['mute', '–'] : d.short > 0 ? ['bad', f1(d.short)] : ['ok', 'ครบ']) },
      { f: 'win', label: 'ขาย ' + w + ' (QTY)', num: true, fmt: PC.nf },
      { f: 'netw', label: 'Net Amount ' + w, num: true, fmt: PC.nf },
      { f: 'ach', label: '%ACH', num: true, pill: (d) => (d.ach == null ? ['mute', '–'] : [d.ach >= 1 ? 'ok' : d.ach < 0.5 ? 'bad' : 'mute', Math.round(d.ach * 100) + '%']) },
      { f: 'rem', label: 'TG คงเหลือ ' + w, num: true, pill: (d) => (d.rem ? ['bad', PC.nf(d.rem)] : ['ok', 'ครบ']) },
      { f: 'mom', label: '%MoM ตอนนี้', num: true, pill: (d) => (d.mom == null ? ['mute', '–'] : [d.mom >= 0 ? 'ok' : 'bad', (d.mom > 0 ? '+' : '') + Math.round(d.mom * 100) + '%']) },
      { f: 'stk', label: 'Stock ' + (C.stockAsof ? dTH(C.stockAsof.slice(0, 10)) : ''), num: true, pill: (d) => (d.stk ? ['mute', PC.nf(d.stk)] : ['bad', '0']) },
      { f: 'note', label: 'Remark', wrap: true }] });
  });

  // Excel export = the same tables as on the page (Region · Area · shops), Thai headers, same order
  const xlib = () => (window.XLSX ? Promise.resolve() : new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); }));
  const sheet = (head, rows, fmts, widths) => { const ws = XLSX.utils.aoa_to_sheet([head, ...rows]);
    rows.forEach((r, ri) => r.forEach((v, ci) => { const z = fmts[ci]; const c = ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })]; if (z && c && typeof v === 'number') c.z = z; }));
    ws['!cols'] = widths.map((w) => ({ wch: w })); ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: head.length - 1 } }) }; ws['!freeze'] = { xSplit: 0, ySplit: 1 }; return ws; };
  if (!window.MOM_CSV_BOUND) { window.MOM_CSV_BOUND = true;
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest && e.target.closest('#mom-csv'); if (!btn) return; const C = calc(); if (!C) return; const M = C.M;
      const td = C.last >= M.from ? dTH(C.last) : 'Today', w = (+M.from.slice(8)) + '–' + (+M.to.slice(8)) + ' ' + TH[+M.month.slice(5, 7) - 1], r1 = (v) => Math.round(v * 10) / 10, pc = (v) => (v == null ? '' : Math.round(v * 1000) / 1000);
      const r = shopRows().slice().sort((a, b) => b.rem - a.rem);
      const t0 = btn.textContent; btn.disabled = true; btn.textContent = 'กำลังสร้างไฟล์…';
      try {
        await xlib(); const wb = XLSX.utils.book_new();
        // 1) shops: same columns as the table on the page
        XLSX.utils.book_append_sheet(wb, sheet(['รหัส', 'สาขา', 'Area', 'ประเภท', 'Target ' + w + ' (จำนวนซิม)', 'TG ต่อวัน', 'ขาย ' + td, 'ขาด ' + td, 'ขาย ' + w + ' (QTY)', 'Net Amount ' + w, '%ACH', 'TG คงเหลือ ' + w, '%MoM ตอนนี้', 'Stock ' + (C.stockAsof ? dTH(C.stockAsof.slice(0, 10)) : ''), 'Remark'],
          r.map((x) => [x.shop, x.name, x.area, x.stype, x.tgt, r1(x.tpd), x.today, x.short == null ? '' : r1(x.short), x.win, Math.round(x.netw), pc(x.ach), x.rem, pc(x.mom), x.stk || 0, x.note || '']),
          [, , , , '#,##0', '0.0', '#,##0', '0.0', '#,##0', '#,##0', '0%', '#,##0', '0%', '#,##0'], [10, 40, 24, 18, 14, 9, 10, 10, 12, 14, 8, 12, 11, 10, 24]), 'รายสาขา');
        // 2) Areas still short + total
        const A = areaRows().rows, S = (f) => A.reduce((a, x) => a + x[f], 0), T = { area: 'รวม ' + A.length + ' Area', n: S('n'), done: S('done'), tgt: S('tgt'), tpd: S('tpd'), today: S('today'), win: S('win'), rem: S('rem') }; T.ach = T.tgt ? T.win / T.tgt : null;
        XLSX.utils.book_append_sheet(wb, sheet(['Area', 'สาขาผ่านแล้ว', 'สาขาทั้งหมด', 'Target ' + w + ' (จำนวนซิม)', 'Target ต่อวัน', 'ยอดขาย Today (' + td + ')', 'ยอดขาย ' + w, '%ACH', 'ยังขาด (ซิม)'],
          [...A, T].map((x) => [x.area, x.done, x.n, x.tgt, r1(x.tpd), x.today, x.win, pc(x.ach), x.rem]), [, '#,##0', '#,##0', '#,##0', '0.0', '#,##0', '#,##0', '0%', '#,##0'], [26, 12, 12, 16, 12, 14, 14, 8, 12]), 'ราย Area');
        // 3) Regions
        XLSX.utils.book_append_sheet(wb, sheet(['Region', 'Area', 'สาขา', 'สาขาผ่านแล้ว', 'Target (จำนวนซิม)', 'เป้า/วัน', 'ขาย ' + td, 'ขายสะสม ' + w, '%ACH', 'ยังขาด'],
          zones(C).filter((o) => o.n).map((o) => [o.z, o.areas, o.n, o.done, o.tgt, r1(o.tpd), o.today, o.win, pc(o.ach), o.rem]), [, '#,##0', '#,##0', '#,##0', '#,##0', '0.0', '#,##0', '#,##0', '0%', '#,##0'], [10, 8, 8, 12, 16, 10, 12, 14, 8, 10]), 'Region');
        // 4) notes
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['โฟกัสซิมรายปีปิดเดือน · ซิม 2,750 บาท'], ['ช่วงติดตาม', M.from + ' ถึง ' + M.to], ['ยอดขาย TSM ถึง', C.last], ['Stock ณ', C.stockAsof], ['รายชื่อสาขา / LM', 'ไฟล์ HQ ' + M.asof + ' (สาขา %MoM ติดลบ)'], ['มุมมอง', ({ gap: 'MoM ยังลบ', done: 'MoM บวกแล้ว', all: 'ทุกสาขา' })[view]],
          ['Target', 'ยอดเดือนก่อน (LM) − ยอดขายตั้งแต่ต้นเดือนถึงวันก่อนเริ่มติดตาม'], ['TG ต่อวัน', 'Rollover: (Target − ยอดขายในช่วงก่อนวันล่าสุด) ÷ วันที่เหลือรวมวันล่าสุด'], ['Matcode', '3000122199 / 3000122191 / 3000122169 ทุกสาขา + 3000143085 เฉพาะ Dtac COCO / Hall']]), 'หมายเหตุ');
        XLSX.writeFile(wb, 'Focus_SIM2750_' + (C.last || M.from) + '.xlsx');
      } catch (err) { console.error(err); btn.dataset.err = '1'; } finally { btn.disabled = false; btn.textContent = btn.dataset.err ? 'สร้างไฟล์ไม่สำเร็จ ลองใหม่' : t0; delete btn.dataset.err; }
    }); }
})();
