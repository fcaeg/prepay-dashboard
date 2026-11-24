"""Tecno Dashboard pipeline (its own page /tecno/, separate from the Prepay Dashboard).
Uses the same TSM files that land in the Drive inbox (daily_sales + stock_balance_report); only H/S,TECNO rows are kept.

Called from update.py:
  add_sales(raw)        every sales file -> state/tecno_sales_<YYYY-MM>.csv.gz (de-duplicated like the SIM rows)
  set_stock(st, asof)   every stock file -> state/tecno_stock.csv.gz (replaces the snapshot)
  build()               -> out/tecno_data.json ; pipeline/tecno_page.py makes tecno/index.html
No staff names are kept or published.
"""
import glob, hashlib, json, os, re
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ST = os.path.join(HERE, 'state'); OUT = os.path.join(HERE, 'out')
DEDUP = ['SHOP_CODE', 'ORDER_ID', 'BILL_NO', 'PRODUCT_CODE', 'SERIAL', 'ORDER_STATUS', 'NET_AMOUNT', 'BILL_DATE']
KEEP = ['BILL_DATE', 'SHOP_CODE', 'PRODUCT_CODE', 'DESCRIPTION', 'PRICE', 'QTY', 'DISCOUNT_AMOUNT', 'NET_AMOUNT', 'ORDER_STATUS']
FMT = '%m/%d/%Y %I:%M:%S %p'

def is_tecno(s): return s.fillna('').str.upper().str.replace(' ', '').str.startswith('H/S,TECNO')

def _load(name):
    fp = os.path.join(ST, name)
    return pd.read_csv(fp, dtype=str, keep_default_na=False, na_values=['']) if os.path.exists(fp) else None

def _save(df, name): df.to_csv(os.path.join(ST, name), index=False, compression='gzip' if name.endswith('.gz') else None)

def _meta():
    fp = os.path.join(ST, 'meta.json'); return json.load(open(fp)) if os.path.exists(fp) else {}

def _meta_set(**kw):
    m = _meta(); m.update(kw); json.dump(m, open(os.path.join(ST, 'meta.json'), 'w'), indent=1)

def parse(d):
    """'H/S,TECNO,POP20C,4G,4/64,LUNAR TITANIUM' -> (model key, model name, family, colour)"""
    p = [x.strip() for x in str(d).upper().split(',')]
    p = p[:2] + [x for x in p[2:] if x]
    fam = p[2] if len(p) > 2 else '?'
    net = next((x for x in p[3:] if re.fullmatch(r'[2-5]G', x)), '')
    mem = next((x for x in p[3:] if re.fullmatch(r'\d+\s*[/+]\s*\d+\s*(GB|TB)?', x)), '')
    mem = mem.replace('GB', '').replace(' ', '')
    rest = [x for x in p[3:] if x not in (net, mem) and x.replace(' ', '') != mem]
    demo = any(re.search(r'\b(DEMO|DM)\b', x) for x in rest)  # '...,PINK,DM' is a demo unit too
    colour = ' '.join(x for x in rest if not re.search(r'\b(DEMO|DM)\b', x)).title()
    name = ' '.join(x for x in ['TECNO', fam, net, (mem + 'GB') if mem and 'TB' not in mem else mem] if x)
    return '|'.join(re.sub(r'[^A-Z0-9/]', '', x) for x in [fam, net, mem]), name, fam, colour, demo

def add_sales(raw):
    if 'DESCRIPTION' not in raw: return
    v = raw[is_tecno(raw.DESCRIPTION)].copy()
    if not len(v): print('tecno: no H/S,TECNO rows in this sales file'); return
    v['key'] = v[DEDUP].fillna('').astype(str).agg('|'.join, axis=1).map(lambda x: hashlib.sha1(x.encode()).hexdigest()[:16])
    v = v[['key'] + KEEP].drop_duplicates('key')
    mo = pd.to_datetime(v.BILL_DATE, format=FMT, errors='coerce').dt.strftime('%Y-%m')
    added = 0
    for m, g in v.groupby(mo):
        name = f'tecno_sales_{m}.csv.gz'; old = _load(name)
        new = g if old is None else g[~g.key.isin(set(old.key))]
        added += len(new)
        if len(new): _save((new if old is None else pd.concat([old, new])).sort_values(['BILL_DATE', 'key']), name)
    bd = pd.to_datetime(v.BILL_DATE, format=FMT, errors='coerce')
    if bd.notna().any() and bd.max().strftime('%Y-%m-%d %H:%M') > _meta().get('tecno_sales_asof', ''): _meta_set(tecno_sales_asof=bd.max().strftime('%Y-%m-%d %H:%M'))
    print(f'tecno: sales {len(v):,} H/S TECNO rows, new {added:,}')

