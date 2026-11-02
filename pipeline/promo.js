/* ---------- โปรเดือนนี้: โปรโมชั่นซิม Prepay + ประกาศสำคัญ ----------
   อัปเดตทุกเดือน: แก้เฉพาะ PROMO ด้านล่าง (เดือน, ประกาศ, โปรเด่น, การ์ดแคมเปญ และ Matcode ของแต่ละรายการ)
   ยอดขายเดือนนี้และสต็อกในแต่ละรายการคำนวณจากข้อมูลจริงตามตัวกรอง Region / ภาค / ประเภทสาขา / สาขา */
window.PROMO = {
  month: '2026-11',
  title: 'พฤศจิกายนนี้ โปรดี PREPAY',
  sub: 'แคมเปญ / ซิมแนะนำ สำหรับการขาย Prepaid · NOV’26',
  notice: {
    tag: 'IMPORTANT NOTICE',
    head: 'ห้ามช้อปดำเนินการ Return SIM',
    lead: 'หากไม่ได้รับการเรียกคืน / คำสั่งจากส่วนกลาง',
    box: ['ห้ามส่ง SIM กลับคลังเองทุกกรณี', 'ต้องมีรายการ Recall หรือการยืนยันจากส่วนกลางก่อนดำเนินการ Return เท่านั้น'],
    steps: [
      ['ตรวจสอบก่อน', 'ตรวจสอบประกาศ / รายการ SIM ที่ส่วนกลางเรียกคืนให้ชัดเจน'],
      ['ยังไม่ถูกเรียก = ห้าม Return', 'แยกเก็บ SIM ไว้ที่ช้อป และรอคำสั่งจากส่วนกลาง'],
      ['มีปัญหาให้แจ้งก่อน', 'SIM ใกล้หมดอายุ / ผิดปกติ / ต้องการส่งคืน ให้ประสาน AM หรือส่วนกลางก่อนทุกครั้ง'],
    ],
    rule: 'หลักการเดียวกันทุกช้อป : “ส่วนกลางไม่เรียก = ห้าม Return”',
  },
  hero: {
    name: 'Travel World SIM', tagline: 'เที่ยวทั่วโลก เชื่อมต่อทุกเส้นทาง', period: '1–30 พ.ย. 2569',
    pack: 'SIM GO TRAVEL Worldwide · 15 GB | 30 วัน', was: 1599, now: 1499, off: 100, esim: true,
    matcodes: ['3000106115'],
  },
  cards: [
    { key: 'ready', color: '#9b3fc4', title: 'ซิมพร้อมใช้', fit: 'เหมาะกับลูกค้าที่ต้องการ “ซื้อแล้วใช้ได้ทันที”', items: [
      { label: '200 บ. · 4Mbps 50GB · 30 วัน', note: 'Pre-EOL', warn: true, matcodes: ['3000096033'] },
      { label: '299 บ. · 10Mbps 80GB · 30 วัน', note: 'FUP 1Mbps', hot: true, matcodes: ['3000143640', '3000143639'] },
      { label: '790 บ. · 15Mbps 100GB/รอบ · 3 รอบ', matcodes: ['3000122197', '3000121749', '3000122167', '3000143083'] },
      { label: '1,450 บ. · 15Mbps 100GB/รอบ · 6 รอบ', matcodes: ['3000122198', '3000121750', '3000122168', '3000143084'] },
      { label: '2,750 บ. · 15Mbps 100GB/รอบ · 12 รอบ', matcodes: ['3000122199', '3000122191', '3000122169', '3000143085'] },
    ], foot: 'อายุแพ็ก 3 / 6 / 12 รอบ · WiFi ไม่จำกัด' },
    { key: 'mass', color: '#d42a2a', title: 'ซิม Mass 49 บาท (เติม VAS)', fit: 'ENTRY SIM · เน้นลูกค้าเริ่มต้น / เติมแพ็กต่อ', items: [
      { label: '49 บ. · ใช้งานเริ่มต้น 5 วัน', note: 'Max speed 3GB + WiFi', hot: true, matcodes: ['3000104161', '3000142906'] },
    ], foot: 'เติมเงินสะสม 150 บาท/เดือน เพื่อรับสิทธิพิเศษต่อเนื่อง · True: On-net + WiFi 30 วัน | dtac: Social 4Mbps 30 วัน' },
    { key: 'tourist', color: '#1f9a4a', title: 'Tourist SIM · นักท่องเที่ยวต่างชาติที่มาเที่ยวไทย', fit: '8 วัน: Short Stay | 15–30 วัน: Long Stay', items: [
      { label: '499 บ. · 8 วัน', matcodes: ['3000121950', '6000017536', '6000018585'] },
      { label: '699 บ. · 15 วัน', matcodes: ['3000098815', '6000017537'] },
      { label: '1,199 บ. · 30 วัน', matcodes: ['3000103252', '6000017538'] },
    ], foot: '5G เต็มสปีด ไม่อั้น ไม่ลดสปีด · โทรทุกเครือข่าย 24 ชม. (ครั้งละ 15 นาที) + โทรต่างประเทศ 100 นาที · WiFi ไม่จำกัด · เลือกแพ็กตามระยะเวลาพำนักในไทย' },
    { key: 'travel', color: '#2a5fd4', title: 'SIM TRAVEL · ลูกค้าคนไทยเดินทางไปต่างประเทศ', fit: 'เลือกแพ็กตาม “ประเทศปลายทาง + จำนวนวันเดินทาง”', items: [
      { label: '399 บ. · 6GB / 10 วัน · Asia–Australia', matcodes: ['3000106113', '6000017531'] },
      { label: '549 บ. · 12GB / 10 วัน · Asia–Australia', matcodes: ['3000114724'] },
      { label: '899 บ. · 6GB / 15 วัน · Worldwide', matcodes: ['3000106114'] },
      { label: '1,499 บ. · 15GB / 30 วัน · Worldwide', note: 'โปรลด 100 บาท (ปกติ 1,599)', hot: true, matcodes: ['3000106115'] },
    ], foot: '' },
  ],
  // รายละเอียดซิมแต่ละแพ็ก (จาก Monthly Business Steering) — Stock / ขายต่อสัปดาห์ / Cover Week คำนวณจากข้อมูลจริง
  sheets: [
    { title: 'รวมซิมทรูพร้อมใช้', color: '#9b3fc4', packs: [
      { price: 200, mat: '3000096033', desc: 'SIM,PRE,TMH2 READY 4MBPS50GB_VAS MULTI', tag: 'Pre-EOL', life: '30 วัน', net: '4Mbps 50GB', call: 'โทรในเครือข่าย (ฟรี 60 นาที/ครั้ง โทรเกินนาทีละ 25 สต. ไม่รวม VAT)', perk: 'WiFi ไม่จำกัด' },
      { price: 299, mat: '3000143640', desc: 'SIM,PRE,TMH2 NET READY2 _VAS MUL', tag: 'ใหม่ แทน 200 บ.', life: '30 วัน', net: '10 Mbps 80GB (FUP 1 Mbps)', call: 'โทรทุกเครือข่าย (ฟรี 15 นาที/ครั้ง โทรเกินนาทีละ 99 สต. ไม่รวม VAT)', perk: 'WiFi ไม่จำกัด · ต่อแพ็กสำเร็จในเดือน 2–6 รับเน็ต 10Mbps เพิ่มอีก 20GB' },
      { price: 790, mat: '3000122197', desc: 'SIM,PRE,TMH2 15MBPS100G3M SW_VAS MULTI', life: '3 รอบ (รอบละ 30 วัน)', net: '15Mbps 100 GB ต่อรอบ (FUP 128 Kbps)', call: 'โทรในเครือข่าย (ฟรีสูงสุด 15 นาที/ครั้ง โทรเกินนาทีละ 99 สต. ไม่รวม VAT) · โทรนอกเครือข่าย 60 นาทีต่อรอบ', perk: 'WiFi ไม่จำกัด' },
      { price: 1450, mat: '3000122198', desc: 'SIM,PRE,TMH2 15MBPS100G6M SW_VAS MULTI', life: '6 รอบ (รอบละ 30 วัน)', net: '15Mbps 100 GB ต่อรอบ (FUP 128 Kbps)', call: 'โทรในเครือข่าย (ฟรีสูงสุด 15 นาที/ครั้ง โทรเกินนาทีละ 99 สต. ไม่รวม VAT) · โทรนอกเครือข่าย 60 นาทีต่อรอบ', perk: 'WiFi ไม่จำกัด' },
      { price: 2750, mat: '3000122199', desc: 'SIM,PRE,TMH2 15MBPS100G12M SW_VAS MULTI', life: '12 รอบ (รอบละ 30 วัน)', net: '15Mbps 100 GB ต่อรอบ (FUP 128 Kbps)', call: 'โทรในเครือข่าย (ฟรีสูงสุด 15 นาที/ครั้ง โทรเกินนาทีละ 99 สต. ไม่รวม VAT) · โทรนอกเครือข่าย 60 นาทีต่อรอบ', perk: 'WiFi ไม่จำกัด' } ] },
    { title: 'รวมซิมดีแทคพร้อมใช้ (คงกระพัน+)', color: '#7a3fa8', packs: [
      { price: 790, mat: '3000143083', desc: 'SIM,PRE,TMH3 KKP 15MB 3M 790 TSHOP_VAS', life: '3 รอบ (รอบละ 30 วัน)', net: '15Mbps 100 GB ต่อรอบ (FUP 128 Kbps)', call: 'โทรในเครือข่าย (ฟรีสูงสุด 15 นาที/ครั้ง โทรเกินนาทีละ 99 สต. ไม่รวม VAT) · โทรนอกเครือข่าย 60 นาทีต่อรอบ', perk: 'WiFi ไม่จำกัด' },
      { price: 1450, mat: '3000143084', desc: 'SIM,PRE,TMH3 KKP 15MB 6M 1450 TSHOP_VAS', life: '6 รอบ (รอบละ 30 วัน)', net: '15Mbps 100 GB ต่อรอบ (FUP 128 Kbps)', call: 'โทรในเครือข่าย (ฟรีสูงสุด 15 นาที/ครั้ง โทรเกินนาทีละ 99 สต. ไม่รวม VAT) · โทรนอกเครือข่าย 60 นาทีต่อรอบ', perk: 'WiFi ไม่จำกัด' },
      { price: 2750, mat: '3000143085', desc: 'SIM,PRE,TMH3 KKP 15MB 12M 2750 TSHOP_VAS', life: '12 รอบ (รอบละ 30 วัน)', net: '15Mbps 100 GB ต่อรอบ (FUP 128 Kbps)', call: 'โทรในเครือข่าย (ฟรีสูงสุด 15 นาที/ครั้ง โทรเกินนาทีละ 99 สต. ไม่รวม VAT) · โทรนอกเครือข่าย 60 นาทีต่อรอบ', perk: 'WiFi ไม่จำกัด' } ] },
    { title: 'รวมซิม Mass 49 บาท (เติม VAS)', color: '#d42a2a', packs: [
      { price: 49, mat: '3000104161', desc: 'SIM,PRE,TMH2 HELLO_VAS MULTI', tag: 'ทรู · ฮัลโหล', life: '5 วัน', net: 'Max speed 3GB + Wi-Fi', perk: 'เติมเงินสะสม 150 บาท/เดือน → โทรฟรีในเครือข่าย 30 วัน + Wi-Fi ฟรี 30 วัน' },
      { price: 49, mat: '3000142906', desc: 'SIM,PRE,TMH3 NET TSHOP_VAS', tag: 'ดีแทค · แฮปปี้เน็ต', life: '5 วัน', net: 'Max speed 3GB + Wi-Fi', perk: 'เติมเงินสะสม 150 บาท/เดือน → เล่น FB, LINE, X, Instagram, Messenger ฟรีที่ 4Mbps 30 วัน' } ] },
    { title: 'Tourist SIM · นักท่องเที่ยวต่างชาติที่มาเที่ยวไทย', color: '#1f9a4a', packs: [
      { price: 499, mat: '3000121950', desc: 'SIM,PRE,TMH2 INFINITE 8D SH WW_VAS MULTI', life: '8 วัน', net: 'เน็ต 5G เต็มสปีด ไม่อั้น ไม่ลดสปีด', call: 'โทรทุกเครือข่าย 24 ชม. (ครั้งละ 15 นาที) · โทรฟรีต่างประเทศ 100 นาที', perk: 'WiFi ไม่จำกัด', who: 'กลุ่มที่อยู่สั้น 3–8 วัน เช่น Asia จีน มาเลเซีย ญี่ปุ่น' },
      { price: 699, mat: '3000098815', desc: 'SIM,PRE,TMH2 INFINITE 15DAY_VAS MULTI', life: '15 วัน', net: 'เน็ต 5G เต็มสปีด ไม่อั้น ไม่ลดสปีด', call: 'โทรทุกเครือข่าย 24 ชม. (ครั้งละ 15 นาที) · โทรฟรีต่างประเทศ 100 นาที', perk: 'WiFi ไม่จำกัด', who: 'กลุ่มที่อยู่นาน 15 วันขึ้นไป เช่น Europe / Russia หรือ Middle East' },
      { price: 1199, mat: '3000103252', desc: 'SIM,PRE,TMH2 INFINITE 30DAY V2_VAS MULTI', life: '30 วัน', net: 'เน็ต 5G เต็มสปีด ไม่อั้น ไม่ลดสปีด', call: 'โทรทุกเครือข่าย 24 ชม. (ครั้งละ 15 นาที) · โทรฟรีต่างประเทศ 100 นาที', perk: 'WiFi ไม่จำกัด', who: 'กลุ่มที่อยู่นาน 15 วันขึ้นไป เช่น Europe / Russia หรือ Middle East' } ] },
    { title: 'SIM TRAVEL · ลูกค้าคนไทยเดินทางไปต่างประเทศ', color: '#2a5fd4', packs: [
      { price: 399, mat: '3000106113', desc: 'SIM,PRE,TMH2 GOTRAVEL ASIA_VAS MULTI', zone: 'Asia · Australia', life: '6 GB | 10 วัน' },
      { price: 549, mat: '3000114724', desc: 'SIM,PRE,TMH2 GOTRAVEL ASIA V1_VAS MULTI', zone: 'Asia · Australia', life: '12 GB | 10 วัน' },
      { price: 899, mat: '3000106114', desc: 'SIM,PRE,TMH2 GOTRAVEL W 15D_VAS MULTI', zone: 'Worldwide', life: '6 GB | 15 วัน' },
      { price: 1599, mat: '3000106115', desc: 'SIM,PRE,TMH2 GOTRAVEL W 30D_VAS MULTI', zone: 'Worldwide', life: '15 GB | 30 วัน', tag: 'พ.ย. ลดเหลือ 1,499' } ] },
  ],
};

