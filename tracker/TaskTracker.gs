/**
 * Task Tracker – ติดตามงานสาขา
 * วิธีใช้:
 *   1) สร้าง Google Sheet ใหม่ > ส่วนขยาย (Extensions) > Apps Script
 *   2) ลบโค้ดเดิม วางไฟล์นี้ทั้งหมด > บันทึก
 *   3) เลือกฟังก์ชัน setup แล้วกด Run (อนุญาตสิทธิ์ครั้งแรก)
 *   4) ดูลิงก์ฟอร์มในแท็บ "Settings" > เพิ่มลิงก์ไว้ที่หน้าจอโฮมมือถือ
 */

const TABS = {
  branches: ['Branches', ['code', 'name', 'area']],
  tasks:    ['Tasks',    ['task_id', 'title', 'type', 'link', 'detail', 'assigned', 'due', 'branches', 'raw_message', 'attachments', 'auto_check', 'check_tab', 'check_done_col', 'check_done_value', 'check_log', 'tracked_branches']],
  done:     ['Done',     ['task_id', 'branch_code', 'status', 'note', 'updated']],
  exams:    ['Exams',    ['exam_id', 'title', 'link', 'due', 'pass_score', 'raw_message', 'attachments']],
  staff:    ['Staff',    ['emp_id', 'name', 'branch_code', 'position']],
  results:  ['ExamResults', ['exam_id', 'emp_id', 'score']],
  trainings:['Trainings', ['training_id', 'date', 'start', 'end', 'title', 'location', 'link', 'trainer', 'detail', 'attachments']],
  attendees:['TrainingAttendees', ['training_id', 'name', 'branch_code', 'emp_id', 'note']],
  daily:    ['Daily', ['daily_id', 'title', 'frequency', 'link', 'detail', 'deadline', 'days', 'branches', 'active', 'auto_check', 'check_tab', 'check_done_col', 'check_done_value', 'check_log', 'tracked_branches']]
};

const Q = {
  msg:      'รายละเอียดงาน (วางข้อความ + ลิงก์จากไลน์)',
  type:     'ประเภทงาน',
  due:      'Due (เว้นว่าง = อ่านจากข้อความ)',
  freq:     'รอบงาน',
  area:     'ส่งถึง',
  branches: 'รหัสสาขา (ถ้าเลือก "ระบุสาขาเอง")',
  title:    'ชื่องาน'
};
const TYPE_AUTO = 'อัตโนมัติ (ดูจากลิงก์)';
const DEFAULT_CHECK_TAB = 'UPC - Upper North, UPC - Lower North, Upper North, Lower North, UN, LN, North';
const SET_CHECK_TAB = 'check_tab เริ่มต้น (ใช้กับทุกงานที่เป็น Google Sheet/Form)';
const AREAS = ['ทุกสาขา', 'Upper North', 'Lower North', 'ระบุสาขาเอง'];
const FREQS = ['One Time (ครั้งเดียว)', 'Daily (ทุกวัน)', 'Weekly (ทุกสัปดาห์)', 'Monthly (ทุกเดือน)'];
const TYPES = [TYPE_AUTO, 'Google Form', 'Google Doc', 'Google Sheet', 'Dashboard', 'ส่งไฟล์ (Drive)', 'งานประจำวัน', 'อบรม', 'การสอบ', 'อื่นๆ'];

/* ===================== ตั้งค่าครั้งแรก ===================== */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.values(TABS).forEach(([name, head]) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#e8eeff');
      sh.setFrozenRows(1);
    } else {                                   // เติมคอลัมน์ใหม่ที่ยังไม่มี (ไม่แตะข้อมูลเดิม)
      const cur = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(String);
      head.filter(h => !cur.includes(h)).forEach(h => {
        const c = sh.getLastColumn() + 1;
        sh.getRange(1, c).setValue(h).setFontWeight('bold').setBackground('#e8eeff');
      });
    }
    sh.getRange('A:Z').setNumberFormat('@'); // เก็บเป็นข้อความ กันวันที่เพี้ยนตาม locale
  });

  // ใช้ฟอร์มเดิมถ้ามีแล้ว (ลิงก์ไม่เปลี่ยน) ไม่มีค่อยสร้างใหม่
  let form = null, isNew = false;
  if (ss.getFormUrl()) { try { form = FormApp.openByUrl(ss.getFormUrl()); } catch (err) { form = null; } }
  if (!form) {
    form = FormApp.create('ลงงานใหม่ – Task Tracker');
    form.setDescription('วางข้อความจากไลน์ทั้งก้อน (มีลิงก์ได้หลายลิงก์) ระบบจะแยกชื่องาน ลิงก์ รายละเอียด และ Due ให้เอง');
    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
    isNew = true;
  }
  ensureQuestions_(form);

  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'onTaskForm') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onTaskForm').forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.getProjectTriggers().forEach(t => { if (['autoCheck', 'autoCheckQuick'].includes(t.getHandlerFunction())) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('autoCheckQuick').timeBased().everyMinutes(1).create();

  SpreadsheetApp.flush();
  if (isNew) ss.getSheets().forEach(sh => { if (sh.getFormUrl && sh.getFormUrl()) sh.setName('_FormInput'); });

  let st = ss.getSheetByName('Settings') || ss.insertSheet('Settings');
  const keepTab = getSetting_(SET_CHECK_TAB) || DEFAULT_CHECK_TAB;
  st.clear();
  st.getRange('A1:B4').setValues([
    ['ลิงก์ฟอร์มลงงาน (เปิดบนมือถือ)', form.getPublishedUrl()],
    ['แก้ไขฟอร์ม', form.getEditUrl()],
    ['Sheet ID (ใส่ในหน้าเว็บ)', ss.getId()],
    [SET_CHECK_TAB, keepTab]
  ]);
  st.getRange('A:B').setNumberFormat('@');
  st.autoResizeColumns(1, 2);
  const hasUpload = form.getItems().some(i => i.getType() === FormApp.ItemType.FILE_UPLOAD);
  const msg = 'ตั้งค่าเสร็จ ✅\nลิงก์ฟอร์มอยู่ในแท็บ Settings' + (hasUpload ? '' :
    '\n\nยังไม่มีช่องแนบไฟล์: เปิด "แก้ไขฟอร์ม" > เพิ่มคำถาม > ประเภท "อัปโหลดไฟล์"');
  try { SpreadsheetApp.getUi().alert(msg); }
  catch (err) { Logger.log('ตั้งค่าเสร็จ ✅ ลิงก์ฟอร์มอยู่ในแท็บ Settings'); }
}

/* เพิ่มคำถามที่ยังไม่มี โดยไม่แตะคำถาม/คำตอบเดิม */
function ensureQuestions_(form) {
  const find = t => form.getItems().find(i => i.getTitle() === t);
  const rename = (from, to) => { const it = find(from); if (it && !find(to)) it.setTitle(to); };
  rename('สาขาที่เกี่ยวข้อง', Q.branches);                     // ชื่อคำถามเวอร์ชันก่อน
  rename('วางข้อความจากไลน์', Q.msg);
  rename('ชื่องาน (เว้นว่าง = ตั้งให้อัตโนมัติ)', Q.title);
  if (!find(Q.msg))   form.addParagraphTextItem().setTitle(Q.msg).setRequired(true);
  if (!find(Q.type))  form.addListItem().setTitle(Q.type).setChoiceValues(TYPES).setRequired(false);
  else find(Q.type).asListItem().setChoiceValues(TYPES);
  if (!find(Q.due))   form.addDateItem().setTitle(Q.due).setRequired(false);
  if (!find(Q.freq))  form.addMultipleChoiceItem().setTitle(Q.freq).setChoiceValues(FREQS).setRequired(true)
    .setHelpText('Daily / Weekly / Monthly จะไปอยู่ใน Tab งานประจำ (วันในสัปดาห์หรือวันที่ของเดือน ระบบอ่านจากข้อความ ถ้าไม่มีจะใช้วันที่ส่งฟอร์ม)');
  if (!find(Q.area))  form.addMultipleChoiceItem().setTitle(Q.area).setChoiceValues(AREAS).setRequired(false);
  if (!find(Q.branches)) form.addTextItem().setTitle(Q.branches);
  if (!find(Q.title)) form.addTextItem().setTitle(Q.title);
  find(Q.title).asTextItem().setHelpText('เว้นว่าง = ระบบตั้งชื่อจากบรรทัดหลักของข้อความ | พิมพ์เองเมื่ออยากได้ชื่อสั้นกว่า');
  find(Q.msg).asParagraphTextItem().setRequired(false).setHelpText('วางข้อความจากไลน์ได้ทั้งก้อน มีหลายลิงก์ได้ ระบบแยกลิงก์ / Due / ประเภทงาน ให้เอง (แนบแค่รูปอย่างเดียวก็ได้)');
  find(Q.branches).asTextItem().setHelpText('เช่น UN01,UN05,LN03 (ใส่ชื่อ Area ปนได้ เช่น Lower North,UN01)');
  // ส่วน "ไม่ต้องกรอกก็ได้"
  const OPT = 'ตัวเลือกเพิ่มเติม (เว้นว่างได้ ระบบแยกให้เอง)';
  if (!find(OPT)) form.addSectionHeaderItem().setTitle(OPT)
    .setHelpText('ชื่องาน, ประเภทงาน, Due และลิงก์ ระบบอ่านจากข้อความให้อัตโนมัติ กรอกเฉพาะเมื่ออยากกำหนดเอง');
  // เรียงลำดับ: รายละเอียด | (เว้นว่างได้) ชื่องาน > ส่งถึง > Due > ประเภท > รหัสสาขา
  [Q.msg, Q.freq, OPT, Q.title, Q.area, Q.due, Q.type, Q.branches].forEach((t, i) => {
    const it = find(t); if (it && it.getIndex() !== i) form.moveItem(it.getIndex(), i);
  });
}

