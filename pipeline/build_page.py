"""Builds the stand-alone index.html (GitHub Pages) from pipeline/page.html + pipeline/out data, and out/page_doc.json for the Claude dashboard."""
import json,gzip,base64,sys,os,datetime
HERE=os.path.dirname(os.path.abspath(__file__)); O=HERE+'/out'; ROOT=os.path.dirname(HERE)
page_full=open(HERE+'/page.html',encoding='utf-8').read(); page=page_full.replace('<meta name="dash-one-writer">','',1)
raw={k:json.load(open(f'{O}/{k}.json',encoding='utf-8')) for k in ['matcodes','shops','staff','stock_by_shop','aging_serials','targets']}
raw['sales_daily_csv']=open(O+'/sales_daily.csv',encoding='utf-8').read()
blob=base64.b64encode(gzip.compress(json.dumps(raw,ensure_ascii=False,separators=(',',':')).encode('utf-8'),9)).decode()
d3=open(HERE+'/vendor/d3.min.js',encoding='utf-8').read()
pako=open(HERE+'/vendor/pako_inflate.min.js',encoding='utf-8').read()
last=max(l.split(',',1)[0] for l in raw['sales_daily_csv'].splitlines()[1:])
meta=json.load(open(O+'/meta.json'))
TH=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
y,m,d=map(int,last.split('-')); asof=f'{d} {TH[m-1]} {y+543}'
now=datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(hours=7)
built=f'{now.day} {TH[now.month-1]} {now.year+543} {now:%H:%M} น.'
html=f'''<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#f7f6f2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1c1b19" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Prepay Dashboard">
<title>Prepay Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600&family=Noto+Serif+Thai:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {{
  --font-anthropic-sans: "Noto Sans Thai", -apple-system, BlinkMacSystemFont, "Segoe UI", "Leelawadee UI", Tahoma, Roboto, sans-serif;
  --font-anthropic-serif: "Noto Serif Thai", Georgia, "Times New Roman", serif;
  --color-bg: #f7f6f2; --color-panel: #ffffff; --color-fg: #1f1e1c; --color-fg-muted: #6b6862; --color-border-line: #e3e0d8;
  --color-ok: #23864f; --color-warn: #b7791f; --color-bad: #c53b32;
  --cds-chart-grid: #ecebe6; --cds-chart-axis: #b9b6ae; --cds-chart-muted: #b9b6ae;
  --cds-surface-popover: #ffffff; --cds-border: #e3e0d8; --cds-text-secondary: #6b6862; --cds-shadow-popover: 0 4px 16px rgba(0,0,0,.12);
  --cds-font-size-caption: 12.5px; --cds-font-size-body: 14px; --cds-font-size-heading: 16px; --cds-font-size-title: 28px; --cds-font-weight-medium: 600;
  --cds-gap-xs: 4px; --cds-gap-sm: 8px; --cds-gap-md: 12px; --cds-gap-lg: 20px;
  --cds-pad-xs: 4px; --cds-pad-sm: 8px; --cds-pad-md: 12px; --cds-pad-lg: 16px; --cds-radius: 8px; --cds-dur-slow: .3s;
}}
@media (prefers-color-scheme: dark) {{ :root {{
  --color-bg: #1c1b19; --color-panel: #262522; --color-fg: #eeece6; --color-fg-muted: #a5a29a; --color-border-line: #3a3834;
  --color-ok: #4cc185; --color-warn: #e0a63e; --color-bad: #ef6b60;
  --cds-chart-grid: #33312d; --cds-chart-axis: #5a5751; --cds-chart-muted: #5a5751;
  --cds-surface-popover: #2f2d2a; --cds-border: #3a3834; --cds-text-secondary: #a5a29a; --cds-shadow-popover: 0 4px 16px rgba(0,0,0,.5);
}} }}
html {{ -webkit-text-size-adjust: 100%; }}
body {{ margin: 0; background: var(--color-bg); color: var(--color-fg); font-family: var(--font-anthropic-sans); }}
#dash-root {{ padding: 16px max(16px, env(safe-area-inset-right)) 32px max(16px, env(safe-area-inset-left)); }}
.sa-bar {{ max-width: 88rem; margin: 0 auto; padding: 10px max(16px, env(safe-area-inset-left)) 0; font-size: 12.5px; color: var(--color-fg-muted); display: flex; flex-wrap: wrap; gap: 4px 12px; }}
.sa-bar b {{ color: var(--color-fg); font-weight: 600; }}
.sa-load {{ max-width: 88rem; margin: 12px 16px; padding: 10px 14px; border-radius: 8px; background: var(--color-panel); border: 1px solid var(--color-border-line); font-size: 14px; }}
.dash-skeleton {{ opacity: .35; }}
[hidden] {{ display: none !important; }}
@media (max-width: 640px) {{ :root {{ --cds-font-size-title: 24px; }} }}
</style>
<script>{d3}</script>
<script>{pako}</script>
<script>
window.dash = (() => {{
  const DEF = {{ area: 'ALL', stype: 'ALL', group: 'ALL', shop: 'ALL', life: 365, period: 'today', metric: 'net', slevel: 'group', sstatus: 'ALL' }};
  let params = {{ ...DEF }}, ready = false, error = null;
  const RAW = {{}}, calcs = {{}}, cache = {{}}, draws = new Map(), onData = [];
  const get = (id) => {{
    if (id in cache) return cache[id];
    if (id in RAW) return (cache[id] = RAW[id]);
    const c = calcs[id]; if (!c) return undefined;
    const args = c.inputs.map((i) => {{ const v = get(i); if (v === undefined) throw new Error('missing ' + i); return v; }});
    return (cache[id] = c.fn(...args));
  }};
  const data = (id) => {{
    if (error) return {{ status: 'error', data: [], message: error, meta: [] }};
    if (!ready) return {{ status: 'loading', data: [], meta: [] }};
    try {{ const v = get(id); if (v === undefined) return {{ status: 'missing', data: [], meta: [] }};
      return {{ status: 'ok', data: v, columns: Array.isArray(v) && v[0] ? Object.keys(v[0]) : [], meta: [] }}; }}
    catch (e) {{ console.error('calc', id, e); return {{ status: 'error', data: [], message: String(e), meta: [] }}; }}
  }};
  const run = (name) => {{ const fn = draws.get(name); if (!fn) return; document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => {{ try {{ fn(el); }} catch (e) {{ console.error('draw', name, e); }} }}); }};
  const all = () => {{ for (const n of draws.keys()) run(n); onData.forEach((f) => {{ try {{ f(); }} catch (e) {{ console.error(e); }} }}); }};
  return {{
    calc: (id, c) => {{ calcs[id] = c; }},
    loader: () => {{}},
    data,
    colors: ['#3b7dd8', '#d9822b', '#2f9e75', '#8a63c9', '#c9487a', '#a8901f', '#3d9fb3', '#8a8780'],
    draw: (name, fn) => {{ if (fn) {{ draws.set(name, fn); if (ready || error) run(name); }} else run(name); }},
    onData: (fn) => {{ onData.push(fn); try {{ fn(); }} catch (e) {{}} }},
    params: () => ({{ ...params }}),
    setParams: (o) => {{ params = {{ ...params, ...o }}; all(); }},
    resetParams: () => {{ params = {{ ...DEF }}; all(); }},
    setLink: (n) => {{ try {{ history.replaceState(null, '', '#' + n); }} catch (e) {{}} }},
    refresh: () => {{}},
    _load: (raw) => {{ Object.assign(RAW, raw); ready = true; all(); }},
    _fail: (m) => {{ error = m; all(); }},
  }};
}})();
</script>
</head>
<body>
<div class="sa-bar"><span>ข้อมูลยอดขายถึง <b>{asof}</b></span><span>ยอดขายถึง {meta.get('sales_asof','')[11:]} น. · Stock ณ {meta.get('stock_asof','')}</span><span>ไฟล์สร้างเมื่อ {built}</span><span>ไฟล์นี้เป็นข้อมูล ณ วันที่สร้าง ไม่อัปเดตเอง</span></div>
<div class="sa-load" id="sa-load">กำลังเตรียมข้อมูล…</div>
<div id="dash-root">
{page}
</div>
<script id="pc-data" type="application/octet-stream">{blob}</script>
<script>
setTimeout(() => {{
  const box = document.getElementById('sa-load');
  try {{
    const b64 = document.getElementById('pc-data').textContent.trim();
    const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const raw = JSON.parse(pako.inflate(u8, {{ to: 'string' }}));
    raw.sales_daily = d3.csvParse(raw.sales_daily_csv); delete raw.sales_daily_csv;
    dash._load(raw); box.remove();
  }} catch (e) {{ console.error(e); box.textContent = 'โหลดข้อมูลไม่สำเร็จ: ' + e.message; dash._fail(String(e)); }}
}}, 30);
</script>
</body>
</html>'''
fn=ROOT+'/index.html'
open(fn,'w',encoding='utf-8').write(html)
json.dump({'text':page_full},open(O+'/page_doc.json','w'),ensure_ascii=False)
print(fn, os.path.getsize(fn))
