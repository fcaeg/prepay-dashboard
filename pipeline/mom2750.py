"""MoM ซิมรายปี 2,750 - the shops HQ lists with a negative %MoM (file 'Prepaid_Sales_By_Store_<ddmmyyyy>.xlsx'),
watched in the last 10 days of the month on the Prepay Dashboard (tab "MoM ซิม 2,750").

  load(fp)  -> state/mom2750_base.csv (replaces the list; the file date is kept in meta.json as mom2750_asof)
  build()   -> pipeline/mom2750_data.js  (window.MOM2750 = {...}); the page counts sales itself from sales_daily (TSM)

Baseline (LM) = HQ last-month QTY, worked back from the file: Runrate / (1 + %MoM) / 2,701 (net per SIM in the file).
Shops with %MoM = -100% (no sale this month in the HQ file) have no Runrate, so their LM comes from TSM October.
"""
import json, os, re, datetime
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__)); ST = os.path.join(HERE, 'state')
MATS = ['3000122199', '3000122191', '3000122169', '3000143085']   # 2,750 baht yearly SIM
DTAC_ONLY = '3000143085'                                            # counted only at Dtac COCO / Dtac Hall
FMT = '%m/%d/%Y %I:%M:%S %p'

def _norm(s): return re.sub(r'[^a-z0-9ก-๙]', '', str(s).lower())

def _names():
    """shop name -> code, from shop_master + the Prepay target files"""
    m = {}
    sm = os.path.join(ST, 'shop_master.csv')
    if os.path.exists(sm):
        for r in pd.read_csv(sm, dtype=str).fillna('').itertuples(): m[_norm(r.SHOP_NAME)] = r.SHOP_CODE
    ta = os.path.join(ST, 'targets_all.csv')
    if os.path.exists(ta):
        for r in pd.read_csv(ta, dtype=str).fillna('').itertuples(): m.setdefault(_norm(r.name), r.shop)
    return m

def load(fp):
    raw = pd.read_excel(fp, header=None)
    title = str(raw.iat[0, 0]); hdr = next(i for i in range(6) if str(raw.iat[i, 0]).strip().lower() == 'shop name')
    d = pd.read_excel(fp, header=hdr); d.columns = [str(c).strip() for c in d.columns]
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', title) or re.search(r'(\d{2})(\d{2})(\d{4})', os.path.basename(str(fp)))
    asof = f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}' if m else ''
    col = lambda *ks: next((c for c in d.columns if any(k.lower() in c.lower() for k in ks)), None)
    cN, cA, cC, cT, cR, cM, cRem = col('shop name'), col('area'), col('channel'), col('actual'), col('runrate'), col('mom'), col('remark')
    cS = col('(t+d)')
    names = _names()
    out = []
    for r in d.to_dict('records'):
        name = str(r.get(cN) or '').strip()
        if not name: continue
        mom = r.get(cM); rr = r.get(cR)
        lm = None
        if pd.notna(mom) and pd.notna(rr) and float(mom) > -1: lm = round(float(rr) / (1 + float(mom)) / 2701)
        out.append({'shop': names.get(_norm(name), ''), 'name': name, 'area': r.get(cA) or '', 'channel': r.get(cC) or '',
                    'hq_mom': '' if pd.isna(mom) else round(float(mom), 4), 'hq_actual': '' if pd.isna(r.get(cT)) else round(float(r.get(cT)) / 2701),
                    'hq_lm': '' if lm is None else lm, 'stock': '' if cS is None or pd.isna(r.get(cS)) else int(r.get(cS)),
                    'remark': '' if cRem is None or pd.isna(r.get(cRem)) else str(r.get(cRem)).strip()})
    b = pd.DataFrame(out)
    b.to_csv(os.path.join(ST, 'mom2750_base.csv'), index=False)
    mp = os.path.join(ST, 'meta.json'); meta = json.load(open(mp)) if os.path.exists(mp) else {}
    meta['mom2750_asof'] = asof; json.dump(meta, open(mp, 'w'), indent=1)
    print(f'mom2750: {len(b)} shops from {os.path.basename(str(fp))} (as of {asof}), %MoM < 0: {(pd.to_numeric(b.hq_mom, errors="coerce") < 0).sum()},'
          f' no shop code: {(b.shop == "").sum()} {list(b[b.shop == ""].name)}')