function getSetting_(label) {
  const st = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  if (!st || st.getLastRow() < 1) return '';
  const row = st.getRange(1, 1, st.getLastRow(), 2).getDisplayValues().find(r => r[0] === label);
  return row ? String(row[1]).trim() : '';
}
function defaultCheckTab_() { return getSetting_(SET_CHECK_TAB) || DEFAULT_CHECK_TAB; }
const isCheckable_ = link => /docs\.google\.com\/(spreadsheets|forms)|forms\.gle/i.test(String(link || ''));

/* ===================== รับข้อมูลจากฟอร์ม ===================== */
function onTaskForm(e) {
  const nv = e.namedValues || {};
  const OLD = { branches: 'สาขาที่เกี่ยวข้อง', msg: 'วางข้อความจากไลน์', title: 'ชื่องาน (เว้นว่าง = ตั้งให้อัตโนมัติ)' };
  const v = k => ((nv[Q[k]] || nv[OLD[k]] || [''])[0] || '').toString().trim();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const today = toIso(new Date());

  // ---------- ไฟล์แนบ (หาจากทุกคำตอบที่เป็นลิงก์ Drive) ----------
  const fileIds = [];
  Object.values(nv).flat().join(',').replace(/[?&]id=([\w-]{20,})/g, (_, id) => { if (!fileIds.includes(id)) fileIds.push(id); });
  const files = fileIds.map(id => { try { return DriveApp.getFileById(id); } catch (err) { return null; } }).filter(Boolean);
  files.forEach(f => { try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (err) {} });
  const attachments = files.map(f => [f.getName().replace(/\|/g, ' '), 'https://drive.google.com/file/d/' + f.getId() + '/view', f.getMimeType()].join('|')).join('\n');

  // ข้อความในรูป (OCR) ช่วยแยกวันที่/เวลา/หัวข้อ
  const ocr = files.filter(f => /^image\/|pdf/.test(f.getMimeType())).map(ocrText_).filter(Boolean).join('\n');
  const p = parseLineMessage(v('msg') + (ocr ? '\n' + ocr : ''), new Date());
  p.raw = v('msg');
  if (ocr) p.detail = (p.detail ? p.detail + '\n' : '') + '— ข้อความจากรูป —\n' + ocr.slice(0, 1500);

  // รายชื่อจาก Excel / CSV / Google Sheet
  const roster = files.filter(f => /sheet|excel|csv/i.test(f.getMimeType()) || /\.(xlsx?|csv)$/i.test(f.getName()))
    .map(f => readTable_(f)).flatMap(t => parseRoster(t, branchList_()));

  let type = (v('type') && v('type') !== TYPE_AUTO) ? v('type') : p.type;
  if (type === 'งานประจำวัน' && /one\s*time/i.test(v('freq'))) type = detectType(p.links, p.raw);
  const title = v('title') || p.title;
  const due = v('due') ? toIso(new Date(v('due'))) : p.due;
  const area = v('area');
  let branches = 'ALL';
  if (v('branches')) branches = v('branches').replace(/\s*,\s*/g, ',');
  else if (area && area !== 'ทุกสาขา' && area !== 'ระบุสาขาเอง') branches = area;

  const freq = v('freq');
  const recurring = /daily|weekly|monthly/i.test(freq) || (!freq && type === 'งานประจำวัน');
  if (recurring) {
    const sh = ss.getSheetByName(TABS.daily[0]);
    const f = /weekly/i.test(freq) ? 'Weekly' : /monthly/i.test(freq) ? 'Monthly' : 'Daily';
    const tm = (p.raw.match(/(?:ภายใน|ก่อน|ไม่เกิน)\s*(?:เวลา)?\s*(\d{1,2})[.:](\d{2})/) || p.raw.match(/(\d{1,2})[.:](\d{2})\s*น/) || []);
    appendObj_(sh, {daily_id: nextId(sh, 'D'), title, frequency: f, link: p.links.join(' '), detail: p.detail,
      deadline: tm[1] ? tm[1].padStart(2, '0') + ':' + tm[2] : '', days: recurDays(f, p.raw, new Date()), branches, active: 'Y',
      check_tab: isCheckable_(p.links.join(' ')) ? defaultCheckTab_() : ''});
  } else if (type === 'อบรม' || (p.training && (!v('type') || v('type') === TYPE_AUTO))) {
    const tr = p.training || {};
    const sh = ss.getSheetByName(TABS.trainings[0]);
    const id = nextId(sh, 'TR');
    appendObj_(sh, {training_id: id, date: v('due') ? due : (tr.date || due), start: tr.start || '', end: tr.end || '',
      title, location: tr.location || '', link: p.links.join(' '), detail: p.detail, attachments});
    if (roster.length) {
      const at = ss.getSheetByName(TABS.attendees[0]);
      roster.filter(r => r.name || r.emp_id).forEach(r => appendObj_(at, {training_id: id, name: r.name, branch_code: r.code, emp_id: r.emp_id, note: r.note}));
    }
    if (p.exam) {                              // มีสอบต่อท้ายการอบรม
      const ex = ss.getSheetByName(TABS.exams[0]);
      appendObj_(ex, {exam_id: nextId(ex, 'E'), title: 'สอบ – ' + title, due: p.exam.due || '', raw_message: p.exam.text || p.raw});
    }
  } else if (type === 'การสอบ') {
    const sh = ss.getSheetByName(TABS.exams[0]);
    appendObj_(sh, {exam_id: nextId(sh, 'E'), title, link: p.links.join(' '), due, raw_message: p.raw, attachments});
  } else {
    // Excel ที่มีแต่สาขา (ไม่มีชื่อคน) = รายชื่อสาขาที่ต้องทำงานนี้
    const codes = [...new Set(roster.filter(r => r.code && !r.name).map(r => r.code))];
    if (branches === 'ALL' && codes.length) branches = codes.join(',');
    const sh = ss.getSheetByName(TABS.tasks[0]);
    appendObj_(sh, {task_id: nextId(sh, 'T'), title, type, link: p.links.join(' '), detail: p.detail,
      assigned: today, due, branches, raw_message: p.raw, attachments,
      check_tab: isCheckable_(p.links.join(' ')) ? defaultCheckTab_() : ''});
  }
}

/* วันที่ต้องทำของงานประจำ: Daily = ทุกวัน/จ-ศ, Weekly = วันในสัปดาห์, Monthly = วันที่ของเดือน */
function recurDays(freq, text, now) {
  text = String(text || '');
  const TH = [['อา', 'อาทิตย์'], ['จ', 'จันทร์'], ['อ', 'อังคาร'], ['พ', 'พุธ'], ['พฤ', 'พฤหัส'], ['ศ', 'ศุกร์'], ['ส', 'เสาร์']];
  if (freq === 'Daily') return /จ\s*[-–]\s*ศ|วันทำการ|จันทร์\s*[-–]\s*ศุกร์/.test(text) ? 'จ-ศ' : 'ทุกวัน';
  if (freq === 'Weekly') {
    const found = TH.map((d, i) => ({i, k: d[0], hit: new RegExp('วัน' + d[1] + '|ทุก' + d[1]).test(text)})).filter(x => x.hit);
    return (found.length ? found : [{k: TH[now.getDay()][0]}]).map(x => x.k).join(',');
  }
  if (freq === 'Monthly') {
    if (/สิ้นเดือน|วันสุดท้ายของเดือน|end of month/i.test(text)) return 'สิ้นเดือน';
    const m = text.match(/(?:ทุก)?วันที่\s*(\d{1,2})(?!\d)(?!\s*(?:\/|ม\.ค|ก\.พ|มี\.ค|เม\.ย|พ\.ค|มิ\.ย|ก\.ค|ส\.ค|ก\.ย|ต\.ค|พ\.ย|ธ\.ค|มกรา|กุมภา|มีนา|เมษา|พฤษภา|มิถุนา|กรกฎา|สิงหา|กันยา|ตุลา|พฤศจิกา|ธันวา))/);
    return 'วันที่ ' + (m ? m[1] : now.getDate());
  }
  return 'ทุกวัน';
}

