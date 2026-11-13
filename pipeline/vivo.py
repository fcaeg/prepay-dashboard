"""Vivo Dashboard pipeline (shares the Prepay inputs: daily_sales + stock_balance_report).

Called from update.py:
  add_sales(raw)        every sales file -> state/vivo_sales_<YYYY-MM>.csv.gz (H/S,VIVO rows, de-duplicated like SIM rows)
  set_stock(st, asof)   every stock file -> state/vivo_stock.csv.gz (H/S,VIVO serials, replaces the snapshot)
  merge_target(xlsx)    'VIVO Target*.xlsx' (sheet TARGET_FOR_OPERATION) -> state/vivo_targets.csv (replaces that month)
  merge_pc(xlsx)        '* PC Brand Update*.xlsx' (newest 'PC <Mon> <yy>' sheet, column VIVO) -> state/vivo_pc.csv
  build()               -> out/vivo_data.json ; pipeline/vivo_page.py makes vivo/index.html
Week portions per month: state/vivo_portions.json {"2026-10": [30, 23, 21, 26]}; a month that is missing
uses the share of days (8-7-7-8 / 8-7-7-9).
"""
import glob, hashlib, json, os, re
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ST = os.path.join(HERE, 'state'); OUT = os.path.join(HERE, 'out')
DEDUP = ['SHOP_CODE', 'ORDER_ID', 'BILL_NO', 'PRODUCT_CODE', 'SERIAL', 'ORDER_STATUS', 'NET_AMOUNT', 'BILL_DATE']
KEEP = ['BILL_DATE', 'SHOP_CODE', 'PRODUCT_CODE', 'DESCRIPTION', 'PRICE', 'QTY', 'DISCOUNT_AMOUNT', 'NET_AMOUNT', 'ORDER_STATUS', 'SALE_CODE', 'SALE_NAME']
FMT = '%m/%d/%Y %I:%M:%S %p'
MON = {m: i + 1 for i, m in enumerate(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])}
MON.update({'Sept': 9, 'July': 7, 'June': 6})

def is_vivo(s): return s.fillna('').str.upper().str.replace(' ', '').str.startswith('H/S,VIVO')

def _load(name):
    fp = os.path.join(ST, name)
    return pd.read_csv(fp, dtype=str, keep_default_na=False, na_values=['']) if os.path.exists(fp) else None

def _save(df, name): df.to_csv(os.path.join(ST, name), index=False, compression='gzip' if name.endswith('.gz') else None)

def _meta():
    fp = os.path.join(ST, 'meta.json'); return json.load(open(fp)) if os.path.exists(fp) else {}

def _meta_set(**kw):
    m = _meta(); m.update(kw); json.dump(m, open(os.path.join(ST, 'meta.json'), 'w'), indent=1)

# ---------- model key: 'H/S,VIVO,V80LITE,5G,6/256,BLACK' and 'VIVO V80 LITE 5G 6/256GB' -> 'V80LITE|5G|6256'
def _norm(x): return re.sub(r'[^A-Z0-9]', '', str(x).upper())

def key_from_desc(d):
    p = [x.strip() for x in str(d).upper().split(',')]
    p = p[:2] + [x for x in p[2:] if x]
    if len(p) > 1 and p[1].startswith('VIVO ') and len(p[1]) > 5: p = [p[0], 'VIVO', p[1][5:].strip()] + p[2:]
    net = next((x for x in p[3:] if re.fullmatch(r'[2-5]G', x)), None)
    mem = next((x for x in p[3:] if re.fullmatch(r'\d+\s*[/+]\s*\d+\s*(GB|TB)?', x)), None)
    if len(p) < 4 or not net or not mem: return _norm(' '.join(p[2:4])), 'VIVO ' + ' '.join(p[2:4])
    model = p[2]
    mem = mem.replace('GB', '').replace(' ', '')
    extra = 'PHOTOSET' if 'PHOTOSET' in str(d).upper().replace(' ', '') else ''
    k = '|'.join([_norm(model), _norm(net), _norm(mem.replace('GB', ''))]) + ('|PHOTOSET' if extra else '')
    nm = f"VIVO {model} {net} {mem.replace('+', '/')}GB" + (' PHOTOSET' if extra else '')
    return k, nm

