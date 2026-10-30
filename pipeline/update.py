"""Prepay Dashboard pipeline.

Usage (from repo root):
  python3 -I pipeline/update.py [--sales FILE ...] [--stock FILE] [--target FILE ...] [--master FILE]

FILE may be .csv or .zip (a zip's CSV inside is used). Each run:
  * sales: rows for the bill dates found in the new file REPLACE the same dates in the state
           (so a month-to-date file can be re-sent every day; older dates stay as they are)
  * stock: the new stock file replaces the stock snapshot
  * target: a "Target_of_<Mon>_26*.xlsx" file is parsed and replaces that month's targets
  * master: replaces the product master (Master Prepaid.xlsx)
Then rebuilds pipeline/out/*.json + sales_daily.csv, and pipeline/build_page.py makes index.html.
"""
import argparse, glob, io, json, os, re, sys, zipfile
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ST = os.path.join(HERE, 'state'); OUT = os.path.join(HERE, 'out')
os.makedirs(ST, exist_ok=True); os.makedirs(OUT, exist_ok=True)
DEDUP = ['SHOP_CODE', 'ORDER_ID', 'BILL_NO', 'PRODUCT_CODE', 'SERIAL', 'ORDER_STATUS', 'NET_AMOUNT', 'BILL_DATE']
MON = {'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12}

def read_csv_any(path):
    if path.lower().endswith('.zip'):
        z = zipfile.ZipFile(path); names = [n for n in z.namelist() if n.lower().endswith('.csv')]
        if not names: sys.exit('no CSV inside ' + path)
        raw = z.read(names[0]); label = names[0]
    else:
        raw = open(path, 'rb').read(); label = os.path.basename(path)
    for enc in ('utf-8-sig', 'cp874'):
        try: return pd.read_csv(io.BytesIO(raw), dtype=str, encoding=enc), label
        except UnicodeDecodeError: pass
    return pd.read_csv(io.BytesIO(raw), dtype=str, encoding='cp874', encoding_errors='replace'), label

def sales_tables(s):
    """raw POS rows -> per-date tables kept in state"""
    s = s.drop_duplicates(DEDUP)
    s['BD'] = pd.to_datetime(s.BILL_DATE, format='%m/%d/%Y %I:%M:%S %p', errors='coerce')
    p = s[s.DESCRIPTION.str.upper().str.startswith('SIM,PRE', na=False) & s.BD.notna()].copy()
    p['sign'] = p.ORDER_STATUS.map({'Payment': 1, 'CreditNote': -1}).fillna(0)
    p['units'] = p.sign; p['net'] = p.sign * p.NET_AMOUNT.astype(float)
    p['amount'] = p.sign * p.PRICE.astype(float) * p.QTY.astype(float).clip(lower=1); p['disc'] = p.sign * p.DISCOUNT_AMOUNT.astype(float)
    p['date'] = p.BD.dt.strftime('%Y-%m-%d'); p['emp'] = p.SALE_CODE.fillna('NA')
    fact = p.groupby(['date', 'SHOP_CODE', 'PRODUCT_CODE', 'emp'], as_index=False).agg(units=('units', 'sum'), amount=('amount', 'sum'), disc=('disc', 'sum'), net=('net', 'sum')) \
        .rename(columns={'SHOP_CODE': 'shop', 'PRODUCT_CODE': 'matcode'})
    for c in ['net', 'amount', 'disc']: fact[c] = fact[c].round(2)
    staff = p.groupby(['date', 'emp', 'SALE_NAME', 'SHOP_CODE'], as_index=False, dropna=False).size().rename(columns={'SALE_NAME': 'name', 'SHOP_CODE': 'shop', 'size': 'n'})
    price = p[p.sign == 1].groupby(['date', 'PRODUCT_CODE', 'PRICE'], as_index=False).size().rename(columns={'PRODUCT_CODE': 'matcode', 'PRICE': 'price', 'size': 'n'})
    names = p.groupby('PRODUCT_CODE', as_index=False).DESCRIPTION.first().rename(columns={'PRODUCT_CODE': 'matcode', 'DESCRIPTION': 'name'})
    comp = p.groupby('SHOP_CODE', as_index=False).COMPANY_NAME.first().rename(columns={'SHOP_CODE': 'shop', 'COMPANY_NAME': 'company'})
    asof = s.BD.max()
    return dict(fact=fact, staff=staff, price=price), names, comp, asof

def load(name, **kw):
    fp = os.path.join(ST, name)
    return pd.read_csv(fp, dtype=str, **kw) if os.path.exists(fp) else None

def save(df, name): df.to_csv(os.path.join(ST, name), index=False, compression='gzip' if name.endswith('.gz') else None)

def merge_sales(paths):
    meta = json.load(open(os.path.join(ST, 'meta.json'))) if os.path.exists(os.path.join(ST, 'meta.json')) else {}
    for path in paths:
        raw, label = read_csv_any(path)
        tabs, names, comp, asof = sales_tables(raw)
        dates = set(tabs['fact'].date)
        for key, fn in [('fact', 'fact.csv.gz'), ('staff', 'staff.csv.gz'), ('price', 'price.csv.gz')]:
            old = load(fn)
            new = tabs[key].astype(str)
            if old is not None: new = pd.concat([old[~old.date.isin(dates)], new])
            save(new.sort_values(list(new.columns[:3])), fn)
        for df, fn, k in [(names, 'names.csv', 'matcode'), (comp, 'company.csv', 'shop')]:
            old = load(fn); df = df.astype(str)
            save(pd.concat([df, old]).drop_duplicates(k) if old is not None else df, fn)
        if pd.notna(asof) and asof.strftime('%Y-%m-%d %H:%M') > meta.get('sales_asof', ''): meta['sales_asof'] = asof.strftime('%Y-%m-%d %H:%M')
        print(f'sales: {label}: {len(raw):,} rows, {len(dates)} dates {min(dates)}..{max(dates)}')
    json.dump(meta, open(os.path.join(ST, 'meta.json'), 'w'), indent=1)

def merge_stock(path):
    st, label = read_csv_any(path)
    st['PN'] = st.PRODUCT_NAME.str.strip()
    k = st[st.PN.str.upper().str.startswith('SIM,PRE', na=False)][['SHOP_CODE', 'PRODUCT_CODE', 'PN', 'LOCATION_NAME', 'SERIAL', 'FIRST_UPDATE_DATE', 'FIRST_AGING']]
    save(k, 'stock.csv.gz')
    m = re.search(r'as of (\d{1,2}) (\w{3}) (\d{4})(?: Time (\d{1,2})[.:](\d{2}))?', label)
    meta = json.load(open(os.path.join(ST, 'meta.json'))) if os.path.exists(os.path.join(ST, 'meta.json')) else {}
    meta['stock_asof'] = f'{m.group(3)}-{MON[m.group(2)]:02d}-{int(m.group(1)):02d}' + (f' {int(m.group(4)):02d}:{m.group(5)}' if m and m.group(4) else '') if m else meta.get('sales_asof', '')
    meta['stock_file'] = label
    json.dump(meta, open(os.path.join(ST, 'meta.json'), 'w'), indent=1)
    print(f'stock: {label}: {len(st):,} rows, SIM PRE {len(k):,}')

def merge_targets(paths):
    old = load('targets_all.csv')
    for fp in paths:
        mm = re.search(r'Target_of_(\w{3})_(\d{2})', os.path.basename(fp))
        if not mm: sys.exit('target file name must look like Target_of_Nov_26...xlsx: ' + fp)
        month = '20%s-%02d' % (mm.group(2), MON[mm.group(1)])
        td = pd.read_excel(fp, header=None, dtype=str)
        hr = next(i for i in range(len(td)) if str(td.iat[i, 1]).strip().upper() == 'CODE' or (td.iloc[i] == 'PRE').sum() >= 3)
        h = [str(v).strip() for v in td.iloc[hr].tolist()]; pc = [j for j, v in enumerate(h) if v == 'PRE']
        x = td.iloc[hr + 1:]; x = x[x[1].notna()]
        t = pd.DataFrame({'month': month, 'shop': x[1].str.strip(), 'name': x[2].str.strip(), 'region': x[3].str.strip().str.replace('Regional Management ', '', regex=False),
                          'type': x[4], 'province': x[5], 'dm': x[6], 'target_units': pd.to_numeric(x[pc[0]], errors='coerce'), 'target_net': pd.to_numeric(x[pc[2]], errors='coerce')})
        t = t[t.shop.str.match(r'^\d')]
        old = pd.concat([old[old.month != month], t.astype(str)]) if old is not None else t.astype(str)
        print(f'target: {os.path.basename(fp)} -> {month}: {len(t)} shops, PRE units {t.target_units.sum():,.0f}')
    save(old, 'targets_all.csv')

def band(x):
    if pd.isna(x): return None
    for lim, lab in [(49, '≤ 49'), (299, '50–299'), (599, '300–599'), (999, '600–999'), (1999, '1,000–1,999')]:
        if x <= lim: return lab
    return '2,000+'

def grp(n):
    u = n.upper()
    if re.search(r'INFINI|INFIN|INF ', u): return 'SIM INFINITE'
    if re.search(r'TRAVEL|EASYHOLIDAY', u): return 'SIM TRAVEL'
    if re.search(r'INTER|TOURIST', u): return 'SIM TOURIST'
    if re.search(r'MBPS|\d+MB\b|NET|MAX\d|READY|DATA|GB', u): return 'SIM READY NET'
    return 'SIM MASS'

def build():
    meta = json.load(open(os.path.join(ST, 'meta.json')))
    f = load('fact.csv.gz'); staff = load('staff.csv.gz'); price = load('price.csv.gz'); names = load('names.csv'); comp = load('company.csv')
    k = load('stock.csv.gz'); allt = load('targets_all.csv')
    for c in ['units']: f[c] = f[c].astype(float).astype(int)
    for c in ['amount', 'disc', 'net']: f[c] = f[c].astype(float)
    f = f[f.date.str[:4] == f.date.max()[:4]]  # current year only
    k['aging'] = k.FIRST_AGING.astype(int)
    k['first'] = pd.to_datetime(k.FIRST_UPDATE_DATE, format='%m/%d/%Y %I:%M:%S %p', errors='coerce').dt.strftime('%Y-%m-%d')
    # targets: map old shop codes (before 801/1005 codes) by shop name to the newest code
    allt['target_units'] = pd.to_numeric(allt.target_units, errors='coerce'); allt['target_net'] = pd.to_numeric(allt.target_net, errors='coerce')
    norm = lambda s: re.sub(r'[^a-z0-9]', '', str(s).lower())
    isnew = allt.shop.str.startswith('801') | allt.shop.str.startswith('1005')
    newc = allt[isnew].sort_values('month').drop_duplicates('name', keep='last'); n2c = dict(zip(newc.name.map(norm), newc.shop))
    allt.loc[~isnew, 'shop'] = allt.loc[~isnew, 'name'].map(norm).map(n2c)
    allt = allt[allt.shop.notna()].drop_duplicates(['month', 'shop'])
    targets = allt[allt.target_units.fillna(0) > 0][['month', 'shop', 'target_units', 'target_net']].copy()
    targets['target_units'] = targets.target_units.round(2); targets['target_net'] = targets.target_net.round(0)
    lastm = allt.month.max()
    tg = allt.sort_values('month').drop_duplicates('shop', keep='last').drop(columns=['target_units', 'target_net'])
    tg = tg.merge(allt[allt.month == lastm][['shop', 'target_units', 'target_net']], on='shop', how='left')
    ww = set(allt.shop) - set(tg.loc[tg.type.isin(["Lotus's", 'Lotus']), 'shop'])
    # matcodes
    nm = pd.concat([names.rename(columns={'name': 'n'}), k[['PRODUCT_CODE', 'PN']].rename(columns={'PRODUCT_CODE': 'matcode', 'PN': 'n'})]).drop_duplicates('matcode')
    m = nm.rename(columns={'n': 'name'}); m['name'] = m.name.str.replace(r'^SIM,PRE,', '', regex=True)
    m = m[m.matcode.isin(set(f.matcode) | set(k.PRODUCT_CODE))]
    m['group'] = m.name.map(grp); m['esim'] = m.name.str.upper().str.contains('ESIM')
    mp = os.path.join(ST, 'master.xlsx')
    mm = pd.read_excel(mp, sheet_name='Master', dtype=str).drop_duplicates('MATERIAL_CODE').set_index('MATERIAL_CODE')
    mi = pd.read_excel(mp, sheet_name='Index Sim', dtype=str).drop_duplicates('PRODUCT_CODE').set_index('PRODUCT_CODE')
    m['group'] = m.matcode.map(mm.CUSTOM_MODEL).fillna(m.group)
    m['subgroup'] = m.matcode.map(mm.CUSTOM_SUBMODEL).fillna(m.matcode.map(mi.GROUP_SIM)).fillna(m.group)
    m['status'] = m.matcode.map(mm.PRODUCT_STATUS).fillna('-'); m['rank'] = m.matcode.map(mm.PRODUCT_RANK).fillna('-')
    rrp = {'3000096683': 535, '3000096684': 880, '3000096454': 49, '3000098016': 49, '3000080483': 399, '3000098814': 399, '3000093272': 49, '3000096034': 1790, '3000098816': 999, '3000093326': 299,
           '3000080422': 399, '3000080426': 399, '3000080424': 399, '3000080425': 399, '3000080484': 899}
    rrp.update({kk: float(v) for kk, v in mi.RRP.dropna().items() if str(v).strip() not in ('', '0')})
    price['n'] = price.n.astype(int); price['price'] = price.price.astype(float)
    pm = price.groupby(['matcode', 'price']).n.sum().reset_index().sort_values(['matcode', 'n', 'price'], ascending=[True, False, True]).drop_duplicates('matcode').set_index('matcode').price
    m['price'] = m.matcode.map(pm).fillna(m.matcode.map(rrp)); m['band'] = m.price.map(band)
    # shops
    shops = pd.DataFrame({'shop': sorted(set(f.shop) | set(k.SHOP_CODE) | set(allt.loc[allt.month == lastm, 'shop']))})
    shops = shops.merge(tg, on='shop', how='left')
    shops['name'] = shops.name.fillna(shops.shop); shops['region'] = shops.region.fillna('ไม่มีในไฟล์เป้า'); shops['type'] = shops.type.fillna('-')
    shops = shops[shops.shop.isin(ww)].copy(); shops['area'] = shops.region; shops['company'] = 'Wire & Wireless (WW)'
    TY = {'matching': ('Matching Shop', 1), 'non_matching': ('Non Matching Shop', 2), 'HALL': ('Dtac Hall', 3), 'COCO': ('Dtac Coco', 4), "Lotus's": ("True Shop Lotus's", 5), 'Lotus': ("True Shop Lotus's", 5),
          'True_Center_Makro': ('สาขาที่ปิดแล้ว (SIS / Makro)', 99), 'SIS GROUP1': ('สาขาที่ปิดแล้ว (SIS / Makro)', 99), 'SIS GROUP2': ('สาขาที่ปิดแล้ว (SIS / Makro)', 99)}
    shops['stype'] = shops.type.map(lambda x: TY.get(x, ('ไม่ระบุ (ไม่อยู่ในไฟล์เป้า)', 9))[0]); shops['stype_order'] = shops.type.map(lambda x: TY.get(x, ('', 9))[1])
    shops = shops[['shop', 'company', 'month', 'name', 'region', 'type', 'province', 'dm', 'target_units', 'target_net', 'area', 'stype', 'stype_order']]
    f = f[f.shop.isin(ww)]; k = k[k.SHOP_CODE.isin(ww)]
    # staff: most common name and shop
    staff['n'] = staff.n.astype(int); staff = staff[staff.shop.isin(ww)]
    e = staff.groupby(['emp', 'name']).n.sum().reset_index().sort_values('n', ascending=False).drop_duplicates('emp')[['emp', 'name']]
    es = staff.groupby(['emp', 'shop']).n.sum().reset_index().sort_values('n', ascending=False).drop_duplicates('emp')[['emp', 'shop']]
    e = e.merge(es, on='emp')
    # stock
    k['ab'] = pd.cut(k.aging, [-1, 90, 180, 270, 365, 10 ** 6], labels=['a0_90', 'a91_180', 'a181_270', 'a271_365', 'a365p']).astype(str)
    ss = k.pivot_table(index=['SHOP_CODE', 'PRODUCT_CODE'], columns='ab', values='SERIAL', aggfunc='count', fill_value=0).reset_index().rename(columns={'SHOP_CODE': 'shop', 'PRODUCT_CODE': 'matcode'})
    for c in ['a0_90', 'a91_180', 'a181_270', 'a271_365', 'a365p']:
        if c not in ss: ss[c] = 0
    ss['qty'] = ss[['a0_90', 'a91_180', 'a181_270', 'a271_365', 'a365p']].sum(axis=1); ss['asof'] = meta.get('stock_asof', '')
    ex = k[k.aging >= 180][['SERIAL', 'SHOP_CODE', 'PRODUCT_CODE', 'LOCATION_NAME', 'first', 'aging']].rename(columns={'SERIAL': 'serial', 'SHOP_CODE': 'shop', 'PRODUCT_CODE': 'matcode', 'LOCATION_NAME': 'location'}).sort_values('aging', ascending=False)
    f = f.sort_values(['date', 'shop', 'matcode', 'emp'])
    f[['date', 'shop', 'matcode', 'emp', 'units', 'amount', 'disc', 'net']].to_csv(os.path.join(OUT, 'sales_daily.csv'), index=False)
    for nmx, d in [('targets', targets[targets.shop.isin(ww)]), ('matcodes', m), ('shops', shops), ('staff', e), ('stock_by_shop', ss), ('aging_serials', ex)]:
        d = d.astype(object).where(d.notna(), None)
        json.dump(d.to_dict('records'), open(os.path.join(OUT, nmx + '.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w'))
    tot = f[f.date.str[:7] == f.date.max()[:7]]
    print(f"built: sales to {f.date.max()} ({meta.get('sales_asof')}), stock as of {meta.get('stock_asof')}, targets to {lastm}")
    print(f"  YTD QTY {f.units.sum():,} Net {f.net.sum():,.0f} | month {f.date.max()[:7]} QTY {tot.units.sum():,} | latest day QTY {f[f.date == f.date.max()].units.sum():,} Net {f[f.date == f.date.max()].net.sum():,.0f}")
    print(f"  shops {len(shops)} matcodes {len(m)} staff {len(e)} stock {int(ss.qty.sum()):,} aged>=180 {len(ex)}")
    if lastm < f.date.max()[:7]: print(f'  WARNING: no target file for {f.date.max()[:7]} yet (latest target month {lastm}); attach Target_of_<Mon>_26 to update % target')

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--sales', nargs='*', default=[]); ap.add_argument('--stock'); ap.add_argument('--target', nargs='*', default=[]); ap.add_argument('--master')
    a = ap.parse_args()
    if a.master:
        import shutil; shutil.copy(a.master, os.path.join(ST, 'master.xlsx')); print('master replaced')
    if a.target: merge_targets(a.target)
    if a.sales: merge_sales(a.sales)
    if a.stock: merge_stock(a.stock)
    build()
