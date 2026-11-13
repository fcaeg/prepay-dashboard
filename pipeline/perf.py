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
  merge_postpay(xlsx)    '3.Self Refresh Postpaid Rawdata This year <yyyy> For DB' (sheet Rawdata, one row per sale, whole year)
                         -> state/perf_post.csv (month x day x shop x activity x SIM_STATUS: q = QTY, n = NET_AMOUNT); months in the file replace.
                         Postpay Net Amount is compared with the target's POST_NEW revenue (acquisition), QTY with POST subscribers.
                         Lines with SIM_STATUS Suspend / Terminate are not counted (Nami, 14 Nov 2026). The file has no salesperson, so Staff Productivity shows Postpay as 'no data'.
Service & Retention: merge_retention (Retention_Shops_<date> <product>.csv), %Save vs 88%.\nTVS includes bundles (tvs_flag; Net of a bundled unit = QTY x TVS target revenue per unit).
True Online / True Visions: the same Self Refresh Rawdata format (merge_tol / merge_tvs); Net Amount vs TOL_NEW / TVS_NEW revenue (Nami, 14 Nov 2026).
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
T_N = {'Postpay': ('POST_NEW', 0), 'True Online': ('TOL_NEW', 0), 'Device': ('DEV', 1), 'GIA': ('ACC', 1), 'True Visions': ('TVS_NEW', 0)}
# Indy Target sheet: column positions (header row 2)
I_Q = {'Postpay': 16, 'True Online': 20, 'Device': 24, 'GIA': 25, 'True Visions': 18}
I_N = {'Postpay': 31, 'True Online': 40, 'Device': 45, 'GIA': 46, 'True Visions': 36}
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

def tvs_flag(product, get):
    """TVS sold in a bundle (Nami, 14 Nov 2026: TVS counts bundles with True Online / Postpay):
    Postpay price plan type with 'TVS' (5G DEVICE TVS) and TOL campaign code 3P.../4P... (3POTT, 4POTT) = 'tvs_bundle';
    a TVS NOW 'REDEEM ... POSTPAID / TOL' line is that bundle's entitlement = 'redeem_bundle' (not counted again)."""
    if product == 'Postpay': return 'tvs_bundle' if 'TVS' in str(get('PRICE_PLAN_TYPE') or '').upper() else ''
    if product == 'True Online': return 'tvs_bundle' if re.match(r'^[34]P', str(get('CAMPIGN_CODE') or '').strip().upper()) else ''
    if product == 'True Visions':
        g = str(get('GP_SPECIAL_SKU') or get('CAMPAIGN') or '').upper()
        return 'redeem_bundle' if 'REDEEM' in g and ('POSTPAID' in g or 'TOL' in g) else ''
    return ''

RAW = {'Postpay': 'perf_post.csv', 'True Online': 'perf_tol.csv', 'True Visions': 'perf_tvs.csv'}

def merge_raw(fp, product):
    """'3.Self Refresh <Postpaid|TrueOnline|TrueVision> Rawdata This year <yyyy> For DB' (sheet Rawdata, one row per sale, whole year)"""
    import openpyxl
    sh = shops()
    if not sh: print(f'perf: no shop list yet - {product} skipped'); return
    wb = openpyxl.load_workbook(fp, read_only=True); ws = wb['Rawdata'] if 'Rawdata' in wb.sheetnames else wb.worksheets[-1]
    it = ws.iter_rows(values_only=True); h = [str(x).strip() for x in next(it)]
    ix = {c: h.index(c) for c in ['SHOP_CODE', 'BM', 'DAY', 'QTY', 'NET_AMOUNT', 'DATA_ASOF_DATE']}
    opt = {c: h.index(c) for c in ['SIM_STATUS', 'ACTIVITY_GROUP'] if c in h}
    hx = {c: i for i, c in enumerate(h)}
    rows = []; months = set(); asof = ''
    for r in it:
        bm = str(r[ix['BM']] or '').strip()
        if len(bm) == 6: months.add(f'{bm[:4]}-{bm[4:]}')
        if str(r[ix['SHOP_CODE']] or '').strip() not in sh: continue
        asof = max(asof, str(r[ix['DATA_ASOF_DATE']] or '')[:10])
        rows.append((f'{bm[:4]}-{bm[4:]}', int(float(r[ix['DAY']] or 0)), str(r[ix['SHOP_CODE']]).strip(),
                     str(r[opt['ACTIVITY_GROUP']] or '') if 'ACTIVITY_GROUP' in opt else '', str(r[opt['SIM_STATUS']] or '') if 'SIM_STATUS' in opt else '',
                     tvs_flag(product, lambda c: r[hx[c]] if c in hx else None), float(r[ix['QTY']] or 0), float(r[ix['NET_AMOUNT']] or 0)))
    d = pd.DataFrame(rows, columns=['month', 'day', 'shop', 'activity', 'sim_status', 'flag', 'q', 'n'])
    d = d.groupby(['month', 'day', 'shop', 'activity', 'sim_status', 'flag'], as_index=False)[['q', 'n']].sum()
    old = _load(RAW[product])
    out = pd.concat([old[~old.month.isin(months)], d.astype(str)]) if old is not None else d
    _save(out.sort_values(['month', 'day', 'shop']), RAW[product])
    m_ = _meta(); m_.setdefault('perf_raw_asof', {})[product] = asof
    if product == 'Postpay': m_['perf_post_asof'] = asof
    json.dump(m_, open(_p('meta.json'), 'w'), indent=1)
    print(f'perf: {product} months {sorted(months)} · UN rows {len(rows)} · as of {asof} · qty', round(d.q.sum()))

def merge_postpay(fp): merge_raw(fp, 'Postpay')
def merge_tol(fp): merge_raw(fp, 'True Online')
def merge_tvs(fp): merge_raw(fp, 'True Visions')

def _raw_lines(month, product):
    p = _load(RAW[product])
    if p is None: return None
    p = p[(p.month == month) & ~p.sim_status.fillna('').str.upper().str.contains('SUSPEND|TERMINATE')].copy()  # Nami, 14 Nov 2026
    if not len(p): return None
    for c in ('q', 'n'): p[c] = pd.to_numeric(p[c])
    p['day'] = month + '-' + p.day.astype(int).map('{:02d}'.format); p['emp'] = ''
    p['flag'] = p['flag'].fillna('') if 'flag' in p else ''
    return p[['day', 'shop', 'emp', 'flag', 'q', 'n']]

