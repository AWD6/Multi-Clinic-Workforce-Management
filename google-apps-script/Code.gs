const OPD2_CONFIG = {
  // ใส่ Spreadsheet ID จาก URL ของ Google Sheet ระหว่าง /d/ และ /edit
  SPREADSHEET_ID: "PASTE_SPREADSHEET_ID_HERE",
  // origin ของ GitHub Pages เช่น https://awd6.github.io (ไม่ใส่ path ต่อท้าย)
  ALLOWED_PARENT_ORIGIN: "https://YOUR_GITHUB_OWNER.github.io",
  ROOMS_SHEET: "Rooms",
  DATA_SHEET: "RoomData"
};

const ROOM_HEADERS = ["unitId", "clinicName", "unitName", "active"];
const DATA_HEADERS = ["unitId", "clinicName", "staffJson", "defaultsJson", "updatedAt", "updatedBy"];
const ROOM_DEFINITIONS = [
  ["u4", "OPD 9", "หน่วยตรวจที่ 4", true],
  ["u4", "OPD 21", "หน่วยตรวจที่ 4", true],
  ["u4", "PCU", "หน่วยตรวจที่ 4", true],
  ["u4", "OPD เฉพาะทางนอกเวลา", "หน่วยตรวจที่ 4", true],
  ["u5", "OPD 22", "หน่วยตรวจที่ 5", true],
  ["u5", "OPD 23", "หน่วยตรวจที่ 5", true],
  ["u5", "OPD 26", "หน่วยตรวจที่ 5", true],
  ["u7", "EID Complex", "หน่วยตรวจที่ 7", true],
  ["chemo", "ห้องให้ยาเคมีบำบัด", "หน่วยให้ยาเคมีบำบัดผู้ป่วยนอก", true],
  ["chemo", "OPD 24", "หน่วยให้ยาเคมีบำบัดผู้ป่วยนอก", true],
  ["chemo", "OPD 110", "หน่วยให้ยาเคมีบำบัดผู้ป่วยนอก", true],
  ["chemo", "EKG", "หน่วยให้ยาเคมีบำบัดผู้ป่วยนอก", true],
  ["chemo", "ศูนย์สุขใจ", "หน่วยให้ยาเคมีบำบัดผู้ป่วยนอก", true]
];

/** สร้างแท็บ Rooms และ RoomData; ถ้าเคยสร้าง Users ไว้แล้วสามารถปล่อยทิ้งได้ */
function setupDatabase() {
  const ss = openDatabase_();
  const roomsSheet = ensureSheet_(ss, OPD2_CONFIG.ROOMS_SHEET, ROOM_HEADERS);
  if (roomsSheet.getLastRow() === 1) {
    roomsSheet.getRange(2, 1, ROOM_DEFINITIONS.length, ROOM_HEADERS.length).setValues(ROOM_DEFINITIONS);
    roomsSheet.setFrozenRows(1);
  }
  ensureSheet_(ss, OPD2_CONFIG.DATA_SHEET, DATA_HEADERS);
  return "สร้างแท็บ Rooms และ RoomData เรียบร้อยแล้ว";
}

