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
3. Only if `pipeline/page.html` (or a `pipeline/*.js` it loads) changed: `update` collection `files` doc `index.html` with `file_path` = `pipeline/out/page_doc.json`, and doc `sa.js` with `pipeline/out/sa.js.doc.json` (each file must stay under 256 KB).
4. Read ArtifactData collection `data/users/me` doc `check` (up to 5 reads; none or gone = passed).
5. Delete the old blobs that are no longer referenced (Artifact `delete` with `url` + `path` = old blob id) — optional.

## 3. Tell Nami
One short message: data as of <latest sales time>, stock as of <stock time>, today's QTY / Net Amount, and the link
https://fcaeg.github.io/prepay-dashboard/ (GitHub Pages refreshes in 1–2 minutes).

## Automatic updates from Google Drive (GitHub Actions)
`.github/workflows/drive-sync.yml` runs every hour 09:05–22:05 Bangkok (and on demand: Actions → "Update from Google Drive" → Run workflow).
It runs `pipeline/drive_sync.py`, which lists the Drive inbox folder (`vars.DRIVE_FOLDER_ID`, read with the service account in
`secrets.GDRIVE_SA_JSON`), recognises files by name (daily_sales*, stock_balance_report*, *Target of <Mon> <yy>*, *Individual Target of*,
Manpower*, Master Prepaid*), runs update.py + build_page.py, moves the files to the sub-folder Done (or Error) and commits
`pipeline/state` + `index.html`. Processed file ids are kept in `pipeline/state/drive_done.json`.
This updates GitHub Pages only; the Claude dashboard still needs step 2 above (pull first: `git pull origin main`).