def _agg(d): return None if d is None or not len(d) else d.groupby(['day', 'shop', 'emp'], as_index=False)[['q', 'n']].sum()

def _mix(lines, rate):
    """lines: product -> line frame (day, shop, emp, flag, q, n) -> product -> aggregated actuals, where TVS = TVS lines except
    'redeem_bundle' + Postpay / TOL 'tvs_bundle' lines (their QTY; Net = QTY x the month's TVS target revenue per unit)."""
    out = {p: _agg(d) for p, d in lines.items()}
    parts = []
    if lines.get('True Visions') is not None: parts.append(lines['True Visions'][lines['True Visions'].flag != 'redeem_bundle'])
    for p in ('Postpay', 'True Online'):
        d = lines.get(p)
        if d is not None:
            b = d[d.flag == 'tvs_bundle'].copy(); b['n'] = b.q * rate; parts.append(b)
    if parts: out['True Visions'] = _agg(pd.concat(parts))
    return out

ALLPROD = {'DEVICE': 'Device', 'GIA': 'GIA', 'POSTPAID': 'Postpay', 'TRUEONLINE': 'True Online', 'TRUEVISION': 'True Visions'}

# breakdown dimensions per product (whichever columns the sheet has); used by the per-axis analysis on the page
DIMS = {'Postpay': ['ACTIVITY_GROUP', 'GP_SKU', 'CAMPAIGN_GROUP_LV1', 'NET_RC_TIER', 'BRAND'],
        'True Online': ['CAMPIGN_CODE', 'RC_TIER', 'FLAG_BUNDLE', 'TECHNOLOGY'],
        'True Visions': ['SUB_PRODUCT', 'GP_SKU'],
        'Device': ['BRAND', 'CATEGORY', 'SUB_CATEGORY', 'PRICE_TIER', 'CAPACITY'],
        'GIA': ['CATEGORY', 'SUB_CATEGORY', 'BRAND']}

def merge_allprod(fp):
    """'Self Refresh All Product Rawdata Latest 2 Months For DB' - one sheet per product (PREPAID skipped), each line with SALE_ID.
    -> state/perf_allprod.csv (product x month x day x shop x emp x SIM_STATUS: q, n); months in the file replace those months.
    Used for staff-level Postpay / TOL / TVS, and for Device / GIA of a month with no TSM daily_sales (e.g. Oct 2026)."""
    import openpyxl
    sh = shops()
    if not sh: print('perf: no shop list yet - all-product file skipped'); return
    import collections
    wb = openpyxl.load_workbook(fp, read_only=True); rows = []; months = set(); asof = {}
    dims = collections.defaultdict(lambda: [0.0, 0.0]); dshops = collections.defaultdict(set); found = {}
    def add(month, product, scope, dim, val, q, n, shop):
        a = dims[(month, product, scope, dim, val)]; a[0] += q; a[1] += n; dshops[(month, product, scope)].add(shop)
    for sheet, product in ALLPROD.items():
        if sheet not in wb.sheetnames: continue
        it = wb[sheet].iter_rows(values_only=True); h = [str(x).strip() for x in next(it)]
        ix = {c: h.index(c) for c in ['SHOP_CODE', 'SALE_ID', 'BM', 'DAY', 'QTY', 'NET_AMOUNT', 'DATA_ASOF_DATE']}
        st = h.index('SIM_STATUS') if 'SIM_STATUS' in h else None
        hx = {c: i for i, c in enumerate(h)}
        dcols = [c for c in DIMS.get(product, []) if c in hx]; found[product] = dcols
        ag = hx.get('AREA_GROUP'); ww = hx.get('WW_FLAG')
        for r in it:
            bm = str(r[ix['BM']] or '').strip()
            if len(bm) == 6: months.add(f'{bm[:4]}-{bm[4:]}')
            code = str(r[ix['SHOP_CODE']] or '').strip(); mon = f'{bm[:4]}-{bm[4:]}'
            if st is not None and re.search('SUSPEND|TERMINATE', str(r[st] or '').upper()): pass
            elif ww is None or str(r[ww] or '').strip().upper() == 'WW':
                q_, n_ = float(r[ix['QTY']] or 0), float(r[ix['NET_AMOUNT']] or 0)
                g = str(r[ag] or '').strip().upper() if ag is not None else ''
                emp = str(r[ix['SALE_ID']] or '').strip()
                scopes = ([g] if g in ('UPC', 'BMA') else []) + (['UN', code] + (['E:' + emp] if emp else []) if code in sh else [])
                get = lambda c: str(r[hx[c]] if c in hx and r[hx[c]] is not None else '').strip()
                lucky = (('มงคล · ' + (get('CAMPAIGN_GROUP_LV2') or '-')) if get('CAMPAIGN_GROUP_LV1') == 'เบอร์มงคล' else 'เบอร์ทั่วไป') if product == 'Postpay' else None
                item = f"{get('SUB_MODEL') or get('PRODUCT_DESCRIPTION')}|{get('BRAND')}|{get('CATEGORY')} / {get('SUB_CATEGORY')}" if product in ('Device', 'GIA') else None
                fl = tvs_flag(product, lambda c: r[hx[c]] if c in hx else None)
                for sc in scopes:
                    add(mon, product, sc, 'ALL', 'ALL', q_, n_, code)
                    for c in dcols: add(mon, product, sc, c, str(r[hx[c]] if r[hx[c]] is not None else '').strip() or '(ว่าง)', q_, n_, code)
                    if lucky: add(mon, product, sc, 'เบอร์มงคล', lucky, q_, n_, code)
                    if item and sc not in ('UPC', 'BMA'): add(mon, product, sc, 'สินค้า', item, q_, n_, code)  # product | brand | category (local scopes only)
                    # TVS sources (TVS NOW without the bundle redeem + Postpay / TOL bundles) - same rule as the TVS axis
                    if product == 'True Visions' and fl != 'redeem_bundle': add(mon, 'True Visions', sc, 'ที่มา', 'TVS NOW ' + str(r[hx['SUB_PRODUCT']] if 'SUB_PRODUCT' in hx else '').replace('TVS NOW ', ''), q_, 0.0, code)
                    if product in ('Postpay', 'True Online') and fl == 'tvs_bundle': add(mon, 'True Visions', sc, 'ที่มา', 'Postpay 5G DEVICE TVS' if product == 'Postpay' else 'TOL 3P/4P OTT', q_, 0.0, code)
            if code not in sh: continue
            asof[product] = max(asof.get(product, ''), str(r[ix['DATA_ASOF_DATE']] or '')[:10])
            rows.append((product, f'{bm[:4]}-{bm[4:]}', int(float(r[ix['DAY']] or 0)), str(r[ix['SHOP_CODE']]).strip(), str(r[ix['SALE_ID']] or '').strip(),
                         str(r[st] or '') if st is not None else '', tvs_flag(product, lambda c: r[hx[c]] if c in hx else None),
                         float(r[ix['QTY']] or 0), float(r[ix['NET_AMOUNT']] or 0)))
    d = pd.DataFrame(rows, columns=['product', 'month', 'day', 'shop', 'emp', 'sim_status', 'flag', 'q', 'n'])
    d = d.groupby(['product', 'month', 'day', 'shop', 'emp', 'sim_status', 'flag'], as_index=False)[['q', 'n']].sum()
    old = _load('perf_allprod.csv')
    out = pd.concat([old[~old.month.isin(months)], d.astype(str)]) if old is not None else d
    _save(out.sort_values(['product', 'month', 'day', 'shop']), 'perf_allprod.csv')
    dd = pd.DataFrame([(*k, v[0], v[1], len(dshops[k[:3]])) for k, v in dims.items()], columns=['month', 'product', 'scope', 'dim', 'val', 'q', 'n', 'shops'])
    oldd = _load('perf_dims.csv')
    _save(pd.concat([oldd[~oldd.month.isin(months)], dd.astype(str)]) if oldd is not None else dd, 'perf_dims.csv')
    print('perf: breakdown columns found', found, '·', len(dd), 'rows')
    m_ = _meta(); m_['perf_allprod_asof'] = asof; json.dump(m_, open(_p('meta.json'), 'w'), indent=1)
    print(f'perf: all-product months {sorted(months)} · UN lines {len(rows)} · as of {asof} · qty by product', d.groupby('product').q.sum().round().to_dict())

