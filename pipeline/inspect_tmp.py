"""TEMPORARY: print the SCHEMA of a Drive file (column names, row count, safe category values). No personal data is printed."""
import os, re, sys, zipfile, io, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import drive_sync as ds, pandas as pd
SENS = re.compile(r'name|mobile|msisdn|phone|tel|card|address|cust|email|account|serial|imei|sim|ชื่อ|เบอร์|ที่อยู่|บัตร|ลูกค้า|id_?no|citizen|contact', re.I)
UN = {'80101067','80100621','80101117','80100486','80101263','80101281','80100750','80100754','80100849','80101013','80100858','80100792','80100798','80100804','80101655','80101661','80101670'}
s = ds.session(); folder = os.environ['DRIVE_FOLDER_ID'].strip()
f = next(x for x in ds.ls(s, folder) if x['name'].startswith(sys.argv[1]))
fp = ds.download(s, f, '/tmp/in'); print('file', f['name'], os.path.getsize(fp))
z = zipfile.ZipFile(fp); print('inside:', [(i.filename, i.file_size) for i in z.infolist()])
for inf in z.infolist():
    if inf.is_dir(): continue
    n = inf.filename.lower(); raw = z.open(inf)
    if n.endswith('.csv'):
        b = raw.read(); enc = 'utf-8-sig'
        try: b[:200000].decode('utf-8')
        except UnicodeDecodeError: enc = 'cp874'
        d = pd.read_csv(io.BytesIO(b), dtype=str, encoding=enc, low_memory=False)
    elif n.endswith(('.xlsx', '.xlsb', '.xls')):
        import openpyxl, time; t0 = time.time()
        z.extract(inf, '/tmp/x'); wb = openpyxl.load_workbook('/tmp/x/' + inf.filename, read_only=True)
        ws = wb['Rawdata']; print('Rawdata dims', ws.max_row, ws.max_column, 'open s', round(time.time() - t0))
        it = ws.iter_rows(values_only=True); hdr = [str(x) for x in next(it)]; rows = []
        for i, r in enumerate(it):
            rows.append(r)
            if i >= 20000: break
        d = pd.DataFrame(rows, columns=hdr).astype(str).replace({'None': None}); print('read s', round(time.time() - t0))
    else: continue
    print('==', inf.filename, 'rows', len(d), 'cols', len(d.columns))
    for c in d.columns:
        v = d[c].dropna(); nu = v.nunique(); sens = bool(SENS.search(str(c)))
        info = {'col': str(c), 'nonnull': int(len(v)), 'distinct': int(nu)}
        if not sens and nu <= 30:
            vals = v.value_counts().head(30)
            info['values'] = {str(k)[:40]: int(x) for k, x in vals.items() if not re.search(r'\d{7,}', str(k)) or len(str(k)) == 8}
        elif not sens:
            ex = v.iloc[0] if len(v) else ''
            info['shape'] = re.sub(r'[A-Za-zก-๙]', 'a', re.sub(r'\d', '9', str(ex)))[:30]
        print(json.dumps(info, ensure_ascii=False))
    for c in d.columns:
        hit = d[c].astype(str).str.strip().isin(UN).sum()
        if hit: print('UN shop codes found in column', c, int(hit), 'rows')