def key_from_target(s):
    u = str(s).upper().strip()
    extra = 'PHOTOSET' in u; u = u.replace('PHOTOSET', '').strip()
    m = re.match(r'^VIVO\s+(.*?)\s+(\d+G)\s+([\d+/]+)\s*GB?$', u)
    if not m: return _norm(u), str(s).strip()
    return '|'.join([_norm(m.group(1)), m.group(2), _norm(m.group(3))]) + ('|PHOTOSET' if extra else ''), str(s).strip()

# ---------- RRP (price per unit, used for "Gross" = QTY x RRP)
def _rrp_parse(name):
    u = str(name).upper()
    photo = bool(re.search(r'\bSET\b|PHOTOSET', u)); u = re.sub(r'\bSET\b|PHOTOSET', ' ', u)
    net = re.search(r'\b([2-5]G)\b', u); u2 = re.sub(r'\b[2-5]G\b', ' ', u)
    mem = re.search(r'(\d{1,2})\s*[/+]\s*(\d{2,4}|1\s*TB)\s*(GB)?', u2)
    model = _norm((u2[:mem.start()] if mem else u2).replace(',', ' '))
    if model.startswith('VIVO'): model = model[4:]
    m = (mem.group(1) + _norm(mem.group(2))) if mem else None
    return model, net.group(1) if net else None, m, photo

def rrp_rows(fp):
    """RRP sheet (Model | RRP) -> [(name, price)]"""
    raw = pd.read_excel(fp, header=None)
    hr = next(i for i, r in raw.iterrows() if {'model', 'rrp'} <= {str(x).strip().lower() for x in r})
    h = [str(x).strip().lower() for x in raw.iloc[hr]]; im, ip = h.index('model'), h.index('rrp')
    out = []
    for _, r in raw.iloc[hr + 1:].iterrows():
        price = pd.to_numeric(r.iloc[ip], errors='coerce')
        if pd.notna(price) and price > 0 and pd.notna(r.iloc[im]): out.append((str(r.iloc[im]).strip(), float(price)))
    return out

def rrp_map(rows, models):
    """{model key: display name} -> {model key: RRP}. A row without memory size covers every size of that model that
    has no row of its own; a row with 4G/5G only matches that network; 'Set' rows match PHOTOSET models."""
    rows = [(n, p) + _rrp_parse(n) for n, p in rows]
    out, used = {}, set()
    for k, name in models.items():
        p = k.split('|')
        if len(p) >= 3: kmodel, knet, kmem, kphoto = p[0], p[1], p[2], 'PHOTOSET' in p
        else: kmodel, knet, kmem, kphoto = _rrp_parse(name); knet = knet or ''   # keys that could not be split, e.g. 16/1TB
        best = None
        for rn, price, model, net, mem, photo in rows:
            if model != kmodel or photo != kphoto or (net and net != knet) or (mem and mem != kmem): continue
            score = (mem is not None) * 2 + (net is not None)
            if best is None or score > best[0]: best = (score, price, rn)
        if best: out[k] = best[1]; used.add(best[2])
    return out, [r[0] for r in rows if r[0] not in used]

def merge_rrp(fp):
    rows = rrp_rows(fp)
    pd.DataFrame(rows, columns=['model', 'rrp']).to_csv(os.path.join(ST, 'vivo_rrp.csv'), index=False)
    _meta_set(vivo_rrp_file=os.path.basename(str(fp)))
    print(f'vivo RRP: {len(rows)} rows from {os.path.basename(str(fp))}')

