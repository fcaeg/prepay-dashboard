"""GIA Dashboard pipeline (Gadget / IOT / Accessory) - shares the Prepay input daily_sales (POS Sale Report, TSM).

Called from update.py:
  add_sales(raw)       every sales file -> state/gia_sales_<YYYY-MM>.csv.gz (GIA rows only, de-duplicated like SIM rows)
  merge_target(xlsx)   Nami's daily report 'GIA_North_<Mon>_<d>.xlsx' (sheets UN / LN) -> state/gia_targets.csv
                       (shop list, section, order and the month's Target Revenue / QTY; replaces that month).
                       The file is also kept as state/gia_template.xlsx (layout/styles for the Excel export).
  build()              -> out/gia_data.json + gia/xlsx/GIA_North_<Mon>_<d>.xlsx for every day of the latest month
GIA rule (checked against Nami's GIA_North_Nov_1 - 27 of 28 shops identical, the 28th had a sale after the file's time):
  ACC,...             -> Accessory
  WATCH / OTT / IT    -> Gadget
  IOT / T,IOT         -> IOT
  anything with a ',FOC,' part is not counted; H/S, SIM, IPAD, scratch cards, CRM gifts are not GIA.
"""
import calendar, datetime, hashlib, json, os, re, shutil
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
ST = os.path.join(HERE, 'state'); OUT = os.path.join(HERE, 'out')
DEDUP = ['SHOP_CODE', 'ORDER_ID', 'BILL_NO', 'PRODUCT_CODE', 'SERIAL', 'ORDER_STATUS', 'NET_AMOUNT', 'BILL_DATE']
KEEP = ['BILL_DATE', 'SHOP_CODE', 'PRODUCT_CODE', 'DESCRIPTION', 'QTY', 'NET_AMOUNT', 'ORDER_STATUS', 'SALE_CODE', 'SALE_NAME']
FMT = '%m/%d/%Y %I:%M:%S %p'
MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
AREA = {'UN': 'Upper North', 'LN': 'Lower North'}

def group(desc):
    p = [x.strip().upper() for x in str(desc).split(',')]
    if 'FOC' in p: return None
    h = p[0]
    if h == 'ACC': return 'Accessory'
    if h in ('WATCH', 'OTT', 'IT'): return 'Gadget'
    if h == 'IOT' or (h == 'T' and len(p) > 1 and p[1] == 'IOT'): return 'IOT'
    return None

def _load(name):
    fp = os.path.join(ST, name)
    return pd.read_csv(fp, dtype=str, keep_default_na=False, na_values=['']) if os.path.exists(fp) else None

def _save(df, name): df.to_csv(os.path.join(ST, name), index=False, compression='gzip' if name.endswith('.gz') else None)

def _meta():
    fp = os.path.join(ST, 'meta.json'); return json.load(open(fp)) if os.path.exists(fp) else {}

def _meta_set(**kw):
    m = _meta(); m.update(kw); json.dump(m, open(os.path.join(ST, 'meta.json'), 'w'), indent=1)