def _allprod_lines(month):
    p = _load('perf_allprod.csv')
    if p is None: return {}
    p = p[(p.month == month) & ~p.sim_status.fillna('').str.upper().str.contains('SUSPEND|TERMINATE')].copy()
    for c in ('q', 'n'): p[c] = pd.to_numeric(p[c])
    p['day'] = month + '-' + p.day.astype(int).map('{:02d}'.format); p['emp'] = p.emp.fillna('')
    p['flag'] = p['flag'].fillna('') if 'flag' in p else ''
    return {k: g[['day', 'shop', 'emp', 'flag', 'q', 'n']] for k, g in p.groupby('product')}

# ---------- EBIT & Revenue: '<n>. <yyyy>_Performance Report (Model WW)_<Mon>'<yy> ....xlsb', sheet 'Data Model 2 WW' (P&L per shop per month) ----------
PL_FIELDS = {'man': (113, 'Man'), 'pers': (132, 'Personnel Expense'), 'front': (136, 'Total'), 'tx': (140, 'Total Transaction'),
             'rev_svc': (141, 'Rev. Sale Service'), 'rev_nonsale': (142, 'Rev.'), 'rev_prod': (143, 'Rev. Sale Product'), 'rev': (144, 'Total Rev.'),
             'gm': (148, 'Total Gross Margin'), 'var': (160, 'Total Cost'), 'ebitda': (162, 'EBITDA'), 'ebit': (169, 'EBIT'), 'rent': (176, 'ค่าเช่า'),
             'sqm': (187, 'Sum of SQM All')}
PL_TYPES = ['Matching', 'Non Matching', 'DTAC COCO', 'DTAC HALL']
PL_SUM = ['man', 'pers', 'front', 'tx', 'rev_svc', 'rev_nonsale', 'rev_prod', 'rev', 'gm', 'var', 'ebitda', 'ebit', 'rent', 'sqm']

def merge_pl(fp):
    """-> state/perf_pl_shop.csv (our shops, every month) + state/perf_pl_bench.csv (month x BMA/UPC x shop type sums, open shops;
    per-sqm sums only over shops with SQM). Values per sqm use SQM All (the P&L includes the True Coffee costs)."""
    sh = shops()
    d = pd.read_excel(fp, sheet_name='Data Model 2 WW', header=None, dtype=object, engine='pyxlsb' if fp.lower().endswith('.xlsb') else None)
    hr = next(i for i in range(min(30, len(d))) if str(d.iat[i, 0]).strip() == 'Shop Code WW')
    h = [str(v).strip() for v in d.iloc[hr].tolist()]
    for k, (j, nm) in PL_FIELDS.items():
        if not h[j].startswith(nm): raise RuntimeError(f'P&L column {j} is {h[j]!r}, expected {nm!r} - the report layout changed')
    x = d.iloc[hr + 1:]
    out = pd.DataFrame({'shop': x[0].astype(str).str.strip().str.replace(r'\.0$', '', regex=True), 'name': x[3].astype(str), 'type': x[6].astype(str).str.strip(),
                        'region': x[7].astype(str), 'status': x[8].astype(str).str.strip().str.lower(), 'month': x[9].astype(str).str.replace(r'\.0$', '', regex=True).str.zfill(6)})
    for k, (j, _) in PL_FIELDS.items(): out[k] = pd.to_numeric(x[j], errors='coerce').fillna(0.0)
    out['month'] = out.month.str[2:] + '-' + out.month.str[:2]
    out['grp'] = out.region.str.extract(r'(BMA|UPC)', expand=False)
    mine = out[out.shop.isin(sh)]
    _save(mine, 'perf_pl_shop.csv')
    b = out[out.status.eq('open') & out.type.isin(PL_TYPES) & out.grp.notna()].copy()
    for k in PL_SUM:
        if k != 'sqm': b[k + '_s'] = b[k].where(b.sqm > 0, 0.0)  # the same item, only shops that have an area
    bench = b.groupby(['month', 'grp', 'type'], as_index=False).agg(shops=('shop', 'size'), **{k: (k, 'sum') for k in PL_SUM}, **{k + '_s': (k + '_s', 'sum') for k in PL_SUM if k != 'sqm'})
    _save(bench, 'perf_pl_bench.csv')
    m_ = _meta(); m_['perf_pl_month'] = out.month.max(); json.dump(m_, open(_p('meta.json'), 'w'), indent=1)
    print(f'perf: P&L months {out.month.min()}..{out.month.max()} · our shops {mine.shop.nunique()} · bench rows {len(bench)}')

# Shops without an area in the report (DTAC COCO has none): Nami, 14 Nov 2026 - these three are 10 sqm each.
# Shops of a type with no per-sqm average are compared with UPC Non Matching.
PL_SQM_OVERRIDE = {'80101655': 10.0, '80101661': 10.0, '80101670': 10.0}
PL_BENCH_FALLBACK = 'Non Matching'