def _tsm_month(month, dtac):
    """units of the 2,750 SIMs per shop in a month from the TSM history (state/sim_<month>.csv.gz)"""
    fp = os.path.join(ST, f'sim_{month}.csv.gz')
    if not os.path.exists(fp): return {}
    s = pd.read_csv(fp, dtype=str, usecols=['SHOP_CODE', 'PRODUCT_CODE', 'QTY', 'ORDER_STATUS'])
    s = s[s.PRODUCT_CODE.isin(MATS)]
    s = s[(s.PRODUCT_CODE != DTAC_ONLY) | s.SHOP_CODE.isin(dtac)]
    s['u'] = s.ORDER_STATUS.map({'Payment': 1, 'CreditNote': -1}).fillna(0) * pd.to_numeric(s.QTY, errors='coerce').fillna(1)
    return s.groupby('SHOP_CODE').u.sum().astype(int).to_dict()

def build():
    fp = os.path.join(ST, 'mom2750_base.csv'); out = os.path.join(HERE, 'mom2750_data.js')
    if not os.path.exists(fp):
        open(out, 'w').write('window.MOM2750 = null;\n'); return
    b = pd.read_csv(fp, dtype=str).fillna('')
    meta = json.load(open(os.path.join(ST, 'meta.json')))
    asof = meta.get('mom2750_asof', '')
    month = (asof or datetime.date.today().isoformat())[:7]
    y, m = int(month[:4]), int(month[5:7]); lmon = f'{y - (m == 1)}-{12 if m == 1 else m - 1:02d}'
    dim = (datetime.date(y + (m == 12), 1 if m == 12 else m + 1, 1) - datetime.timedelta(days=1)).day
    dtac = set(b[b.channel.str.upper().str.startswith('DTAC')].shop)
    sm = os.path.join(ST, 'shop_master.csv')
    if os.path.exists(sm):
        x = pd.read_csv(sm, dtype=str).fillna(''); dtac |= set(x[x.CHANNEL.str.upper().str.startswith('DTAC')].SHOP_CODE)
    tsm_lm = _tsm_month(lmon, dtac)
    shops = []
    for r in b.itertuples():
        mom = float(r.hq_mom) if r.hq_mom != '' else None
        if mom is None or mom >= 0 or not r.shop: continue           # watch only the shops with a negative %MoM
        lm, src = (int(r.hq_lm), 'HQ') if r.hq_lm != '' else (tsm_lm.get(r.shop, 0), 'TSM')
        shops.append({'c': r.shop, 'n': r.name, 'area': r.area, 'ch': r.channel, 'lm': lm, 'src': src, 'mom': mom,
                      'hq': int(r.hq_actual) if r.hq_actual != '' else 0, 'stock': int(r.stock) if r.stock != '' else None, 'rem': r.remark})
    data = {'asof': asof, 'month': month, 'lmonth': lmon, 'from': f'{month}-20', 'to': f'{month}-{dim:02d}',
            'mats': MATS, 'dtac_only': DTAC_ONLY, 'dtac': sorted(dtac), 'shops': shops}
    open(out, 'w', encoding='utf-8').write('/* generated by pipeline/mom2750.py - do not edit */\nwindow.MOM2750 = '
                                            + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(f'mom2750 built: {len(shops)} shops with %MoM < 0 (HQ file {asof}), LM from TSM for {sum(s["src"] == "TSM" for s in shops)}')

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1: load(sys.argv[1])
    build()