# ---------- inputs
def add_sales(raw):
    if 'DESCRIPTION' not in raw: return
    g = raw.DESCRIPTION.map(group)
    v = raw[g.notna()].copy()
    if not len(v): print('gia: no GIA rows in this sales file'); return
    # accessories often have no serial: two identical lines in one bill are two pieces, so number repeats (#0, #1, ...)
    base = v[DEDUP].fillna('').astype(str).agg('|'.join, axis=1)
    v['key'] = (base + '#' + base.groupby(base).cumcount().astype(str)).map(lambda x: hashlib.sha1(x.encode()).hexdigest()[:16])
    v = v[['key'] + KEEP]
    bd = pd.to_datetime(v.BILL_DATE, format=FMT, errors='coerce'); v['_d'] = bd.dt.strftime('%Y-%m-%d')
    # A daily_sales file is a snapshot of its day(s): a bill cancelled later disappears from later files.
    # So for the file's main days (>= 100 rows: a real day of sales, also in a 1st-to-today export) the newer snapshot
    # REPLACES that day; stray rows of other days (late credit notes, old bills: a handful each) are only added if not there yet.
    rb = pd.to_datetime(raw.BILL_DATE, format=FMT, errors='coerce'); rd = rb.dt.strftime('%Y-%m-%d')
    cnt = rd.value_counts()
    main = {d for d, x in cnt.items() if x >= 100}
    day_asof = _meta().get('gia_day_asof', {}); file_asof = {d: rb[rd == d].max().strftime('%Y-%m-%d %H:%M:%S') for d in main}
    replace = {d for d in main if file_asof[d] >= day_asof.get(d, '')}
    added = 0; repl = 0
    for m, part in v.groupby(bd.dt.strftime('%Y-%m')):
        name = f'gia_sales_{m}.csv.gz'; old = _load(name)
        part = part[~(~part._d.isin(replace) & part._d.isin(main))]  # an OLDER snapshot of a main day adds nothing
        if old is not None:
            od = pd.to_datetime(old.BILL_DATE, format=FMT, errors='coerce').dt.strftime('%Y-%m-%d')
            drop = od.isin(replace); repl += int(drop.sum()); old = old[~drop]
            new = part[part._d.isin(replace) | ~part.key.isin(set(old.key))]
        else: new = part
        added += len(new)
        _save((new if old is None else pd.concat([old, new]))[['key'] + KEEP].sort_values(['BILL_DATE', 'key']), name)
    for d in replace: day_asof[d] = file_asof[d]
    m_ = _meta(); m_['gia_day_asof'] = day_asof
    if bd.notna().any() and bd.max().strftime('%Y-%m-%d %H:%M') > m_.get('gia_sales_asof', ''): m_['gia_sales_asof'] = bd.max().strftime('%Y-%m-%d %H:%M')
    json.dump(m_, open(os.path.join(ST, 'meta.json'), 'w'), indent=1)
    print(f'gia: sales {len(v):,} GIA rows · days replaced {sorted(replace) or "-"} ({repl:,} old rows) · rows written {added:,}')

def merge_target(fp, month=None):
    """Nami's report: per sheet, a row with 'Shop Code' in A starts a section (name in B); shop rows have an 8-digit code in A,
    Target Revenue Month in C and Target QTY Month in D. The month comes from the 'Total Revenue <Mon>' header or the file name."""
    import openpyxl
    wb = openpyxl.load_workbook(fp, data_only=False)
    rows, mon = [], None
    for ws in wb:
        sec = None; order = 0
        for r in ws.iter_rows(min_row=1, max_row=min(ws.max_row, 400)):
            a = r[0].value; b = r[1].value if len(r) > 1 else None
            if isinstance(a, str) and a.strip().lower() == 'shop code':
                sec = str(b or '').strip(); order += 1
                for c in r:
                    m_ = re.match(r'total revenue\s+([a-z]{3})', str(c.value or ''), re.I)
                    if m_ and not mon: mon = m_.group(1).title()
                continue
            code = str(a).strip() if a is not None else ''
            if re.fullmatch(r'\d{8}', code) and sec is not None:
                def num(c):
                    try: return float(c.value)
                    except (TypeError, ValueError): return None
                rows.append({'area': ws.title.strip(), 'section': sec, 'sec_no': order, 'row': r[0].row, 'shop': code, 'name': str(b or '').strip(),
                             'target_rev': num(r[2]), 'target_qty': num(r[3])})
    if not rows: raise RuntimeError('gia: no shop rows found in ' + os.path.basename(fp))
    if not month:
        if not mon:
            m_ = re.search(r'(' + '|'.join(MON) + r')', os.path.basename(fp), re.I); mon = m_.group(1).title() if m_ else None
        if not mon: raise RuntimeError('gia: cannot tell the month of ' + os.path.basename(fp))
        today = datetime.date.today(); mi = MON.index(mon) + 1
        yr = today.year if mi >= today.month - 6 else today.year + 1
        if mi > today.month + 6: yr -= 1
        month = f'{yr}-{mi:02d}'
    t = pd.DataFrame(rows); t.insert(0, 'month', month)
    old = _load('gia_targets.csv')
    out = pd.concat([old[old.month != month], t.astype(str)]) if old is not None else t
    _save(out, 'gia_targets.csv'); shutil.copy(fp, os.path.join(ST, 'gia_template.xlsx'))
    print(f'gia: targets {month}: {len(t)} shops, revenue {t.target_rev.sum():,.0f}, qty {t.target_qty.sum():,.0f}')

