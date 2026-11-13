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

- SN expiry snapshot from HQ (e.g. `Update Serial Sim with Expire date data <d Mon yyyy>.xlsx`, sheet with Status / Expire Date, or the older sheet Detail):
  `python3 -I pipeline/update.py --snexpiry <xlsx>` (Drive: names with Serial+Expire / SN sim / แจ้งเตือนซิม) - replaces the watch lists; keeps plant 0321,
  status Valid or New Lot; serials already sold stay.
- Shops added to WW outside the target files: `pipeline/state/extra_shops.csv` (shop,name,region,type,province,dm,from,note); sales count from `from`,
  no target until a target file lists the shop (then the target file's name / area win). Now: Ten Ten Shop 80101715 (BMA I - North West) and
  80101714 (UPC - West), type TenTen, under WW from 1 Nov 2026 (Nami, 5 Nov) - target pending.

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
- Target to date is FLAT (Nami, 4 Nov 2026): month Target ÷ days × days passed; the 8-7-7-8 portions are no longer used (vivo_portions.json is ignored). WoW = ISO weeks Mon–Sun, latest week to date vs the same weekdays of the week before; tab 6 shows W1–W52.
- Page: `pipeline/vivo_page.html` + `out/vivo_data.json` → `vivo/index.html` (built by build_page.py). Model match: sales
  `H/S,VIVO,V80LITE,5G,6/256,...` ↔ target `VIVO V80 LITE 5G 6/256GB` (key V80LITE|5G|6256; PHOTOSET kept separate).
- Download password (Nami, 4 Nov 2026): every Excel / PNG download asks a separate password (PBKDF2 hash DL_HASH in vivo_page.html; asked once per visit).
- Password (Nami, 4 Nov 2026): the Vivo page is locked. vivo_page.py encrypts out/vivo_data.json (zlib + AES-256-GCM, key wrapped with the
  RSA public key in `pipeline/vivo_lock.json`); the browser unlocks the RSA private key with the password (PBKDF2-SHA256 250k + AES-GCM).
  The password is not stored in the repo. To change it, regenerate vivo_lock.json with the new password (new key pair) and rebuild.
  GitHub Actions needs `cryptography` (installed in drive-sync.yml).

## GIA Dashboard (https://fcaeg.github.io/prepay-dashboard/gia/)
Gadget / IOT / Accessory sales of Nami's North shops, same daily_sales input (`pipeline/gia.py`, hooked into update.py; a GIA error never stops Prepay).
- GIA rule: ACC → Accessory · WATCH / OTT / IT → Gadget · IOT, T,IOT → IOT · lines with a `FOC` part are not counted; H/S, SIM, IPAD, scratch cards are not GIA
  (checked against Nami's GIA_North_Nov_1.xlsx: 27/28 shops identical, the 28th had a sale after her file's time).
- A daily_sales file is a snapshot: for its main days (>= 100 rows of that bill date) the newer file REPLACES that day (cancelled bills drop out);
  `meta.json gia_day_asof` keeps the latest bill time per day, an older snapshot never overwrites a newer one. → `state/gia_sales_<YYYY-MM>.csv.gz`
- Shops, sections, order and month targets come from Nami's report `GIA_North_<Mon>_<d>.xlsx` (sheets UN / LN) →
  `python3 -I pipeline/update.py --gia-target <file>` (Drive: any xlsx whose name starts with "GIA") → `state/gia_targets.csv`; the file is kept as
  `state/gia_template.xlsx` and every build writes `gia/xlsx/GIA_North_<Mon>_<d>.xlsx` for each day of the month (template filled with values, no external links).
- Target per day = month target ÷ days in month (template: ÷30). Page: `pipeline/gia_page.html` → `gia/index.html` (gia_page.py, built by build_page.py).
- Nov 2026: no daily_sales file for 3 Nov in Drive; 2 Nov is up to 21:45, 4 Nov up to 16:23 (partial).

### Instant start from Drive (Google Apps Script)
`pipeline/drive_trigger.gs` runs every minute in Nami's Google account (script.google.com): when a data file appears in the
inbox folder it calls the GitHub workflow_dispatch API, so the update starts within ~1 minute instead of waiting for GitHub's
(often late) schedule. Script Properties: FOLDER_ID, GITHUB_TOKEN (fine-grained, fcaeg/prepay-dashboard, Actions read/write).

### Stock folder
Stock files may be dropped in the "Stock" folder next to the inbox ("POS Sale Report (TSM)"). The Apps Script (drive_trigger.gs,
copyNewStock) copies each new stock_balance_report file into the inbox (original stays in Stock); files older than 3 days are skipped.
Stock time = the date/time in the file name ("... 7 Nov 2026 Time 1100.zip" -> 2026-11-07 11:00), else the file's upload time.

### Rebuilding pages by hand
pipeline/out/ is gitignored, so a local copy can be stale. Always run `python3 -I pipeline/update.py` (no args) before
`build_page.py`, or the Prepay page is rebuilt from old data (happened 7 Nov 2026: stock went back to 5 Nov).

### Gross unit (Vivo)
Gross = QTY x RRP per model. RRP file: an xlsx with columns Model | RRP and "vivo" + "RRP" in its name (Drive or `update.py --vivo-rrp`);
rows are kept in state/vivo_rrp.csv and matched to models at build time (model + memory, optional 4G/5G, "Set" = PHOTOSET; a row
without memory covers all sizes without their own row). Gross target = QTY target x RRP. Models without RRP: sales use the
actual full price (PRICE x QTY / AMOUNT), targets use the Net target. The Amount column (7 Nov) is switched off (SHOWA = false).

### Page size
`pipeline/page.html` must stay under ~250 KB as a Claude files doc; the ranking/tables/stock/watch script now lives in `pipeline/pc_main.js`
(loaded with <script src>, inlined for GitHub, published as files doc `pc_main.js`). Put new code in sa.js / pc_main.js, not page.html.
### Stock history / out-of-stock card
Each stock file appends shop x matcode counts to state/stock_hist.csv.gz (180 days); out/stock_lastpos.json = last stock file in which a
shop still had a Matcode it has 0 of now. Card "สินค้าหมด ราย Matcode" (Stock tab): out since ≈ later of last sale / last stock seen,
avg = units in the 28 days before that ÷ 28, lost = avg × days out × list price; Excel via SheetJS (cdnjs) on click.

## Shop Performance Dashboard (https://fcaeg.github.io/prepay-dashboard/performance/)
Upper North shop performance (radar summary → detail per topic). `pipeline/perf.py` (hooked into update.py; an error never stops Prepay),
page `pipeline/perf_page.html` → `performance/index.html` (perf_page.py, built by build_page.py). Data stays inline (no fetch).
- Shops (Nami, 13 Nov 2026): region UPC - Upper North of the target file, minus type Lotus's (Nan, Hangdong, Chiang Khong) = 17 shops.
- Targets: the same Drive files as Prepay — `*Target of <Mon> <yy>*` → `state/perf_targets.csv` (POST / TOL / DEVICE / ACC=GIA / TVS:
  Target Subscribers + Target Revenue), `*Individual Target of*` → `state/perf_ind_targets.csv` (same products per employee).
- Actuals: Device = H/S (incl. tablets) + IPAD, no FOC (Nami, 13 Nov 2026) from every daily_sales → `state/perf_dev_<YYYY-MM>.csv.gz`
  (day x shop x SALE_CODE; newer snapshot of a day replaces it). GIA from gia.py's state. SALE_CODE = emp_id8 of the Indy Target.
- % = actual ÷ (month target × days to latest sale ÷ days in month); previous month = full month.
- Pending: Postpay / TOL / TVS actuals (report from Nami), Service & Retention, EBIT & Revenue, Sale Longevity; Oct 2026 actuals.
- Nov 2026 Device was backfilled by hand from Drive snapshots: 3 Nov missing, 4 Nov up to 16:23, 5 Nov up to 19:00 (Device understated).
