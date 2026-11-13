"""Pull new files from a Google Drive inbox folder and update the dashboard data.

Runs in GitHub Actions (.github/workflows/drive-sync.yml). Needs:
  GDRIVE_SA_JSON  - service-account key (JSON text); the inbox folder must be shared with its e-mail as Editor
  DRIVE_FOLDER_ID - id of the inbox folder (the part after /folders/ in the folder URL)

Files are recognised by name (zip, csv or xlsx; zips are unpacked):
  daily_sales*                         -> sales (any number, oldest first)
  stock_balance_report*                -> stock (newest only)
  *Individual Target of <Mon> <yy>*    -> individual targets
  *Target of <Mon> <yy>*               -> shop targets
  Manpower*                            -> staff roster
  *Serial*Expire* / SN sim* / แจ้งเตือนซิม*  -> expiring-SIM watch lists (SN expiry snapshot from HQ)
  Master Prepaid*                      -> matcode master
  *VIVO*Target*                        -> Vivo Dashboard targets
  *VIVO*Sale*                          -> Vivo Dashboard central-system sales (used up to its DATA_ASOF_DATE)
  *PC Brand* / *PC*vivo*              -> Vivo Dashboard PC per shop (PC Brand Update, or Update PC vivo with a "PC Active" column)
  GIA*.xlsx                            -> GIA Dashboard shop list + month targets (Nami's daily GIA report)
  Retention_Shops_<date> <product>.csv  -> Shop Performance: Retention %Save per shop (month to date)
  ServiceLevel_Shops_ / OnTime_by_Shop_ / iCSAT_by_Shop_<date>.csv (or a zip of them) -> Shop Performance: Service Level / On Time / iCsat
  True_Mobile_Care_ / Extended_W_ / Trade_In_Shops_<date>, Downsell_SharePlan*.csv -> Shop Performance: Sale Longevity
  <yyyymm>_Target by Brand / Target GIA by CATEGORY (.xlsx or a zip of them) -> Shop Performance: Device by Brand / GIA targets
  *Performance Report*                 -> Shop Performance: EBIT & Revenue (P&L per shop, .xlsb)
  *All Product*Raw*                    -> Shop Performance: all products with SALE_ID (latest 2 months)
  *Postpaid*Raw* / *TrueOnline*Raw* / *TrueVision*Raw*  -> Shop Performance: Postpay / TOL / TVS actuals (Self Refresh Rawdata, sheet Rawdata)
Processed files are moved to the sub-folder "Done" (or "Error" if the update failed) and remembered in
pipeline/state/drive_done.json, so a file is never processed twice. Raw files never leave Drive / the runner.
Exit code 0; writes changed=true|false to $GITHUB_OUTPUT.
"""
import json, os, re, shutil, subprocess, sys, tempfile, zipfile, datetime
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

HERE = os.path.dirname(os.path.abspath(__file__)); ST = os.path.join(HERE, 'state'); DONE = os.path.join(ST, 'drive_done.json')
API = 'https://www.googleapis.com/drive/v3'; FOLDER = 'application/vnd.google-apps.folder'
EXPORT = {'application/vnd.google-apps.spreadsheet': ('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx')}
BKK = datetime.timezone(datetime.timedelta(hours=7))

def log(*a): print(*a, flush=True)
def summary(md):
    fp = os.environ.get('GITHUB_STEP_SUMMARY')
    if fp: open(fp, 'a', encoding='utf-8').write(md + '\n')
def output(k, v):
    fp = os.environ.get('GITHUB_OUTPUT')
    if fp: open(fp, 'a').write(f'{k}={v}\n')

def session():
    info = json.loads(os.environ['GDRIVE_SA_JSON'])
    cred = service_account.Credentials.from_service_account_info(info, scopes=['https://www.googleapis.com/auth/drive'])
    cred.refresh(Request()); s = requests.Session(); s.headers['Authorization'] = 'Bearer ' + cred.token; return s

def ls(s, parent, folders=False):
    q = f"'{parent}' in parents and trashed=false and mimeType{'=' if folders else '!='}'{FOLDER}'"; out, tok = [], None
    while True:
        r = s.get(API + '/files', params={'q': q, 'fields': 'nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,md5Checksum,size)', 'pageSize': 200,
                                          'supportsAllDrives': 'true', 'includeItemsFromAllDrives': 'true', 'pageToken': tok}); r.raise_for_status()
        j = r.json(); out += j.get('files', []); tok = j.get('nextPageToken')
        if not tok: return out

def subfolder(s, parent, name):
    for f in ls(s, parent, folders=True):
        if f['name'] == name: return f['id']
    r = s.post(API + '/files', params={'supportsAllDrives': 'true'}, json={'name': name, 'mimeType': FOLDER, 'parents': [parent]}); r.raise_for_status(); return r.json()['id']

def download(s, f, d):
    name = f['name']; os.makedirs(d, exist_ok=True)
    if f['mimeType'] in EXPORT:
        mt, ext = EXPORT[f['mimeType']]; url = f"{API}/files/{f['id']}/export"; params = {'mimeType': mt}; name += ext
    else: url = f"{API}/files/{f['id']}"; params = {'alt': 'media', 'supportsAllDrives': 'true'}
    fp = os.path.join(d, name)
    with s.get(url, params=params, stream=True) as r:
        r.raise_for_status()
        with open(fp, 'wb') as o:
            for ch in r.iter_content(1 << 20): o.write(ch)
    return fp

