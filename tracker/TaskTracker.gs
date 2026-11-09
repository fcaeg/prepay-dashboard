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
  tasks:    ['Tasks',    ['task_id', 'title', 'type', 'link', 'detail', 'assigned', 'due', 'branches', 'raw_message', 'attachments', 'auto_check', 'check_tab', 'check_done_col', 'check_done_value', 'check_log']],
  done:     ['Done',     ['task_id', 'branch_code', 'status', 'note', 'updated']],
  exams:    ['Exams',    ['exam_id', 'title', 'link', 'due', 'pass_score', 'raw_message', 'attachments']],
  staff:    ['Staff',    ['emp_id', 'name', 'branch_code', 'position']],
  results:  ['ExamResults', ['exam_id', 'emp_id', 'score']],
  trainings:['Trainings', ['training_id', 'date', 'start', 'end', 'title', 'location', 'link', 'trainer', 'detail', 'attachments']],
  attendees:['TrainingAttendees', ['training_id', 'name', 'branch_code', 'emp_id', 'note']]
};

const Q = {
  msg:      'รายละเอียดงาน (วางข้อความ + ลิงก์จากไลน์)',
  type:     'ประเภทงาน',
  due:      'Due (เว้นว่าง = อ่านจากข้อความ)',
  area:     'ส่งถึง',
  branches: 'รหัสสาขา (ถ้าเลือก "ระบุสาขาเอง")',
  title:    'ชื่องาน'
};
const TYPE_AUTO = 'อัตโนมัติ (ดูจากลิงก์)';
const AREAS = ['ทุกสาขา', 'Upper North', 'Lower North', 'ระบุสาขาเอง'];
const TYPES = [TYPE_AUTO, 'Google Form', 'Google Doc', 'Google Sheet', 'Dashboard', 'ส่งไฟล์ (Drive)', 'อบรม', 'การสอบ', 'อื่นๆ'];

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
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'autoCheck') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('autoCheck').timeBased().everyMinutes(30).create();

  SpreadsheetApp.flush();
  if (isNew) ss.getSheets().forEach(sh => { if (sh.getFormUrl && sh.getFormUrl()) sh.setName('_FormInput'); });

  let st = ss.getSheetByName('Settings') || ss.insertSheet('Settings');
  st.clear();
  st.getRange('A1:B3').setValues([
    ['ลิงก์ฟอร์มลงงาน (เปิดบนมือถือ)', form.getPublishedUrl()],
    ['แก้ไขฟอร์ม', form.getEditUrl()],
    ['Sheet ID (ใส่ในหน้าเว็บ)', ss.getId()]
  ]);
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
  [Q.msg, OPT, Q.title, Q.area, Q.due, Q.type, Q.branches].forEach((t, i) => {
    const it = find(t); if (it && it.getIndex() !== i) form.moveItem(it.getIndex(), i);
  });
}

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

  const type = (v('type') && v('type') !== TYPE_AUTO) ? v('type') : p.type;
  const title = v('title') || p.title;
  const due = v('due') ? toIso(new Date(v('due'))) : p.due;
  const area = v('area');
  let branches = 'ALL';
  if (v('branches')) branches = v('branches').replace(/\s*,\s*/g, ',');
  else if (area && area !== 'ทุกสาขา' && area !== 'ระบุสาขาเอง') branches = area;

  if (type === 'อบรม' || (p.training && (!v('type') || v('type') === TYPE_AUTO))) {
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
      assigned: today, due, branches, raw_message: p.raw, attachments});
  }
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
    type: training ? 'อบรม' : detectType(links, raw),
    training, exam,
    due: pickDue(noUrl, now),
    raw
  };
}

/* ===================== ตรวจสถานะสาขาจากลิงก์งานอัตโนมัติ =====================
 * เปิดใช้ต่องานในแท็บ Tasks:
 *   auto_check       = Y
 *   check_tab        = ชื่อแท็บในลิงก์งาน (หลายแท็บคั่นด้วย ,) เว้นว่าง = ทุกแท็บ
 *   check_done_col   = หัวคอลัมน์ (หรือตัวอักษรคอลัมน์ เช่น K) ที่บอกว่าสาขาทำแล้ว
 *                      เว้นว่าง = แค่มีชื่อ/รหัสสาขาในชีตก็ถือว่าทำแล้ว (เหมาะกับชีตคำตอบฟอร์ม)
 *   check_done_value = ค่าที่ถือว่าเสร็จ คั่นด้วย / เช่น ส่งแล้ว/ครบ  | เว้นว่าง = ช่องไม่ว่าง
 *                      ขึ้นต้นด้วย ! = เสร็จเมื่อไม่ใช่ค่านั้น เช่น !รอส่ง
 * ผลตรวจเขียนลงแท็บ Done (note = auto) และสรุปไว้ใน check_log
 * แถวใน Done ที่คุณใส่เอง (note ไม่ใช่ auto) จะไม่ถูกแตะ */