# ---------- inputs
def add_sales(raw):
    if 'DESCRIPTION' not in raw: return
    v = raw[is_vivo(raw.DESCRIPTION)].copy()
    if not len(v): print('vivo: no H/S,VIVO rows in this sales file'); return
    v['key'] = v[DEDUP].fillna('').astype(str).agg('|'.join, axis=1).map(lambda x: hashlib.sha1(x.encode()).hexdigest()[:16])
    v = v[['key'] + KEEP].drop_duplicates('key')
    mo = pd.to_datetime(v.BILL_DATE, format=FMT, errors='coerce').dt.strftime('%Y-%m')
    added = 0
    for m, g in v.groupby(mo):
        name = f'vivo_sales_{m}.csv.gz'; old = _load(name)
        new = g if old is None else g[~g.key.isin(set(old.key))]
        added += len(new)
        if len(new): _save((new if old is None else pd.concat([old, new])).sort_values(['BILL_DATE', 'key']), name)
    bd = pd.to_datetime(v.BILL_DATE, format=FMT, errors='coerce')
    m = _meta()
    if bd.notna().any() and bd.max().strftime('%Y-%m-%d %H:%M') > m.get('vivo_sales_asof', ''): _meta_set(vivo_sales_asof=bd.max().strftime('%Y-%m-%d %H:%M'))
    print(f'vivo: sales {len(v):,} H/S VIVO rows, new {added:,}')

def set_stock(st, asof=None):
    pn = 'PRODUCT_NAME' if 'PRODUCT_NAME' in st else 'DESCRIPTION'
    k = st[is_vivo(st[pn])].copy(); k['PN'] = k[pn].str.strip()
    cols = [c for c in ['SHOP_CODE', 'PRODUCT_CODE', 'PN', 'LOCATION_NAME', 'BALANCE', 'SERIAL', 'FIRST_AGING'] if c in k]
    _save(k[cols], 'vivo_stock.csv.gz'); _meta_set(vivo_stock_asof=asof or _meta().get('stock_asof', ''))
    print(f'vivo: stock {len(k):,} H/S VIVO serials')

def merge_target(fp):
    t = pd.read_excel(fp, sheet_name=0, dtype=str)
    t = t[t.CUSTOM_BRAND.str.upper().str.strip() == 'VIVO'].copy()
    t['month'] = pd.to_datetime(t.START_DATE).dt.strftime('%Y-%m')
    out = pd.DataFrame({'month': t.month, 'shop': t.SHOP_CODE.str.strip(), 'name': t.SHOP_NAME.str.strip(), 'zone': t.ZONE_AREA, 'area': t.REGION.str.strip(),
                        'size': t.SIZE_SHOP, 'type': t.SHOP_TYPE, 'location': t.LOCATION, 'submodel': t.CUSTOM_SUBMODEL.str.strip(), 'assort': t.ASSORTMENT,
                        'pc': t.PC, 'total_pc': t.TOTAL_PC, 'qty': pd.to_numeric(t.OPERATION_TARGET_QTY, errors='coerce').fillna(0),
                        'net': pd.to_numeric(t.OPERATION_TARGET_NET_AMOUNT, errors='coerce').fillna(0)})
    old = _load('vivo_targets.csv'); months = set(out.month)
    _save(pd.concat([old[~old.month.isin(months)], out]) if old is not None else out, 'vivo_targets.csv')
    for m in sorted(months):
        x = out[out.month == m]; print(f'vivo target {m}: {x.shop.nunique()} shops, {x.submodel.nunique()} models, QTY {x.qty.sum():,.0f}, Net {x.net.sum():,.0f}')