def move(s, f, src, dst):
    try: s.patch(f"{API}/files/{f['id']}", params={'addParents': dst, 'removeParents': src, 'supportsAllDrives': 'true'}).raise_for_status()
    except Exception as e: log('  (could not move', f['name'], '-', e, ')')

def kind(name):
    n = name.lower()
    if n.startswith('daily_sales'): return 'sales'
    if re.match(r'^20\d{4}_target (by brand|gia by category)', n): return 'mixtarget'
    if n.startswith('mongkol'): return 'mongkol'
    if 'all product' in n and 'raw' in n: return 'allprod'
    if re.search(r'performance[ _]+report', n): return 'pl'
    if n.startswith('retention_shops') or n.startswith('retention shops'): return 'retention'
    if n.startswith(('servicelevel', 'ontime', 'icsat')): return 'service'
    if n.startswith(('true_mobile_care', 'true mobile care', 'extended_w', 'trade_in', 'trade in', 'downsell', 'consent')): return 'longevity'
    if 'postpaid' in n and 'raw' in n: return 'postpay'
    if re.search(r'true ?online', n) and 'raw' in n: return 'tolraw'
    if re.search(r'true ?visions?', n) and 'raw' in n: return 'tvsraw'
    if 'vivo' in n and 'rrp' in n: return 'vivorrp'
    if 'vivo' in n and 'target' in n: return 'vivotarget'
    if 'vivo' in n and 'sale' in n: return 'vivohist'
    if re.search(r'pc[ _]?brand', n) or re.search(r'\bpc\b', n.replace('_', ' ')) and 'vivo' in n: return 'pc'
    if n.startswith('gia') and n.endswith(('.xlsx', '.xlsm', '.zip')): return 'giatarget'
    if n.startswith('stock_balance_report'): return 'stock'
    if re.search(r'individual[ _]target[ _]of', n): return 'indtarget'
    if re.search(r'target[ _]of[ _][a-z]{3}', n): return 'target'
    if n.startswith('manpower'): return 'manpower'
    if re.search(r'serial.*expir|expir.*serial|^sn[ _]?sim|แจ้งเตือนซิม|ซิม.*หมดอายุ', n): return 'snexpiry'
    if n.startswith('master prepaid') or n.startswith('master_prepaid'): return 'master'
    return None