/* เขียนแถวตามชื่อหัวคอลัมน์ (คอลัมน์ไหนไม่มีก็ข้าม) */
function appendObj_(sh, obj) {
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  sh.appendRow(head.map(h => (obj[h] == null ? '' : obj[h])));
}

function branchList_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.branches[0]);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().map(([code, name]) => ({code: String(code).trim(), name: String(name).trim()}));
}

/* อ่านตารางจากไฟล์: CSV อ่านตรง, Excel แปลงเป็น Google Sheet ชั่วคราว (ต้องเปิดบริการ Drive API) */
function readTable_(file) {
  try {
    const mt = file.getMimeType();
    if (/csv/i.test(mt) || /\.csv$/i.test(file.getName())) return Utilities.parseCsv(file.getBlob().getDataAsString('UTF-8'));
    let id = file.getId(), tmp = null;
    if (mt !== MimeType.GOOGLE_SHEETS) {
      tmp = Drive.Files.copy({name: '_tmp_roster', mimeType: MimeType.GOOGLE_SHEETS}, id);
      id = tmp.id;
    }
    const vals = SpreadsheetApp.openById(id).getSheets()[0].getDataRange().getDisplayValues();
    if (tmp) DriveApp.getFileById(tmp.id).setTrashed(true);
    return vals;
  } catch (err) { Logger.log('อ่านไฟล์ไม่ได้: ' + file.getName() + ' ' + err); return []; }
}

/* OCR รูป/PDF เป็นข้อความ (ต้องเปิดบริการ Drive API) */
function ocrText_(file) {
  try {
    const doc = Drive.Files.copy({name: '_tmp_ocr', mimeType: MimeType.GOOGLE_DOCS}, file.getId(), {ocrLanguage: 'th'});
    const text = DocumentApp.openById(doc.id).getBody().getText();
    DriveApp.getFileById(doc.id).setTrashed(true);
    return text.trim();
  } catch (err) { Logger.log('OCR ไม่ได้: ' + err); return ''; }
}

function nextId(sh, prefix) {
  const n = sh.getLastRow() < 2 ? [] : sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().flat();
  const max = n.reduce((m, x) => Math.max(m, Number(String(x).replace(/\D/g, '')) || 0), 0);
  return prefix + String(max + 1).padStart(3, '0');
}

/* ===================== ตัวแยกข้อความไลน์ ===================== */
const TH_MONTHS = [
  ['ม.ค.', 'มกรา'], ['ก.พ.', 'กุมภา'], ['มี.ค.', 'มีนา'], ['เม.ย.', 'เมษา'], ['พ.ค.', 'พฤษภา'], ['มิ.ย.', 'มิถุนา'],
  ['ก.ค.', 'กรกฎา'], ['ส.ค.', 'สิงหา'], ['ก.ย.', 'กันยา'], ['ต.ค.', 'ตุลา'], ['พ.ย.', 'พฤศจิกา'], ['ธ.ค.', 'ธันวา']
];

function toIso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function fixYear(y, now) {
  if (y == null) return null;
  y = Number(y);
  if (y < 100) y += (y > 50 ? 2500 : 2000);   // 69 -> 2569, 26 -> 2026
  if (y > 2400) y -= 543;                      // พ.ศ. -> ค.ศ.
  return y;
}

function makeDate(d, m, y, now) {
  let yy = fixYear(y, now);
  if (yy == null) {
    yy = now.getFullYear();
    const tmp = new Date(yy, m, d);
    if ((now - tmp) / 86400000 > 60) yy += 1; // วันที่ผ่านไปนานแล้ว = ปีหน้า
  }
  const dt = new Date(yy, m, d);
  return (dt.getMonth() === m && dt.getDate() === d) ? dt : null;
}

function findDates(text, now) {
  const out = [];
  const re1 = /(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?/g;
  let m;
  while ((m = re1.exec(text))) {
    const d = makeDate(+m[1], +m[2] - 1, m[3], now);
    if (d) out.push({ d, i: m.index });
  }
  TH_MONTHS.forEach(([abbr, full], mi) => {
    const esc = abbr.replace(/\./g, '\\.');
    const re = new RegExp('(\\d{1,2})\\s*(?:' + esc + '|' + full + '(?:คม|ยน|พันธ์)?)\\s*(\\d{2,4})?', 'g');
    let x;
    while ((x = re.exec(text))) {
      const d = makeDate(+x[1], mi, x[2], now);
      if (d) out.push({ d, i: x.index });
    }
  });
  const rel = [[/วันนี้/, 0], [/พรุ่งนี้/, 1], [/มะรืน/, 2]];
  rel.forEach(([r, n]) => {
    const x = r.exec(text);
    if (x) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n); out.push({ d, i: x.index }); }
  });
  return out.sort((a, b) => a.i - b.i);
}

function pickDue(text, now) {
  const dates = findDates(text, now);
  if (!dates.length) return '';
  const kw = /(ภายใน|ก่อน|ไม่เกิน|กำหนดส่ง|ส่งภายใน|deadline|due|ปิดรับ|หมดเขต)/ig;
  let k, best = null;
  while ((k = kw.exec(text))) {
    const after = dates.find(x => x.i >= k.index && x.i - k.index < 40);
    if (after) { best = after; break; }
  }
  if (!best) best = dates.reduce((a, b) => (b.d > a.d ? b : a)); // ไม่มีคำบอก Due ใช้วันที่ล่าสุด
  return toIso(best.d);
}

function detectType(links, text) {
  const all = links.join(' ');
  if (/forms\.gle|docs\.google\.com\/forms/i.test(all)) return /สอบ|ข้อสอบ|exam|quiz/i.test(text) ? 'การสอบ' : 'Google Form';
  if (/lookerstudio|datastudio|powerbi|tableau/i.test(all)) return 'Dashboard';
  if (/docs\.google\.com\/spreadsheets/i.test(all)) return /dashboard|แดชบอร์ด/i.test(text) ? 'Dashboard' : 'Google Sheet';
  if (/docs\.google\.com\/document/i.test(all)) return 'Google Doc';
  if (/docs\.google\.com\/presentation/i.test(all)) return 'Google Slides';
  if (/drive\.google\.com/i.test(all)) return 'ส่งไฟล์ (Drive)';
  if (/สอบ|ข้อสอบ|exam/i.test(text)) return 'การสอบ';
  if (/dashboard|แดชบอร์ด/i.test(text)) return 'Dashboard';
  return 'อื่นๆ';
}