def merge_pc(fp):
    import openpyxl
    wb = openpyxl.load_workbook(fp, read_only=True, data_only=True)
    # Format 2 ("Update PC vivo as. 7.11.26"): one sheet, header row has "Shop Code WW" and "PC Active".
    for n in wb.sheetnames:
        rows = list(wb[n].iter_rows(values_only=True))
        norm = lambda r: [re.sub(r'\s+', ' ', str(c)).strip().lower() if c is not None else '' for c in r]
        hr = next((i for i, r in enumerate(rows) if r and 'shop code ww' in norm(r) and 'pc active' in norm(r)), None)
        if hr is None: continue
        h = norm(rows[hr]); iw, iv = h.index('shop code ww'), h.index('pc active')
        def num(v):
            try: return int(float(v))
            except (TypeError, ValueError): return 0
        out = [{'shop': str(r[iw]).strip().replace('.0', ''), 'vivo_pc': num(r[iv])} for r in rows[hr + 1:] if r and r[iw] and str(r[iw]).strip()[:1].isdigit()]
        df = pd.DataFrame(out).drop_duplicates('shop'); _save(df, 'vivo_pc.csv')
        _meta_set(vivo_pc_sheet=f'{os.path.basename(str(fp))} · PC Active')
        print(f'vivo PC (PC Active): {len(df)} shops, {int((df.vivo_pc > 0).sum())} with Vivo PC ({int(df.vivo_pc.sum())} PC)')
        return
    best = None
    for n in wb.sheetnames:
        m = re.match(r'^PC\s+([A-Za-z]+)\s+(\d{2})\s*$', n.strip())
        if m and m.group(1)[:3].title() in MON:
            k = (int(m.group(2)), MON[m.group(1)[:3].title()])
            if best is None or k > best[0]: best = (k, n)
    if not best: raise SystemExit('PC file: no sheet named like "PC OCT 26"')
    rows = list(wb[best[1]].iter_rows(values_only=True))
    hr = next(i for i, r in enumerate(rows) if r and 'CODE WW' in [str(c).strip() if c else '' for c in r])
    h = [str(c).strip() if c else '' for c in rows[hr]]; iw, iv = h.index('CODE WW'), h.index('VIVO')
    out = [{'shop': str(r[iw]).strip().replace('.0', ''), 'vivo_pc': int(r[iv] or 0)} for r in rows[hr + 1:] if r and r[iw]]
    df = pd.DataFrame(out).drop_duplicates('shop'); _save(df, 'vivo_pc.csv')
    _meta_set(vivo_pc_sheet=best[1])
    print(f'vivo PC: sheet "{best[1]}": {len(df)} shops, {int((df.vivo_pc > 0).sum())} with Vivo PC ({int(df.vivo_pc.sum())} PC)')

def _area(a):
    a = re.sub(r'\s+', ' ', str(a or '')).strip()
    m = re.match(r'^(BMA [IVX]+) \((.*)\)$', a)
    if m: return f'{m.group(1)} - {m.group(2)}'
    return a if a.startswith(('BMA', 'UPC')) or not a or a == 'NOT_CLASSIFIED' else 'UPC - ' + a