def set_stock(st, asof=None):
    pn = 'PRODUCT_NAME' if 'PRODUCT_NAME' in st else 'DESCRIPTION'
    k = st[is_tecno(st[pn])].copy(); k['PN'] = k[pn].str.strip()
    cols = [c for c in ['SHOP_CODE', 'PRODUCT_CODE', 'PN', 'LOCATION_NAME', 'BALANCE', 'FIRST_AGING'] if c in k]
    _save(k[cols], 'tecno_stock.csv.gz'); _meta_set(tecno_stock_asof=asof or _meta().get('stock_asof', ''))
    print(f'tecno: stock {len(k):,} H/S TECNO rows')

def merge_target(fp):
    """'<yyyymm>_Target by Brand*.xlsx' (sheet TARGET_FOR_OPERATION): TECNO rows of every shop -> state/tecno_targets.csv (replaces that month)"""
    import openpyxl
    name = os.path.basename(str(fp)); m = re.search(r'(20\d{2})(\d{2})_', name)
    if not m or 'gia' in name.lower(): return
    month = f'{m.group(1)}-{m.group(2)}'
    wb = openpyxl.load_workbook(fp, read_only=True)
    if 'TARGET_FOR_OPERATION' not in wb.sheetnames: return
    it = wb['TARGET_FOR_OPERATION'].iter_rows(values_only=True); h = [str(x).strip() for x in next(it)]; hx = {c: i for i, c in enumerate(h)}
    pick = lambda pre: next(i for c, i in hx.items() if c.upper().startswith(pre))
    ib, im, ic, iq, ia, i_n = hx['CUSTOM_BRAND'], hx['CUSTOM_SUBMODEL'], hx['SHOP_CODE'], pick('OPERATION_TARGET_Q'), pick('OPERATION_TARGET_A'), pick('OPERATION_TARGET_N')
    rows = [{'month': month, 'shop': str(r[ic] or '').strip(), 'model': str(r[im] or '').strip(), 'tq': float(r[iq] or 0), 'ta': float(r[ia] or 0), 'tn': float(r[i_n] or 0)}
            for r in it if str(r[ib] or '').strip().upper() == 'TECNO']
    d = pd.DataFrame(rows, columns=['month', 'shop', 'model', 'tq', 'ta', 'tn'])
    old = _load('tecno_targets.csv')
    _save(pd.concat([old[old.month != month], d.astype(str)]) if old is not None else d, 'tecno_targets.csv')
    print(f'tecno target {month}: {d.shop.nunique()} shops · ' + ', '.join(f'{k} {v:,.0f}' for k, v in d.groupby('model').tq.sum().items()))

def key_from_target(s):
    """'TECNO CAMON SLIM 5G 8/256GB' -> ('CAMONSLIM|5G|8/256', 'CAMONSLIM')"""
    u = str(s).upper().strip(); u = re.sub(r'^TECNO\s+', '', u)
    m = re.match(r'^(.*?)\s+([2-5]G)\s+(\d+\s*/\s*\d+)\s*(GB|TB)?$', u)
    if not m: f = re.sub(r'[^A-Z0-9]', '', u); return f, f
    f = re.sub(r'[^A-Z0-9]', '', m.group(1)); return f'{f}|{m.group(2)}|{m.group(3).replace(" ", "")}', f

