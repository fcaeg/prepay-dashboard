/**
 * Prepay / Vivo / GIA dashboards - start the GitHub update as soon as a file lands in the Drive inbox.
 *
 * Google Apps Script (script.google.com). Runs every minute on Google's servers:
 * if the inbox folder has a new data file, it asks GitHub to run "Update from Google Drive" now.
 * GitHub then downloads the file, rebuilds the dashboards and moves the file to Done (or Error).
 *
 * Setup (once):
 *   1. Project Settings (gear) > Script Properties > add
 *        FOLDER_ID     = the part after /folders/ in the "POS Sale Report (TSM)" folder URL
 *        GITHUB_TOKEN  = a fine-grained GitHub token for fcaeg/prepay-dashboard with "Actions: Read and write"
 *   2. Run `check` once and allow the permissions it asks for.
 *   3. Run `install` once - it adds the every-minute trigger.
 */
const REPO = 'fcaeg/prepay-dashboard';
const WORKFLOW = 'drive-sync.yml';
const NAMES = /^(daily_sales|stock_balance_report|manpower|master[ _]prepaid)|individual[ _]target[ _]of|target[ _]of[ _][a-z]{3}/i;

function check() {
  const P = PropertiesService.getScriptProperties();
  const folderId = P.getProperty('FOLDER_ID'), token = P.getProperty('GITHUB_TOKEN');
  if (!folderId || !token) throw new Error('Set FOLDER_ID and GITHUB_TOKEN in Project Settings > Script Properties');
  const seen = JSON.parse(P.getProperty('SEEN') || '{}');
  const files = DriveApp.getFolderById(folderId).getFiles();
  const fresh = [];
  while (files.hasNext()) {
    const f = files.next(); const key = f.getId() + '@' + f.getLastUpdated().getTime();
    if (NAMES.test(f.getName()) && !seen[key]) fresh.push([key, f.getName()]);
  }
  if (!fresh.length) return;
  const res = UrlFetchApp.fetch('https://api.github.com/repos/' + REPO + '/actions/workflows/' + WORKFLOW + '/dispatches', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
    payload: JSON.stringify({ ref: 'main' }),
  });
  if (res.getResponseCode() !== 204) { console.error('GitHub said ' + res.getResponseCode() + ': ' + res.getContentText()); return; } // retried next minute
  fresh.forEach(([k]) => (seen[k] = Date.now()));
  const cut = Date.now() - 7 * 864e5; Object.keys(seen).forEach((k) => { if (seen[k] < cut) delete seen[k]; }); // keep the list small
  P.setProperty('SEEN', JSON.stringify(seen));
  console.log('Update started for: ' + fresh.map((x) => x[1]).join(', '));
}

function install() {
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('check').timeBased().everyMinutes(1).create();
}
