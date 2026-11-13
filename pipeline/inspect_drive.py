"""Manual tool (workflow "Inspect Drive file"): print the STRUCTURE of files in the Drive inbox, for adding a new report type.
Prints column names, row counts and values of low-cardinality, non-personal columns only. Never prints names, phone numbers or IDs.
Usage: python pipeline/inspect_drive.py <file name prefix> [...]
"""
import io, json, os, re, sys, time, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import drive_sync as ds, pandas as pd

SENS = re.compile(r'name|mobile|msisdn|phone|tel|card|address|cust|email|account|serial|imei|sim_no|ชื่อ|เบอร์|ที่อยู่|บัตร|ลูกค้า|id_?no|citizen|contact|ba_?no|ca_?no', re.I)
UN = {'80101067', '80100621', '80101117', '80100486', '80101263', '80101281', '80100750', '80100754', '80100849', '80101013', '80100858',
      '80100792', '80100798', '80100804', '80101655', '80101661', '80101670'}

def frame(path, name):
    n = name.lower()
    if n.endswith('.csv'):
        b = open(path, 'rb').read(); enc = 'utf-8-sig'
        try: b[:200000].decode('utf-8')
        except UnicodeDecodeError: enc = 'cp874'
        return pd.read_csv(io.BytesIO(b), dtype=str, encoding=enc, low_memory=False, nrows=20000)
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True); print('sheets', wb.sheetnames)
    ws = wb['Rawdata'] if 'Rawdata' in wb.sheetnames else wb.worksheets[-1]; print('using sheet', ws.title, 'dims', ws.max_row, ws.max_column)
    it = ws.iter_rows(values_only=True); hdr = [str(x) for x in next(it)]; rows = []
    for i, r in enumerate(it):
        rows.append(r)
        if i >= 20000: break
    return pd.DataFrame(rows, columns=hdr).astype(str).replace({'None': None})

def describe(d):
    print('rows read', len(d), 'cols', len(d.columns))
    for c in d.columns:
        v = d[c].dropna(); nu = v.nunique(); info = {'col': str(c), 'nonnull': int(len(v)), 'distinct': int(nu)}
        if not SENS.search(str(c)):
            if nu <= 30: info['values'] = {str(k)[:40]: int(x) for k, x in v.value_counts().head(30).items() if not re.search(r'\d{9,}', str(k))}
            elif len(v): info['shape'] = re.sub(r'[A-Za-zก-๙]', 'a', re.sub(r'\d', '9', str(v.iloc[0])))[:30]
        print(json.dumps(info, ensure_ascii=False))
    if os.environ.get('SHOW_AREA') and len(d) < 5000:  # shop-level KPI files without a shop code: rows of one area
        m = d.apply(lambda col: col.astype(str).str.contains(os.environ['SHOW_AREA'], regex=False)).any(axis=1)
        if m.any(): print(d[m][[x for x in d.columns if not SENS.search(str(x)) or str(x) == 'Shop']].to_string(max_colwidth=40))
    for c in d.columns:
        hit = int(d[c].astype(str).str.strip().isin(UN).sum())
        if hit: print('UN shop codes found in column', c, hit, 'rows')
        if hit and os.environ.get('SHOW_UN') and len(d) < 5000:  # shop-level KPI files only (no personal columns are printed)
            cols = [x for x in d.columns if not SENS.search(str(x))]
            print(d[d[c].astype(str).str.strip().isin(UN)][cols].to_string(max_colwidth=28))

if sys.argv[1:] == ['ANALYZE_TVS']:
    import runpy; runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'analyze_tvs.py')); sys.exit(0)
s = ds.session(); folder = os.environ['DRIVE_FOLDER_ID'].strip(); files = ds.ls(s, folder)
for pref in sys.argv[1:]:
    f = next((x for x in files if x['name'].lower().startswith(pref.lower().strip())), None)
    if not f: print('NOT FOUND', pref); continue
    t0 = time.time(); fp = ds.download(s, f, '/tmp/in/' + f['id']); print('\n#####', f['name'], os.path.getsize(fp))
    if fp.lower().endswith('.zip'):
        z = zipfile.ZipFile(fp); print('inside:', [(i.filename, i.file_size) for i in z.infolist()])
        for inf in z.infolist():
            if inf.is_dir() or not inf.filename.lower().endswith(('.csv', '.xlsx', '.xlsm')): continue
            z.extract(inf, '/tmp/x'); describe(frame('/tmp/x/' + inf.filename, inf.filename))
    else: describe(frame(fp, f['name']))
    print('seconds', round(time.time() - t0))