/** หน้า bridge ที่ GitHub Pages ฝังไว้เพื่อส่งคำสั่งข้ามโดเมน */
function doGet() {
  const template = HtmlService.createTemplateFromFile("Bridge");
  template.allowedParentOrigin = OPD2_CONFIG.ALLOWED_PARENT_ORIGIN;
  return template.evaluate()
    .setTitle("Workforce data bridge")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** โหลดรายชื่อจากทุกห้องที่เปิดใช้งาน */
function getBootstrapData() {
  const ss = openDatabase_();
  const roomsSheet = ensureSheet_(ss, OPD2_CONFIG.ROOMS_SHEET, ROOM_HEADERS);
  const roomRows = roomsSheet.getDataRange().getValues();
  const scopes = [];
  const units = {};
  for (let r = 1; r < roomRows.length; r += 1) {
    const row = roomRows[r];
    if (!row[0] || !row[1] || !isActive_(row[3])) continue;
    const scope = scopeKey_(row[0], row[1]);
    scopes.push(scope);
    units[scope] = { unitId: String(row[0]).trim(), clinicName: String(row[1]).trim(), unitName: String(row[2] || "").trim() };
  }
  if (!scopes.length) throw new Error("ไม่พบห้องตรวจที่เปิดใช้งานในแท็บ Rooms");

  const dataSheet = ensureSheet_(ss, OPD2_CONFIG.DATA_SHEET, DATA_HEADERS);
  const values = dataSheet.getDataRange().getValues();
  const rooms = {};
  scopes.forEach((scope) => { rooms[scope] = { staff: [], defaults: {} }; });
  for (let r = 1; r < values.length; r += 1) {
    const row = values[r];
    const scope = scopeKey_(row[0], row[1]);
    if (!Object.prototype.hasOwnProperty.call(rooms, scope)) continue;
    rooms[scope] = { staff: parseJsonCell_(row[2], []), defaults: parseJsonCell_(row[3], {}) };
  }
  return { scopes, rooms, units };
}

/** บันทึกรายชื่อหรือค่า Default ของห้องที่ระบุ; ไม่มีการตรวจอีเมลในโหมด public-link */
function saveRoomCollection(scope, collection, value) {
  const parts = parseScope_(scope);
  if (!isKnownActiveRoom_(parts.unitId, parts.clinicName)) throw new Error("ไม่พบห้องตรวจนี้หรือห้องถูกปิดใช้งาน");
  if (!["staff-directory", "assignment-defaults"].includes(collection)) {
    throw new Error("ไม่อนุญาตให้บันทึกข้อมูลประเภทนี้");
  }
  const json = JSON.stringify(value);
  if (json.length > 100000) throw new Error("ข้อมูลมีขนาดใหญ่เกินกำหนด");
  if (collection === "staff-directory" && !Array.isArray(value)) throw new Error("รูปแบบรายชื่อบุคลากรไม่ถูกต้อง");
  if (collection === "assignment-defaults" && (!value || typeof value !== "object" || Array.isArray(value))) {
    throw new Error("รูปแบบค่า Default ไม่ถูกต้อง");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = ensureSheet_(openDatabase_(), OPD2_CONFIG.DATA_SHEET, DATA_HEADERS);
    const rows = sheet.getDataRange().getValues();
    let rowNumber = -1;
    for (let r = 1; r < rows.length; r += 1) {
      if (scopeKey_(rows[r][0], rows[r][1]) === scope) { rowNumber = r + 1; break; }
    }
    if (rowNumber < 0) {
      rowNumber = sheet.getLastRow() + 1;
      sheet.getRange(rowNumber, 1, 1, DATA_HEADERS.length).setValues([[parts.unitId, parts.clinicName, "[]", "{}", new Date(), "public-link"]]);
    }
    const targetColumn = collection === "staff-directory" ? 3 : 4;
    sheet.getRange(rowNumber, targetColumn).setValue(json);
    sheet.getRange(rowNumber, 5, 1, 2).setValues([[new Date(), "public-link"]]);
    SpreadsheetApp.flush();
    return { ok: true, savedAt: new Date().toISOString() };
  } finally {
    lock.releaseLock();
  }
}

function isKnownActiveRoom_(unitId, clinicName) {
  const sheet = ensureSheet_(openDatabase_(), OPD2_CONFIG.ROOMS_SHEET, ROOM_HEADERS);
  const rows = sheet.getDataRange().getValues();
  const target = scopeKey_(unitId, clinicName);
  return rows.slice(1).some((row) => row[0] && row[1] && isActive_(row[3]) && scopeKey_(row[0], row[1]) === target);
}

function isActive_(value) {
  return value === true || String(value).trim().toLowerCase() === "true" || String(value).trim() === "1";
}

function parseScope_(scope) {
  const text = String(scope || "");
  const splitAt = text.indexOf("::");
  if (splitAt <= 0 || splitAt + 2 >= text.length) throw new Error("รหัสห้องตรวจไม่ถูกต้อง");
  return { unitId: text.slice(0, splitAt).trim(), clinicName: text.slice(splitAt + 2).trim() };
}

function scopeKey_(unitId, clinicName) {
  return `${String(unitId || "").trim()}::${String(clinicName || "").trim()}`;
}

function parseJsonCell_(value, fallback) {
  if (!value) return fallback;
  try { return JSON.parse(String(value)); }
  catch (error) { console.error("ข้อมูล JSON ใน RoomData เสียหาย", error); return fallback; }
}

function openDatabase_() {
  if (!OPD2_CONFIG.SPREADSHEET_ID || OPD2_CONFIG.SPREADSHEET_ID === "PASTE_SPREADSHEET_ID_HERE") {
    throw new Error("ยังไม่ได้ใส่ Spreadsheet ID ใน Code.gs");
  }
  return SpreadsheetApp.openById(OPD2_CONFIG.SPREADSHEET_ID);
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else {
    const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0].map(String);
    if (headers.some((header, index) => existing[index] !== header)) {
      throw new Error(`หัวคอลัมน์ของแท็บ ${name} ไม่ตรงกับที่ระบบต้องใช้`);
    }
  }
  return sheet;
}