PL_AXES = [('Revenue / ตร.ม.', 'rev', 1, 'sqm'), ('GM / ตร.ม.', 'gm', 1, 'sqm'), ('EBIT / ตร.ม.', 'ebit', 1, 'sqm'),
           ('Front Cost / ตร.ม.', 'front', -1, 'sqm'), ('ค่าเช่า / ตร.ม.', 'rent', -1, 'sqm'),
           ('GM / พนักงาน', 'gm', 1, 'man')]  # Nami, 14 Nov 2026: GM per staff replaces Transactions per sqm

def _pl_build():
    s = _load('perf_pl_shop.csv'); b = _load('perf_pl_bench.csv')
    if s is None or b is None: return None
    for c in PL_SUM: s[c] = pd.to_numeric(s[c])
    ov = s.shop.map(PL_SQM_OVERRIDE); s['sqm'] = s.sqm.where(s.sqm > 0, ov).fillna(0.0)
    for c in b.columns:
        if c not in ('month', 'grp', 'type'): b[c] = pd.to_numeric(b[c])
    months = sorted(s.month.unique()); last = months[-1]; prev = months[-2] if len(months) > 1 else None
    def bench(m, grp, typ, k, unit):
        """group average per unit: per sqm over shops that have an area; per staff over all shops"""
        r = b[(b.month == m) & (b.grp == grp) & (b.type == typ)]
        if not len(r): return None
        num, den = (r[k + '_s'].sum(), r.sqm.sum()) if unit == 'sqm' else (r[k].sum(), r.man.sum())
        return float(num / den) if den > 0 else None
    def btype(m, typ, unit):  # a type with no average of its own (DTAC COCO per sqm) -> UPC Non Matching
        return typ if bench(m, 'UPC', typ, 'rev', unit) is not None else PL_BENCH_FALLBACK
    def idx(own, ben, sign):
        if own is None or ben is None or ben <= 0: return None
        if sign > 0: return max(0.0, own / ben * 100)
        return ben / own * 100 if own > 0 else None
    res = {'last': last, 'prev': prev, 'axes': [a[0] for a in PL_AXES], 'units': [a[3] for a in PL_AXES], 'months': {}}
    for m in [x for x in (prev, last) if x]:
        sm = s[s.month == m]; shops_out = {}; nexp = len(PL_AXES)
        a_own = [0.0] * nexp; a_den = [0.0] * nexp; a_exp = [0.0] * nexp; tot = {k: 0.0 for k in PL_SUM}
        for _, r in sm.iterrows():
            typ = r.type; row = {'type': typ, 'bench_type': btype(m, typ, 'sqm'), 'sqm': float(r.sqm), **{k: float(r[k]) for k in PL_SUM}}
            own_l, ben_l, idx_l = [], [], []
            for i, (lbl, k, sign, unit) in enumerate(PL_AXES):
                den = r.sqm if unit == 'sqm' else r.man
                bt = btype(m, typ, unit); ben = bench(m, 'UPC', bt, k, unit)
                own = (r[k] / den) if den > 0 else None
                own_l.append(own); ben_l.append(ben); idx_l.append(idx(own, ben, sign))
                if den > 0 and ben is not None: a_own[i] += r[k]; a_den[i] += den; a_exp[i] += ben * den
            row.update({'own': own_l, 'ben': ben_l, 'idx': idx_l})
            for k in PL_SUM: tot[k] += r[k]
            shops_out[r.shop] = row
        area_idx = [None if a_exp[i] <= 0 else (max(0.0, a_own[i] / a_exp[i] * 100) if PL_AXES[i][2] > 0 else (a_exp[i] / a_own[i] * 100 if a_own[i] > 0 else None)) for i in range(nexp)]
        types = sorted(set(sm.type) | {PL_BENCH_FALLBACK})
        ref = {g: {t: [bench(m, g, t, k, unit) for _, k, _, unit in PL_AXES] for t in types} for g in ('UPC', 'BMA')}
        # P&L lines per sqm for the drill-down: own vs UPC average of the same type (area: weighted by our shops' sqm)
        LINES = ['rev_prod', 'rev_svc', 'rev_nonsale', 'gm', 'pers', 'rent', 'var', 'front', 'ebitda', 'ebit', 'tx']
        lown = {k: 0.0 for k in LINES}; lexp = {k: 0.0 for k in LINES}; lsq = 0.0
        for _, r in sm.iterrows():
            if r.sqm <= 0: continue
            bt = btype(m, r.type, 'sqm'); lsq += r.sqm
            sl = {}
            for k in LINES:
                ben = bench(m, 'UPC', bt, k, 'sqm'); lown[k] += r[k]
                if ben is not None: lexp[k] += ben * r.sqm
                sl[k] = [r[k] / r.sqm, ben]
            shops_out[r.shop]['lines'] = sl
        area_lines = {k: [lown[k] / lsq if lsq else None, lexp[k] / lsq if lsq else None] for k in LINES}
        res['months'][m] = {'shops': shops_out, 'area_idx': area_idx, 'area_tot': tot, 'area_lines': area_lines,
                            'area_own': [a_own[i] / a_den[i] if a_den[i] else None for i in range(nexp)],
                            'area_ben': [a_exp[i] / a_den[i] if a_den[i] else None for i in range(nexp)],
                            'ref': ref, 'no_sqm': [sh for sh, v in shops_out.items() if not v['sqm']]}
    trend = s[s.month >= months[max(0, len(months) - 12)]].groupby('month')[['rev', 'gm', 'ebit', 'sqm']].sum()
    res['trend'] = [{'month': mm, **{k: float(v) for k, v in r.items()}} for mm, r in trend.iterrows()]
    return res

# ---------- Service & Retention: 'Retention_Shops_<yyyy-mm-dd> <Postpay|True Online|True Visions>.csv' (all shops, month to date) ----------
RET_PASS = 88.0  # Nami, 14 Nov 2026: %Save must reach 88%
RET_PRODUCTS = {'postpay': 'Postpay', 'true mobile': 'Postpay', 'true online': 'True Online', 'true visions': 'True Visions', 'true vision': 'True Visions'}