function parseLineMessage(raw, now) {
  raw = String(raw || '').replace(/\r/g, '');
  const urlRe = /https?:\/\/[^\s<>"'）)]+/g;
  const links = [...new Set((raw.match(urlRe) || []).map(u => u.replace(/[.,;:!?]+$/, '')))];

  const noUrl = raw.replace(urlRe, ' ');
  const lines = noUrl.split('\n')
    .map(l => l.replace(/[ \t]+/g, ' ').trim())
    .map(l => l.replace(/^(ลิงก์|ลิ้งค์|ลิงค์|link|คลิก|กด)\s*[:：]?\s*$/i, '').trim())
    .filter(l => l && !/^[\p{P}\p{S}\s]+$/u.test(l));

  const labelOf = l => { const m = l.match(/^([^:：]{2,30})\s*[:：]\s*(.*)$/); return m ? {k: m[1].trim(), v: m[2].trim()} : null; };
  const TITLE_LABEL = /^(หัวข้อ|เรื่อง|หลักสูตร|ชื่อหลักสูตร|ชื่องาน|topic|course)/i;
  const INFO_LABEL  = /(วันที่|วัน|เวลา|ช่องทาง|สถานที่|สอบ|ลิงก์|ลิ้งค์|link|หมายเหตุ|กำหนด|ผู้เข้า|วิทยากร|ระยะเวลา|รูปแบบ)/i;
  const isGreeting = l => /^(?:[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]*)(แจ้ง(ทุก)?สาขา|แจ้งอบรม|แจ้งเตือน|แจ้งข่าว|เรียน|สวัสดี|ถึง|ทุกสาขา|ด่วน|ประกาศ)\S{0,15}$/u.test(l);
  const isThanks  = l => /^(ขอบคุณ|thank|รบกวนด้วย|ขอบพระคุณ)/i.test(l);
  const body = lines.filter(l => !isThanks(l));
  const labeled = body.map(labelOf);
  const titleByLabel = labeled.find(x => x && TITLE_LABEL.test(x.k) && x.v);
  const titleLine = titleByLabel ? titleByLabel.v
    : (body.find((l, i) => !isGreeting(l) && !(labeled[i] && INFO_LABEL.test(labeled[i].k))) || '');

  let title = titleLine
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s•\-*#]+/u, '')
    .replace(/^(เรื่อง|หัวข้อ)\s*[:：]?\s*/, '')
    .replace(/^(ด่วน(ที่สุด)?|urgent)\s*!*\s*/i, '')
    .replace(/^(รบกวน|ขอความร่วมมือ|ขอให้)\s*(ทุก)?\s*(สาขา|น้องๆ|น้อง|ทีม|ผจก\.?)?\s*(ทุกคน|ทุกท่าน)?\s*(ช่วย)?\s*/, '')
    .split(/\s*(ภายใน|ก่อนวันที่|ก่อน\s*\d|ไม่เกิน|กำหนดส่ง|หมดเขต|deadline)/i)[0]
    .replace(/(ค่ะ|ครับ|นะคะ|นะครับ)\s*$/, '')
    .trim();
  if (title.length > 80) title = title.slice(0, 77) + '…';

  const detail = body.filter(l => !isGreeting(l)).join('\n');

  // ---------- อบรม / สอบ ----------
  const val = re => { const x = labeled.find(y => y && re.test(y.k)); return x ? x.v : ''; };
  const isTraining = /อบรม|training|workshop|สัมมนา/i.test(noUrl);
  let training = null, exam = null;
  if (isTraining) {
    const dateTxt = val(/วันที่อบรม|วันอบรม|วันที่/) || noUrl;
    const d = findDates(dateTxt, now)[0] || findDates(noUrl, now)[0];
    const tm = (val(/เวลา/) || noUrl).match(/(\d{1,2})[.:](\d{2})\s*(?:น\.?)?\s*(?:-|–|—|ถึง)\s*(\d{1,2})[.:](\d{2})/);
    let loc = val(/ช่องทาง|สถานที่|รูปแบบ/).replace(/join the meeting now/ig, '').replace(/^ผ่าน\s*/, '').trim();
    if (!loc) { const all = links.join(' '); loc = /teams\./i.test(all) ? 'Microsoft Teams' : /zoom\./i.test(all) ? 'Zoom' : /meet\.google/i.test(all) ? 'Google Meet' : ''; }
    training = {
      date: d ? toIso(d.d) : '',
      start: tm ? tm[1].padStart(2, '0') + ':' + tm[2] : '',
      end:   tm ? tm[3].padStart(2, '0') + ':' + tm[4] : '',
      location: loc
    };
    const exLine = labeled.find(y => y && /สอบ/.test(y.k));
    const exText = exLine ? exLine.v : (body.find(l => /สอบ/.test(l) && !/อบรม/.test(l)) || '');
    if (exText) { const ed = findDates(exText, now); exam = { due: ed.length ? toIso(ed[ed.length - 1].d) : '', text: exText }; }
  }
  if (!title) {
    const th = s => { const [y, m, d] = s.split('-').map(Number); return d + ' ' + TH_MONTHS[m - 1][0]; };
    title = training ? ('อบรม' + (training.date ? ' ' + th(training.date) : '') + (training.start ? ' ' + training.start + (training.end ? '–' + training.end : '') : '') + (training.location ? ' (' + training.location + ')' : ''))
                     : 'งานใหม่';
  }

  return {
    title,
    detail: detail || titleLine,
    links,
    type: training ? 'อบรม' : /ทุกวัน|ประจำวัน|รายวัน|daily/i.test(noUrl) ? 'งานประจำวัน' : detectType(links, raw),
    training, exam,
    due: pickDue(noUrl, now),
    raw
  };
}

/* ===================== ตรวจสถานะสาขาจากลิงก์งานอัตโนมัติ =====================
 * เปิดใช้ต่องานในแท็บ Tasks:
 *   auto_check       = Y
 *   check_tab        = ชื่อแท็บในลิงก์งาน (หลายแท็บคั่นด้วย ,) เว้นว่าง = ทุกแท็บ
 *   check_done_col   = เว้นว่าง = ระบบหาคอลัมน์สถานะเอง (ชีตคำตอบฟอร์ม: มีชื่อสาขา = ทำแล้ว)
 *                      ใส่เองได้: หัวคอลัมน์ หรือตัวอักษรคอลัมน์ เช่น K
 *   check_done_value = เว้นว่าง = ระบบเดาเอง | ใส่เองได้ คั่นด้วย / เช่น ส่งแล้ว/ครบ
 *                      ขึ้นต้นด้วย ! = เสร็จเมื่อไม่ใช่ค่านั้น เช่น !รอส่ง
 * ผลตรวจเขียนลงแท็บ Done (note = auto) และสรุปไว้ใน check_log
 * แถวใน Done ที่คุณใส่เอง (note ไม่ใช่ auto) จะไม่ถูกแตะ */
function autoCheck() {                       // ตรวจทุกงานเต็มรูปแบบ (เมนู)
  checkSheet_(TABS.tasks[0], 'task_id', false);
  checkSheet_(TABS.daily[0], 'daily_id', false);
  archiveCompleted_();
}

/* ย้ายงาน One Time ที่ครบทุกสาขาแล้ว จากแท็บ Tasks ไปแท็บ History (หยุดตรวจงานนั้น) */
function archiveCompleted_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tsh = ss.getSheetByName(TABS.tasks[0]);
  if (!tsh || tsh.getLastRow() < 2) return 0;
  const head = tsh.getRange(1, 1, 1, tsh.getLastColumn()).getValues()[0].map(String);
  const C = n => head.indexOf(n);
  let hsh = ss.getSheetByName('History');
  if (!hsh) { hsh = ss.insertSheet('History'); hsh.getRange('A:Z').setNumberFormat('@'); }
  const hHead = hsh.getLastRow() ? hsh.getRange(1, 1, 1, hsh.getLastColumn()).getValues()[0].map(String).filter(Boolean) : [];
  [...head, 'completed_at'].forEach(h => { if (h && !hHead.includes(h)) { hsh.getRange(1, hHead.length + 1).setValue(h).setFontWeight('bold').setBackground('#e3f6ea'); hHead.push(h); } });
  hsh.setFrozenRows(1);
  const bv = ss.getSheetByName(TABS.branches[0]).getDataRange().getDisplayValues(), bh = bv[0].map(String);
  const bi = n => bh.indexOf(n);
  const branches = bv.slice(1).filter(r => r[bi('code')]).map(r => ({code: String(r[bi('code')]).trim(),
    area: String((bi('area') >= 0 && r[bi('area')]) || (bi('zone') >= 0 && r[bi('zone')]) || '').trim()}));
  const dsh = ss.getSheetByName(TABS.done[0]);
  const st = {};
  if (dsh.getLastRow() > 1) dsh.getRange(2, 1, dsh.getLastRow() - 1, 3).getDisplayValues()
    .forEach(([t, c, x]) => { st[t + '|' + String(c).trim()] = /partial|บางส่วน/i.test(x) ? 'partial' : 'done'; });
  const N = x => String(x || '').toLowerCase().replace(/[\s_\-]+/g, '');
  const targets = (spec, tracked) => {
    spec = String(spec || '').trim();
    let list;
    if (!spec || /^(all|ทุกสาขา)$/i.test(spec)) list = branches.slice();
    else {
      const set = new Set();
      spec.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).forEach(tok => {
        const byArea = branches.filter(b => N(b.area) === N(tok) || b.area.split(/\s+/).map(w => w[0] || '').join('').toLowerCase() === N(tok));
        if (byArea.length) byArea.forEach(b => set.add(b.code)); else tok.split(/\s+/).forEach(c => set.add(c.toUpperCase()));
      });
      list = branches.filter(b => set.has(b.code));
    }
    const tr = String(tracked || '').split(/[,\s]+/).filter(Boolean);
    return tr.length ? list.filter(b => tr.includes(b.code)) : list;
  };
  const rows = tsh.getRange(2, 1, tsh.getLastRow() - 1, head.length).getDisplayValues();
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  let moved = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i], tid = r[C('task_id')];
    if (!tid) continue;
    const tg = targets(r[C('branches')], C('tracked_branches') >= 0 ? r[C('tracked_branches')] : '');
    if (!tg.length || !tg.every(b => st[tid + '|' + b.code] === 'done')) continue;
    const obj = {}; head.forEach((h, k) => obj[h] = r[k]); obj.completed_at = stamp;
    hsh.appendRow(hHead.map(h => obj[h] == null ? '' : obj[h]));
    tsh.deleteRow(i + 2);
    moved++;
  }
  return moved;
}