function autoCheck() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tsh = ss.getSheetByName(TABS.tasks[0]);
  if (!tsh || tsh.getLastRow() < 2) return;
  const head = tsh.getRange(1, 1, 1, tsh.getLastColumn()).getValues()[0].map(String);
  const C = n => head.indexOf(n);
  const rows = tsh.getRange(2, 1, tsh.getLastRow() - 1, head.length).getDisplayValues();
  const branches = branchList_();
  const dsh = ss.getSheetByName(TABS.done[0]);
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

  rows.forEach((r, i) => {
    if (!/^(y|yes|✓|true|1|ใช่)$/i.test(String(r[C('auto_check')] || '').trim())) return;
    const tid = r[C('task_id')];
    const links = String(r[C('link')] || '').split(/\s+/).filter(Boolean);
    let log;
    try {
      const book = openLinkedBook_(links);
      if (!book) throw new Error('เปิดลิงก์งานไม่ได้ (ต้องเป็น Google Sheet/Form ที่บัญชีนี้มีสิทธิ์)');
      const wanted = String(r[C('check_tab')] || '').split(',').map(x => x.trim()).filter(Boolean);
      const sheets = wanted.length ? wanted.map(n => book.getSheetByName(n)).filter(Boolean) : book.getSheets();
      if (!sheets.length) throw new Error('ไม่พบแท็บ: ' + wanted.join(', '));
      const rule = { col: String(r[C('check_done_col')] || '').trim(), val: String(r[C('check_done_value')] || '').trim() };
      const res = {}; let headers = [];
      sheets.forEach(sh => {
        const out = evaluateTable(sh.getDataRange().getDisplayValues(), branches, rule);
        if (!headers.length) headers = out.headers;
        Object.entries(out.status).forEach(([code, st]) => {
          const a = res[code] || {found: 0, done: 0}; a.found += st.found; a.done += st.done; res[code] = a;
        });
      });
      // เขียน Done: ลบผล auto เดิมของงานนี้ แล้วเขียนใหม่
      const dv = dsh.getLastRow() > 1 ? dsh.getRange(2, 1, dsh.getLastRow() - 1, 5).getValues() : [];
      for (let k = dv.length - 1; k >= 0; k--) if (dv[k][0] === tid && dv[k][3] === 'auto') dsh.deleteRow(k + 2);
      let nDone = 0, nPart = 0;
      Object.entries(res).forEach(([code, a]) => {
        if (!a.done) return;
        const st = a.done >= a.found ? 'done' : 'partial';
        st === 'done' ? nDone++ : nPart++;
        appendObj_(dsh, {task_id: tid, branch_code: code, status: st, note: 'auto', updated: stamp});
      });
      log = `${stamp} ✓ พบ ${Object.keys(res).length} สาขา · เสร็จ ${nDone} · บางส่วน ${nPart}` +
            (rule.col ? '' : ' (โหมด: มีชื่อสาขา = ทำแล้ว)') +
            (headers.length ? ` | หัวคอลัมน์: ${headers.slice(0, 25).join(' | ')}` : '');
    } catch (err) { log = `${stamp} ✗ ${err.message}`; }
    tsh.getRange(i + 2, C('check_log') + 1).setValue(log.slice(0, 1000));
  });
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

/* ตรวจตาราง 1 แท็บ: คืนสถานะต่อสาขา {found: จำนวนแถวที่พบ, done: จำนวนแถวที่เสร็จ} */
function evaluateTable(values, branches, rule) {
  const N = s => String(s || '').toLowerCase().replace(/true\s*shop|ทรูช็อป|[\s'’\-_.,]/g, '');
  const byCode = {}, byName = {};
  branches.forEach(b => { byCode[String(b.code).trim()] = b.code; byName[N(b.name)] = b.code; });
  // หาแถวหัวตาราง + คอลัมน์สถานะ
  let hRow = -1, dCol = -1;
  const letter = /^[A-Z]{1,2}$/i.test(rule.col) ? rule.col.toUpperCase() : '';
  if (letter) dCol = letter.split('').reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;
  for (let i = 0; i < Math.min(15, values.length); i++) {
    const row = values[i].map(c => String(c).trim());
    if (rule.col && !letter) {
      const j = row.findIndex(c => c && c.toLowerCase().includes(rule.col.toLowerCase()));
      if (j >= 0) { hRow = i; dCol = j; break; }
    } else if (row.filter(Boolean).length >= 3 && row.every(c => !/^\d{6,}$/.test(c))) { hRow = i; break; }
  }
  const headers = hRow >= 0 ? values[hRow].map(c => String(c).trim()).filter(Boolean) : [];
  if (rule.col && dCol < 0) return {status: {}, headers};
  const vals = rule.val ? rule.val.replace(/^!/, '').split('/').map(x => x.trim().toLowerCase()).filter(Boolean) : [];
  const neg = rule.val.startsWith('!');
  const isDone = cell => {
    const c = String(cell || '').trim().toLowerCase();
    if (!rule.col) return true;
    if (!vals.length) return c !== '' && !/^(false|0|-|รอ|ยังไม่|ไม่|pending|no)/.test(c);
    const hit = vals.some(v => c === v || c.includes(v));
    return neg ? (c !== '' && !hit) : hit;
  };
  const status = {};
  values.slice(hRow + 1).forEach(row => {
    let code = null;
    for (const c of row) {
      const t = String(c).trim().replace(/\.0$/, '');
      if (byCode[t]) { code = byCode[t]; break; }
      const n = N(t); if (n.length > 5 && byName[n]) { code = byName[n]; break; }
    }
    if (!code) return;
    const a = status[code] || {found: 0, done: 0};
    a.found++; if (isDone(dCol >= 0 ? row[dCol] : 'x')) a.done++;
    status[code] = a;
  });
  return {status, headers};
}

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

/* ===================== เมนูใน Sheet ===================== */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Task Tracker')
    .addItem('🔄 ตรวจสถานะสาขาจากลิงก์งานตอนนี้', 'autoCheck')
    .addItem('ตั้งค่า / อัปเดตฟอร์ม', 'setup')
    .addToUi();
}

// ให้ทดสอบใน Node ได้ (Apps Script จะไม่สนใจบรรทัดนี้)
if (typeof module !== 'undefined') module.exports = { parseLineMessage, parseRoster, evaluateTable };