def merge_retention(fp):
    """-> state/perf_ret.csv: month x as-of day x product x shop (all shops, BMA/UPC from Region) with Req / Save / Cancel / Rev Req / Rev Save.
    The file is month to date; a newer file for the same month and product replaces it."""
    name = os.path.basename(fp)
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', name)
    if not m: print('perf: retention file has no date in its name', name); return
    asof = f'{m.group(1)}-{m.group(2)}-{m.group(3)}'; month = asof[:7]
    for enc in ('utf-8-sig', 'cp874'):
        try: d = pd.read_csv(fp, dtype=str, encoding=enc); break
        except UnicodeDecodeError: continue
    d.columns = [str(c).strip() for c in d.columns]
    prod = RET_PRODUCTS.get(str(d['Product'].dropna().iloc[0]).strip().lower()) if 'Product' in d and d['Product'].notna().any() else None
    if not prod:
        low = name.lower(); prod = next((v for k, v in RET_PRODUCTS.items() if k in low), None)
    if not prod: print('perf: retention product unknown', name); return
    num = lambda c: pd.to_numeric(d[c].astype(str).str.replace(',', '').str.replace('%', ''), errors='coerce').fillna(0)
    out = pd.DataFrame({'month': month, 'asof': asof, 'product': prod, 'shop': d['Shop Code'].astype(str).str.strip(), 'name': d['Shop'],
                        'grp': d['Region'].map(lambda r: 'BMA' if isinstance(r, str) and r.strip().upper().startswith('BMA') else 'UPC'), 'kpitype': d.get('KPIType', ''),
                        'req': num('Req'), 'save': num('Save'), 'cancel': num('Cancel'), 'rev_req': num('Rev Req'), 'rev_save': num('Rev Save')})
    old = _load('perf_ret.csv')
    if old is not None:
        cur = old[(old.month == month) & (old['product'] == prod)]
        if len(cur) and cur['asof'].max() > asof: print(f'perf: retention {prod} {asof} is older than {cur["asof"].max()} - skipped'); return
        old = old[~((old.month == month) & (old['product'] == prod))]
    _save(pd.concat([old, out.astype(str)]) if old is not None else out, 'perf_ret.csv')
    mine = out[out.shop.isin(shops())]
    print(f'perf: retention {prod} {asof}: {len(out)} shops, ours {len(mine)} · %Save ours {mine.save.sum() / max(mine.req.sum(), 1) * 100:.1f}%')

# Service Level / On Time / iCSAT (Nami, 14 Nov 2026: pass marks 85% / 95% / 92%); files of all shops, month to date:
#   ServiceLevel_Shops_<date>.csv  (Shop Code, Region BMA / UPC I / UPC II, Transactions, SL% Overall)  -> weight = Transactions
#   OnTime_by_Shop_<date>.csv      (Shop = name + code, Area WW, Close in due, Close over due, Pending over due) -> in due ÷ (in + over + pending over)
#   iCSAT_by_Shop_<date>.csv       (Shop = name + code, Area WW, survey counts, %iCSAT - <Mon> <yy>)    -> weight = surveys
SVC_PASS = {'Service Level': 85.0, 'iCsat': 92.0, 'On Time': 95.0}

def _code(v):
    m = re.search(r'(?<!\d)(80\d{6}|10\d{6})(?!\d)', str(v)); return m.group(1) if m else None

def merge_service(fp):
    name = os.path.basename(fp); low = name.lower()
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', name)
    if not m: print('perf: service file has no date in its name', name); return
    asof = f'{m.group(1)}-{m.group(2)}-{m.group(3)}'; month = asof[:7]
    for enc in ('utf-8-sig', 'cp874'):
        try: d = pd.read_csv(fp, dtype=str, encoding=enc); break
        except UnicodeDecodeError: continue
    d.columns = [str(c).strip() for c in d.columns]
    pct = lambda c: pd.to_numeric(d[c].astype(str).str.replace('%', '').str.replace(',', ''), errors='coerce')
    num = lambda c: pd.to_numeric(d[c].astype(str).str.replace(',', ''), errors='coerce').fillna(0)
    grp = lambda c: d[c].map(lambda r: 'BMA' if str(r if isinstance(r, str) else '').strip().upper().startswith('BMA') else 'UPC')  # blank cells stay NA in newer pandas
    if low.startswith('servicelevel'):
        kpi = 'Service Level'; den = num('Transactions'); p = pct('SL% Overall')
        out = pd.DataFrame({'shop': d['Shop Code'].map(_code), 'grp': grp('Region'), 'den': den, 'num': den * p / 100})
    elif low.startswith('ontime'):
        kpi = 'On Time'; ok = num('Close in due'); den = ok + num('Close over due') + num('Pending over due')
        out = pd.DataFrame({'shop': d['Shop'].map(_code), 'grp': grp('Area WW'), 'den': den, 'num': ok})
    elif low.startswith('icsat'):
        kpi = 'iCsat'; tot = [c for c in d.columns if c.endswith('- Total')][0]
        cur = [c for c in d.columns if c.startswith('%iCSAT') and 'MoM' not in c][0]  # the first %iCSAT column = this month
        den = num(tot); p = pct(cur).fillna(0)
        out = pd.DataFrame({'shop': d['Shop'].map(_code), 'grp': grp('Area WW'), 'den': den, 'num': den * p / 100})
    else: print('perf: unknown service file', name); return
    out = out[out.shop.notna()].assign(month=month, asof=asof, kpi=kpi)
    old = _load('perf_svc.csv')
    if old is not None:
        cur_ = old[(old.month == month) & (old.kpi == kpi)]
        if len(cur_) and cur_['asof'].max() > asof: print(f'perf: {kpi} {asof} is older than {cur_["asof"].max()} - skipped'); return
        old = old[~((old.month == month) & (old.kpi == kpi))]
    _save(pd.concat([old, out.astype(str)]) if old is not None else out, 'perf_svc.csv')
    mine = out[out.shop.isin(shops())]
    print(f'perf: {kpi} {asof}: {len(out)} shops, ours {len(mine)} · {mine.num.sum() / max(mine.den.sum(), 1) * 100:.1f}%')

def _svc_build():
    v = _load('perf_svc.csv')
    if v is None: return None
    for c in ('num', 'den'): v[c] = pd.to_numeric(v[c])
    sh = shops(); m = v.month.max(); x = v[v.month == m]; out = {'month': m, 'pass': SVC_PASS, 'asof': {}, 'area': {}, 'bench': {}, 'shops': {}}
    agg = lambda z: {'num': float(z.num.sum()), 'den': float(z.den.sum())}
    for k, y in x.groupby('kpi'):
        out['asof'][k] = y['asof'].max(); out['area'][k] = agg(y[y.shop.isin(sh)])
        out['bench'][k] = {'UPC': agg(y[y.grp == 'UPC']), 'BMA': agg(y[y.grp == 'BMA']), 'All': agg(y)}
        for _, r in y[y.shop.isin(sh)].iterrows(): out['shops'].setdefault(r.shop, {})[k] = {'num': float(r.num), 'den': float(r.den)}
    return out

