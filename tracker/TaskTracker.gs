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
  tasks:    ['Tasks',    ['task_id', 'title', 'type', 'link', 'detail', 'assigned', 'due', 'branches', 'raw_message']],
  done:     ['Done',     ['task_id', 'branch_code', 'status', 'note', 'updated']],
  exams:    ['Exams',    ['exam_id', 'title', 'link', 'due', 'pass_score', 'raw_message']],
  staff:    ['Staff',    ['emp_id', 'name', 'branch_code', 'position']],
  results:  ['ExamResults', ['exam_id', 'emp_id', 'score']],
  trainings:['Trainings', ['training_id', 'date', 'start', 'end', 'title', 'location', 'link', 'trainer', 'detail']],
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
const TYPES = [TYPE_AUTO, 'Google Form', 'Google Doc', 'Google Sheet', 'Dashboard', 'ส่งไฟล์ (Drive)', 'การสอบ', 'อื่นๆ'];

/* ===================== ตั้งค่าครั้งแรก ===================== */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.values(TABS).forEach(([name, head]) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#e8eeff');
      sh.setFrozenRows(1);
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
  try { SpreadsheetApp.getUi().alert('ตั้งค่าเสร็จ ✅\nลิงก์ฟอร์มอยู่ในแท็บ Settings'); }
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
  if (!find(Q.due))   form.addDateItem().setTitle(Q.due).setRequired(false);
  if (!find(Q.area))  form.addMultipleChoiceItem().setTitle(Q.area).setChoiceValues(AREAS).setRequired(false);
  if (!find(Q.branches)) form.addTextItem().setTitle(Q.branches);
  if (!find(Q.title)) form.addTextItem().setTitle(Q.title);
  find(Q.title).asTextItem().setHelpText('เว้นว่าง = ระบบตั้งชื่อจากบรรทัดหลักของข้อความ | พิมพ์เองเมื่ออยากได้ชื่อสั้นกว่า');
  find(Q.msg).asParagraphTextItem().setHelpText('วางข้อความจากไลน์ได้ทั้งก้อน มีหลายลิงก์ได้ ระบบแยกลิงก์ / Due / ประเภทงาน ให้เอง');
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
  const p = parseLineMessage(v('msg'), new Date());
  const type = (v('type') && v('type') !== TYPE_AUTO) ? v('type') : p.type;
  const title = v('title') || p.title;
  const due = v('due') ? toIso(new Date(v('due'))) : p.due;
  const area = v('area');
  let branches = 'ALL';
  if (v('branches')) branches = v('branches').replace(/\s*,\s*/g, ',');
  else if (area && area !== 'ทุกสาขา' && area !== 'ระบุสาขาเอง') branches = area;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const today = toIso(new Date());

  if (type === 'การสอบ') {
    const sh = ss.getSheetByName(TABS.exams[0]);
    sh.appendRow([nextId(sh, 'E'), title, p.links.join(' '), due, '', p.raw]);
  } else {
    const sh = ss.getSheetByName(TABS.tasks[0]);
    sh.appendRow([nextId(sh, 'T'), title, type, p.links.join(' '), p.detail, today, due, branches, p.raw]);
  }
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

  const isGreeting = l => /^(?:[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]*)(แจ้ง(ทุก)?สาขา|เรียน|สวัสดี|ถึง|ทุกสาขา|ด่วน|ประกาศ)\S{0,15}$/u.test(l);
  const isThanks  = l => /^(ขอบคุณ|thank|รบกวนด้วย|ขอบพระคุณ)/i.test(l);
  const body = lines.filter(l => !isThanks(l));
  const titleLine = body.find(l => !isGreeting(l)) || body[0] || 'งานใหม่';

  let title = titleLine
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s•\-*#]+/u, '')
    .replace(/^(เรื่อง|หัวข้อ)\s*[:：]?\s*/, '')
    .replace(/^(ด่วน(ที่สุด)?|urgent)\s*!*\s*/i, '')
    .replace(/^(รบกวน|ขอความร่วมมือ|ขอให้)\s*(ทุก)?\s*(สาขา|น้องๆ|น้อง|ทีม|ผจก\.?)?\s*(ทุกคน|ทุกท่าน)?\s*(ช่วย)?\s*/, '')
    .split(/\s*(ภายใน|ก่อนวันที่|ก่อน\s*\d|ไม่เกิน|กำหนดส่ง|หมดเขต|deadline)/i)[0]
    .replace(/(ค่ะ|ครับ|นะคะ|นะครับ)\s*$/, '')
    .trim();
  if (title.length > 80) title = title.slice(0, 77) + '…';
  if (!title) title = 'งานใหม่';

  const detail = body.filter(l => !isGreeting(l)).join('\n');

  return {
    title,
    detail: detail || titleLine,
    links,
    type: detectType(links, raw),
    due: pickDue(noUrl, now),
    raw
  };
}

/* ===================== เมนูใน Sheet ===================== */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Task Tracker')
    .addItem('ตั้งค่า / สร้างฟอร์มใหม่', 'setup')
    .addToUi();
}

// ให้ทดสอบใน Node ได้ (Apps Script จะไม่สนใจบรรทัดนี้)
if (typeof module !== 'undefined') module.exports = { parseLineMessage };