(() => {
  const css = `
.pm-notice { border: 1px solid #e9a3a8; background: color-mix(in srgb, #d42a2a 7%, var(--color-panel)); border-radius: var(--cds-radius); padding: var(--cds-pad-lg); display: grid; gap: var(--cds-gap-md); }
.pm-tag { justify-self: start; background: var(--color-fg); color: var(--color-bg); font-size: 12px; font-weight: 600; letter-spacing: .04em; padding: 3px 10px; border-radius: 6px; }
.pm-notice h3 { margin: 0; font-size: 20px; font-weight: 600; }
.pm-notice h3 span { display: block; color: var(--color-bad); font-size: 16px; margin-top: 2px; }
.pm-alert { display: flex; gap: var(--cds-gap-md); align-items: center; }
.pm-alert i { flex: none; width: 36px; height: 36px; border-radius: 50%; background: #d42a2a; color: #fff; font-style: normal; font-weight: 700; font-size: 20px; display: grid; place-items: center; }
.pm-alert b { display: block; font-size: 15px; }
.pm-alert small { color: var(--color-fg-muted); font-size: 13px; }
.pm-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr)); gap: var(--cds-gap-sm); }
.pm-step { background: var(--color-panel); border: 1px solid var(--color-border-line); border-radius: var(--cds-radius); padding: var(--cds-pad-md); display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; }
.pm-step em { grid-row: span 2; width: 26px; height: 26px; border-radius: 50%; background: #c8a46a; color: #fff; font-style: normal; font-weight: 600; display: grid; place-items: center; font-size: 13px; }
.pm-step:nth-child(2) em { background: #d42a2a; }
.pm-step b { font-size: 14px; } .pm-step span { font-size: 13px; color: var(--color-fg-muted); line-height: 1.45; }
.pm-rule { background: var(--color-fg); color: var(--color-bg); text-align: center; font-weight: 600; border-radius: var(--cds-radius); padding: var(--cds-pad-sm) var(--cds-pad-md); font-size: 14px; }
.pm-hero { border: 1px solid var(--color-border-line); border-left: 6px solid #d42a2a; background: var(--color-panel); border-radius: var(--cds-radius); padding: var(--cds-pad-lg); display: grid; grid-template-columns: 1fr auto; gap: var(--cds-gap-md); align-items: center; }
.pm-hero h3 { margin: 0; font-size: 22px; font-weight: 600; } .pm-hero h3 small { font-size: 14px; font-weight: 500; color: var(--color-fg-muted); margin-left: 6px; }
.pm-hero p { margin: 0; font-size: 13.5px; color: var(--color-fg-muted); line-height: 1.6; }
.pm-price { text-align: right; } .pm-price s { color: var(--color-fg-muted); font-size: 14px; } .pm-price b { display: block; font-size: 30px; line-height: 1.1; color: #d42a2a; font-weight: 700; } .pm-price span { font-size: 12.5px; }
.pm-badge { display: inline-block; font-size: 11.5px; font-weight: 600; padding: 1px 7px; border-radius: 999px; background: color-mix(in srgb, #d42a2a 14%, transparent); color: var(--color-bad); margin-left: 4px; vertical-align: 1px; }
.pm-badge.w { background: color-mix(in srgb, #b7791f 16%, transparent); color: var(--color-warn); }
.pm-badge.g { background: color-mix(in srgb, #2a5fd4 14%, transparent); color: #2a5fd4; }
.pm-card { border-left: 5px solid var(--pm-c); }
.pm-card h3 { color: var(--pm-c); }
.pm-fit { font-size: 12.5px; font-weight: 600; color: #fff; background: var(--pm-c); border-radius: 6px; padding: 4px 10px; justify-self: start; }
.pm-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 32rem), 1fr)); gap: var(--cds-gap-md); }
.pm-tbl { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.pm-tbl td:first-child { white-space: normal; width: 100%; }
.pm-tbl td:not(:first-child) { white-space: nowrap; }
.pm-tbl th { font-weight: 500; color: var(--color-fg-muted); font-size: 12px; text-align: right; padding: 4px 6px; border-bottom: 1px solid var(--color-border-line); white-space: nowrap; }
.pm-tbl th:first-child, .pm-tbl td:first-child { text-align: left; padding-left: 0; }
.pm-tbl td { padding: 6px; border-bottom: 1px solid var(--color-border-line); text-align: right; vertical-align: top; font-variant-numeric: tabular-nums; }
.pm-tbl td:first-child small { display: block; color: var(--color-fg-muted); font-size: 11.5px; }
.pm-tbl tr.tot td { font-weight: 600; border-bottom: 0; }
.pm-zero { color: var(--color-bad); }
.pm-sheet { border-top: 5px solid var(--pm-c); }
.pm-sheet h3 { color: var(--pm-c); }
.pm-st { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; min-width: 640px; }
.pm-st th, .pm-st td { border: 1px solid var(--color-border-line); padding: 6px 8px; text-align: center; vertical-align: middle; line-height: 1.45; }
.pm-st th:first-child, .pm-st td:first-child { width: 8.5rem; text-align: left; font-weight: 600; background: color-mix(in srgb, var(--color-fg) 5%, transparent); }
.pm-st thead th { background: var(--color-fg); color: var(--color-bg); font-size: 17px; font-weight: 700; }
.pm-st thead th:first-child { background: var(--color-fg); color: var(--color-bg); font-size: 13px; }
.pm-st td.mat { font-variant-numeric: tabular-nums; font-weight: 600; }
.pm-st td small { display: block; color: var(--color-fg-muted); font-size: 11px; }
.pm-st tr.live td { font-variant-numeric: tabular-nums; font-weight: 600; background: color-mix(in srgb, var(--pm-c) 6%, transparent); }
.pm-st tr.live td:first-child { background: color-mix(in srgb, var(--pm-c) 12%, transparent); }
.pm-cv-low { color: var(--color-bad); } .pm-cv-high { color: var(--color-warn); }
.pc .pm-sheet .pm-st td, .pc .pm-sheet .pm-st th { white-space: normal !important; overflow-wrap: anywhere; }
.pc .pm-sheet .pm-st thead th { background: var(--color-fg) !important; color: var(--color-bg) !important; text-align: center !important; font-size: 17px; font-weight: 700; }
.pc .pm-sheet .pc-scroll { max-height: none !important; }
.pc .pm-sheet .pm-st thead th:first-child { text-align: left !important; font-size: 13px; }
.pm-sheet tr.pm-d { display: none; } .pm-sheet.open tr.pm-d { display: table-row; }
.pm-i { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; margin-left: 6px; border-radius: 50%; border: 1px solid var(--pm-c); color: var(--pm-c); background: var(--color-panel); font: italic 600 11px/1 var(--font-anthropic-sans, sans-serif); cursor: pointer; vertical-align: 1px; padding: 0; }
.pm-i.on, .pm-i:hover { background: var(--pm-c); color: #fff; }
.pm-dbox { border: 1px solid color-mix(in srgb, var(--pm-c) 45%, var(--color-border-line)); border-left: 4px solid var(--pm-c); border-radius: var(--cds-radius); padding: 10px 14px; display: grid; grid-template-columns: 8.5rem 1fr; gap: 4px 12px; font-size: 13px; line-height: 1.5; }
.pm-dbox h4 { grid-column: 1 / -1; margin: 0 0 4px; font-size: 15px; color: var(--pm-c); }
.pm-dbox dt { color: var(--color-fg-muted); } .pm-dbox dd { margin: 0; }
.pm-all { justify-self: start; font: inherit; font-size: 12px; color: var(--pm-c); background: none; border: 1px solid color-mix(in srgb, var(--pm-c) 45%, transparent); border-radius: 999px; padding: 4px 12px; cursor: pointer; }
@media (max-width: 560px) { .pm-dbox { grid-template-columns: 1fr; } .pm-dbox dt { margin-top: 4px; } }
@media (max-width: 560px) { .pm-hero { grid-template-columns: 1fr; } .pm-price { text-align: left; } }
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const nf = (v) => Math.round(v).toLocaleString('en-US');
  const TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const monTH = (m) => TH[+m.slice(5, 7) - 1] + ' ' + (+m.slice(0, 4) + 543);

  dash.draw('promo_board', (el) => {
    const P = window.PROMO, N = P.notice, H = P.hero;
    const p = window.PC ? PC.P() : { area: 'ALL', stype: 'ALL', shop: 'ALL' };
    const shops = (window.PC && PC.rows('shops')) || [];
    const sm = new Map(shops.map((r) => [String(r.shop), r]));
    const okShop = (s) => { if (p.shop !== 'ALL') return String(s) === String(p.shop); const r = sm.get(String(s)); if (!r) return p.area === 'ALL' && p.stype === 'ALL';
      return window.PCin(r.area, p.area) && (p.stype === 'ALL' || r.stype === p.stype); };
    const sales = (window.PC && PC.rows('sales_daily')) || [];
    const month = P.month;
    const q = new Map(), n = new Map(), stock = new Map();
    let lastDate = '';
    for (const r of sales) { const d = String(r.date); if (d.slice(0, 7) !== month) continue; if (d > lastDate) lastDate = d; if (!okShop(r.shop)) continue;
      q.set(r.matcode, (q.get(r.matcode) || 0) + +r.units); n.set(r.matcode, (n.get(r.matcode) || 0) + +r.net); }
    for (const r of ((window.PC && PC.rows('stock_by_shop')) || [])) { if (!okShop(r.shop)) continue; stock.set(r.matcode, (stock.get(r.matcode) || 0) + +r.qty); }
    const sum = (m, codes) => codes.reduce((a, c) => a + (m.get(c) || 0), 0);
    const scope = p.shop !== 'ALL' ? 'สาขา ' + esc((sm.get(String(p.shop)) || {}).name || p.shop) : (p.area === 'ALL' ? 'ทุกภาค' : esc(p.area)) + (p.stype === 'ALL' ? '' : ' · ' + esc(p.stype));
    const asof = lastDate ? 'ยอดขาย ' + monTH(month) + ' ถึง ' + (+lastDate.slice(8, 10)) + ' ' + TH[+lastDate.slice(5, 7) - 1] : 'ยังไม่มียอดขายเดือน ' + monTH(month);
    const hq = sum(q, H.matcodes), hs = sum(stock, H.matcodes);
    const row = (it) => { const a = sum(q, it.matcodes), b = sum(n, it.matcodes), s = sum(stock, it.matcodes);
      const badge = it.note ? ' <span class="pm-badge' + (it.warn ? ' w' : it.hot ? '' : ' g') + '">' + esc(it.note) + '</span>' : '';
      return '<tr><td class="wrap">' + esc(it.label) + badge + '<small>Matcode ' + it.matcodes.map(esc).join(', ') + '</small></td><td>' + nf(a) + '</td><td>' + nf(b) + '</td><td class="' + (s === 0 ? 'pm-zero' : '') + '">' + nf(s) + '</td></tr>'; };
    const card = (c) => { const all = c.items.flatMap((i) => i.matcodes);
      return '<article class="pc-card pm-card" style="--pm-c:' + c.color + '"><h3>' + esc(c.title) + '</h3><span class="pm-fit">' + esc(c.fit) + '</span>'
        + '<table class="pm-tbl"><thead><tr><th>แพ็ก</th><th>QTY เดือนนี้</th><th>Net (บาท)</th><th>Stock</th></tr></thead><tbody>' + c.items.map(row).join('')
        + (c.items.length > 1 ? '<tr class="tot"><td>รวม</td><td>' + nf(sum(q, all)) + '</td><td>' + nf(sum(n, all)) + '</td><td>' + nf(sum(stock, all)) + '</td></tr>' : '') + '</tbody></table>'
        + (c.foot ? '<p>' + esc(c.foot) + '</p>' : '') + '</article>'; };
    // live stock / weekly sales / cover for product sheets
    let maxD = ''; for (const r of sales) if (String(r.date) > maxD) maxD = String(r.date);
    const d28 = maxD ? new Date(Date.parse(maxD + 'T00:00:00Z') - 27 * 864e5).toISOString().slice(0, 10) : '';
    const w28 = new Map(), mtd = new Map(); const curM = maxD.slice(0, 7); if (maxD) for (const r of sales) { const d = String(r.date); if (!okShop(r.shop)) continue; if (d.slice(0, 7) === curM) mtd.set(String(r.matcode), (mtd.get(String(r.matcode)) || 0) + +r.units); if (d < d28 || d > maxD) continue; w28.set(String(r.matcode), (w28.get(String(r.matcode)) || 0) + +r.units); }
    const stA = String((((window.PC && PC.rows('stock_by_shop')) || [])[0] || {}).asof || ''); const dTH = (s) => (s ? (+s.slice(8, 10)) + ' ' + TH[+s.slice(5, 7) - 1] + (s.length > 10 ? ' ' + s.slice(11, 16) + ' น.' : '') : '');
    const wsA = String((((window.PC && PC.rows('watch_serials')) || [])[0] || {}).sales_asof || ''); const salesTo = wsA && wsA.slice(0, 10) === maxD ? dTH(wsA) : dTH(maxD);
    const sheet = (S, si) => { const ks = S.packs; const same = (f) => ks.every((k) => (k[f] || '') === (ks[0][f] || ''));
      const rowF = (lab, f, cls, vis) => { if (!ks.some((k) => k[f])) return ''; const tr = '<tr' + (vis ? '' : ' class="pm-d"') + '>'; if (ks.length > 1 && same(f)) return tr + '<td>' + lab + '</td><td colspan="' + ks.length + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + esc(ks[0][f]) + '</td></tr>';
        return tr + '<td>' + lab + '</td>' + ks.map((k) => '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + esc(k[f] || '–') + '</td>').join('') + '</tr>'; };
      const live = ks.map((k) => { const s = stock.get(k.mat) || 0, w = (w28.get(k.mat) || 0) / 4; return { s, w, m: mtd.get(k.mat) || 0, cv: w > 0 ? s / w : null }; });
      return '<article class="pc-card pm-sheet" data-si="' + si + '" style="--pm-c:' + S.color + '"><h3>' + esc(S.title) + '</h3><div class="pc-scroll"><table class="pm-st"><thead><tr><th>ราคา</th>' + ks.map((k) => '<th>' + nf(k.price) + ' บ.</th>').join('') + '</tr></thead><tbody>'
        + '<tr><td>Mat code</td>' + ks.map((k, ki) => '<td class="mat">' + esc(k.mat) + '<button type="button" class="pm-i" data-k="' + ki + '" aria-label="ดูรายละเอียดแพ็ก ' + nf(k.price) + ' บาท" title="ดูรายละเอียด">i</button>' + (k.tag ? '<small>' + esc(k.tag) + '</small>' : '') + '</td>').join('') + '</tr>'
        + rowF('Description', 'desc') + rowF('พื้นที่ใช้งาน', 'zone') + rowF('ใช้ได้นาน', 'life', '', true) + rowF('เน็ต', 'net') + rowF('โทร', 'call') + rowF('สิทธิพิเศษ', 'perk') + rowF('ลูกค้าเป้าหมาย', 'who')
        + '<tr class="live"><td>Stock shop<small>ณ ' + esc(dTH(stA)) + '</small></td>' + live.map((x) => '<td class="' + (x.s === 0 ? 'pm-zero' : '') + '">' + nf(x.s) + ' unit</td>').join('') + '</tr>'
        + '<tr class="live"><td>ยอดขายเดือนนี้<small>' + esc(monTH(curM)) + ' ถึง ' + esc(salesTo) + '</small></td>' + live.map((x) => '<td>' + nf(x.m) + ' unit</td>').join('') + '</tr>'
        + '<tr class="live"><td>Sales per Week<small>เฉลี่ย 28 วันล่าสุด</small></td>' + live.map((x) => '<td>' + (x.w ? (x.w < 10 ? x.w.toFixed(1) : nf(x.w)) : '0') + ' unit</td>').join('') + '</tr>'
        + '<tr class="live"><td>Cover Week<small>Stock ÷ ขาย/สัปดาห์ (28 วัน)</small></td>' + live.map((x) => '<td class="' + (x.cv == null ? '' : x.cv < 2 ? 'pm-cv-low' : x.cv > 26 ? 'pm-cv-high' : '') + '">' + (x.cv == null ? (x.s ? 'ยังไม่มียอด' : '–') : x.cv.toFixed(2)) + '</td>').join('') + '</tr>'
        + '</tbody></table></div><div class="pm-dbox" hidden></div><button type="button" class="pm-all">ดูรายละเอียดทุกแพ็ก</button></article>'; };
    el.innerHTML = '<div class="pc-head"><h2 class="pc-title">' + esc(P.title) + '</h2><p class="pc-take">' + esc(P.sub) + ' · ตัวเลขในตาราง: ' + asof + ' · ' + scope + ' · Stock ณ ไฟล์ล่าสุด</p></div>'
      + '<div class="pm-notice" role="note"><span class="pm-tag">' + esc(N.tag) + '</span><h3>' + esc(N.head) + '<span>' + esc(N.lead) + '</span></h3>'
      + '<div class="pm-alert"><i aria-hidden="true">!</i><div><b>' + esc(N.box[0]) + '</b><small>' + esc(N.box[1]) + '</small></div></div>'
      + '<div class="pm-steps">' + N.steps.map((s, i) => '<div class="pm-step"><em>' + (i + 1) + '</em><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>').join('') + '</div>'
      + '<div class="pm-rule">' + esc(N.rule) + '</div></div>'
      + '<div class="pm-hero"><div><h3>' + esc(H.name) + '<small>' + esc(H.tagline) + '</small></h3><p>' + esc(H.pack) + (H.esim ? ' · รองรับ eSIM' : '') + ' · Period ' + esc(H.period) + ' · Matcode ' + H.matcodes.map(esc).join(', ')
      + '<br>เดือนนี้ขายได้ <b>' + nf(hq) + '</b> ชิ้น · Stock คงเหลือ <b class="' + (hs === 0 ? 'pm-zero' : '') + '">' + nf(hs) + '</b> ชิ้น (' + scope + ')</p></div>'
      + '<div class="pm-price"><s>' + nf(H.was) + ' บาท</s><b>' + nf(H.now) + ' บาท</b><span class="pm-badge">ลด ' + nf(H.off) + ' บาท</span></div></div>'
      + '<div class="pm-grid">' + P.cards.map(card).join('') + '</div>'
      + '<h2 class="pc-title" style="font-size:20px;margin-top:8px">รายละเอียดซิมแต่ละแพ็ก</h2><p class="pc-take">ข้อมูลแพ็กจาก Monthly Business Steering · Stock / ขายเฉลี่ยต่อสัปดาห์ (28 วันล่าสุด) / Cover Week คำนวณจากข้อมูลจริงตามตัวกรอง (' + scope + ')</p>'
      + (P.sheets || []).map((S, si) => sheet(S, si)).join('')
      + '<p class="pc-note">QTY / Net = ยอดขายเดือน ' + monTH(month) + ' ของ Matcode ในแต่ละแพ็ก (รวมซิมและ eSIM ที่ราคาเดียวกัน) ตามตัวกรองด้านบน · Stock แดง = ไม่มีของในพื้นที่ที่เลือก ควรขอโยกหรือเบิกเพิ่ม · Cover Week = Stock ÷ ขายเฉลี่ยต่อสัปดาห์ (แดง = ต่ำกว่า 2 สัปดาห์ เสี่ยงของขาด · ส้ม = เกิน 26 สัปดาห์ ของค้าง)</p>';
  });
})();

if (!window.PM_DET_BOUND) { window.PM_DET_BOUND = true;
  const F = [['desc', 'Description'], ['zone', 'พื้นที่ใช้งาน'], ['life', 'ใช้ได้นาน'], ['net', 'เน็ต'], ['call', 'โทร'], ['perk', 'สิทธิพิเศษ'], ['who', 'ลูกค้าเป้าหมาย']];
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.pm-i, .pm-all'); if (!b) return; const art = b.closest('.pm-sheet'); if (!art) return;
    if (b.classList.contains('pm-all')) { const on = art.classList.toggle('open'); b.textContent = on ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียดทุกแพ็ก'; return; }
    const S = (window.PROMO.sheets || [])[+art.dataset.si]; const k = S && S.packs[+b.dataset.k]; const box = art.querySelector('.pm-dbox'); if (!k || !box) return;
    const was = b.classList.contains('on'); art.querySelectorAll('.pm-i.on').forEach((x) => x.classList.remove('on'));
    if (was) { box.hidden = true; return; }
    b.classList.add('on'); box.replaceChildren(); const h = document.createElement('h4'); h.textContent = k.price.toLocaleString('en-US') + ' บาท · ' + k.mat + (k.tag ? ' · ' + k.tag : ''); box.append(h);
    for (const [f, l] of F) { if (!k[f]) continue; const dt = document.createElement('dt'); dt.textContent = l; const dd = document.createElement('dd'); dd.textContent = k[f]; box.append(dt, dd); }
    box.hidden = false; });
}