# ---------- Sale Longevity (Nami, 14 Nov 2026): all shops, month to date ----------
#   True_Mobile_Care_Shops_<date>.csv (Target, Actual units) and Extended_W_Shops_<date>.csv (Target ฿, Actual ฿): vs target to date
#   Trade_In_Shops_<date>.csv (Handset, Trade-in): rate = trade-in ÷ handset, vs the UPC average ("use the average")
#   Downsell_SharePlan_by_shop.csv (RC Prev, Down Sell = RC Prev − RC Cur): % RC lost, vs the UPC average, lower is better
#   consent_shop_performance_<from>_<to>.csv (Customer Hub = consent; TARGET_CONSENT, CONSENT_ACQUISITION): vs target to the <to> date
LON = {'CH': ('Customer Hub', 'target'), 'TMC': ('True Mobile Care', 'target'), 'EXTW': ('Extended Warranty', 'target'), 'TI': ('Trade In', 'avg'), 'DS': ('Down Sell', 'avg_inv')}
LON_AXES = ['True Mobile Care', 'Extended Warranty', 'Trade In', 'Customer Hub', 'Down Sell']

def merge_longevity(fp):
    name = os.path.basename(fp); low = name.lower()
    ds = re.findall(r'\d{4}-\d{2}-\d{2}', name)  # a period file (consent_..._<from>_<to>) is as of its last date
    asof = max(ds) if ds else (datetime.datetime.utcnow() + datetime.timedelta(hours=7) - datetime.timedelta(days=1)).strftime('%Y-%m-%d')
    for enc in ('utf-8-sig', 'cp874'):
        try: d = pd.read_csv(fp, dtype=str, encoding=enc); break
        except UnicodeDecodeError: continue
    d.columns = [str(c).strip() for c in d.columns]
    num = lambda c: pd.to_numeric(d[c].astype(str).str.replace(',', '').str.replace('฿', ''), errors='coerce').fillna(0)
    d.columns = [c if c not in ('REGION', 'AREA', 'SHOP_CODE') else c.title().replace('_', ' ') for c in d.columns]
    area = 'Region' if 'Region' in d else 'Area'
    grp = d[area].map(lambda r: 'BMA' if isinstance(r, str) and r.strip().upper().startswith('BMA') else 'UPC')
    if low.startswith('true_mobile_care') or low.startswith('true mobile care'): k, n, dn = 'TMC', num('Actual'), num('Target')
    elif low.startswith('extended_w'): k, n, dn = 'EXTW', num('Actual ฿'), num('Target ฿')
    elif low.startswith('trade_in') or low.startswith('trade in'): k, n, dn = 'TI', num('Trade-in'), num('Handset')
    elif low.startswith('downsell'): k, n, dn = 'DS', num('Down Sell'), num('RC Prev')
    elif low.startswith('consent'): k, n, dn = 'CH', num('CONSENT_ACQUISITION'), num('TARGET_CONSENT')
    else: print('perf: unknown longevity file', name); return
    out = pd.DataFrame({'month': asof[:7], 'asof': asof, 'kpi': k, 'shop': d['Shop Code'].astype(str).str.extract(r'(\d{8})', expand=False), 'grp': grp, 'num': n, 'den': dn})
    out = out[out.shop.notna()]
    old = _load('perf_lon.csv')
    if old is not None:
        cur = old[(old.month == asof[:7]) & (old.kpi == k)]
        if len(cur) and cur['asof'].max() > asof: print(f'perf: {k} {asof} is older than {cur["asof"].max()} - skipped'); return
        old = old[~((old.month == asof[:7]) & (old.kpi == k))]
    _save(pd.concat([old, out.astype(str)]) if old is not None else out, 'perf_lon.csv')
    mine = out[out.shop.isin(shops())]
    print(f'perf: longevity {LON[k][0]} {asof}: {len(out)} shops, ours {len(mine)} · {mine.num.sum():,.0f} / {mine.den.sum():,.0f}')

def _lon_build():
    v = _load('perf_lon.csv')
    if v is None: return None
    for c in ('num', 'den'): v[c] = pd.to_numeric(v[c])
    sh = shops(); m = v.month.max(); x = v[v.month == m]; dim = calendar.monthrange(int(m[:4]), int(m[5:]))[1]
    out = {'month': m, 'axes': LON_AXES, 'kpis': {}, 'shops': {}}
    agg = lambda z: {'num': float(z.num.sum()), 'den': float(z.den.sum())}
    for k, y in x.groupby('kpi'):
        lbl, mode = LON[k]; asof = y['asof'].max(); frac = int(asof[8:]) / dim if mode == 'target' else 1.0
        out['kpis'][lbl] = {'mode': mode, 'asof': asof, 'frac': round(frac, 4), 'area': agg(y[y.shop.isin(sh)]),
                            'bench': {'UPC': agg(y[y.grp == 'UPC']), 'BMA': agg(y[y.grp == 'BMA']), 'All': agg(y)}}
        for _, r in y[y.shop.isin(sh)].iterrows(): out['shops'].setdefault(r.shop, {})[lbl] = {'num': float(r.num), 'den': float(r.den)}
    return out

# ---------- Device by Brand / GIA by Category targets (Nami, 14 Nov 2026) ----------
#   '<yyyymm>_Target by Brand <Mon>'<yy> ....xlsx'  sheet TARGET_FOR_OPERATION: shop x CUSTOM_CATEGORY x CUSTOM_BRAND x submodel -> OPERATION_TARGET_Q/A/N
#   '<yyyymm>_Target GIA by CATEGORY ....xlsx'     sheet 'Target by Brand': shop x PRODUCT_ACC_GROUP x CUSTOM_CATEGORY x CUSTOM_SUB_CATEGORY x brand
def _ym(name):
    m = re.search(r'(20\d{2})(\d{2})_', os.path.basename(name)); return f'{m.group(1)}-{m.group(2)}' if m else None

