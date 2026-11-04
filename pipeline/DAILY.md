# Prepay Dashboard — daily update (13:00 Bangkok)

Inputs Nami attaches each day (zip or csv):
- `daily_sales - <date>.zip`  — POS sales, month-to-date (any dates in it replace the same dates in the state)
- `stock_balance_report as of <d Mon yyyy> Time <hh.mm>.zip` — stock snapshot (replaces the previous one)
- occasionally `..._Target_of_<Mon>_26_....xlsx` (new month's targets) or `Master Prepaid.xlsx`
- occasionally `Manpower_Update_<d Mon yyyy>.xlsx` (current staff roster for No Sale analysis) →
  `python3 -I pipeline/update.py --manpower <file>` (keeps only ID, Thai name, company, role, shop, area, type, leave, DOJ), then upload `manpower.json`
- monthly `<n> Retail WW Individual Target of <Mon> <yy>_....xlsx` (sheet Indy Target) →
  `python3 -I pipeline/update.py --indtarget <file>` (PRE unit col R + PRE revenue col AJ per employee), then upload `ind_targets.json`
- occasionally a list of Serials to track (e.g. SIMs expiring next month): CSV/XLSX with a Serial column →
  `python3 -I pipeline/update.py --watch <file> --watch-label "ซิมหมดอายุ <เดือน>"` (sold status is matched on every later sales file)
- SN expiry snapshot xlsx (sheet Detail, header row 3: Material, Serial number, SLoc, อายุระบบ = expiry date, `Month/Year ที่หมดอายุ` = MM/YYYY or "New Lot"):
  Nami wants EVERY serial in the file on the page (the count must match the file). One list per expiry month "ซิมหมดอายุ <ด.ด. ปป>"
  (Thai month, BE 2-digit year) plus "ซิม New Lot". Replace pipeline/state/watch_serials.csv with the file's rows (columns serial, list,
  area '', shop_name 'SLoc <SLoc>', added, expiry = อายุระบบ as YYYY-MM-DD; Excel serial numbers converted, matcode = Material), keeping old rows only if sold;
  then run update.py with no args. Shop/area come from the stock file (shops outside the target files show "<code> (Unidentified)", Area "Unidentified"),
  sold serials from the sales state; serials in neither = "ไม่พบใน Stock" (shop shown as SLoc).
  Shops Nami says are not WW (e.g. True Shop by Partner) go in pipeline/state/watch_exclude_shops.txt and are dropped from the page.
  pipeline/state/shop_master.csv (from Nami's 'Raw Data Prepaid.xlsx', sheet Rawdata, WW-operated shops: SHOP_CODE, SHOP_NAME, CHANNEL, AREA, WW_FLAG, SHOP_STATUS):
  WW_FLAG TPNP (True Shop by Partner) is dropped automatically; WW shops outside the target files (e.g. Ten Ten Shop) get their real name / area.

## 1. Update the data and the GitHub page
```bash
cd /home/claude/prepay-dashboard            # clone https://github.com/fcaeg/prepay-dashboard if missing
git pull -q origin main
python3 -I pipeline/update.py --sales "<sales zip>" --stock "<stock zip>"   # add --target <xlsx> / --master <xlsx> when given
python3 -I pipeline/build_page.py           # writes index.html (GitHub Pages) + pipeline/out/page_doc.json
git add -A && git commit -m "Data update <date>" && git push origin main
```
`update.py` prints the headline numbers (YTD, month, latest day). Check them before publishing; it also warns
when the new month has no target file yet.

## 2. Update the Claude dashboard (https://claude.ai/artifact/VUVYJA9vZwTYyjQXvqKVYy)
For each file in `pipeline/out/` that changed — always `sales_daily.csv`, `sales_hourly.json`, `watch_serials.json`, `stock_by_shop.json`, `aging_serials.json`,
`staff.json`, `shops.json`, `matcodes.json`; `targets.json` only after a new target file —
1. upload it as an asset: Artifact `publish` with `url` = the dashboard, `file_path` = the file, `asset: true` → returns `/_blob/<id>`
2. ArtifactData `get` collection `datasets` doc `<id without extension>` for its version, then `update` it with
   `{source: {kind: "file", name: "<file name>", url: "/_blob/<id>"}, updated: {at: "<ISO time +07:00>", by: "Claude จากไฟล์ <input file name>"}}` (`if_version`).
   Do several in one ArtifactData `batch`.
3. Only if `pipeline/page.html` (or a `pipeline/*.js` it loads) changed: `update` collection `files` doc `index.html` with `file_path` = `pipeline/out/page_doc.json`, and docs `sa.js`, `promo.js`, `promo_img.js` with `pipeline/out/<name>.doc.json` (each file must stay under 256 KB). SIM cover pictures for the promo tab live in `pipeline/promo_img.js` (base64 JPEG keyed by Matcode, ~200 KB).
4. Read ArtifactData collection `data/users/me` doc `check` (up to 5 reads; none or gone = passed).
5. Delete the old blobs that are no longer referenced (Artifact `delete` with `url` + `path` = old blob id) — optional.

## 3. Tell Nami
One short message: data as of <latest sales time>, stock as of <stock time>, today's QTY / Net Amount, and the link
https://fcaeg.github.io/prepay-dashboard/ (GitHub Pages refreshes in 1–2 minutes).

## Automatic updates from Google Drive (GitHub Actions)
`.github/workflows/drive-sync.yml` runs every 15 minutes 09:07–22:52 Bangkok (and on demand: Actions → "Update from Google Drive" → Run workflow).
It runs `pipeline/drive_sync.py`, which lists the Drive inbox folder (`vars.DRIVE_FOLDER_ID`, read with the service account in
`secrets.GDRIVE_SA_JSON`), recognises files by name (daily_sales*, stock_balance_report*, *Target of <Mon> <yy>*, *Individual Target of*,
Manpower*, Master Prepaid*), runs update.py + build_page.py, moves the files to the sub-folder Done (or Error) and commits
`pipeline/state` + `index.html`. Processed file ids are kept in `pipeline/state/drive_done.json`.
This updates GitHub Pages only; the Claude dashboard still needs step 2 above (pull first: `git pull origin main`).

## Vivo Dashboard (https://fcaeg.github.io/prepay-dashboard/vivo/)
Same inputs as Prepay — every daily_sales / stock_balance_report run also keeps the `H/S,VIVO` rows
(`pipeline/vivo.py`, hooked into update.py; a Vivo error never stops the Prepay update):
- sales → `state/vivo_sales_<YYYY-MM>.csv.gz` (same de-dup key as SIM rows) · stock → `state/vivo_stock.csv.gz` (qty = BALANCE; names with ",DEMO" become location "<LOC> (DEMO)"; page counts MAIN_STOCK only by default)
- `VIVO Target*.xlsx` (sheet TARGET_FOR_OPERATION, brand VIVO) → `python3 -I pipeline/update.py --vivo-target <file>` (Drive: any name with "vivo" + "target")
- `* PC Brand Update*.xlsx` (newest sheet "PC <MON> <yy>", column VIVO by CODE WW) → `--pc <file>` (Drive: name contains "PC Brand")
- Central-system Vivo sales (`VIVO Sale*.xlsx`, WW_FLAG = WW, sale day = YEAR/MONTH/DAY because TRANSACTION_DATE is the month end) →
  `--vivo-hist <file>` (Drive: name contains "vivo" + "sale") → `state/vivo_hist.csv.gz`. The page uses these figures up to DATA_ASOF_DATE
  and POS (TSM) daily_sales rows only for later dates (no double counting). Nami: Nov 26 portion = Oct portion until announced.
- Week portions (8-7-7-8 / 8-7-7-9): `state/vivo_portions.json`, e.g. `{"2026-10": [30, 23, 21, 26]}`; a month not listed uses the share of days
- Page: `pipeline/vivo_page.html` + `out/vivo_data.json` → `vivo/index.html` (built by build_page.py). Model match: sales
  `H/S,VIVO,V80LITE,5G,6/256,...` ↔ target `VIVO V80 LITE 5G 6/256GB` (key V80LITE|5G|6256; PHOTOSET kept separate).
- Download password (Nami, 4 Nov 2026): every Excel / PNG download asks a separate password (PBKDF2 hash DL_HASH in vivo_page.html; asked once per visit).
- Password (Nami, 4 Nov 2026): the Vivo page is locked. vivo_page.py encrypts out/vivo_data.json (zlib + AES-256-GCM, key wrapped with the
  RSA public key in `pipeline/vivo_lock.json`); the browser unlocks the RSA private key with the password (PBKDF2-SHA256 250k + AES-GCM).
  The password is not stored in the repo. To change it, regenerate vivo_lock.json with the new password (new key pair) and rebuild.
  GitHub Actions needs `cryptography` (installed in drive-sync.yml).
