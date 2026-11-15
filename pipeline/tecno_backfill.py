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
    if stocks:
        f = stocks[-1]; st, label = update.read_csv_any(ds.download(s, f, os.path.join(tmp, f['id'])))
        tecno.set_stock(st, ds.stock_time(f['name']) or update.json.load(open(os.path.join(tecno.ST, 'meta.json'))).get('stock_asof'))
    tecno_page.main()

if __name__ == '__main__': main()