def merge_mix_target(fp):
    import openpyxl
    name = os.path.basename(fp); month = _ym(name); sh = shops()
    if not month or not sh: print('perf: mix target skipped (no month in name / no shops)', name); return
    wb = openpyxl.load_workbook(fp, read_only=True); gia = 'gia' in name.lower()
    ws = wb['Target by Brand'] if gia else wb['TARGET_FOR_OPERATION']
    it = ws.iter_rows(values_only=True); h = [str(x).strip() for x in next(it)]; hx = {c: i for i, c in enumerate(h)}
    pick = lambda pre: next(i for c, i in hx.items() if c.upper().startswith(pre))
    if gia:
        keys = {'grp': hx['PRODUCT_ACC_GROUP'], 'cat': hx['CUSTOM_CATEGORY'], 'sub': hx[next(c for c in hx if c.startswith('CUSTOM_SUB_CATEG'))], 'brand': hx['CUSTOM_BRAND']}
        tq, ta, tn = pick('SUM OF TARGET QTY'), pick('SUM OF TARGET AMOU'), pick('SUM OF TARGET NET')
    else:
        keys = {'cat': hx['CUSTOM_CATEGORY'], 'brand': hx['CUSTOM_BRAND'], 'model': hx['CUSTOM_SUBMODEL']}
        tq, ta, tn = pick('OPERATION_TARGET_Q'), pick('OPERATION_TARGET_A'), pick('OPERATION_TARGET_N')
    rows = []
    for r in it:
        code = str(r[hx['SHOP_CODE']] or '').strip()
        if code not in sh: continue
        rows.append({'shop': code, **{k: str(r[i] or '').strip() for k, i in keys.items()}, 'tq': float(r[tq] or 0), 'ta': float(r[ta] or 0), 'tn': float(r[tn] or 0)})
    d = pd.DataFrame(rows); d['month'] = month
    fn = 'perf_gia_target.csv' if gia else 'perf_brand_target.csv'
    old = _load(fn); out = pd.concat([old[old.month != month], d.astype(str)]) if old is not None else d
    _save(out, fn)
    print(f'perf: {"GIA" if gia else "Device brand"} target {month}: {d.shop.nunique()} shops · qty {d.tq.sum():,.0f} · net {d.tn.sum():,.0f} · by', d.groupby('cat').tn.sum().round().to_dict())

RET_ITEMS = ['Postpay', 'True Online', 'True Visions']

def _ret_build():
    r = _load('perf_ret.csv')
    if r is None: return None
    for c in ('req', 'save', 'cancel', 'rev_req', 'rev_save'): r[c] = pd.to_numeric(r[c])
    sh = shops(); months = sorted(r.month.unique()); out = {'pass': RET_PASS, 'items': RET_ITEMS, 'months': {}}
    for m in months[-2:]:
        x = r[r.month == m]; M = {'asof': {p: (x[x['product'] == p]['asof'].max() if (x['product'] == p).any() else None) for p in RET_ITEMS}, 'shops': {}, 'area': {}, 'bench': {}}
        for p in RET_ITEMS:
            y = x[x['product'] == p]
            if not len(y): continue
            ours = y[y.shop.isin(sh)]
            agg = lambda z: {'req': float(z.req.sum()), 'save': float(z.save.sum()), 'cancel': float(z.cancel.sum()), 'rev_req': float(z.rev_req.sum()), 'rev_save': float(z.rev_save.sum())}
            M['area'][p] = agg(ours)
            M['bench'][p] = {'UPC': agg(y[y.grp == 'UPC']), 'BMA': agg(y[y.grp == 'BMA']), 'All': agg(y)}
            for _, row in ours.iterrows(): M['shops'].setdefault(row.shop, {})[p] = agg(pd.DataFrame([row]))
        out['months'][m] = M
    out['cur'] = months[-1]; out['prev'] = months[-2] if len(months) > 1 else None
    return out

def _dims_build(cur, prev):
    d = _load('perf_dims.csv')
    if d is None: return None
    d = d[d.month.isin([cur, prev])]
    for c in ('q', 'n', 'shops'): d[c] = pd.to_numeric(d[c])
    out = {}
    for (m, p, sc), g in d.groupby(['month', 'product', 'scope']):
        node = out.setdefault(m, {}).setdefault(p, {}).setdefault(sc, {'shops': int(g.shops.max()), 'dims': {}})
        for dim, gg in g.groupby('dim'):
            node['dims'][dim] = {r.val: [round(r.q, 2), round(r.n, 2)] for r in gg.itertuples()}
    return out

def _gia_actual(month, sh):
    g = _load(f'gia_sales_{month}.csv.gz')
    if g is None: return pd.DataFrame(columns=['day', 'shop', 'emp', 'q', 'n'])
    g = g[g.SHOP_CODE.isin(sh)].copy()
    g['day'] = pd.to_datetime(g.BILL_DATE, format=FMT, errors='coerce').dt.strftime('%Y-%m-%d')
    g['q'] = pd.to_numeric(g.QTY, errors='coerce').fillna(0); g['n'] = pd.to_numeric(g.NET_AMOUNT, errors='coerce').fillna(0)
    g['emp'] = g.SALE_CODE.fillna('').astype(str).str.strip()
    return g.groupby(['day', 'SHOP_CODE', 'emp'], as_index=False).agg(q=('q', 'sum'), n=('n', 'sum')).rename(columns={'SHOP_CODE': 'shop'})

# ---------- Device by Brand / GIA by sub-category radars ----------
MIX = {'Device': {'file': 'perf_brand_target.csv', 'key': 'brand', 'dim': 'BRAND', 'top': 8},
       'GIA': {'file': 'perf_gia_target.csv', 'key': 'brand', 'dim': 'BRAND', 'fixed': ['APPLE', 'SAMSUNG', 'SUPLIFE (PVL)'], 'top': 3}}  # Nami: Apple, Samsung, Suplife PVL + top-3 other brands by target