# ---------- build
def _sales(month):
    s = _load(f'gia_sales_{month}.csv.gz')
    if s is None: return pd.DataFrame(columns=KEEP + ['day', 'grp', 'n', 'q'])
    bd = pd.to_datetime(s.BILL_DATE, format=FMT, errors='coerce')
    s = s[bd.notna()].copy(); bd = bd[bd.notna()]
    s['day'] = bd.dt.day; s['hour'] = bd.dt.hour; s['grp'] = s.DESCRIPTION.map(group)
    s['n'] = pd.to_numeric(s.NET_AMOUNT, errors='coerce').fillna(0); s['q'] = pd.to_numeric(s.QTY, errors='coerce').fillna(0)
    return s[s.grp.notna()]

def build():
    tg = _load('gia_targets.csv')
    if tg is None: print('gia: no targets yet - skipped'); return
    months = sorted(set(tg.month) | {os.path.basename(f)[10:17] for f in __import__('glob').glob(os.path.join(ST, 'gia_sales_*.csv.gz'))})
    meta = _meta(); asof = meta.get('gia_sales_asof', '')
    month = asof[:7] if asof[:7] in months else months[-1]
    t = tg[tg.month == month]
    if not len(t): t = tg[tg.month == tg.month.max()]  # new month without a target file yet: keep the shop list, flag it
    t = t.copy(); t['target_rev'] = pd.to_numeric(t.target_rev, errors='coerce').fillna(0); t['target_qty'] = pd.to_numeric(t.target_qty, errors='coerce').fillna(0)
    t['row'] = pd.to_numeric(t.row); t['sec_no'] = pd.to_numeric(t.sec_no)
    s = _sales(month); s = s[s.SHOP_CODE.isin(set(t.shop))]
    y, m = map(int, month.split('-')); dim = calendar.monthrange(y, m)[1]
    days_with = sorted(int(d) for d in s.day.unique())
    last = int(asof[8:10]) if asof[:7] == month else (days_with[-1] if days_with else 1)
    # per shop x day x group
    agg = s.groupby(['SHOP_CODE', 'day', 'grp']).agg(n=('n', 'sum'), q=('q', 'sum')).reset_index()
    daily = {}
    for r in agg.itertuples():
        daily.setdefault(r.SHOP_CODE, {}).setdefault(str(r.day), {})[r.grp] = [round(r.n, 2), round(r.q, 2)]
    # top products (month to date) per shop
    top = s.groupby(['SHOP_CODE', 'grp', 'DESCRIPTION']).agg(n=('n', 'sum'), q=('q', 'sum'), last=('day', 'max')).reset_index()
    prod = [{'shop': r.SHOP_CODE, 'g': r.grp, 'd': r.DESCRIPTION, 'n': round(r.n, 2), 'q': r.q, 'last': int(r.last)} for r in top.itertuples()]
    # each product row with its day so the page can filter by day
    pday = s.groupby(['SHOP_CODE', 'day', 'grp', 'DESCRIPTION']).agg(n=('n', 'sum'), q=('q', 'sum')).reset_index()
    pdays = [[r.SHOP_CODE, int(r.day), r.grp, r.DESCRIPTION, round(r.n, 2), r.q] for r in pday.itertuples()]
    hours = s[s.day == last].groupby('hour').agg(n=('n', 'sum'), q=('q', 'sum')).reset_index()
    shops = [{'area': r.area, 'areaName': AREA.get(r.area, r.area), 'section': r.section, 'sec': int(r.sec_no), 'row': int(r.row), 'shop': r.shop, 'name': r.name,
              'tr': round(r.target_rev, 2), 'tq': round(r.target_qty, 4)} for r in t.sort_values(['area', 'row'], key=lambda c: c.map({'UN': 0, 'LN': 1}) if c.name == 'area' else c).itertuples()]
    data = {'month': month, 'mon': MON[m - 1], 'dim': dim, 'asof': asof, 'last': last, 'days': days_with, 'target_month': t.month.iloc[0],
            'shops': shops, 'daily': daily, 'pdays': pdays, 'hours': [[int(r.hour), round(r.n, 2), r.q] for r in hours.itertuples()]}
    os.makedirs(OUT, exist_ok=True)
    json.dump(data, open(os.path.join(OUT, 'gia_data.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    files = build_xlsx(data)
    tot = s.n.sum(); print(f'gia: built {month} as of {asof}: {len(shops)} shops, MTD net {tot:,.0f}, qty {s.q.sum():,.0f}, days {days_with}, xlsx {len(files)}')

def _shop_day(data, shop, d):
    x = data['daily'].get(shop, {}).get(str(d), {}); return sum(v[0] for v in x.values()), sum(v[1] for v in x.values())

def _shop_mtd(data, shop, d):
    n = q = 0
    for k, x in data['daily'].get(shop, {}).items():
        if int(k) <= d: n += sum(v[0] for v in x.values()); q += sum(v[1] for v in x.values())
    return n, q

def build_xlsx(data):
    """Nami's template with the numbers filled in as values (no links to other workbooks), one file per day."""
    import openpyxl
    tp = os.path.join(ST, 'gia_template.xlsx')
    if not os.path.exists(tp): return []
    od = os.path.join(ROOT, 'gia', 'xlsx'); os.makedirs(od, exist_ok=True)
    for f in os.listdir(od): os.remove(os.path.join(od, f))
    by = {(s['area'], s['row']): s for s in data['shops']}
    out = []
    days = [d for d in range(1, data['last'] + 1)]
    for d in days:
        wb = openpyxl.load_workbook(tp)
        wb._external_links = []
        for ws in wb:
            secrows, shoprows = [], []
            for r in range(1, min(ws.max_row, 400) + 1):
                a = ws.cell(r, 1).value
                if isinstance(a, str) and a.strip().lower() == 'shop code':
                    secrows.append(r)
                    for c in range(1, 22):
                        v = ws.cell(r, c).value
                        if isinstance(v, str) and re.match(r'revenue day', v, re.I): ws.cell(r, c).value = f'Revenue Day {d}'
                        if isinstance(v, str) and re.match(r'total (revenue|qty)\s+[a-z]{3}', v, re.I): ws.cell(r, c).value = re.sub(r'([a-z]{3})$', data['mon'], v.strip(), flags=re.I)
                        if isinstance(v, str) and re.match(r'%ach (revenue|qty)\s+[a-z]{3}', v, re.I): ws.cell(r, c).value = re.sub(r'([a-z]{3})$', data['mon'], v.strip(), flags=re.I)
                elif (ws.title.strip(), r) in by:
                    s = by[(ws.title.strip(), r)]; shoprows.append(r)
                    dn, dq = _shop_day(data, s['shop'], d); mn, mq = _shop_mtd(data, s['shop'], d)
                    tr, tq = s['tr'], s['tq']; tpd, qpd = tr / data['dim'], tq / data['dim']
                    rv = ws.cell(r, 18).value; rv = rv if isinstance(rv, (int, float)) else 0
                    vals = {3: tr, 4: tq, 5: tpd, 6: qpd, 7: dn, 8: dn / tpd if tpd else 0, 9: dq, 10: dq / qpd if qpd else 0,
                            11: mn, 12: mq, 13: mn / tr if tr else 0, 14: mq / tq if tq else 0}
                    if ws.cell(r, 20).value is not None: vals[20] = rv + dn; vals[21] = (rv + dn) / tpd if tpd else 0
                    for c, v in vals.items(): ws.cell(r, c).value = v
                elif isinstance(ws.cell(r, 2).value, str) and ws.cell(r, 2).value.strip().lower().startswith('total'):
                    sm = lambda c: sum((ws.cell(x, c).value or 0) for x in shoprows)
                    tot = {c: sm(c) for c in (3, 4, 5, 6, 7, 9, 11, 12)}
                    tot[8] = tot[7] / tot[5] if tot[5] else 0; tot[10] = tot[9] / tot[6] if tot[6] else 0
                    tot[13] = tot[11] / tot[3] if tot[3] else 0; tot[14] = tot[12] / tot[4] if tot[4] else 0
                    if ws.cell(r, 20).value is not None:
                        tot[20] = sum((ws.cell(x, 20).value or 0) for x in shoprows); tot[21] = tot[20] / tot[5] if tot[5] else 0
                    for c, v in tot.items(): ws.cell(r, c).value = v
            # days left in the month (S1 next to 'DAY')
            for c in range(1, 22):
                if str(ws.cell(1, c).value or '').strip().upper() == 'DAY': ws.cell(1, c + 1).value = data['dim'] - d
        name = f"GIA_North_{data['mon']}_{d}.xlsx"; wb.save(os.path.join(od, name)); out.append(name)
    return out
