"""Shop Performance Dashboard (Upper North) - pipeline part. Page: /prepay-dashboard/performance/

Called from update.py (an error here never stops the Prepay update):
  merge_target(xlsx)     'Retail WW Target of <Mon> <yy>' -> state/perf_targets.csv
                         (month x shop x product: q = Target Subscribers/Units, n = Target Revenue) for the Upper North shops
  merge_indtarget(xlsx)  'Retail WW Individual Target of <Mon> <yy>' (sheet Indy Target) -> state/perf_ind_targets.csv (per employee)
  add_sales(raw)         every daily_sales file -> state/perf_dev_<YYYY-MM>.csv.gz: Device lines (H/S, IPAD, TABLET; FOC not counted)
                         of the Upper North shops, summed per day x shop x SALE_CODE. A file's main days (>= 100 rows) REPLACE that day
                         when the file is newer (meta.json perf_day_asof), like gia.py.
  build()                -> out/perf_data.json (perf_page.py inlines it into performance/index.html)
GIA actuals come from gia.py's state/gia_sales_<YYYY-MM>.csv.gz (same GIA rule as the GIA Dashboard).
Postpay / True Online / True Visions actuals: not wired yet (waiting for the report from Nami).
Shops (Nami, 13 Nov 2026): region UPC - Upper North in the target file, without the Lotus's-company shops (Nan, Hangdong, Chiang Khong) = 17 shops.
GIA target = column ACC of the target file (Nami, 13 Nov 2026). Device = H/S incl. tablets + iPad (Nami, 13 Nov 2026).
"""
import calendar, datetime, json, os, re
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__)); ST = os.path.join(HERE, 'state'); OUT = os.path.join(HERE, 'out')
FMT = '%m/%d/%Y %I:%M:%S %p'
MON = {m: i + 1 for i, m in enumerate(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])}
PRODUCTS = ['Postpay', 'True Online', 'Device', 'GIA', 'True Visions']
# target file (sheet RETAIL, header row with CODE): Target Subscribers / Target Revenue columns by header name
T_Q = {'Postpay': ('POST', 0), 'True Online': ('TOL', 0), 'Device': ('DEVICE', 0), 'GIA': ('ACC', 0), 'True Visions': ('TVS', 0)}
T_N = {'Postpay': ('POST', 2), 'True Online': ('TOL', 2), 'Device': ('DEV', 1), 'GIA': ('ACC', 1), 'True Visions': ('TVS', 2)}
# Indy Target sheet: column positions (header row 2)
I_Q = {'Postpay': 16, 'True Online': 20, 'Device': 24, 'GIA': 25, 'True Visions': 18}
I_N = {'Postpay': 34, 'True Online': 42, 'Device': 45, 'GIA': 46, 'True Visions': 38}
REGION = 'Upper North'; EXCLUDE_TYPES = {"Lotus's"}

def _p(n): return os.path.join(ST, n)
def _load(n, **kw): return pd.read_csv(_p(n), dtype=str, keep_default_na=False, na_values=[''], **kw) if os.path.exists(_p(n)) else None
def _save(df, n): df.to_csv(_p(n), index=False, compression='gzip' if n.endswith('.gz') else None)
def _meta(): return json.load(open(_p('meta.json'))) if os.path.exists(_p('meta.json')) else {}
def _month_of(name):
    m = re.search(r'of[ _]([A-Za-z]{3})[a-z]*[ _](\d{2})', os.path.basename(name))
    return f"20{m.group(2)}-{MON[m.group(1).title()]:02d}" if m else None
def shops():
    t = _load('perf_targets.csv')
    if t is None: return set()
    return set(t[t.month == t.month.max()].shop)

