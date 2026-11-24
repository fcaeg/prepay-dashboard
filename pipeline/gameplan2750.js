/* Gameplan ปิดเดือน พ.ย. ซิมรายปี 2,750 (24–30 พ.ย. 2569): 38 สาขาที่ RR ไม่ถึงยอด ต.ค. ทำได้เท่ายอด ต.ค. รับรางวัลตามกลุ่ม
   กลุ่มกำหนดจากซิมที่ต้องทำเพิ่ม ณ ปิดวัน 23 พ.ย. (A > 30 = 2,000 · B 16–30 = 1,000 · C 1–15 = 500 บาท) · นับ Matcode 3000122199 + 3000143085
   ยอด พ.ย. คิดสดจาก sales_daily (TSM) */
window.GAMEPLAN2750 = {"from":"2026-11-24","to":"2026-11-30","month":"2026-11","asof_base":"2026-11-23","mats":["3000122199","3000143085"],"reward":{"A":2000,"B":1000,"C":500},"shops":[{"c":"80100925","n":"True Shop Fashion Island","area":"BMA III - North East","oct":69,"base":25,"grp":"A"},{"c":"80101707","n":"True Shop Future Park Rangsit (2 nd.) (D)","area":"BMA III - North East","oct":44,"base":9,"grp":"A"},{"c":"80101698","n":"True Shop Central West Gate (D)","area":"BMA I - North West","oct":41,"base":16,"grp":"B"},{"c":"80100565","n":"True Shop Central Rama 2","area":"BMA II - South West","oct":72,"base":48,"grp":"B"},{"c":"80101068","n":"True Shop Central Rama 3","area":"BMA V - Central","oct":32,"base":12,"grp":"B"},{"c":"80100626","n":"True Shop Central Pinklao 3Fl.","area":"BMA II - South West","oct":31,"base":12,"grp":"B"},{"c":"80101071","n":"True Shop Seacon Square 2","area":"BMA IV - South East","oct":55,"base":36,"grp":"B"},{"c":"80101185","n":"True Shop Central West Gate","area":"BMA I - North West","oct":40,"base":22,"grp":"B"},{"c":"80101186","n":"True Shop Central Festival East Ville","area":"BMA V - Central","oct":33,"base":16,"grp":"B"},{"c":"80100622","n":"True Shop Central Rama 9 4Fl.","area":"BMA V - Central","oct":40,"base":28,"grp":"C"},{"c":"80100480","n":"True Shop The Mall Ngamwongwan 6Fl.","area":"BMA I - North West","oct":38,"base":25,"grp":"C"},{"c":"80101349","n":"True Shop Silom Complex","area":"BMA V - Central","oct":19,"base":9,"grp":"C"},{"c":"80100566","n":"True Shop Central Rama 2 (H)","area":"BMA II - South West","oct":24,"base":15,"grp":"C"},{"c":"80101709","n":"True Shop Mega Bangna (D)","area":"BMA IV - South East","oct":23,"base":14,"grp":"C"},{"c":"80100483","n":"True Shop The Mall Thapra","area":"BMA II - South West","oct":29,"base":20,"grp":"C"},{"c":"80101418","n":"True Shop Imperial World Samrong","area":"BMA IV - South East","oct":21,"base":14,"grp":"C"},{"c":"80101066","n":"True Shop Central Bangna","area":"BMA IV - South East","oct":14,"base":9,"grp":"C"},{"c":"80100623","n":"True Shop Central Rama 9","area":"BMA V - Central","oct":15,"base":10,"grp":"C"},{"c":"80101306","n":"True Shop Robinson Mae Sot","area":"UPC - Lower North","oct":42,"base":19,"grp":"B"},{"c":"80100487","n":"True Shop The Mall Nakhonratchasima 3Fl.","area":"UPC - Lower Northeast","oct":26,"base":11,"grp":"C"},{"c":"80100621","n":"True Shop Central Chiangrai","area":"UPC - Upper North","oct":25,"base":11,"grp":"C"},{"c":"80101196","n":"True Shop Central Plaza Udonthani","area":"UPC - Upper Northeast","oct":37,"base":24,"grp":"C"},{"c":"80101198","n":"True Shop Central Phitsanulok","area":"UPC - Lower North","oct":22,"base":11,"grp":"C"},{"c":"80101697","n":"True Shop Central Udon Thani (D)","area":"UPC - Upper Northeast","oct":14,"base":10,"grp":"C"},{"c":"80100782","n":"True Shop Lotus's Thaluang Phichit","area":"UPC - Lower North","oct":14,"base":9,"grp":"C"},{"c":"80101119","n":"True Shop Central Plaza Nakhonratchasima","area":"UPC - Lower Northeast","oct":12,"base":8,"grp":"C"},{"c":"80100858","n":"True Shop Mini Mae Sai ChiangRai","area":"UPC - Upper North","oct":12,"base":9,"grp":"C"},{"c":"80100476","n":"True Shop Central Festival Phuket","area":"UPC - Upper South","oct":116,"base":76,"grp":"A"},{"c":"80100926","n":"True Shop Ayudhaya Park","area":"UPC - Central","oct":35,"base":15,"grp":"B"},{"c":"80101699","n":"True Shop Central Festival Hat Yai (D)","area":"UPC - Lower South","oct":27,"base":12,"grp":"C"},{"c":"80101700","n":"True Shop Central Festival Pattaya (D)","area":"UPC - East","oct":31,"base":16,"grp":"C"},{"c":"80101629","n":"True Shop Central Nakhonpathom","area":"UPC - West","oct":34,"base":19,"grp":"C"},{"c":"80100840","n":"True Shop Central Plaza Mahachai","area":"UPC - West","oct":35,"base":22,"grp":"C"},{"c":"80101692","n":"True Shop Central Nakorn Sithammarat (D)","area":"UPC - Lower South","oct":21,"base":10,"grp":"C"},{"c":"80101222","n":"True Shop Central Festival Hadyai Songkhla","area":"UPC - Lower South","oct":23,"base":14,"grp":"C"},{"c":"80100838","n":"True Shop Central Festival Samui Suratthani","area":"UPC - Upper South","oct":21,"base":13,"grp":"C"},{"c":"80101378","n":"True Shop South Pattaya","area":"UPC - East","oct":15,"base":10,"grp":"C"},{"c":"80101214","n":"True Shop Central Plaza Salaya","area":"UPC - West","oct":22,"base":17,"grp":"C"}]};
(() => {
  const GP = window.GAMEPLAN2750;
  const css = `
.gp-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 4px 0 12px; }
.gp-tile { background: var(--color-panel); border: 1px solid var(--color-border-line); border-radius: var(--cds-radius); padding: 10px 14px; }
.gp-tile span { display: block; font-size: 12px; color: var(--color-fg-muted); }
.gp-tile b { display: block; font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1.3; }
.gp-tile small { font-size: 12px; color: var(--color-fg-muted); }
.gp-grp { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 12px; }
.gp-g { border: 1px solid var(--color-border-line); border-radius: var(--cds-radius); padding: 10px 14px; background: var(--color-panel); }
.gp-g h4 { margin: 0 0 2px; font-size: 15px; } .gp-g h4 em { font-style: normal; font-weight: 400; font-size: 12px; color: var(--color-fg-muted); margin-left: 6px; }
.gp-g .r { display: flex; justify-content: space-between; font-size: 13px; font-variant-numeric: tabular-nums; } .gp-g .r span { color: var(--color-fg-muted); }
.gp-bar { height: 8px; background: var(--color-border-line); border-radius: 4px; overflow: hidden; margin: 6px 0; } .gp-bar i { display: block; height: 100%; background: #2e9e5b; }
.gp-A { color: #c8102e; } .gp-B { color: #d97706; }
@media (max-width: 640px) { .gp-tiles { grid-template-columns: 1fr 1fr; gap: 8px; } .gp-tile b { font-size: 20px; } }
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const nf = (v) => Math.round(v || 0).toLocaleString('en-US');
  const TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const dTH = (s) => (s ? (+s.slice(8, 10)) + ' ' + TH[+s.slice(5, 7) - 1] : '–');
  const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
  const areaName = (a) => String(a || '').replace(/^UPC - /, '').replace(/^(BMA [IV]+) - /, '$1 ');
  let view = 'all';
  const calc = () => {
    if (!window.PC) return null;
    const p = PC.P(), shops = PC.rows('shops') || [], sales = PC.rows('sales_daily') || [];
    const sm = new Map(shops.map((r) => [String(r.shop), r])); const mats = new Set(GP.mats);
    const rows = new Map();
    for (const s of GP.shops) { const x = sm.get(s.c) || {}; const area = x.area || s.area, stype = x.stype || '';
      if (p.shop !== 'ALL' ? s.c !== String(p.shop) : !(window.PCin(area, p.area) && (p.stype === 'ALL' || stype === p.stype))) continue;
      rows.set(s.c, { shop: s.c, name: x.name || s.n, area, areaN: areaName(area), grp: s.grp, rw: GP.reward[s.grp], oct: s.oct, pre: 0, nov: 0, win: 0, today: 0 }); }
    let last = ''; for (const r of sales) { const d = String(r.date); if (d.slice(0, 7) === GP.month && d > last) last = d; }
    for (const r of sales) { const d = String(r.date); if (d.slice(0, 7) !== GP.month || !mats.has(String(r.matcode))) continue; const x = rows.get(String(r.shop)); if (!x) continue;
      const u = +r.units || 0; x.nov += u; if (d < GP.from) x.pre += u; else if (d <= GP.to) x.win += u; if (d === last) x.today += u; }
    const left = last < GP.from ? days(GP.from, GP.to) + 1 : Math.max(1, days(last, GP.to) + 1);
    const out = [...rows.values()].map((x) => { const rem = Math.max(0, x.oct - x.nov); return { ...x, rem, done: rem === 0, pd: rem / left, pct: x.oct ? x.nov / x.oct : 0, earn: rem === 0 ? x.rw : 0 }; });
    return { rows: out, last, left };
  };
  window.GP_CALC = calc;
  dash.draw('gp_head', (el) => {
    const C = calc(); if (!C) { el.innerHTML = ''; return; } const R = C.rows, S = (f) => R.reduce((a, x) => a + f(x), 0);
    const done = R.filter((x) => x.done).length, win = S((x) => x.win), rem = S((x) => x.rem), earn = S((x) => x.earn), oct = S((x) => x.oct), nov = S((x) => x.nov);
    el.innerHTML = '<p class="pc-take">ช่วง Gameplan ' + dTH(GP.from) + ' – ' + dTH(GP.to) + ' · ยอดขาย TSM ถึง ' + dTH(C.last) + ' · เหลือ ' + C.left + ' วัน · นับ Matcode 3000122199 + 3000143085</p>'
      + '<div class="gp-tiles">'
      + '<div class="gp-tile"><span>สาขาที่ทำได้เท่ายอด ต.ค. แล้ว</span><b class="' + (done ? 'mm-ok' : '') + '">' + done + ' / ' + R.length + '</b><small>สาขา</small></div>'
      + '<div class="gp-tile"><span>ยอด พ.ย. รวม vs เป้า ต.ค.</span><b>' + nf(nov) + ' <small>/ ' + nf(oct) + '</small></b><small>' + (oct ? Math.round(100 * nov / oct) : 0) + '%</small><div class="gp-bar"><i style="width:' + Math.min(100, oct ? 100 * nov / oct : 0) + '%"></i></div></div>'
      + '<div class="gp-tile"><span>ขายแล้วช่วง Gameplan</span><b>' + nf(win) + '</b><small>ซิม · ' + dTH(C.last) + ' ' + nf(S((x) => x.today)) + ' ซิม</small></div>'
      + '<div class="gp-tile"><span>ยังขาดอีก (สาขาที่ยังไม่ถึง)</span><b class="' + (rem ? 'mm-bad' : 'mm-ok') + '">' + nf(rem) + '</b><small>ซิม · เฉลี่ย ' + (rem / C.left).toFixed(1) + ' ซิม/วัน</small></div>'
      + '<div class="gp-tile"><span>รางวัลที่ได้แล้ว</span><b>฿' + nf(earn) + '</b><small>จาก ' + done + ' สาขา</small></div></div>'
      + '<div class="gp-grp">' + ['A', 'B', 'C'].map((g) => { const r = R.filter((x) => x.grp === g); const n = r.length, d = r.filter((x) => x.done).length, rm = r.reduce((a, x) => a + x.rem, 0), w = r.reduce((a, x) => a + x.win, 0);
        return '<div class="gp-g"><h4 class="gp-' + g + '">กลุ่ม ' + g + '<em>' + (g === 'A' ? '> 30 ซิม · ฿2,000' : g === 'B' ? '16–30 ซิม · ฿1,000' : '1–15 ซิม · ฿500') + '</em></h4><div class="gp-bar"><i style="width:' + (n ? 100 * d / n : 0) + '%"></i></div>'
          + '<div class="r"><span>ผ่านแล้ว</span><b>' + d + ' / ' + n + ' สาขา</b></div><div class="r"><span>ขายช่วง Gameplan</span><b>' + nf(w) + '</b></div><div class="r"><span>ยังขาด</span><b>' + nf(rm) + ' ซิม</b></div></div>'; }).join('') + '</div>';
  });
  dash.draw('gp_seg', (el) => {
    el.innerHTML = [['all', 'ทุกสาขา'], ['gap', 'ยังไม่ถึง'], ['done', 'ทำได้แล้ว']].map(([k, l]) => '<button type="button" data-v="' + k + '" aria-pressed="' + (view === k) + '">' + l + '</button>').join('');
    el.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; view = b.dataset.v; dash.draw('gp_seg'); dash.draw('tb_gp'); };
  });
  const gpRows = () => { const C = calc(); if (!C) return null; return C.rows.filter((x) => (view === 'gap' ? !x.done : view === 'done' ? x.done : true)).map((x) => ({ ...x, gk: x.grp + String(1000 - x.rem).padStart(4, '0') })); };
  dash.draw('tb_gp', (el) => {
    const r = gpRows(); if (!r) { el.innerHTML = ''; return; } const C = calc(), td = dTH(C.last);
    PC.table(el, 'tb_gp', r, { key: ['shop'], def: 'gk', dir: 1, limit: 100, q: 'gp', cols: [
      { f: 'grp', label: 'กลุ่ม', pill: (d) => [d.grp === 'A' ? 'bad' : d.grp === 'B' ? 'warn' : 'mute', d.grp] },
      { f: 'name', label: 'สาขา', wrap: true }, { f: 'areaN', label: 'Area' },
      { f: 'oct', label: 'เป้า (ยอด ต.ค.)', num: true, fmt: PC.nf }, { f: 'pre', label: 'ยอด 1–23 พ.ย.', num: true, fmt: PC.nf },
      { f: 'win', label: 'ขาย 24–30 พ.ย.', num: true, fmt: PC.nf }, { f: 'today', label: 'ขาย ' + td, num: true, fmt: PC.nf },
      { f: 'nov', label: 'ยอด พ.ย. รวม', num: true, fmt: PC.nf }, { f: 'pct', label: '% ของเป้า', num: true, pill: (d) => [d.pct >= 1 ? 'ok' : d.pct >= 0.8 ? 'mute' : 'bad', Math.round(d.pct * 100) + '%'] },
      { f: 'rem', label: 'ยังขาด', num: true, pill: (d) => (d.rem ? ['bad', PC.nf(d.rem)] : ['ok', 'ครบ']) },
      { f: 'pd', label: 'ต้องขาย/วัน', num: true, fmt: (v) => (v ? v.toFixed(1) : '–') },
      { f: 'earn', label: 'รางวัล', num: true, pill: (d) => (d.done ? ['ok', '฿' + PC.nf(d.rw)] : ['mute', '฿' + PC.nf(d.rw)]) }] });
  });
  // PNG: tiles + groups + shop table (current filter / view)
  const gpPNG = async () => {
    try { await document.fonts.ready; } catch (e) {}
    const C = calc(), r = gpRows().sort((a, b) => a.gk.localeCompare(b.gk)), K = RKX.C, rr = RKX.rr, fit = RKX.fit, td = dTH(C.last);
    const cols = [['กลุ่ม', 70, 'c'], ['สาขา', 330, 'l'], ['Area', 200, 'l'], ['เป้า (ต.ค.)', 110], ['ยอด พ.ย. รวม', 130], ['ขาย 24–30', 110], ['ขาย ' + td, 110], ['% เป้า', 100], ['ยังขาด', 100], ['ต้องขาย/วัน', 120], ['รางวัล', 110]];
    const W = 48 + cols.reduce((a, c) => a + c[1], 0), RH = 40, top = 430, H = top + RH * (r.length + 1) + 60, sc = 2;
    const cv = document.createElement('canvas'); cv.width = W * sc; cv.height = H * sc; const g = cv.getContext('2d'); g.scale(sc, sc);
    const F = (wt, z) => wt + ' ' + z + 'px "Noto Sans Thai", "IBM Plex Sans Thai", system-ui, sans-serif';
    g.fillStyle = K.bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#c8102e'; g.font = F(700, 30); g.fillText('ติดตาม Gameplan ปิดเดือน พ.ย. · ซิมรายปี 2,750', 24, 50);
    g.fillStyle = K.mu; g.font = F(400, 17); g.fillText('ช่วง ' + dTH(GP.from) + ' – ' + dTH(GP.to) + ' · ยอดขาย TSM ถึง ' + td + ' · เหลือ ' + C.left + ' วัน · ทำยอด พ.ย. ≥ ยอด ต.ค. รับรางวัลตามกลุ่ม · ' + ({ all: 'ทุกสาขา', gap: 'สาขาที่ยังไม่ถึง', done: 'สาขาที่ทำได้แล้ว' })[view] + ' ' + r.length + ' สาขา', 24, 80);
    const R = C.rows, S = (f) => R.reduce((a, x) => a + f(x), 0), oct = S((x) => x.oct), nov = S((x) => x.nov), done = R.filter((x) => x.done).length;
    const tiles = [['ทำได้แล้ว', done + ' / ' + R.length, 'สาขา', done ? K.ok : K.fg], ['ยอด พ.ย. vs เป้า ต.ค.', nf(nov) + ' / ' + nf(oct), Math.round(100 * nov / (oct || 1)) + '%', K.fg], ['ขายช่วง Gameplan', nf(S((x) => x.win)), td + ' ' + nf(S((x) => x.today)) + ' ซิม', K.fg], ['ยังขาดอีก', nf(S((x) => x.rem)), 'เฉลี่ย ' + (S((x) => x.rem) / C.left).toFixed(1) + ' ซิม/วัน', K.bad], ['รางวัลที่ได้แล้ว', '฿' + nf(S((x) => x.earn)), 'จาก ' + done + ' สาขา', K.fg]];
    const tw = (W - 48 - 4 * 16) / 5;
    tiles.forEach(([l, v, sub, c], i) => { const x = 24 + i * (tw + 16), y = 100; g.fillStyle = '#ffffff'; rr(g, x, y, tw, 110, 12); g.fill(); g.strokeStyle = K.line; g.lineWidth = 1.5; rr(g, x, y, tw, 110, 12); g.stroke();
      g.fillStyle = K.mu; g.font = F(400, 15); g.fillText(l, x + 16, y + 28); g.fillStyle = c; g.font = F(700, 32); g.fillText(fit(g, v, tw - 30), x + 16, y + 68); g.fillStyle = K.mu; g.font = F(400, 14); g.fillText(sub, x + 16, y + 94); });
    const gw = (W - 48 - 2 * 16) / 3, gc = { A: '#c8102e', B: '#d97706', C: K.fg }, gl = { A: '> 30 ซิม · ฿2,000', B: '16–30 ซิม · ฿1,000', C: '1–15 ซิม · ฿500' };
    ['A', 'B', 'C'].forEach((k, i) => { const x = 24 + i * (gw + 16), y = 228, rs = R.filter((q) => q.grp === k), n = rs.length, d = rs.filter((q) => q.done).length;
      g.fillStyle = '#ffffff'; rr(g, x, y, gw, 140, 12); g.fill(); g.strokeStyle = K.line; rr(g, x, y, gw, 140, 12); g.stroke();
      g.fillStyle = gc[k]; g.font = F(700, 20); g.fillText('กลุ่ม ' + k, x + 16, y + 30); g.fillStyle = K.mu; g.font = F(400, 14); g.fillText(gl[k], x + 100, y + 30);
      g.fillStyle = K.grid; rr(g, x + 16, y + 46, gw - 32, 10, 5); g.fill(); if (d) { g.fillStyle = K.ok; rr(g, x + 16, y + 46, Math.max(10, (gw - 32) * d / n), 10, 5); g.fill(); }
      [['ผ่านแล้ว', d + ' / ' + n + ' สาขา'], ['ขายช่วง Gameplan', nf(rs.reduce((a, q) => a + q.win, 0))], ['ยังขาด', nf(rs.reduce((a, q) => a + q.rem, 0)) + ' ซิม']].forEach(([l, v], j) => {
        g.fillStyle = K.mu; g.font = F(400, 14); g.fillText(l, x + 16, y + 80 + j * 22); g.fillStyle = K.fg; g.font = F(700, 14); g.textAlign = 'right'; g.fillText(v, x + gw - 16, y + 80 + j * 22); g.textAlign = 'left'; }); });
    let y = top; g.fillStyle = '#c8102e'; g.fillRect(24, y - RH + 6, W - 48, RH);
    const cell = (txt, i, yy, o = {}) => { let x = 24; for (let k = 0; k < i; k++) x += cols[k][1]; const c = cols[i]; g.font = F(o.b ? 700 : o.h ? 600 : 400, o.h ? 14 : 15);
      g.fillStyle = o.c || (o.h ? '#ffffff' : K.fg); g.textAlign = c[2] === 'l' ? 'left' : c[2] === 'c' ? 'center' : 'right';
      g.fillText(c[2] === 'l' ? fit(g, txt, c[1] - 16) : txt, c[2] === 'l' ? x + 8 : c[2] === 'c' ? x + c[1] / 2 : x + c[1] - 10, yy); g.textAlign = 'left'; };
    cols.forEach((c, i) => cell(c[0], i, y - 8, { h: 1 })); y += 6;
    r.forEach((q, n) => { if (n % 2) { g.fillStyle = '#f7f8fa'; g.fillRect(24, y, W - 48, RH); }
      const yy = y + RH / 2 + 6; cell(q.grp, 0, yy, { b: 1, c: gc[q.grp] }); cell(q.name.replace(/^True Shop /, ''), 1, yy); cell(q.areaN, 2, yy); cell(nf(q.oct), 3, yy); cell(nf(q.nov), 4, yy, { b: 1 });
      cell(nf(q.win), 5, yy); cell(nf(q.today), 6, yy); cell(Math.round(q.pct * 100) + '%', 7, yy, { c: q.pct >= 1 ? K.ok : K.bad }); cell(q.rem ? nf(q.rem) : 'ครบ', 8, yy, { b: 1, c: q.rem ? K.bad : K.ok });
      cell(q.rem ? q.pd.toFixed(1) : '–', 9, yy); cell('฿' + nf(q.rw), 10, yy, { b: q.done, c: q.done ? K.ok : K.mu });
      g.strokeStyle = K.line; g.lineWidth = 1; g.beginPath(); g.moveTo(24, y + RH); g.lineTo(W - 24, y + RH); g.stroke(); y += RH; });
    g.fillStyle = K.mu; g.font = F(400, 13); g.fillText('กลุ่มกำหนด ณ ปิดวัน 23 พ.ย. (เป้า ต.ค. − ยอด 1–23 พ.ย.) · ได้รางวัลเมื่อยอดทั้งเดือน พ.ย. ≥ ยอด ต.ค. · Matcode 3000122199 + 3000143085 · Prepay Dashboard', 24, H - 22);
    return { cv, name: 'Gameplan_SIM2750_' + (C.last || '') + '.png' };
  };
  if (!window.GP_PNG_BOUND) { window.GP_PNG_BOUND = true;
    document.addEventListener('click', async (e) => { const b = e.target.closest && e.target.closest('#gp-png'); if (!b) return; const t = b.textContent; b.disabled = true; b.textContent = 'กำลังสร้างรูป…';
      try { const { cv, name } = await gpPNG(); RKX.show(cv, name); } catch (err) { console.error(err); } finally { b.disabled = false; b.textContent = t; } }); }
  if (!window.GP_CSV_BOUND) { window.GP_CSV_BOUND = true;
    document.addEventListener('click', (e) => { if (!(e.target.closest && e.target.closest('#gp-csv'))) return; const r = gpRows(); if (!r) return; const C = calc();
      const H = ['กลุ่ม', 'รหัส', 'สาขา', 'Area', 'เป้า (ยอด ต.ค.)', 'ยอด 1–23 พ.ย.', 'ขาย 24–30 พ.ย.', 'ขาย ' + C.last, 'ยอด พ.ย. รวม', '% ของเป้า', 'ยังขาด', 'ต้องขาย/วัน', 'สถานะ', 'รางวัล (฿)'];
      const L = [H].concat(r.sort((a, b) => a.gk.localeCompare(b.gk)).map((x) => [x.grp, x.shop, x.name, x.areaN, x.oct, x.pre, x.win, x.today, x.nov, Math.round(x.pct * 100) + '%', x.rem, x.pd.toFixed(1), x.done ? 'ทำได้แล้ว' : 'ยังไม่ถึง', x.rw]));
      const csv = '﻿' + L.map((x) => x.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'Gameplan_SIM2750_' + (C.last || '') + '.csv'; document.body.appendChild(a); a.click(); a.remove(); }); }
})();