HCOLS = ['YEAR', 'MONTH', 'DAY', 'TRANSACTION_DATE', 'DATA_ASOF_DATE', 'SHOP_CODE', 'SHOP_NAME', 'SHOP_TYPE', 'AREA', 'SIZE_SHOP', 'WW_FLAG', 'PRODUCT_DESCRIPTION', 'SUB_MODEL', 'QTY', 'AMOUNT', 'NET_AMOUNT']
def merge_hist(fp):
    """Central-system Vivo sales (e.g. 'VIVO Sale Jan-Nov.xlsx', one row per order line with SUB_MODEL, QTY, NET_AMOUNT, DATA_ASOF_DATE).
    WW shops only, kept per day x shop x model in state/vivo_hist.csv.gz; dates in the file replace the same dates already kept.
    build() uses these figures up to DATA_ASOF_DATE and the POS (TSM) daily_sales rows only for later dates."""
    h = pd.read_excel(fp, dtype=str, usecols=lambda c: str(c).strip() in HCOLS)
    h = h[h.WW_FLAG.str.strip().str.upper() == 'WW'].copy()
    # TRANSACTION_DATE holds the month end; the sale day is YEAR / MONTH / DAY
    h['date'] = pd.to_datetime(dict(year=pd.to_numeric(h.YEAR), month=pd.to_numeric(h.MONTH), day=pd.to_numeric(h.DAY)), errors='coerce').dt.strftime('%Y-%m-%d')
    h = h[h.date.notna()]
    pd_ = h.PRODUCT_DESCRIPTION.fillna('').str.upper().str.contains('PHOTOSET')
    h['sub'] = h.SUB_MODEL.fillna(h.PRODUCT_DESCRIPTION).str.strip()
    add = pd_ & ~h['sub'].str.upper().str.contains('PHOTOSET'); h.loc[add, 'sub'] = h.loc[add, 'sub'] + ' PHOTOSET'
    h['m'] = h['sub'].map(lambda x: key_from_target(x)[0])
    h['u'] = pd.to_numeric(h.QTY, errors='coerce').fillna(0); h['n'] = pd.to_numeric(h.NET_AMOUNT, errors='coerce').fillna(0)
    h['a'] = pd.to_numeric(h.AMOUNT, errors='coerce').fillna(0) if 'AMOUNT' in h else h.n
    g = h.groupby(['date', 'SHOP_CODE', 'm'], as_index=False).agg(name=('sub', 'first'), u=('u', 'sum'), n=('n', 'sum'), a=('a', 'sum')).rename(columns={'SHOP_CODE': 'shop'})
    asof = pd.to_datetime(h.DATA_ASOF_DATE).max().strftime('%Y-%m-%d')
    lo = g.date.min(); old = _load('vivo_hist.csv.gz')
    if old is not None: g = pd.concat([old[(old.date < lo) | (old.date > asof)], g])
    _save(g.sort_values(['date', 'shop', 'm']), 'vivo_hist.csv.gz')
    sh = h.sort_values('date').drop_duplicates('SHOP_CODE', keep='last')
    sh = pd.DataFrame({'shop': sh.SHOP_CODE, 'name': sh.SHOP_NAME.str.strip(), 'area': sh.AREA.map(_area), 'type': sh.SHOP_TYPE, 'size': sh.SIZE_SHOP})
    old = _load('vivo_hist_shops.csv')
    if old is not None: sh = pd.concat([old[~old.shop.isin(set(sh.shop))], sh])
    _save(sh, 'vivo_hist_shops.csv'); _meta_set(vivo_hist_asof=asof, vivo_hist_from=g.date.min())
    print(f'vivo central sales: {os.path.basename(fp)}: {len(h):,} WW rows, {lo}..{asof}, QTY {h.u.sum():,.0f}, Net {h.n.sum():,.0f}')

# ---------- build
def _ty(t):
    t = str(t or '').strip().lower().replace('_', ' ')
    if 'hall' in t: return 'Dtac Hall'
    if 'coco' in t: return 'Dtac Coco'
    if t.startswith('non'): return 'Non Matching'
    if t.startswith('matching'): return 'Matching'
    if 'makro' in t or 'sis' in t: return 'ปิดแล้ว (SIS / Makro)'
    if 'ten ten' in t: return 'Ten Ten Shop'  # not WW - dropped in build()
    return '-'

def _pack(rows):
    """[date, shop, model, u, n] -> index-coded rows (the page unpacks them)"""
    ds = sorted({r[0] for r in rows}); ss = sorted({r[1] for r in rows}); ms = sorted({r[2] for r in rows})
    di = {v: i for i, v in enumerate(ds)}; si = {v: i for i, v in enumerate(ss)}; mi = {v: i for i, v in enumerate(ms)}
    return {'d': ds, 's': ss, 'm': ms, 'r': [[di[r[0]], si[r[1]], mi[r[2]], *r[3:]] for r in rows]}