def _shops():
    """WW shops: name / area / type from the Prepay target files + shop_master (same rule as the other dashboards)"""
    shops = {}
    sm = _load('shop_master.csv')
    if sm is not None:
        for r in sm.fillna('').itertuples():
            if str(r.WW_FLAG).strip().upper() == 'WW': shops[r.SHOP_CODE] = {'c': r.SHOP_CODE, 'n': r.SHOP_NAME, 'area': r.AREA, 'type': r.CHANNEL}
    pt = _load('targets_all.csv')
    if pt is not None:
        pt = pt[pt.shop.str.startswith(('801', '1005'), na=False)]
        for r in pt.sort_values('month').drop_duplicates('shop', keep='last').fillna('').itertuples():
            shops[r.shop] = {'c': r.shop, 'n': r.name, 'area': r.region, 'type': r.type}
    ex = _load('extra_shops.csv')
    if ex is not None:
        for r in ex.fillna('').to_dict('records'):
            c = str(r.get('shop', '')).strip()
            if c: shops[c] = {'c': c, 'n': r.get('name', c), 'area': r.get('region', '') or r.get('area', ''), 'type': r.get('type', '')}
    xf = os.path.join(ST, 'watch_exclude_shops.txt')
    nx = {l.split('#')[0].strip() for l in open(xf, encoding='utf-8')} - {''} if os.path.exists(xf) else set()
    for x in shops.values(): x['area'] = _area(x['area'])
    return {c: x for c, x in shops.items() if c not in nx}

def _area(a):
    """'BMA II (South West)' -> 'BMA II - South West', 'Upper South' -> 'UPC - Upper South' (the target-file spelling)"""
    a = re.sub(r'\s+', ' ', str(a or '')).strip()
    m = re.match(r'^(BMA [IVX]+) \((.*)\)$', a)
    if m: return f'{m.group(1)} - {m.group(2)}'
    return a if a.startswith(('BMA', 'UPC')) or not a or a == 'NOT_CLASSIFIED' else 'UPC - ' + a

