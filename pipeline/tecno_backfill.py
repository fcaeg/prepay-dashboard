"""One-off (workflow "Tecno backfill"): read every daily_sales file already in the Drive inbox / Done folder
(created on or after FROM, default 2026-10-01) and the newest stock_balance_report, keep only the H/S,TECNO rows,
then rebuild tecno/index.html. Rows already kept are not counted twice."""
import os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import drive_sync as ds, update, tecno, tecno_page

def main():
    s = ds.session(); folder = os.environ['DRIVE_FOLDER_ID'].strip(); frm = os.environ.get('FROM') or '2026-10-01'
    files = ds.ls(s, folder) + ds.ls(s, ds.subfolder(s, folder, 'Done'))
    sales = sorted([f for f in files if ds.kind(f['name']) == 'sales' and f['createdTime'] >= frm], key=lambda f: f['createdTime'])
    stocks = sorted([f for f in files if ds.kind(f['name']) == 'stock'], key=lambda f: f['createdTime'])
    tmp = tempfile.mkdtemp(); print(f'{len(sales)} sales files since {frm}')
    for f in sales:
        try: raw, _ = update.read_csv_any(ds.download(s, f, os.path.join(tmp, f['id']))); print(f['createdTime'][:16], f['name'], end=' · '); tecno.add_sales(raw)
        except Exception as e: print('  skipped', f['name'], e)
    # newest '<yyyymm>_Target by Brand' file of each month -> Tecno targets
    tf = {}
    for f in files:
        if ds.kind(f['name']) == 'mixtarget' and 'gia' not in f['name'].lower():
            mo = f['name'][:6]
            if f['createdTime'] > tf.get(mo, {}).get('createdTime', ''): tf[mo] = f
    for mo, f in sorted(tf.items()):
        x = ds.unpack(ds.download(s, f, os.path.join(tmp, f['id'])), 'mixtarget')
        for fp in (x if isinstance(x, list) else [x]):
            if ds.kind(os.path.basename(fp)) in ('mixtarget', None) and 'gia' not in os.path.basename(fp).lower():
                if not os.path.basename(fp)[:6].isdigit():  # keep the zip's month in the name
                    import shutil; nf = os.path.join(os.path.dirname(fp), f['name'][:7] + os.path.basename(fp)); shutil.copy(fp, nf); fp = nf
                print('target:', f['name'], '->', os.path.basename(fp)); tecno.merge_target(fp)
    if stocks:
        f = stocks[-1]; st, label = update.read_csv_any(ds.download(s, f, os.path.join(tmp, f['id'])))
        tecno.set_stock(st, ds.stock_time(f['name']) or update.json.load(open(os.path.join(tecno.ST, 'meta.json'))).get('stock_asof'))
    tecno_page.main()

if __name__ == '__main__': main()