def build():
    meta = _meta()
    fs = sorted(glob.glob(os.path.join(ST, 'vivo_sales_*.csv.gz')))
    s = pd.concat([_load(os.path.basename(f)) for f in fs]) if fs else pd.DataFrame(columns=['key'] + KEEP)
    t = _load('vivo_targets.csv'); k = _load('vivo_stock.csv.gz'); pc = _load('vivo_pc.csv')
    if t is not None: t['qty'] = pd.to_numeric(t.qty, errors='coerce').fillna(0); t['net'] = pd.to_numeric(t.net, errors='coerce').fillna(0)
    # shops: Vivo target file first, then WW shops of the Prepay target files (same rule as the Prepay Dashboard)
    shops = {}
    pt = _load('targets_all.csv')
    if pt is not None:
        pt = pt[pt.shop.str.startswith(('801', '1005'), na=False)].sort_values('month').drop_duplicates('shop', keep='last')
        pt = pt[~pt.type.isin(["Lotus's", 'Lotus', 'True_Center_Makro', 'SIS GROUP1', 'SIS GROUP2'])]
        for r in pt.itertuples():
            shops[r.shop] = {'c': r.shop, 'n': r.name, 'area': r.region, 'type': _ty(r.type), 'size': '', 'pc': 0}
    hs = _load('vivo_hist_shops.csv')
    if hs is not None:
        for r in hs.itertuples():
            if r.shop not in shops: shops[r.shop] = {'c': r.shop, 'n': r.name, 'area': r.area, 'type': _ty(r.type), 'size': r.size if isinstance(r.size, str) else '', 'pc': 0}
    if t is not None:
        for r in t.sort_values('month').drop_duplicates('shop', keep='last').itertuples():
            shops[r.shop] = {'c': r.shop, 'n': r.name, 'area': r.area, 'type': _ty(r.type), 'size': r.size or '', 'pc': 0}
    # not WW: Ten Ten Shop, and shops listed in state/watch_exclude_shops.txt (same list as the Prepay Dashboard)
    xf = os.path.join(ST, 'watch_exclude_shops.txt')
    nx = {l.split('#')[0].strip() for l in open(xf, encoding='utf-8')} - {''} if os.path.exists(xf) else set()
    for c in [c for c, x in shops.items() if c in nx or x['type'] == 'Ten Ten Shop' or str(x['n']).lower().startswith('ten ten')]: del shops[c]
    pcsrc = 'none'
    if pc is not None:
        pcm = dict(zip(pc.shop, pc.vivo_pc.astype(int))); pcsrc = meta.get('vivo_pc_sheet', 'PC file')
        for c, x in shops.items(): x['pc'] = int(pcm.get(c, 0))
    elif t is not None:
        lt = t[t.month == t.month.max()].drop_duplicates('shop'); pcm = dict(zip(lt.shop, pd.to_numeric(lt.total_pc, errors='coerce').fillna(0).astype(int)))
        for c, x in shops.items(): x['pc'] = int(pcm.get(c, 0))
        pcsrc = 'VIVO Target (TOTAL_PC)'
    ww = set(shops)
    # models
    models = {}
    def addm(key, name, tgt):
        if key not in models: models[key] = {'k': key, 'name': name, 'tgt': tgt}
        elif tgt and not models[key]['tgt']: models[key].update(name=name, tgt=True)
    if t is not None:
        for sm in t.submodel.unique(): kk, nm = key_from_target(sm); addm(kk, nm, True)
    # sales fact
    s = s[s.SHOP_CODE.isin(ww)].copy()
    s['BD'] = pd.to_datetime(s.BILL_DATE, format=FMT, errors='coerce'); s = s[s.BD.notna()]
    s['sign'] = s.ORDER_STATUS.map({'Payment': 1, 'CreditNote': -1}).fillna(0)
    s['units'] = s.sign * pd.to_numeric(s.QTY, errors='coerce').fillna(1).clip(lower=1)
    s['net'] = s.sign * pd.to_numeric(s.NET_AMOUNT, errors='coerce').fillna(0)
    # Amount = full price before discount (POS: PRICE x QTY; central system: AMOUNT)
    s['amt'] = s.sign * pd.to_numeric(s.PRICE, errors='coerce').fillna(0) * pd.to_numeric(s.QTY, errors='coerce').fillna(1).clip(lower=1)
    km = s.DESCRIPTION.map(key_from_desc); s['m'] = km.str[0]
    for kk, nm in set(km): addm(kk, nm, False)
    s['date'] = s.BD.dt.strftime('%Y-%m-%d')
    stf = s.groupby(['date', 'SHOP_CODE', 'm', 'SALE_CODE'], as_index=False, dropna=False).agg(u=('units', 'sum'), n=('net', 'sum'), a=('amt', 'sum'))
    enames = s.dropna(subset=['SALE_CODE']).groupby('SALE_CODE').SALE_NAME.agg(lambda x: x.mode().iat[0] if len(x.mode()) else '').to_dict()
    f = s.groupby(['date', 'SHOP_CODE', 'm'], as_index=False).agg(u=('units', 'sum'), n=('net', 'sum'), a=('amt', 'sum'))
    f = f[(f.u != 0) | (f.n != 0)]
    # central-system figures up to their as-of date, POS (TSM) rows only after it
    hz = _load('vivo_hist.csv.gz'); hasof = meta.get('vivo_hist_asof', '')
    pos_asof = max(meta.get('vivo_sales_asof', ''), s.BD.max().strftime('%Y-%m-%d %H:%M') if len(s) else '')
    if hz is not None and hasof:
        f = f[f.date > hasof]; stf = stf[stf.date > hasof]
        hz = hz[hz.shop.isin(ww)]; hz['u'] = pd.to_numeric(hz.u); hz['n'] = pd.to_numeric(hz.n); hz['a'] = pd.to_numeric(hz['a'], errors='coerce').fillna(hz.n) if 'a' in hz else hz.n
        for kk, nm in set(zip(hz.m, hz.name)): addm(kk, nm, False)
        f = pd.concat([hz.rename(columns={'shop': 'SHOP_CODE'})[['date', 'SHOP_CODE', 'm', 'u', 'n', 'a']], f])
    sales = [[r.date, r.SHOP_CODE, r.m, int(r.u), round(float(r.n)), round(float(r.a))] for r in f.itertuples() if r.u != 0 or r.n != 0]
    sales_asof = pos_asof if pos_asof[:10] > hasof else hasof
    # targets
    targets = {}
    if t is not None:
        t['m'] = t.submodel.map(lambda x: key_from_target(x)[0])
        g = t.groupby(['month', 'shop', 'm'], as_index=False)[['qty', 'net']].sum(); g = g[(g.qty > 0) | (g.net > 0)]
        for mo, x in g.groupby('month'): targets[mo] = [[r.shop, r.m, round(float(r.qty), 4), round(float(r.net), 2)] for r in x.itertuples()]
    # stock
    stock = []; locs = []
    if k is not None and len(k):
        k = k[k.SHOP_CODE.isin(ww)].copy()
        kk2 = k.PN.map(key_from_desc); k['m'] = kk2.str[0]
        for a, b in set(kk2): addm(a, b, False)
        if 'LOCATION_NAME' not in k: k['LOCATION_NAME'] = '-'
        k['LOCATION_NAME'] = k.LOCATION_NAME.fillna('-') + k.PN.str.upper().str.contains(r',\s*DEMO\b').map({True: ' (DEMO)', False: ''})
        k['q'] = pd.to_numeric(k.BALANCE, errors='coerce').fillna(1) if 'BALANCE' in k else 1
        g = k.groupby(['SHOP_CODE', 'm', 'LOCATION_NAME']).q.sum().reset_index()
        locs = sorted(g.LOCATION_NAME.unique().tolist())
        stock = [[r.SHOP_CODE, r.m, locs.index(r.LOCATION_NAME), int(r.q)] for r in g.itertuples()]
    # model order: series X > V > Y > others, then target net
    tn = {}
    if t is not None:
        for kk_, v in t.groupby('m').net.sum().items(): tn[kk_] = v
    def series(name):
        m = re.match(r'^VIVO\s+([A-Z]+)(\d+)', name.upper()); return m.group(1) if m else '?'
    def family(name):
        m = re.match(r'^VIVO\s+(.*?)\s+\d+G\b', name.upper()); return ('VIVO ' + m.group(1)) if m else name
    so = {'X': 0, 'V': 1, 'Y': 2, 'T': 3}
    ml = sorted(models.values(), key=lambda x: (so.get(series(x['name']), 9), family(x['name']), -tn.get(x['k'], 0), x['name']))
    for x in ml: x['series'] = series(x['name']); x['family'] = family(x['name']).replace('VIVO ', '')
    ml = [x for x in ml if x['tgt'] or any(r[2] == x['k'] for r in sales) or any(r[1] == x['k'] for r in stock)]
    # RRP per model (for the Gross unit = QTY x RRP)
    rr = _load('vivo_rrp.csv'); rmiss = []
    if rr is not None:
        mp, unused = rrp_map(list(zip(rr.model, pd.to_numeric(rr.rrp))), {x['k']: x['name'] for x in ml})
        yr = max((r[0] for r in sales), default='')[:4]; sold = {r[2] for r in sales if r[0][:4] == yr}
        for x in ml:
            if x['k'] in mp: x['rrp'] = mp[x['k']]
            elif x['k'] in sold: rmiss.append(x['name'])
        print(f"vivo RRP: {len(mp)} models priced; models sold this year without RRP (Gross uses actual full price): {rmiss}")
    portions = json.load(open(os.path.join(ST, 'vivo_portions.json'))) if os.path.exists(os.path.join(ST, 'vivo_portions.json')) else {}
    data = {'meta': {'sales_asof': sales_asof, 'hist_asof': hasof, 'pos_asof': pos_asof, 'stock_asof': meta.get('vivo_stock_asof', ''), 'pc_source': pcsrc, 'rrp_source': meta.get('vivo_rrp_file', ''),
                     'first_sales': min((r[0] for r in sales), default='')},
            'portions': portions, 'models': ml, 'shops': sorted(shops.values(), key=lambda x: (x['area'] or '', x['n'] or '')),
            'sales': _pack(sales),
            'staff': {'e': {str(k_): v for k_, v in enames.items()}, 'r': [[r.date, r.SHOP_CODE, r.m, str(r.SALE_CODE), int(r.u), round(float(r.n)), round(float(r.a))] for r in stf.itertuples() if r.u != 0 or r.n != 0]},
            'targets': targets, 'stock': stock, 'locs': locs}
    os.makedirs(OUT, exist_ok=True)
    json.dump(data, open(os.path.join(OUT, 'vivo_data.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    lm = max((r[0] for r in sales), default='')[:7]
    mt = [r for r in sales if r[0][:7] == lm]
    print(f"vivo built: sales {data['meta']['first_sales']}..{data['meta']['sales_asof']} ({len(sales)} rows), month {lm} QTY {sum(r[3] for r in mt):,} Net {sum(r[4] for r in mt):,} Amount {sum(r[5] for r in mt):,}"
          f" | stock {sum(r[3] for r in stock):,} as of {data['meta']['stock_asof']} | models {len(ml)} shops {len(shops)} | target months {sorted(targets)} | PC {pcsrc}")
    unk = sorted({x['name'] for x in ml if not x['tgt']})
    if unk: print('  models without target:', ', '.join(unk[:30]))

if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser(); ap.add_argument('--target', nargs='*', default=[]); ap.add_argument('--pc'); ap.add_argument('--hist', nargs='*', default=[]); a = ap.parse_args()
    for fp in a.hist: merge_hist(fp)
    for fp in a.target: merge_target(fp)
    if a.pc: merge_pc(a.pc)
    build()