def merge_target(fp):
    month = _month_of(fp)
    if not month: print('perf: target file name has no month', fp); return
    d = pd.read_excel(fp, header=None, dtype=str)
    hr = next(i for i in range(len(d)) if str(d.iat[i, 1]).strip().upper() == 'CODE')
    h = [str(v).strip().upper() for v in d.iloc[hr].tolist()]
    def col(name, nth):
        idx = [j for j, v in enumerate(h) if v == name]; return idx[nth]
    x = d.iloc[hr + 1:]; x = x[x[1].notna() & x[1].astype(str).str.match(r'^\d')]
    x = x[x[3].astype(str).str.strip().str.endswith(REGION) & ~x[4].astype(str).str.strip().isin(EXCLUDE_TYPES)]
    rows = []
    for _, r in x.iterrows():
        for p in PRODUCTS:
            rows.append({'month': month, 'shop': str(r[1]).strip(), 'name': str(r[2]).strip(), 'type': str(r[4]).strip(), 'product': p,
                         'q': round(float(pd.to_numeric(r[col(*T_Q[p])], errors='coerce') or 0), 2), 'n': round(float(pd.to_numeric(r[col(*T_N[p])], errors='coerce') or 0), 0)})
    new = pd.DataFrame(rows); old = _load('perf_targets.csv')
    out = pd.concat([old[old.month != month], new.astype(str)]) if old is not None else new
    _save(out, 'perf_targets.csv'); print(f'perf: targets {month}: {new.shop.nunique()} shops')

def merge_indtarget(fp):
    month = _month_of(fp)
    if not month: return
    d = pd.read_excel(fp, sheet_name='Indy Target', header=1, dtype=str); d = d[d.emp_id8.notna()]
    sh = shops() or set()
    if not sh: print('perf: no shop targets yet - individual targets skipped'); return
    d = d[d.shop_code.astype(str).str.strip().isin(sh)]
    rows = []
    for _, r in d.iterrows():
        v = r.tolist()
        for p in PRODUCTS:
            rows.append({'month': month, 'emp': str(v[1]).strip(), 'name': f'{v[2]} {v[3]}'.strip(), 'role': v[6], 'shop': str(v[8]).strip(), 'product': p,
                         'q': round(float(pd.to_numeric(v[I_Q[p]], errors='coerce') or 0), 2), 'n': round(float(pd.to_numeric(v[I_N[p]], errors='coerce') or 0), 0)})
    new = pd.DataFrame(rows); old = _load('perf_ind_targets.csv')
    out = pd.concat([old[old.month != month], new.astype(str)]) if old is not None else new
    _save(out, 'perf_ind_targets.csv'); print(f'perf: individual targets {month}: {new.emp.nunique()} staff')

def is_device(desc):
    p = [x.strip().upper() for x in str(desc).split(',')]
    return 'FOC' not in p and p[0] in ('H/S', 'IPAD', 'TABLET')

def add_sales(raw):
    if 'DESCRIPTION' not in raw: return
    sh = shops()
    if not sh: print('perf: no shop list yet (attach a Target of <Mon> file)'); return
    bd = pd.to_datetime(raw.BILL_DATE, format=FMT, errors='coerce'); day = bd.dt.strftime('%Y-%m-%d')
    cnt = day.value_counts(); main = {d for d, x in cnt.items() if x >= 100}
    m_ = _meta(); asof = m_.get('perf_day_asof', {})
    f_asof = {d: bd[day == d].max().strftime('%Y-%m-%d %H:%M:%S') for d in main}
    replace = {d for d in main if f_asof[d] >= asof.get(d, '')}
    v = raw[raw.SHOP_CODE.astype(str).str.strip().isin(sh) & raw.DESCRIPTION.map(is_device) & day.isin(replace)].copy()
    v['day'] = day[v.index]; v['q'] = pd.to_numeric(v.QTY, errors='coerce').fillna(0); v['n'] = pd.to_numeric(v.NET_AMOUNT, errors='coerce').fillna(0)
    v['emp'] = v.SALE_CODE.fillna('').astype(str).str.strip()
    agg = v.groupby(['day', 'SHOP_CODE', 'emp'], as_index=False).agg(q=('q', 'sum'), n=('n', 'sum')).rename(columns={'SHOP_CODE': 'shop'})
    for m in sorted({d[:7] for d in replace}):
        name = f'perf_dev_{m}.csv.gz'; old = _load(name)
        days = {d for d in replace if d[:7] == m}
        part = agg[agg.day.isin(days)]
        out = pd.concat([old[~old.day.isin(days)], part.astype(str)]) if old is not None else part
        _save(out.sort_values(['day', 'shop', 'emp']), name)
    for d in replace: asof[d] = f_asof[d]
    m_ = _meta(); m_['perf_day_asof'] = asof
    if bd.notna().any(): m_['perf_sales_asof'] = max(m_.get('perf_sales_asof', ''), bd.max().strftime('%Y-%m-%d %H:%M'))
    json.dump(m_, open(_p('meta.json'), 'w'), indent=1)
    print(f'perf: device days {sorted(replace) or "-"} · {int(v.q.sum())} units')

