# Prepay Dashboard — daily update (13:00 Bangkok)

Inputs Nami attaches each day (zip or csv):
- `daily_sales - <date>.zip`  — POS sales, month-to-date (any dates in it replace the same dates in the state)
- `stock_balance_report as of <d Mon yyyy> Time <hh.mm>.zip` — stock snapshot (replaces the previous one)
- occasionally `..._Target_of_<Mon>_26_....xlsx` (new month's targets) or `Master Prepaid.xlsx`
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
For each file in `pipeline/out/` that changed — always `sales_daily.csv`, `watch_serials.json`, `stock_by_shop.json`, `aging_serials.json`,
`staff.json`, `shops.json`, `matcodes.json`; `targets.json` only after a new target file —
1. upload it as an asset: Artifact `publish` with `url` = the dashboard, `file_path` = the file, `asset: true` → returns `/_blob/<id>`
2. ArtifactData `get` collection `datasets` doc `<id without extension>` for its version, then `update` it with
   `{source: {kind: "file", name: "<file name>", url: "/_blob/<id>"}, updated: {at: "<ISO time +07:00>", by: "Claude จากไฟล์ <input file name>"}}` (`if_version`).
   Do several in one ArtifactData `batch`.
3. Only if `pipeline/page.html` changed: `update` collection `files` doc `index.html` with `file_path` = `pipeline/out/page_doc.json`.
4. Read ArtifactData collection `data/users/me` doc `check` (up to 5 reads; none or gone = passed).
5. Delete the old blobs that are no longer referenced (Artifact `delete` with `url` + `path` = old blob id) — optional.

## 3. Tell Nami
One short message: data as of <latest sales time>, stock as of <stock time>, today's QTY / Net Amount, and the link
https://fcaeg.github.io/prepay-dashboard/ (GitHub Pages refreshes in 1–2 minutes).
