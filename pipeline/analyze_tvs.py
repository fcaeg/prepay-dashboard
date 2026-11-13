"""Manual analysis (workflow 'Inspect Drive file' with prefix ANALYZE_TVS): where TVS sales hide in the TOL / Postpaid Rawdata.
Prints only aggregated counts for the Upper North shops (no personal data)."""
import os, re, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import drive_sync as ds, openpyxl, zipfile
UN = set(open(os.path.join(os.path.dirname(__file__), 'state', 'perf_targets.csv')).read().split('\n')[1:3000]) and \
     {l.split(',')[1] for l in open(os.path.join(os.path.dirname(__file__), 'state', 'perf_targets.csv')).read().splitlines()[1:]}
s = ds.session(); inbox = os.environ['DRIVE_FOLDER_ID'].strip()
done = ds.subfolder(s, inbox, 'Done'); files = ds.ls(s, inbox) + ds.ls(s, done)
def get(pref):
    f = sorted([x for x in files if x['name'].lower().startswith(pref.lower())], key=lambda x: x['createdTime'])[-1]
    fp = ds.download(s, f, '/tmp/a/' + f['id']); z = zipfile.ZipFile(fp); n = z.namelist()[0]; z.extract(n, '/tmp/a/x'); return '/tmp/a/x/' + n
def scan(path, sheet, cols, months=('202610', '202611')):
    wb = openpyxl.load_workbook(path, read_only=True); it = wb[sheet].iter_rows(values_only=True); h = [str(x).strip() for x in next(it)]
    ix = {c: h.index(c) for c in ['SHOP_CODE', 'BM', 'QTY'] + [c for c in cols if c in h]}; out = collections.Counter()
    for r in it:
        if str(r[ix['BM']]) not in months or str(r[ix['SHOP_CODE']]).strip() not in UN: continue
        for c in cols:
            if c in ix: out[(str(r[ix['BM']]), c, str(r[ix[c]])[:60])] += float(r[ix['QTY']] or 0)
    return out
def show(title, cnt, kw=None):
    print('\n=====', title)
    for (bm, c, v), q in sorted(cnt.items(), key=lambda x: (x[0][1], x[0][0], -x[1])):
        if kw and not re.search(kw, v, re.I): continue
        print(f'{bm} | {c} | {v} | {q:.0f}')
tol = get('3.Self Refresh TrueOnline'); show('TOL by campaign code / group', scan(tol, 'Rawdata', ['CAMPIGN_CODE', 'FLAG_BUNDLE', 'CAMPAIGN_GROUP']))
tvs = get('3.Self Refresh TrueVision'); show('TVS by campaign / sub product', scan(tvs, 'Rawdata', ['GP_SPECIAL_SKU', 'SUB_PRODUCT', 'PRODUCT_GROUP']))
post = get('3.Self Refresh Postpaid'); c = scan(post, 'Rawdata', ['PROPOSITION_DESC', 'FIRST_PRICEPLAN_DESC', 'CAMPAIGN_GROUP_LV1', 'CAMPAIGN_GROUP_LV2', 'PRICE_PLAN_TYPE'])
show('POSTPAID values mentioning NOW / TVS / TRUEID / VISION / OTT / ENT', c, r'\bNOW\b|TVS|TRUE ?ID|VISION|OTT|\bENT')
show('POSTPAID campaign groups (all)', collections.Counter({k: v for k, v in c.items() if k[1] in ('CAMPAIGN_GROUP_LV1', 'PRICE_PLAN_TYPE')}))