/* ตัวตั้งเวลารันทุก 1 นาที แต่ทำงานจริงทุก QUICK_EVERY นาที (Google ไม่มีตัวเลือก 2 นาที)
   ตรวจเฉพาะงานที่ไฟล์ปลายทางมีการแก้ไขใหม่ (ประหยัดโควตา) | งานที่ไม่มีการแก้ไขจะถูกตรวจซ้ำอย่างน้อยทุก 60 นาที
   ช่วงเวลาทำงาน QUICK_HOURS = [ชั่วโมงเริ่ม, ชั่วโมงสิ้นสุด) เช่น [8, 24] = 08:00–23:59 */
const QUICK_EVERY = 2;
const QUICK_HOURS = [8, 24];
function autoCheckQuick() {
  const now = new Date(), tz = Session.getScriptTimeZone();
  const h = Number(Utilities.formatDate(now, tz, 'H')), mi = Number(Utilities.formatDate(now, tz, 'm'));
  if (h < QUICK_HOURS[0] || h >= QUICK_HOURS[1]) return;
  if (mi % QUICK_EVERY !== 0) return;          // ข้ามนาทีคี่ → ทำงานทุก 2 นาที
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;            // รอบก่อนยังไม่เสร็จ ข้ามรอบนี้
  try {
    checkSheet_(TABS.tasks[0], 'task_id', true);
    checkSheet_(TABS.daily[0], 'daily_id', true);
    archiveCompleted_();
  } finally { lock.releaseLock(); }
}

