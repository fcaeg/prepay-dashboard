/* ---------- MoM ซิมรายปี 2,750: ติดตามสาขาที่ %MoM ติดลบ ช่วง 10 วันสุดท้ายของเดือน ----------
   รายชื่อสาขา + ยอดเดือนก่อน (LM) มาจากไฟล์ HQ "Prepaid_Sales_By_Store_<ddmmyyyy>.xlsx" (pipeline/mom2750.py -> mom2750_data.js)
   ยอดขายนับจาก TSM (sales_daily) เฉพาะ Matcode 3000122199 / 3000122191 / 3000122169 ทุกสาขา และ 3000143085 เฉพาะ Dtac COCO / Dtac Hall
   Target (Gap) = LM − ยอดขาย 1 ถึงวันก่อนเริ่มติดตาม (TSM) · ยังขาด = LM − ยอดขายเดือนนี้ทั้งหมด (TSM) */
(() => {
  const css = `
.mm-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 4px 0 14px; }
.mm-tile { background: var(--color-panel); border: 1px solid var(--color-border-line); border-radius: var(--cds-radius); padding: 10px 14px; }
.mm-tile span { display: block; font-size: 12px; color: var(--color-fg-muted); }
.mm-tile b { display: block; font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1.3; }
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
    let last = '';
    const daily = {};
    for (const r of sales) {
      const d = String(r.date); if (d.slice(0, 7) !== M.month) continue; if (d > last) last = d;
      const m = String(r.matcode); if (!mats.has(m)) continue;
      const c = String(r.shop); if (m === M.dtac_only && !dtac.has(c)) continue;
      const x = rows.get(c); if (!x) continue;
      const u = +r.units || 0; x.mtd += u;
      x.byDay[d] = (x.byDay[d] || 0) + u;
      if (d < M.from) x.before += u; else if (d <= M.to) { x.win += u; x.netw += +r.net || 0; daily[d] = (daily[d] || 0) + u; }
    }
    const left = !last || last < M.from ? days(M.from, M.to) + 1 : Math.max(1, days(last, M.to) + 1); // today counts as a selling day (files come in during the day)
    const out = [...rows.values()].map((x) => {
      const tgt = Math.max(0, x.lm - x.before), rem = Math.max(0, x.lm - x.mtd);
      const tpd = tgt / (days(M.from, M.to) + 1), today = last >= M.from ? (x.byDay[last] || 0) : 0;   // TG per day = Gap ÷ days of the window
      return { ...x, tgt, rem, tpd, today, short: last >= M.from ? Math.max(0, tpd - today) : null, ach: tgt ? x.win / tgt : null, mom: x.lm ? x.mtd / x.lm - 1 : null, need: rem / left, done: x.mtd >= x.lm };
    });
    return { M, rows: out, last, left, daily };
  };
  window.MOM_CALC = calc;

  dash.draw('mom_head', (el) => {
    const C = calc(); if (!C) { el.innerHTML = '<p class="pc-note">ยังไม่มีไฟล์ Prepaid_Sales_By_Store จาก HQ</p>'; return; }
    const { M, rows, last, left } = C;
    const T = (f) => rows.reduce((s, x) => s + f(x), 0);
    const tgt = T((x) => x.tgt), win = T((x) => x.win), rem = T((x) => x.rem), done = rows.filter((x) => x.done).length;
    const ach = tgt ? win / tgt : 0;
    el.innerHTML = '<div class="pc-head"><h2 class="pc-title">ติดตามสาขา %MoM ติดลบ · ซิมรายปี 2,750 บาท</h2>'
      + '<p class="pc-take">ช่วงติดตาม ' + dTH(M.from) + ' – ' + dTH(M.to) + ' ' + (+M.month.slice(0, 4) + 543)
      + ' · รายชื่อสาขาและยอดเดือนก่อน (LM ' + TH[+M.lmonth.slice(5, 7) - 1] + ') จากไฟล์ HQ ณ ' + dTH(M.asof)
      + ' · ยอดขายจาก TSM ถึง ' + dTH(last) + ' · เหลือ ' + left + ' วัน</p></div>'
      + '<div class="mm-tiles">'
      + '<div class="mm-tile"><span>สาขาที่ติดตาม</span><b>' + nf(rows.length) + '</b><small>%MoM ติดลบในไฟล์ HQ</small></div>'
      + '<div class="mm-tile"><span>Target (Gap) ' + dTH(M.from) + '–' + dTH(M.to) + '</span><b>' + nf(tgt) + '</b><small>ซิม · LM − ยอด 1–' + (+add(M.from, -1).slice(8)) + ' ' + TH[+M.month.slice(5, 7) - 1] + '</small></div>'
      + '<div class="mm-tile"><span>ขายแล้วในช่วงติดตาม</span><b>' + nf(win) + '</b><small>ซิม</small></div>'
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

  dash.draw('tb_mom_area', (el) => {
    const C = calc(); if (!C) { el.innerHTML = ''; return; }
    const m = new Map();
    for (const x of C.rows) { const a = m.get(x.area) || { area: x.area, n: 0, done: 0, lm: 0, tgt: 0, win: 0, rem: 0 }; a.n++; a.done += x.done ? 1 : 0; a.lm += x.lm; a.tgt += x.tgt; a.win += x.win; a.rem += x.rem; m.set(x.area, a); }
    const rows = [...m.values()].filter((a) => a.rem > 0).map((a) => ({ ...a, ach: a.tgt ? a.win / a.tgt : null }));   // only Areas still short
    PC.table(el, 'tb_mom_area', rows, { key: ['area'], def: 'rem', limit: 100, cols: [
      { f: 'area', label: 'Area', wrap: true }, { f: 'n', label: 'สาขา', num: true, fmt: PC.nf }, { f: 'done', label: 'MoM บวกแล้ว', num: true, fmt: PC.nf },
      { f: 'tgt', label: 'Target (Gap)', num: true, fmt: PC.nf }, { f: 'win', label: 'ขายช่วงติดตาม', num: true, fmt: PC.nf },
      { f: 'ach', label: '%ACH', num: true, pill: (d) => (d.ach == null ? ['mute', '–'] : [d.ach >= 1 ? 'ok' : d.ach < 0.5 ? 'bad' : 'mute', Math.round(d.ach * 100) + '%']) },
      { f: 'rem', label: 'ยังขาด', num: true, fmt: PC.nf }] });
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
      { f: 'tgt', label: 'TG ' + w + ' (Gap)', num: true, fmt: PC.nf },
      { f: 'tpd', label: 'TG ต่อวัน', num: true, fmt: f1 },
      { f: 'today', label: 'ขาย ' + td, num: true, fmt: PC.nf },
      { f: 'short', label: 'ขาด ' + td, num: true, pill: (d) => (d.short == null ? ['mute', '–'] : d.short > 0 ? ['bad', f1(d.short)] : ['ok', 'ครบ']) },
      { f: 'win', label: 'ขาย ' + w + ' (QTY)', num: true, fmt: PC.nf },
      { f: 'netw', label: 'Net Amount ' + w, num: true, fmt: PC.nf },
      { f: 'ach', label: '%ACH', num: true, pill: (d) => (d.ach == null ? ['mute', '–'] : [d.ach >= 1 ? 'ok' : d.ach < 0.5 ? 'bad' : 'mute', Math.round(d.ach * 100) + '%']) },
      { f: 'rem', label: 'TG คงเหลือ ' + w, num: true, pill: (d) => (d.rem ? ['bad', PC.nf(d.rem)] : ['ok', 'ครบ']) },
      { f: 'mom', label: '%MoM ตอนนี้', num: true, pill: (d) => (d.mom == null ? ['mute', '–'] : [d.mom >= 0 ? 'ok' : 'bad', (d.mom > 0 ? '+' : '') + Math.round(d.mom * 100) + '%']) },
      { f: 'stock', label: 'Stock (HQ)', num: true, fmt: (v) => (v == null ? '–' : PC.nf(v)) },
      { f: 'note', label: 'Remark', wrap: true }] });
  });

  if (!window.MOM_CSV_BOUND) { window.MOM_CSV_BOUND = true;
    document.addEventListener('click', (e) => {
      if (!(e.target.closest && e.target.closest('#mom-csv'))) return; const r = shopRows(); if (!r) return; const M = window.MOM2750;
      const last = calc().last, w = M.from + '..' + M.to;
      const H = ['Shop Code', 'Shop', 'Area', 'Type', 'TG ' + w + ' (Gap)', 'TG per day', 'Sold ' + last, 'Short ' + last, 'Sold ' + w + ' (QTY)', 'Net Amount ' + w, '%ACH', 'TG remaining ' + w, '%MoM now', 'Stock (HQ)', 'Remark'];
      const L = [H].concat(r.map((x) => [x.shop, x.name, x.area, x.stype, x.tgt, x.tpd.toFixed(1), x.today, x.short == null ? '' : x.short.toFixed(1), x.win, Math.round(x.netw), x.ach == null ? '' : Math.round(x.ach * 100) + '%', x.rem, x.mom == null ? '' : Math.round(x.mom * 100) + '%', x.stock ?? '', x.note || '']));
      const csv = '﻿' + L.map((x) => x.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'MoM2750_' + view + '_' + M.from + '_' + M.to + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    }); }
})();
