"""Manual analysis (workflow 'Inspect Drive file' with prefix ANALYZE_ALLPROD): column list per sheet of the newest
All Product Rawdata file + value counts (Upper North shops, QTY) of low-cardinality columns. No personal data printed."""
import os, re, sys, collections, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import drive_sync as ds, openpyxl
UN = {l.split(',')[1] for l in open(os.path.join(os.path.dirname(__file__), 'state', 'perf_targets.csv')).read().splitlines()[1:]}
SENS = re.compile(r'name|mobile|msisdn|phone|tel|card|address|cust|email|account|serial|imei|sim_no|_id$|^id|ชื่อ|ที่อยู่|บัตร|citizen|contact|ba_?no|ca_?no', re.I)
s = ds.session(); inbox = os.environ['DRIVE_FOLDER_ID'].strip(); done = ds.subfolder(s, inbox, 'Done'); files = ds.ls(s, inbox) + ds.ls(s, done)
f = sorted([x for x in files if 'all product' in x['name'].lower() and 'raw' in x['name'].lower()], key=lambda x: x['createdTime'])[-1]
fp = ds.download(s, f, '/tmp/a/' + f['id']); print('#####', f['name'])
if fp.lower().endswith('.zip'):
    z = zipfile.ZipFile(fp); n = [x for x in z.namelist() if x.lower().endswith(('.xlsx', '.xlsm'))][0]; z.extract(n, '/tmp/a/x'); fp = '/tmp/a/x/' + n
wb = openpyxl.load_workbook(fp, read_only=True)
for ws in wb.worksheets:
    if ws.title.upper() == 'PREPAID': continue
    it = ws.iter_rows(values_only=True); h = [str(x).strip() for x in next(it)]; print('\n===== sheet', ws.title, '| columns:', h)
    if 'SHOP_CODE' not in h: continue
    ix = h.index('SHOP_CODE'); iq = h.index('QTY') if 'QTY' in h else None
    cnt = collections.defaultdict(collections.Counter)
    for r in it:
        if str(r[ix] or '').strip() not in UN: continue
        for j, c in enumerate(h):
            if SENS.search(c): continue
            cnt[c][str(r[j])[:50]] += float(r[iq] or 0) if iq is not None else 1
    for c in h:
        v = cnt.get(c)
        if not v: continue
        if len(v) <= 40: print(f'  {c} ({len(v)}):', dict(v.most_common(40)))
        else: print(f'  {c}: {len(v)} distinct, e.g.', [k for k, _ in v.most_common(3) if not re.search(r'\d{8,}', k)])