def build():
    meta = _meta()
    fs = sorted(glob.glob(os.path.join(ST, 'tecno_sales_*.csv.gz')))
    s = pd.concat([_load(os.path.basename(f)) for f in fs]) if fs else pd.DataFrame(columns=['key'] + KEEP)
    k = _load('tecno_stock.csv.gz')
    shops = _shops()
    models = {}
    def addm(desc):
        key, name, fam, col, demo = parse(desc)
        if key not in models: models[key] = {'k': key, 'name': name, 'fam': fam}
        return key, col
    # sales: date x shop x model x colour
    s = s.copy(); s['BD'] = pd.to_datetime(s.BILL_DATE, format=FMT, errors='coerce'); s = s[s.BD.notna()]
    s['sign'] = s.ORDER_STATUS.map({'Payment': 1, 'CreditNote': -1}).fillna(0)
    q = pd.to_numeric(s.QTY, errors='coerce').fillna(1).clip(lower=1)
    s['u'] = s.sign * q; s['n'] = s.sign * pd.to_numeric(s.NET_AMOUNT, errors='coerce').fillna(0)
    s['a'] = s.sign * pd.to_numeric(s.PRICE, errors='coerce').fillna(0) * q
    mc = s.DESCRIPTION.map(addm); s['m'] = mc.str[0]; s['col'] = mc.str[1]
    s['date'] = s.BD.dt.strftime('%Y-%m-%d'); s['h'] = s.BD.dt.hour
    f = s.groupby(['date', 'SHOP_CODE', 'm', 'col'], as_index=False)[['u', 'n', 'a']].sum()
    f = f[(f.u != 0) | (f.n != 0)]
    # stock: shop x model x colour x location
    stock = []
    if k is not None and len(k):
        mc = k.PN.map(addm); k['m'] = mc.str[0]; k['col'] = mc.str[1]
        k['demo'] = k.PN.map(lambda d: parse(d)[4])
        k['loc'] = k.LOCATION_NAME.fillna('-') if 'LOCATION_NAME' in k else '-'
        k['loc'] = k['loc'].where(~k.demo, 'DEMO')
        k['q'] = pd.to_numeric(k.BALANCE, errors='coerce').fillna(1) if 'BALANCE' in k else 1
        g = k.groupby(['SHOP_CODE', 'm', 'col', 'loc'], as_index=False).q.sum()
        stock = [[r.SHOP_CODE, r.m, r.col, r.loc, int(r.q)] for r in g.itertuples() if r.q]
    # WW shops only (same as the Prepay Dashboard)
    nf = len(f); f = f[f.SHOP_CODE.isin(shops)]
    stock = [r for r in stock if r[0] in shops]
    hr = s[s.SHOP_CODE.isin(shops)].groupby(['date', 'h', 'm'], as_index=False).u.sum(); hr = hr[hr.u != 0]
    # targets (all months kept); a sales model name that starts with a target model name is the same model (POP20C = POP20)
    t = _load('tecno_targets.csv'); targets = {}
    if t is not None and len(t):
        t = t[t.shop.isin(shops)].copy()
        for c in ('tq', 'tn'): t[c] = pd.to_numeric(t[c], errors='coerce').fillna(0)
        kf = t.model.map(key_from_target); t['k'] = kf.str[0]; t['fam'] = kf.str[1]
        tf = sorted(set(t.fam), key=len, reverse=True)
        alias = {}
        for x in list(models.values()):
            if x['fam'] in tf: continue
            to = next((y for y in tf if x['fam'].startswith(y)), None)
            if to: alias[x['k']] = to + x['k'][len(x['fam']):]
        for old_k, new_k in alias.items():
            x = models.pop(old_k); x.update(k=new_k, fam=new_k.split('|')[0], name=x['name'].replace(old_k.split('|')[0], new_k.split('|')[0], 1)); models[new_k] = x
        if alias:
            f['m'] = f.m.replace(alias); hr['m'] = hr.m.replace(alias); stock = [[r[0], alias.get(r[1], r[1])] + r[2:] for r in stock]
        for r in t.drop_duplicates('k').itertuples():
            if r.k not in models:
                p = r.k.split('|'); models[r.k] = {'k': r.k, 'name': 'TECNO ' + ' '.join(p[:2] + [p[2] + 'GB'] if len(p) > 2 else p), 'fam': r.fam}
        g = t.groupby(['month', 'shop', 'k'], as_index=False)[['tq', 'tn']].sum(); g = g[(g.tq > 0) | (g.tn > 0)]
        for mo, x in g.groupby('month'): targets[mo] = [[r.shop, r.k, round(float(r.tq), 3), round(float(r.tn))] for r in x.itertuples()]
    used = set(f.SHOP_CODE) | {r[0] for r in stock}
    sh = {c: shops[c] for c in used}
    if nf != len(f): print(f'tecno: {nf - len(f)} sales rows of non-WW shops left out')
    ml = sorted(models.values(), key=lambda x: (x['fam'], x['name']))
    data = {'meta': {'sales_asof': meta.get('tecno_sales_asof', ''), 'stock_asof': meta.get('tecno_stock_asof', ''),
                     'first_sales': f.date.min() if len(f) else ''},
            'areas': sorted({x['area'] for x in shops.values() if x['area']}), 'ww': [[c, x['area'], x['type']] for c, x in sorted(shops.items())],
            'models': ml, 'shops': sorted(sh.values(), key=lambda x: (x['area'] or '', x['n'] or '')),
            'sales': [[r.date, r.SHOP_CODE, r.m, r.col, int(r.u), round(float(r.n)), round(float(r.a))] for r in f.itertuples()],
            'hours': [[r.date, int(r.h), r.m, int(r.u)] for r in hr.itertuples()],
            'stock': stock, 'targets': targets}
    os.makedirs(OUT, exist_ok=True)
    json.dump(data, open(os.path.join(OUT, 'tecno_data.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f"tecno built: sales {data['meta']['first_sales']}..{data['meta']['sales_asof']} units {int(f.u.sum()) if len(f) else 0:,} net {int(f.n.sum()) if len(f) else 0:,}"
          f" | target months {sorted(targets)} | stock {sum(r[4] for r in stock):,} as of {data['meta']['stock_asof']} | models {len(ml)} shops {len(sh)}")

if __name__ == '__main__': build()