/* ไฟล์ปลายทางเปลี่ยนตั้งแต่ตรวจครั้งก่อนไหม (ดูจากเวลาแก้ไขล่าสุดของไฟล์) */
function needsCheck_(tid, links, logText) {
  const props = PropertiesService.getScriptProperties();
  const key = 'chk_' + tid;
  const prev = JSON.parse(props.getProperty(key) || '{}');
  const now = Date.now();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  if (String(logText || '').slice(0, 10) !== today) return {go: true, key, now};   // ยังไม่เคยตรวจวันนี้
  if (!prev.at || now - prev.at > 60 * 60 * 1000) return {go: true, key, now};      // ตรวจซ้ำทุก 60 นาทีอยู่ดี
  let latest = 0;
  for (const u of links) {
    const m = String(u).match(/\/d\/([\w-]{20,})/);
    if (!m || /\/forms\//.test(u)) return {go: true, key, now};                   // ฟอร์ม: เช็กเวลาไม่ได้ ตรวจเลย
    try { latest = Math.max(latest, DriveApp.getFileById(m[1]).getLastUpdated().getTime()); }
    catch (err) { return {go: true, key, now}; }
  }
  return {go: latest > (prev.mod || 0), key, now, mod: latest};
}

function checkSheet_(tabName, idCol, quick) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tsh = ss.getSheetByName(tabName);
  if (!tsh || tsh.getLastRow() < 2) return;
  let head = tsh.getRange(1, 1, 1, tsh.getLastColumn()).getValues()[0].map(String);
  ['auto_check', 'check_tab', 'check_done_col', 'check_done_value', 'check_log', 'tracked_branches'].forEach(h => {   // เติมคอลัมน์ที่ยังไม่มีเอง
    if (!head.includes(h)) { tsh.getRange(1, head.length + 1).setValue(h).setFontWeight('bold').setBackground('#e8eeff'); head.push(h); }
  });
  const C = n => head.indexOf(n);
  const rows = tsh.getRange(2, 1, tsh.getLastRow() - 1, head.length).getDisplayValues();
  const branches = branchList_();
  const dsh = ss.getSheetByName(TABS.done[0]);
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

  const defTab = defaultCheckTab_();
  rows.forEach((r, i) => {
    const flag = String(r[C('auto_check')] || '').trim();
    if (/^(n|no|ไม่|0|false)$/i.test(flag)) return;                       // N = ปิดตรวจ
    if (!String(r[C('check_tab')] || '').trim() && isCheckable_(r[C('link')])) {   // งานเก่าที่ยังว่าง ใช้ค่าเริ่มต้น
      r[C('check_tab')] = defTab;
      tsh.getRange(i + 2, C('check_tab') + 1).setValue(defTab);
    }
    const on = /^(y|yes|✓|true|1|ใช่)$/i.test(flag) || String(r[C('check_tab')] || '').trim() !== '';
    if (!on) return;
    if (C('active') >= 0 && /^(n|no|ไม่|0|false)$/i.test(String(r[C('active')] || '').trim())) return;
    const tid = r[C(idCol)];
    const links = String(r[C('link')] || '').split(/\s+/).filter(Boolean);
    let nc = null;
    if (quick) { nc = needsCheck_(tid, links, r[C('check_log')]); if (!nc.go) return; }
    let log, tracked = null;
    try {
      const book = openLinkedBook_(links);
      if (!book) throw new Error('เปิดลิงก์งานไม่ได้ (ต้องเป็น Google Sheet/Form ที่บัญชีนี้มีสิทธิ์)');
      const wanted = String(r[C('check_tab')] || '').split(',').map(x => x.trim()).filter(Boolean);
      const sheets = resolveTabs_(book, wanted);
      if (!sheets.length) throw new Error('ไม่พบแท็บ: ' + wanted.join(', ') + ' | แท็บที่มี: ' + book.getSheets().map(x => x.getName()).slice(0, 15).join(', '));
      const rule = { col: String(r[C('check_done_col')] || '').trim(), val: String(r[C('check_done_value')] || '').trim(), areas: wanted };
      const added = [];
      const res = {}; let headers = []; const usedList = [];
      const outs = sheets.map(sh => ({sh, out: evaluateTable(sh.getDataRange().getDisplayValues(), branches, rule)}));
      const hasStatus = outs.some(x => ['auto', 'manual'].includes(x.out.used.mode) && Object.keys(x.out.status).length);
      outs.forEach(({sh, out}) => {
        if (hasStatus && out.used.mode === 'presence') { usedList.push(sh.getName() + ': ข้าม (ข้อมูลอ้างอิง)'); return; }
        if (!headers.length) headers = out.headers;
        Object.values(out.newBranches || {}).forEach(nb => {        // เพิ่มสาขาใหม่ที่พบในพื้นที่ลงแท็บ Branches
          if (branches.some(b => b.code === nb.code)) return;
          const area = /upper\s*north/i.test(nb.region) ? 'Upper North' : /lower\s*north/i.test(nb.region) ? 'Lower North' : nb.region;
          appendObj_(ss.getSheetByName(TABS.branches[0]), {code: nb.code, name: nb.name || nb.code, zone: area, area});
          branches.push({code: nb.code, name: nb.name || nb.code});
          added.push(nb.name || nb.code);
        });
        usedList.push(sh.getName() + (sh._autoPicked ? ' [' + sh._autoPicked + ']' : '') + ': ' + (
          out.used.mode === 'auto'     ? `คอลัมน์ "${out.used.col}" = ${out.used.val}` :
          out.used.mode === 'presence' ? 'มีชื่อสาขา = ทำแล้ว' :
          out.used.mode === 'unknown'  ? '⚠️ หาคอลัมน์สถานะไม่เจอ (กรอก check_done_col เอง)' :
          out.used.mode === 'error'    ? `⚠️ ไม่พบคอลัมน์ "${out.used.col}"` :
                                         `คอลัมน์ "${out.used.col}" = ${out.used.val}`));
        Object.entries(out.status).forEach(([code, st]) => {
          const a = res[code] || {found: 0, done: 0}; a.found += st.found; a.done += st.done; res[code] = a;
        });
      });
      tracked = Object.keys(res).join(',');      // สาขาที่มีอยู่ในลิงก์งาน = สาขาที่ต้องติดตาม
      const dv = dsh.getLastRow() > 1 ? dsh.getRange(2, 1, dsh.getLastRow() - 1, 5).getValues() : [];
      for (let k = dv.length - 1; k >= 0; k--) if (String(dv[k][0]) === tid && dv[k][3] === 'auto') dsh.deleteRow(k + 2);
      let nDone = 0, nPart = 0;
      Object.entries(res).forEach(([code, a]) => {
        if (!a.done) return;
        const st = a.done >= a.found ? 'done' : 'partial';
        st === 'done' ? nDone++ : nPart++;
        appendObj_(dsh, {task_id: tid, branch_code: code, status: st, note: 'auto', updated: stamp});
      });
      log = `${stamp} ✓ พบ ${Object.keys(res).length} สาขา · เสร็จ ${nDone} · บางส่วน ${nPart}` +
            (added.length ? ` | ➕ เพิ่มสาขาใหม่ ${added.length}: ${added.join(', ')}` : '') +
            ` | ใช้กฎ: ${usedList.join(' ; ')}` +
            (headers.length ? ` | หัวคอลัมน์: ${headers.slice(0, 25).join(' | ')}` : '');
    } catch (err) { log = `${stamp} ✗ ${err.message}`; }
    tsh.getRange(i + 2, C('check_log') + 1).setValue(log.slice(0, 1000));
    // จำเวลาที่ตรวจ + เวลาแก้ไขไฟล์ล่าสุด สำหรับรอบถัดไป
    try {
      let mod = nc && nc.mod;
      if (!mod) links.forEach(u => { const m = String(u).match(/\/d\/([\w-]{20,})/); if (m && !/\/forms\//.test(u)) { try { mod = Math.max(mod || 0, DriveApp.getFileById(m[1]).getLastUpdated().getTime()); } catch (e) {} } });
      PropertiesService.getScriptProperties().setProperty('chk_' + tid, JSON.stringify({at: Date.now(), mod: mod || 0}));
    } catch (e) {}
    if (tracked !== null) tsh.getRange(i + 2, C('tracked_branches') + 1).setValue(tracked);
  });
}

/* เลือกแท็บ: ชื่อตรงตัว หรือใช้ * แทนส่วนที่เปลี่ยน เช่น "Pending WW *"
   ถ้ามีหลายแท็บตรงแบบ จะเลือกแท็บของวันนี้ (มีวันที่+เดือนของวันนี้ในชื่อ) ถ้าไม่มีใช้แท็บล่าสุด (ขวาสุด) */
function resolveTabs_(book, wanted) {
  const all = book.getSheets();
  if (!wanted.length) return all;
  const now = new Date(), d = now.getDate();
  const MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const THM = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const THS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const m = now.getMonth();
  const todayRe = new RegExp('(^|\\D)0?' + d + '(?!\\d)\\s*[-/ ]?\\s*(' + [MON[m], MON[m].slice(0, 3), THM[m], THS[m].replace(/\./g, '\\.'), String(m + 1)].join('|') + ')(?![a-z])', 'i');
  const out = [];
  wanted.forEach(w => {
    if (!w.includes('*')) { const sh = book.getSheetByName(w) || all.find(x => x.getName().trim().toLowerCase() === w.toLowerCase()); if (sh && !out.includes(sh)) out.push(sh); return; }
    const re = new RegExp('^' + w.split('*').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i');
    const hits = all.filter(sh => re.test(sh.getName()));
    if (!hits.length) return;
    const pick = hits.find(sh => todayRe.test(sh.getName())) || hits[hits.length - 1];
    if (!out.includes(pick)) out.push(pick);
  });
  if (out.length) return out;
  // ไม่มีแท็บตรงชื่อ: ถ้าไฟล์แยกแท็บตามวันที่ → ใช้แท็บของวันนี้ (ไม่มีก็ใช้วันล่าสุดที่ไม่เกินวันนี้)
  const dated = all.map(sh => ({sh, d: tabDate_(sh.getName(), now)})).filter(x => x.d);
  if (dated.length) {
    const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const past = dated.filter(x => x.d.getTime() <= t0).sort((a, b) => b.d - a.d);
    const pick = dated.find(x => x.d.getTime() === t0) || past[0] || dated[dated.length - 1];
    pick.sh._autoPicked = 'แท็บวันที่ (อัตโนมัติ)';
    return [pick.sh];
  }
  // ไม่มีแท็บตรงชื่อ/วันที่ → ตรวจทุกแท็บ ยกเว้นแท็บสรุป/ข้อมูลอ้างอิง
  const REF = /summary|สรุป|^data|_data|raw|master|pivot|dashboard|ref|lookup|setting|config|instruction|คำอธิบาย|readme/i;
  const work = all.filter(sh => !REF.test(sh.getName()));
  const use = work.length ? work : all;
  use.forEach(sh => sh._autoPicked = 'ทุกแท็บ');
  return use;
}

/* อ่านวันที่จากชื่อแท็บ เช่น "Pending WW 9 November", "9 Nov", "09/11", "9 พ.ย." */
function tabDate_(name, now) {
  const MON = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const THM = ['ม.ค','ก.พ','มี.ค','เม.ย','พ.ค','มิ.ย','ก.ค','ส.ค','ก.ย','ต.ค','พ.ย','ธ.ค'];
  const THF = ['มกรา','กุมภา','มีนา','เมษา','พฤษภา','มิถุนา','กรกฎา','สิงหา','กันยา','ตุลา','พฤศจิกา','ธันวา'];
  let m = name.match(/(?:^|\D)(\d{1,2})\s*[-/ ]?\s*([A-Za-z]{3,9}|[ก-๙.]{3,12})/);
  let day, mon = -1;
  if (m) {
    day = +m[1]; const w = m[2].toLowerCase();
    mon = MON.findIndex(x => w.startsWith(x));
    if (mon < 0) mon = THM.findIndex(x => w.replace(/\./g, '').startsWith(x.replace(/\./g, '')));
    if (mon < 0) mon = THF.findIndex(x => w.startsWith(x));
  }
  if (mon < 0) {
    m = name.match(/(?:^|\D)(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?(?!\d)/);
    if (!m) return null;
    day = +m[1]; mon = +m[2] - 1;
    if (mon < 0 || mon > 11) return null;
  }
  if (!(day >= 1 && day <= 31)) return null;
  let y = now.getFullYear();
  const d = new Date(y, mon, day);
  if (d - now > 180 * 86400000) d.setFullYear(y - 1);          // ธ.ค. ตอนเดือน ม.ค.
  return d;
}

function openLinkedBook_(links) {
  for (const u of links) {
    try {
      if (/docs\.google\.com\/spreadsheets/.test(u)) return SpreadsheetApp.openByUrl(u);
      let url = u;
      if (/forms\.gle/.test(u)) url = UrlFetchApp.fetch(u, {followRedirects: false, muteHttpExceptions: true}).getHeaders()['Location'] || u;
      if (/docs\.google\.com\/forms/.test(url)) {
        const id = FormApp.openByUrl(url.replace(/\/viewform.*$/, '/edit')).getDestinationId();
        if (id) return SpreadsheetApp.openById(id);
      }
    } catch (err) { Logger.log(u + ': ' + err); }
  }
  return null;
}

/* ตรวจตาราง 1 แท็บ: คืนสถานะต่อสาขา {found, done} + หัวคอลัมน์ + กฎที่ใช้ */
const DONE_RE = /^(?:(?:ส่งแล้ว|ส่ง|ครบ(?:แล้ว)?|เรียบร้อย(?:แล้ว)?|เสร็จ(?:แล้ว)?|ได้รับ(?:แล้ว)?|ดำเนินการแล้ว|ตอบแล้ว|ผ่าน|มี|คืนแล้ว|รับแล้ว|ติดตั้งแล้ว|ติดตั้งสำเร็จ|ยกเลิก(?:แล้ว)?|ลูกค้ายืนยัน\s*ยกเลิก)(?:\s.{0,20})?|done|completed?|connected|installed|success(?:ful)?|closed|(?:order\s*)?cancel(?:led)?|ok|yes|y|true|✓|✔|☑|\/)$/i;
const PEND_RE = /^(รอ|ยังไม่|ไม่|ค้าง|pending|open|new|todo|to do|in progress|false|no|n|-|x|✗|✘|$)/i;
const FILL_HEAD_RE = /กรอก|สาเหตุ|feedback|คำตอบ|ผลการติดตาม|ผลการดำเนิน|ชี้แจง|action/i;   // คอลัมน์ที่สาขาต้องกรอกเอง
const STATUS_HEAD_RE = /สถานะ|status|ส่งแล้ว|การส่ง|ได้รับ|ตอบ|ดำเนินการ|เรียบร้อย|ผลการ|check|done|complete|รับเอกสาร|คืน|confirm|ยืนยัน/i;

function evaluateTable(values, branches, rule) {
  const N = s => String(s || '').toLowerCase().replace(/true\s*shop|ทรูช็อป|[\s'’\-_.,]/g, '');
  const byCode = {}, byName = {};
  branches.forEach(b => { byCode[String(b.code).trim()] = b.code; byName[N(b.name)] = b.code; });
  const codeOf0 = row => {
    for (const c of row) {
      const t = String(c).trim().replace(/\.0$/, '');
      if (byCode[t]) return byCode[t];
      const n = N(t); if (n.length > 5 && byName[n]) return byName[n];
    }
    return null;
  };
  // ----- แถวหัวตาราง: แถวที่มีคำแบบหัวคอลัมน์มากที่สุด (ภายใน 40 แถวแรก) -----
  const HEADWORD = /status|สถานะ|shop|code|รหัส|สาขา|name|ชื่อ|region|area|zone|ภาค|เขต|พื้นที่|date|day|วันที่|remark|หมายเหตุ|^no\.?$|ลำดับ|source|partner|type/i;
  let hRow = -1, hBest = 1;
  const firstKnown = values.findIndex(r => codeOf0(r));
  for (let i = 0; i < Math.min(40, firstKnown < 0 ? values.length : firstKnown + 1); i++) {
    const sc = values[i].filter(c => { c = String(c).trim(); return c && c.length < 40 && HEADWORD.test(c) && !/^\d+([.,]\d+)?%?$/.test(c); }).length;
    if (sc > hBest) { hBest = sc; hRow = i; }
  }
  if (hRow < 0) for (let i = 0; i < Math.min(15, firstKnown < 0 ? values.length : firstKnown); i++) {
    const row = values[i].map(c => String(c).trim());
    if (row.filter(c => c && !/^\d+([.,]\d+)?$/.test(c)).length >= 3) hRow = i;
  }
  const headRow = hRow >= 0 ? values[hRow].map(c => String(c).trim()) : [];
  const headers = headRow.filter(Boolean);

  // ----- กรองตามพื้นที่ (ชื่อใน check_tab ที่อยู่ในคอลัมน์ Region/Area) -----
  const areas = (rule.areas || []).map(a => a.trim().toLowerCase()).filter(a => a && !a.includes('*'));
  const regionCol = !areas.length ? -1 : (() => {
    const byHead = headRow.findIndex(c => /region|area|zone|ภาค|เขต|พื้นที่/i.test(c));
    const hits = j => values.slice(hRow + 1).filter(r => areas.includes(String(r[j] || '').trim().toLowerCase())).length;
    if (byHead >= 0 && hits(byHead)) return byHead;
    let best = -1, bh = 0; const nc = Math.max(0, ...values.map(r => r.length));
    for (let j = 0; j < nc; j++) { const h = hits(j); if (h > bh) { bh = h; best = j; } }
    return best;
  })();
  const codeCol = headRow.findIndex(c => /shop\s*code|branch\s*code|รหัสสาขา|รหัสร้าน|^code$|location\s*code/i.test(c));
  const nameCol = headRow.findIndex(c => /partner|shop\s*name|branch\s*name|ชื่อสาขา|ชื่อร้าน|^name$/i.test(c));
  const newBranches = {};
  const inArea = row => regionCol >= 0 && areas.includes(String(row[regionCol] || '').trim().toLowerCase());
  const codeOf = row => {
    const k = codeOf0(row); if (k) return k;
    if (!inArea(row)) return null;
    // สาขาในพื้นที่ที่ยังไม่มีในแท็บ Branches
    let code = codeCol >= 0 ? String(row[codeCol] || '').trim().replace(/\.0$/, '') : '';
    if (!code) code = (row.map(c => String(c).trim()).find(c => /^\d{6,10}$/.test(c)) || '');
    if (!code) return null;
    if (!newBranches[code]) newBranches[code] = {code, name: nameCol >= 0 ? String(row[nameCol] || '').trim() : '', region: String(row[regionCol]).trim()};
    return code;
  };
  const dataRows = values.slice(hRow + 1).filter(r => codeOf(r));

  // ----- หาคอลัมน์สถานะ -----
  let dCol = -1, used = {col: rule.col, val: rule.val, mode: 'manual'};
  const letter = /^[A-Z]{1,2}$/i.test(rule.col) ? rule.col.toUpperCase() : '';
  if (letter) dCol = letter.split('').reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;
  else if (rule.col) dCol = headRow.findIndex(c => c && c.toLowerCase().includes(rule.col.toLowerCase()));
  if (rule.col && dCol < 0) return {status: {}, headers, used: {mode: 'error', col: rule.col}};

  let vals = rule.val ? rule.val.replace(/^!/, '').split('/').map(x => x.trim().toLowerCase()).filter(Boolean) : [];
  let neg = rule.val.startsWith('!');
  let presence = false;

  if (!rule.col) {                                         // ----- โหมดอัตโนมัติ -----
    const ncol = Math.max(...values.map(r => r.length));
    let best = {score: 0, col: -1};
    for (let j = 0; j < ncol; j++) {
      const cells = dataRows.map(r => String(r[j] || '').trim());
      const filled = cells.filter(Boolean);
      const distinct = new Set(filled.map(c => c.toLowerCase()));
      const doneHits = filled.filter(c => DONE_RE.test(c)).length;
      const pendHits = cells.filter(c => PEND_RE.test(c)).length;
      const isBool = filled.length && filled.every(c => /^(true|false)$/i.test(c));
      let score = 0;
      const fillCol = FILL_HEAD_RE.test(headRow[j] || '');
      if (fillCol) score += 5;
      if (STATUS_HEAD_RE.test(headRow[j] || '')) score += 3;
      // ข้อความเดียวกันทุกแถว (เช่น คำถาม/คำอธิบาย) ไม่ใช่สถานะ
      if (cells.length > 1 && filled.length === cells.length && distinct.size === 1 && !DONE_RE.test(filled[0]) && !PEND_RE.test(filled[0])) score -= 6;
      if (isBool) score += 3;
      if (doneHits) score += 2 + Math.min(2, doneHits / Math.max(1, cells.length) * 4);
      if (distinct.size && distinct.size <= 6 && (doneHits || pendHits)) score += 1;
      if (distinct.size > 12 && !fillCol) score -= 3;      // ข้อความอิสระ/ตัวเลข ไม่ใช่สถานะ
      if (cells.length && cells.every(c => /^\d{6,}$/.test(c))) score -= 5;   // คอลัมน์รหัส
      if (dataRows.filter(r => codeOf0([r[j]])).length > dataRows.length / 2) score -= 10; // คอลัมน์รหัส/ชื่อสาขา
      if (j === regionCol || j === codeCol || j === nameCol) score -= 10;
      if (score > best.score) best = {score, col: j};
    }
    const isFormSheet = /ประทับเวลา|timestamp/i.test(headRow[0] || '');
    if (best.score >= 3 && !isFormSheet) {
      dCol = best.col;
      const cells = dataRows.map(r => String(r[dCol] || '').trim());
      vals = [...new Set(cells.filter(c => DONE_RE.test(c)).map(c => c.toLowerCase()))];
      neg = false;
      used = {mode: 'auto', col: headRow[dCol] || ('คอลัมน์ ' + colLetter_(dCol)), val: vals.join('/') || '(ไม่ว่าง)'};
    } else if (isFormSheet || dataRows.length < branches.length * 0.8) {
      presence = true;
      used = {mode: 'presence', col: '', val: ''};
    } else {
      // มีรายชื่อเกือบทุกสาขาอยู่แล้ว แต่หาคอลัมน์สถานะไม่เจอ → ไม่เดา
      return {status: {}, headers, used: {mode: 'unknown'}};
    }
  } else if (!rule.val) used.val = '(ไม่ว่าง)';

  const isDone = cell => {
    if (presence) return true;
    const c = String(cell || '').trim().toLowerCase();
    if (!vals.length) return c !== '' && !PEND_RE.test(c);
    const hit = vals.some(v => c === v || c.includes(v));
    return neg ? (c !== '' && !hit) : hit;
  };
  const status = {};
  dataRows.forEach(row => {
    const code = codeOf(row);
    const a = status[code] || {found: 0, done: 0};
    a.found++; if (isDone(dCol >= 0 ? row[dCol] : '')) a.done++;
    status[code] = a;
  });
  return {status, headers, used, newBranches};
}

function colLetter_(j) { let s = ''; j++; while (j > 0) { const m = (j - 1) % 26; s = String.fromCharCode(65 + m) + s; j = Math.floor((j - 1) / 26); } return s; }

/* ===================== อ่านรายชื่อจากตาราง ===================== */
function parseRoster(rows, branches) {
  rows = (rows || []).filter(r => r && r.some(c => String(c).trim() !== ''));
  if (!rows.length) return [];
  const N = s => String(s || '').toLowerCase().replace(/true\s*shop|ทรูช็อป|สาขา|[\s'’()\-_.]/g, '');
  const H = {
    code: /รหัสสาขา|รหัสร้าน|shop\s*code|branch\s*code|location\s*code|^code$/i,
    branch: /สาขา|shop|branch|ร้าน|store|location/i,
    emp: /รหัสพนักงาน|emp|employee|staff\s*id|^id$/i,
    first: /^(ชื่อ|first\s*name)$/i,
    last: /นามสกุล|last\s*name|surname/i,
    name: /ชื่อ|name/i,
    note: /ตำแหน่ง|position|หมายเหตุ|note/i
  };
  // หาแถวหัวตาราง ภายใน 10 แถวแรก
  const score = r => r.filter(c => { c = String(c).trim(); return c && c.length < 30 && Object.values(H).some(re => re.test(c)); }).length;
  let hi = 0, best = -1;
  rows.slice(0, 10).forEach((r, i) => { const sc = score(r); if (sc > best) { best = sc; hi = i; } });
  const head = rows[hi].map(c => String(c).trim());
  const col = (re, not) => head.findIndex(c => re.test(c) && !(not && not.test(c)));
  const cCode = col(H.code), cEmp = col(H.emp, /สาขา|shop|branch/i);
  const cFirst = col(H.first), cLast = col(H.last);
  const cName = cFirst >= 0 ? cFirst : col(H.name, /สาขา|shop|branch|ร้าน|store|ตำแหน่ง|position|^นามสกุล$|^last|^surname/i);
  const cBranch = col(H.branch, /รหัส|code/i);
  const cNote = col(H.note);
  const byCode = {}; branches.forEach(b => byCode[b.code] = b.code);
  const findBranch = (code, name) => {
    code = String(code || '').trim(); name = String(name || '').trim();
    if (code && byCode[code]) return code;
    if (byCode[name]) return name;
    const n = N(name || code); if (n.length < 3) return code;
    const hit = branches.find(b => N(b.name) === n) || branches.find(b => N(b.name).includes(n) || n.includes(N(b.name)));
    return hit ? hit.code : code;
  };
  return rows.slice(hi + 1).map(r => {
    const g = i => (i >= 0 ? String(r[i] || '').trim() : '');
    const name = [g(cName), cFirst >= 0 ? g(cLast) : ''].filter(Boolean).join(' ');
    return {name, emp_id: g(cEmp), code: findBranch(g(cCode), g(cBranch)), note: g(cNote)};
  }).filter(x => x.name || x.code || x.emp_id);
}

/* ===================== ย้ายงาน One Time ไปเป็นงานประจำ ===================== */
function moveSelectedToDaily() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();
  if (sh.getName() !== TABS.tasks[0]) { ui.alert('ไปที่แท็บ Tasks แล้วคลิกเลือกแถวงานที่ต้องการย้ายก่อน'); return; }
  const rows = [...new Set(sh.getActiveRangeList().getRanges().flatMap(r => Array.from({length: r.getNumRows()}, (_, k) => r.getRow() + k)))]
    .filter(r => r > 1).sort((a, b) => b - a);
  if (!rows.length) { ui.alert('ยังไม่ได้เลือกแถวงาน'); return; }
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const ids = rows.map(r => sh.getRange(r, head.indexOf('task_id') + 1).getDisplayValue());
  const ans = ui.prompt('ย้าย ' + ids.join(', ') + ' ไปเป็นงานประจำ', 'พิมพ์รอบงาน: Daily / Weekly / Monthly (เว้นว่าง = Daily)', ui.ButtonSet.OK_CANCEL);
  if (ans.getSelectedButton() !== ui.Button.OK) return;
  const f = /^w/i.test(ans.getResponseText().trim()) ? 'Weekly' : /^m/i.test(ans.getResponseText().trim()) ? 'Monthly' : 'Daily';
  const dsh = ss.getSheetByName(TABS.daily[0]);
  const done = ss.getSheetByName(TABS.done[0]);
  rows.forEach(r => {
    const v = sh.getRange(r, 1, 1, head.length).getDisplayValues()[0];
    const g = n => v[head.indexOf(n)] || '';
    const raw = g('raw_message') || g('detail');
    const tm = (raw.match(/(?:ภายใน|ก่อน|ไม่เกิน)\s*(?:เวลา)?\s*(\d{1,2})[.:](\d{2})/) || raw.match(/(\d{1,2})[.:](\d{2})\s*น/) || []);
    appendObj_(dsh, {daily_id: nextId(dsh, 'D'), title: g('title'), frequency: f, link: g('link'), detail: g('detail'),
      deadline: tm[1] ? tm[1].padStart(2, '0') + ':' + tm[2] : '', days: recurDays(f, raw, new Date()), branches: g('branches') || 'ALL', active: 'Y',
      auto_check: g('auto_check'), check_tab: g('check_tab'), check_done_col: g('check_done_col'), check_done_value: g('check_done_value')});
    // ลบสถานะเดิมของงานนี้ในแท็บ Done แล้วลบแถวงาน
    const tid = g('task_id');
    if (done && done.getLastRow() > 1) {
      const dv = done.getRange(2, 1, done.getLastRow() - 1, 1).getValues();
      for (let k = dv.length - 1; k >= 0; k--) if (String(dv[k][0]) === tid) done.deleteRow(k + 2);
    }
    sh.deleteRow(r);
  });
  ui.alert('ย้ายแล้ว ✅ ' + ids.join(', ') + ' → แท็บ Daily (' + f + ')\nแก้ชื่องาน / เวลา / วัน ได้ในแท็บ Daily');
}

function archiveNow() {
  const n = archiveCompleted_();
  SpreadsheetApp.getUi().alert(n ? `ย้าย ${n} งานที่ครบทุกสาขาไปแท็บ History แล้ว ✅` : 'ยังไม่มีงานที่ครบทุกสาขา');
}

function restoreSelected() {
  const ui = SpreadsheetApp.getUi(), ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getActiveSheet();
  if (sh.getName() !== 'History') { ui.alert('ไปที่แท็บ History แล้วคลิกเลือกแถวงานที่ต้องการย้ายกลับก่อน'); return; }
  const rows = [...new Set(sh.getActiveRangeList().getRanges().flatMap(r => Array.from({length: r.getNumRows()}, (_, k) => r.getRow() + k)))]
    .filter(r => r > 1).sort((a, b) => b - a);
  if (!rows.length) { ui.alert('ยังไม่ได้เลือกแถวงาน'); return; }
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const tsh = ss.getSheetByName(TABS.tasks[0]), dsh = ss.getSheetByName(TABS.done[0]);
  rows.forEach(r => {
    const v = sh.getRange(r, 1, 1, head.length).getDisplayValues()[0];
    const obj = {}; head.forEach((h, k) => obj[h] = v[k]);
    // เปิดงานใหม่: ล้างผลตรวจอัตโนมัติเดิม ไม่อย่างนั้นจะถูกย้ายกลับ History ทันที
    obj.check_log = ''; obj.tracked_branches = '';
    if (dsh.getLastRow() > 1) { const dv = dsh.getRange(2, 1, dsh.getLastRow() - 1, 4).getValues();
      for (let k = dv.length - 1; k >= 0; k--) if (String(dv[k][0]) === obj.task_id && dv[k][3] === 'auto') dsh.deleteRow(k + 2); }
    appendObj_(tsh, obj);
    sh.deleteRow(r);
  });
  ui.alert('ย้ายกลับไป Tasks แล้ว ✅ ระบบจะตรวจสถานะใหม่ในรอบถัดไป');
}

/* ===================== เมนูใน Sheet ===================== */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Task Tracker')
    .addItem('🔄 ตรวจสถานะสาขาจากลิงก์งานตอนนี้', 'autoCheck')
    .addItem('🔁 ย้ายงานที่เลือก (แท็บ Tasks) ไปเป็นงานประจำ', 'moveSelectedToDaily')
    .addItem('🏁 ย้ายงานที่ครบทุกสาขาไป History ตอนนี้', 'archiveNow')
    .addItem('↩️ ย้ายงานที่เลือก (แท็บ History) กลับไป Tasks', 'restoreSelected')
    .addItem('ตั้งค่า / อัปเดตฟอร์ม', 'setup')
    .addToUi();
}

// ให้ทดสอบใน Node ได้ (Apps Script จะไม่สนใจบรรทัดนี้)
if (typeof module !== 'undefined') module.exports = { parseLineMessage, parseRoster, evaluateTable, recurDays };