def _mix_build(cur, prev):
    d = _load('perf_dims.csv'); sh = shops(); asof = _meta().get('perf_allprod_asof', {}); out = {}
    if d is None: return None
    for c in ('q', 'n', 'shops'): d[c] = pd.to_numeric(d[c])
    for prod, cfg in MIX.items():
        t = _load(cfg['file'])
        if t is None: continue
        for c in ('tq', 'tn'): t[c] = pd.to_numeric(t[c])
        t = t[t.shop.isin(sh)]; k = cfg['key']
        tc = t[t.month == cur]
        if not len(tc): continue
        rank = tc.groupby(k).tn.sum().sort_values(ascending=False)
        fixed = cfg.get('fixed', [])
        axes = fixed + [a for a in rank.index if rank[a] > 0 and a not in fixed][:cfg['top']]
        bucket = lambda v: v if v in axes else 'อื่นๆ'
        has_other = (rank.drop(axes, errors='ignore').sum() > 0)
        axes_all = axes + (['อื่นๆ'] if has_other else [])
        node = {'axes': axes_all, 'dim': cfg['dim'], 'months': {}}
        for m in (cur, prev):
            tm = t[t.month == m]; am = d[(d.month == m) & (d['product'] == prod) & (d.dim == cfg['dim'])]
            if not len(tm) and not len(am): continue
            dim_ = calendar.monthrange(int(m[:4]), int(m[5:]))[1]
            a_ = asof.get(prod, '') if m == cur else ''
            frac = (int(a_[8:]) / dim_) if (m == cur and a_[:7] == m) else 1.0
            M = {'frac': round(frac, 4), 'asof': a_ if m == cur else None, 'shops': {}, 'bench': {}}
            tm = tm.assign(ax=tm[k].map(bucket)); am = am[~am.val.isin(['(ว่าง)', 'TRUE BRAND', 'OTT BOX', 'TRUE DIGITAL HD'])].assign(ax=lambda z: z.val.map(bucket))
            tg = tm.groupby(['shop', 'ax'])[['tq', 'tn']].sum()
            ag = am[am.scope.isin(sh)].groupby(['scope', 'ax'])[['q', 'n']].sum()
            for s in sh:
                M['shops'][s] = {ax: [round(float(ag.loc[(s, ax)].q), 2) if (s, ax) in ag.index else 0, round(float(ag.loc[(s, ax)].n), 2) if (s, ax) in ag.index else 0,
                                      round(float(tg.loc[(s, ax)].tq), 2) if (s, ax) in tg.index else 0, round(float(tg.loc[(s, ax)].tn), 2) if (s, ax) in tg.index else 0] for ax in axes_all}
            for sc in ('UN', 'UPC', 'BMA'):
                z = am[am.scope == sc]
                if len(z): M['bench'][sc] = {'shops': int(z.shops.max()), 'v': {ax: [round(float(g.q.sum()), 2), round(float(g.n.sum()), 2)] for ax, g in z.groupby('ax')}}
            node['months'][m] = M
        # focus models / brands inside each axis (current-month target)
        sub = 'model' if prod == 'Device' else 'sub'
        tc2 = tc.assign(ax=tc[k].map(bucket))
        node['focus'] = {ax: [[r[0], round(float(r[1].tq), 1), round(float(r[1].tn))] for r in g.groupby(sub)[['tq', 'tn']].sum().sort_values('tn', ascending=False).head(6).iterrows() if r[1].tn > 0]
                         for ax, g in tc2.groupby('ax')}
        out[prod] = node
    return out

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
        act = {'Device': dev, 'GIA': gia if len(gia) else None, }
        tv = tm[tm['product'] == 'True Visions']; rate = float(tv.n.sum() / tv.q.sum()) if tv.q.sum() else 0.0
        act.update(_mix({p: _raw_lines(m, p) for p in RAW}, rate))
        ap = {k: v for k, v in _mix(_allprod_lines(m), rate).items() if v is not None}; src = {}
        for p in ('Device', 'GIA'):  # TSM first; the all-product file fills a month with no TSM data (e.g. Oct 2026)
            if (act.get(p) is None or not len(act[p])) and p in ap: act[p] = ap[p]; src[p] = 'allprod'
        # salesperson-level actuals: TSM SALE_CODE for Device / GIA, the all-product file's SALE_ID for the rest
        sact = {p: a for p, a in act.items() if p in ('Device', 'GIA') and a is not None and len(a)}
        sact.update({p: ap[p] for p in ('Postpay', 'True Online', 'True Visions') if p in ap})
        days = sorted(set().union(*[set(a.day) for a in act.values() if a is not None])) if any(a is not None for a in act.values()) else []
        dim = calendar.monthrange(int(m[:4]), int(m[5:]))[1]
        last = days[-1] if days else None
        frac = (int(last[8:]) / dim) if (last and m == cur) else 1.0
        frac_p = {p: round((int(a.day.max()[8:]) / dim) if m == cur else 1.0, 4) for p, a in act.items() if a is not None and len(a)}
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
                if 'dummy' in str(g.iloc[0]['name']).lower(): continue  # 'Dummy code for balancing shop target' is not a person
                r0 = g.iloc[0]; e = {'name': r0['name'], 'role': r0.role, 'shop': r0.shop, 'p': {}}
                for p in PRODUCTS:
                    tr = g[g['product'] == p]; row = {'tq': float(tr.q.sum()), 'tn': float(tr.n.sum())}
                    a = sact.get(p)
                    if a is not None:
                        aa = a[a.emp == emp]; row.update({'aq': float(aa.q.sum()), 'an': float(aa.n.sum())})
                    e['p'][p] = row
                E[emp] = e
        months[m] = {'has_target': bool(len(tm)), 'has_ind': it is not None and bool(len(it[it.month == m])), 'last_day': last, 'days_in_month': dim,
                     'frac': round(frac, 4), 'actual_products': [p for p, a in act.items() if a is not None and len(a)], 'staff_products': [p for p in PRODUCTS if p in sact], 'frac_sp': {p: round((int(a.day.max()[8:]) / dim) if m == cur else 1.0, 4) for p, a in sact.items()}, 'src': src, 'frac_p': frac_p, 'last_day_p': {p: a.day.max() for p, a in act.items() if a is not None and len(a)}, 'shops': S, 'staff': E}
    data = {'cur': cur, 'prev': prev, 'products': PRODUCTS, 'shops': [{'shop': s, 'name': names.loc[s, 'name'], 'type': names.loc[s, 'type']} for s in sh],
            'months': months, 'sales_asof': m_.get('perf_sales_asof', ''), 'post_asof': m_.get('perf_post_asof', ''), 'raw_asof': m_.get('perf_raw_asof', {}), 'allprod_asof': m_.get('perf_allprod_asof', {}),
            'notes': {}, 'pl': _pl_build(), 'ret': _ret_build(), 'svc': _svc_build(), 'lon': _lon_build(), 'dims': _dims_build(cur, prev), 'mix': _mix_build(cur, prev)}
    os.makedirs(OUT, exist_ok=True); json.dump(data, open(os.path.join(OUT, 'perf_data.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    c = months[cur]; print(f"perf: built {cur} (to {c['last_day']}, frac {c['frac']}) · {len(sh)} shops · {len(c['staff'])} staff · actual {c['actual_products']}")