MONS = {m: i + 1 for i, m in enumerate(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'])}
def stock_time(name):
    """'stock_balance_report as of 30 Oct 2026 Time 16.50.zip' / '... Stock Update 7 Nov 2026 Time 1100.zip' -> '2026-11-07 11:00' (None if not in the name)"""
    m = re.search(r'(\d{1,2})\s*([A-Za-z]{3})[a-z]*\.?\s*(\d{4})\D+?(\d{1,2})[.:]?(\d{2})\b', name)
    if not m or m.group(2).lower() not in MONS: return None
    d, mo, y, hh, mm = int(m.group(1)), MONS[m.group(2).lower()], int(m.group(3)), int(m.group(4)), int(m.group(5))
    try: return datetime.datetime(y, mo, d, hh, mm).strftime('%Y-%m-%d %H:%M')
    except ValueError: return None

def unpack(fp, k):
    """zip -> the file update.py needs (sales/stock keep the zip; xlsx inputs are extracted)"""
    if not fp.lower().endswith('.zip') or k in ('sales', 'stock'): return fp
    if k in ('retention', 'service', 'longevity', 'mixtarget', 'mongkol'):  # zip of one or more files (csv / xlsx), each routed by its own name
        d = fp + '_x'; zipfile.ZipFile(fp).extractall(d)
        return [os.path.join(r, f) for r, _, fs in os.walk(d) for f in fs if f.lower().endswith(('.csv', '.xlsx')) and not f.startswith(('.', '__', '~$'))]
    d = fp + '_x'; zipfile.ZipFile(fp).extractall(d)
    xs = [os.path.join(r, f) for r, _, fs in os.walk(d) for f in fs if f.lower().endswith(('.xlsx', '.xlsm', '.xls', '.xlsb')) and not f.startswith('~$')]
    if not xs: raise RuntimeError('no Excel file inside ' + os.path.basename(fp))
    x = xs[0]; nice = os.path.join(d, os.path.basename(fp)[:-4] + os.path.splitext(x)[1])  # keep the zip's name (has the month)
    if kind(os.path.basename(x)) == k: return x
    shutil.copy(x, nice); return nice

def main():
    folder = os.environ['DRIVE_FOLDER_ID'].strip(); s = session()
    done = json.load(open(DONE)) if os.path.exists(DONE) else {}
    files = [f for f in ls(s, folder) if f['id'] not in done]
    # REPROCESS (manual run input): name prefixes separated by | - also take the newest matching file from Done and process it again
    rp = [x.strip().lower() for x in os.environ.get('REPROCESS', '').split('|') if x.strip()]
    if rp:
        newest = {}
        for f in ls(s, subfolder(s, folder, 'Done')):
            if any(f['name'].lower().startswith(x) for x in rp) and f['createdTime'] > newest.get(f['name'], {}).get('createdTime', ''): newest[f['name']] = f
        files += list(newest.values()); log('reprocess:', sorted(newest))
    todo = [(f, kind(f['name'])) for f in files]; skip = [f['name'] for f, k in todo if not k]; todo = [(f, k) for f, k in todo if k]
    if skip: log('ignored (name not recognised):', skip)
    if not todo: log('no new files'); output('changed', 'false'); summary('ไม่มีไฟล์ใหม่ใน Google Drive'); return
    tmp = tempfile.mkdtemp(); args = []; used = []
    stocks = sorted([x for x in todo if x[1] == 'stock'], key=lambda x: x[0]['createdTime'])
    keep_stock = stocks[-1][0]['id'] if stocks else None
    for f, k in sorted(todo, key=lambda x: x[0]['createdTime']):
        if k == 'stock' and f['id'] != keep_stock: used.append((f, k, 'older stock file - skipped')); continue
        fp = unpack(download(s, f, os.path.join(tmp, f['id'])), k); used.append((f, k, fp))
        if isinstance(fp, list):  # several csv files from one zip; each is routed by its own name
            for x in fp:
                kx = kind(os.path.basename(x)) or k
                if kx in ('retention', 'service', 'longevity'): args += ['--' + kx, x]
                elif kx == 'mixtarget': args += ['--mix-target', x]
                elif kx == 'mongkol': args += ['--mongkol', x]
            continue
        args += {'sales': ['--sales', fp], 'stock': ['--stock', fp], 'indtarget': ['--indtarget', fp], 'target': ['--target', fp], 'manpower': ['--manpower', fp], 'snexpiry': ['--snexpiry', fp], 'master': ['--master', fp], 'vivotarget': ['--vivo-target', fp], 'vivohist': ['--vivo-hist', fp], 'pc': ['--pc', fp], 'vivorrp': ['--vivo-rrp', fp], 'giatarget': ['--gia-target', fp], 'postpay': ['--postpay', fp], 'tolraw': ['--tol-raw', fp], 'tvsraw': ['--tvs-raw', fp], 'allprod': ['--allprod', fp], 'pl': ['--pl', fp], 'retention': ['--retention', fp], 'service': ['--service', fp], 'longevity': ['--longevity', fp], 'mixtarget': ['--mix-target', fp], 'mongkol': ['--mongkol', fp]}[k]
    # update.py takes several --sales / --target values as one list each
    merged, lists = [], {'--sales': [], '--target': [], '--vivo-target': [], '--vivo-hist': [], '--retention': [], '--service': [], '--longevity': [], '--mix-target': [], '--mongkol': []}
    for i in range(0, len(args), 2):
        if args[i] in lists: lists[args[i]].append(args[i + 1])
        else: merged += args[i:i + 2]
    for k, v in lists.items():
        if v: merged += [k] + v
    env = dict(os.environ)
    if keep_stock:
        st = next(f for f, k in todo if f['id'] == keep_stock)
        env['STOCK_ASOF'] = stock_time(st['name']) or datetime.datetime.fromisoformat(st['createdTime'].replace('Z', '+00:00')).astimezone(BKK).strftime('%Y-%m-%d %H:%M')
    log('update.py', ' '.join(os.path.basename(a) if os.path.sep in a else a for a in merged))
    r = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'update.py')] + merged, env=env, capture_output=True, text=True)
    log(r.stdout[-6000:]); log(r.stderr[-6000:])
    ok = r.returncode == 0
    if ok:
        b = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'build_page.py')], capture_output=True, text=True); log(b.stdout[-2000:], b.stderr[-2000:]); ok = b.returncode == 0
    dst = subfolder(s, folder, 'Done' if ok else 'Error'); now = datetime.datetime.now(BKK).strftime('%Y-%m-%d %H:%M')
    for f, k, _ in used:
        move(s, f, folder, dst); done[f['id']] = {'name': f['name'], 'kind': k, 'at': now, 'ok': ok}
    json.dump(done, open(DONE, 'w'), ensure_ascii=False, indent=1)
    head = [l for l in r.stdout.splitlines() if l.strip().startswith(('built:', 'YTD', 'sales:', 'stock:', 'target:', 'individual', 'manpower', 'vivo', 'gia'))]
    summary(('### ✅ อัปเดตแล้ว' if ok else '### ❌ อัปเดตไม่สำเร็จ — ไฟล์ถูกย้ายไปโฟลเดอร์ Error') + '\n\n' + '\n'.join('- ' + f['name'] + ' → ' + k for f, k, _ in used) + '\n\n```\n' + '\n'.join(head) + ('\n' + r.stderr[-1500:] if not ok else '') + '\n```')
    output('changed', 'true')  # always commit drive_done.json so failed files are not retried forever
    shutil.rmtree(tmp, ignore_errors=True)
    if not ok: sys.exit(1)

if __name__ == '__main__': main()