def _gia_actual(month, sh):
    g = _load(f'gia_sales_{month}.csv.gz')
    if g is None: return pd.DataFrame(columns=['day', 'shop', 'emp', 'q', 'n'])
    g = g[g.SHOP_CODE.isin(sh)].copy()
    g['day'] = pd.to_datetime(g.BILL_DATE, format=FMT, errors='coerce').dt.strftime('%Y-%m-%d')
    g['q'] = pd.to_numeric(g.QTY, errors='coerce').fillna(0); g['n'] = pd.to_numeric(g.NET_AMOUNT, errors='coerce').fillna(0)
    g['emp'] = g.SALE_CODE.fillna('').astype(str).str.strip()
    return g.groupby(['day', 'SHOP_CODE', 'emp'], as_index=False).agg(q=('q', 'sum'), n=('n', 'sum')).rename(columns={'SHOP_CODE': 'shop'})

def build():
    t = _load('perf_targets.csv')
    if t is None: print('perf: no targets - page not built'); return
    for c in ('q', 'n'): t[c] = pd.to_numeric(t[c])
    it = _load('perf_ind_targets.csv')
    if it is not None:
        for c in ('q', 'n'): it[c] = pd.to_numeric(it[c])
    m_ = _meta(); cur = t.month.max()
    y, mo = map(int, cur.split('-')); prev = f'{y - (mo == 1)}-{(mo - 2) % 12 + 1:02d}'
    sh = sorted(set(t[t.month == cur].shop)); names = t[t.month == cur].drop_duplicates('shop').set_index('shop')[['name', 'type']]
    months = {}
    for m in (prev, cur):
        tm = t[t.month == m]
        dev = _load(f'perf_dev_{m}.csv.gz')
        if dev is not None:
            for c in ('q', 'n'): dev[c] = pd.to_numeric(dev[c])
        gia = _gia_actual(m, sh)
        act = {'Device': dev, 'GIA': gia if len(gia) else None}
        days = sorted(set().union(*[set(a.day) for a in act.values() if a is not None])) if any(a is not None for a in act.values()) else []
        dim = calendar.monthrange(int(m[:4]), int(m[5:]))[1]
        last = days[-1] if days else None
        frac = (int(last[8:]) / dim) if (last and m == cur) else 1.0
        S = {}
        for s in sh:
            S[s] = {}
            for p in PRODUCTS:
                tr = tm[(tm.shop == s) & (tm['product'] == p)]
                a = act.get(p)
                row = {'tq': float(tr.q.sum()), 'tn': float(tr.n.sum())}
                if a is not None:
                    aa = a[a.shop == s]; row.update({'aq': float(aa.q.sum()), 'an': float(aa.n.sum())})
                S[s][p] = row
        E = {}
        if it is not None:
            im = it[it.month == m]
            for emp, g in im.groupby('emp'):
                r0 = g.iloc[0]; e = {'name': r0['name'], 'role': r0.role, 'shop': r0.shop, 'p': {}}
                for p in PRODUCTS:
                    tr = g[g['product'] == p]; row = {'tq': float(tr.q.sum()), 'tn': float(tr.n.sum())}
                    a = act.get(p)
                    if a is not None:
                        aa = a[a.emp == emp]; row.update({'aq': float(aa.q.sum()), 'an': float(aa.n.sum())})
                    e['p'][p] = row
                E[emp] = e
        months[m] = {'has_target': bool(len(tm)), 'has_ind': it is not None and bool(len(it[it.month == m])), 'last_day': last, 'days_in_month': dim,
                     'frac': round(frac, 4), 'actual_products': [p for p, a in act.items() if a is not None and len(a)], 'shops': S, 'staff': E}
    data = {'cur': cur, 'prev': prev, 'products': PRODUCTS, 'shops': [{'shop': s, 'name': names.loc[s, 'name'], 'type': names.loc[s, 'type']} for s in sh],
            'months': months, 'sales_asof': m_.get('perf_sales_asof', ''),
            'notes': {'pending_actual': ['Postpay', 'True Online', 'True Visions']}}
    os.makedirs(OUT, exist_ok=True); json.dump(data, open(os.path.join(OUT, 'perf_data.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    c = months[cur]; print(f"perf: built {cur} (to {c['last_day']}, frac {c['frac']}) · {len(sh)} shops · {len(c['staff'])} staff · actual {c['actual_products']}")
