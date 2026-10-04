const UNITS = [
  { id: "u4", name: "หน่วยตรวจที่ 4", clinics: ["OPD 9", "OPD 21", "PCU", "OPD เฉพาะทางนอกเวลา"] },
  { id: "u5", name: "หน่วยตรวจที่ 5", clinics: ["OPD 22", "OPD 23", "OPD 26"] },
  { id: "u7", name: "หน่วยตรวจที่ 7", clinics: ["EID Complex"] },
  { id: "chemo", name: "หน่วยให้ยาเคมีบำบัดผู้ป่วยนอก", clinics: ["ห้องให้ยาเคมีบำบัด", "OPD 24", "OPD 110", "EKG", "ศูนย์สุขใจ"] }
];
const DAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"];
const DAY_SHORT = ["จ", "อ", "พ", "พฤ", "ศ"];
const ROLES = ["RN", "HN", "Incharge", "PN", "HP"];
const ROLE_TASKS = {
  RN: ["คัดกรองผู้ป่วยทั่วไป", "คัดกรองผู้ป่วย ล้อ/เปล", "ตัดกรองผู้ป่วย Fast Tract", "นัด/แนะนำ", "นัดแนะนัด (Online)", "หัตถการ", "Admit", "Nurse Round"],
  HN: ["คัดกรองผู้ป่วยทั่วไป", "คัดกรองผู้ป่วย ล้อ/เปล", "ตัดกรองผู้ป่วย Fast Tract", "นัด/แนะนำ", "นัดแนะนัด (Online)", "หัตถการ", "Admit", "Nurse Round"],
  Incharge: ["คัดกรองผู้ป่วยทั่วไป", "คัดกรองผู้ป่วย ล้อ/เปล", "ตัดกรองผู้ป่วย Fast Tract", "นัด/แนะนำ", "นัดแนะนัด (Online)", "หัตถการ", "Admit", "Nurse Round"],
  PN: ["กดคิว", "วัดสัญญาณชีพ", "Print Sticker/ตาม Lab", "เรีกยกพบแพทย์", "ช่วยหัตถการ", "OK ของ", "ส่ง SMS ผิดนัด"],
  HP: ["กดคิว", "วัดสัญญาณชีพ", "Print Sticker", "เรียกพบแพทย์"]
};
const STATUS_OPTIONS = ["ปฏิบัติงาน", "VAC = ลา", "ประชุม/อบรม", "Float ออก", "ใช้ ชม."];
const BREAK_OPTIONS = ["11.00", "12.00", "12.30", "13.00"];
const LOCATION_OPTIONS = ["-", "ปภ.1", "ปภ.2"];
const FIRE_CODE_OPTIONS = ["C1 สื่อสาร/ประสานงาน", "C2 เคลื่อนย้าย", "C3 ดับเพลิง"];
const CPR_CODE_OPTIONS = ["A ตามแพทย์/ประสานงาน", "P1 ควบคุมสั่งการ", "P2 AED/Defibrillator", "P3 สารน้ำ/ยา/เจาะเลือด", "P4 บันทึก CPR", "P5 ทางเดินหายใจ", "P6 chest compression"];
const FLOAT_OPTIONS = ["08.00-09.00", "09.00-10.00", "10.00-11.00", "11.00-12.00", "13.00-14.00", "14.00-15.00", "15.00-16.00", "กรอกเอง"];
const HOUR_OPTIONS = ["08.00-09.00", "09.00-10.00", "10.00-11.00", "11.00-12.00", "13.00-14.00", "14.00-15.00", "15.00-16.00", "กรอกเอง"];
const STORAGE = { selection: "selection", staff: "staff-directory", plans: "clinic-plans", assignments: "clinic-assignments", defaults: "assignment-defaults" };
const store = window.__OPD2_STORE__;
function migrateOpd110Label() {
  [STORAGE.selection, STORAGE.staff, STORAGE.plans, STORAGE.assignments, STORAGE.defaults].forEach((storageKey) => {
    const data = store.read(storageKey, null);
    if (!data) return;
    if (storageKey === STORAGE.selection) {
      if (data.clinic === "OPD110") { data.clinic = "OPD 110"; store.write(storageKey, data); }
      return;
    }
    const migrated = {};
    Object.entries(data).forEach(([key, value]) => { migrated[key.replaceAll("OPD110", "OPD 110")] = value; });
    if (JSON.stringify(migrated) !== JSON.stringify(data)) store.write(storageKey, migrated);
  });
}
migrateOpd110Label();
let selectedUnitId = store.read(STORAGE.selection, {}).unitId || UNITS[0].id;
let selectedClinic = store.read(STORAGE.selection, {}).clinic || UNITS[0].clinics[0];
let selectedWeek = getDefaultWeek(new Date());
let assignmentDate = dateKey(getDefaultWeek(new Date()));
let lastCalculated = false;
let toastTimer;
let editingStaffId = null;
let editingStaffScopeKey = null;

function esc(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
function clamp(value) { return Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0); }
function currentUnit() { return UNITS.find((unit) => unit.id === selectedUnitId) || UNITS[0]; }
function scopeKey() { return `${selectedUnitId}::${selectedClinic}`; }
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function addDays(date, amount) { const next = new Date(date); next.setDate(next.getDate() + amount); return next; }
function getMonday(date) { const next = new Date(date); next.setHours(0, 0, 0, 0); const day = next.getDay(); next.setDate(next.getDate() - (day === 0 ? 6 : day - 1)); return next; }
function getDefaultWeek(date) { const day = date.getDay(); return getMonday(day === 0 ? addDays(date, 1) : day === 6 ? addDays(date, 2) : date); }
function weekKey() { return dateKey(selectedWeek); }
function toThaiDate(date) { return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear() + 543}`; }
function shortThaiDate(date) { return `${date.getDate()}/${date.getMonth() + 1}/${String(date.getFullYear() + 543).slice(-2)}`; }
function weekLabel(monday) { const friday = addDays(monday, 4); return `${toThaiDate(monday)} – ${toThaiDate(friday)}`; }
function toWeekValue(date) { const thursday = addDays(getMonday(date), 3); const first = new Date(thursday.getFullYear(), 0, 4); const week = 1 + Math.round((thursday - getMonday(first)) / 604800000); return `${thursday.getFullYear()}-W${String(week).padStart(2, "0")}`; }
function mondayFromWeekValue(value) { if (!value) return getMonday(new Date()); const [year, week] = value.split("-W").map(Number); return addDays(getMonday(new Date(year, 0, 4)), (week - 1) * 7); }
function makeDays() { return DAYS.map((label, index) => ({ key: `${weekKey()}-${index}`, label, date: dateKey(addDays(selectedWeek, index)), holiday: false, scheduled: 0, walkIn: 0, outside: 0, forecast: 0 })); }
function plansForScope() { const all = store.read(STORAGE.plans, {}); const key = `${scopeKey()}::${weekKey()}`; if (!all[key]) { all[key] = makeDays(); store.write(STORAGE.plans, all); } all[key] = all[key].map((plan) => { if (plan.scheduled === undefined && plan.walkIn === undefined && plan.outside === undefined) { plan.scheduled = clamp(plan.forecast); plan.walkIn = 0; plan.outside = 0; } plan.scheduled = clamp(plan.scheduled); plan.walkIn = clamp(plan.walkIn); plan.outside = clamp(plan.outside); plan.forecast = plan.scheduled + plan.walkIn + plan.outside; return plan; }); return all[key]; }
function savePlans(plans) { const all = store.read(STORAGE.plans, {}); all[`${scopeKey()}::${weekKey()}`] = plans; store.write(STORAGE.plans, all); }
function staffForScope(key = scopeKey()) { return (store.read(STORAGE.staff, {})[key] || []).map((person) => ({ ...person, tasks: Array.isArray(person.tasks) && person.tasks.length ? person.tasks : defaultTasks(person.role) })); }
function saveStaff(list, key = scopeKey()) { const all = store.read(STORAGE.staff, {}); all[key] = list; store.write(STORAGE.staff, all); }
function defaultTasks(role) { return [{ task: ROLE_TASKS[role]?.[0] || "อื่นๆ", time: "08.00 - 16.00 น." }]; }
function defaultsForScope() { return store.read(STORAGE.defaults, {})[scopeKey()] || {}; }
function saveDefaults(values) { const all = store.read(STORAGE.defaults, {}); all[scopeKey()] = values; store.write(STORAGE.defaults, all); }
function assignmentsForDate(date = assignmentDate) {
  const all = store.read(STORAGE.assignments, {});
  const key = `${scopeKey()}::${date}`;
  const staff = staffForScope();
  const defaults = defaultsForScope();
  const saved = all[key] || {};
  const result = staff.map((source) => {
    const raw = saved[source.id] || defaults[source.id] || source;
    return normalizeAssignment({ ...raw, id: source.id, name: source.name, role: source.role }, source);
  });
  if (!all[key] && staff.length) { all[key] = Object.fromEntries(result.map((person) => [person.id, person])); store.write(STORAGE.assignments, all); }
  return result;
}
function saveAssignments(list, date = assignmentDate) { const all = store.read(STORAGE.assignments, {}); all[`${scopeKey()}::${date}`] = Object.fromEntries(list.map((person) => [person.id, person])); store.write(STORAGE.assignments, all); const defaults = defaultsForScope(); list.forEach((person) => { defaults[person.id] = { ...person }; }); saveDefaults(defaults); }
function normalizeAssignment(person, source) { const next = { id: source.id, name: source.name, role: source.role, status: person.status || "ปฏิบัติงาน", statusValue: person.statusValue || "", break: person.break || "12.00", location: person.location || "-", fireCodes: normalizeCodeValues(person.fireCodes || person.fire, FIRE_CODE_OPTIONS), cprCodes: normalizeCodeValues(person.cprCodes || person.cpr, CPR_CODE_OPTIONS), arrival: person.arrival || "", note: person.note || "", tasks: (person.tasks?.length ? person.tasks : defaultTasks(source.role)).map((task) => ({ task: task.task || "อื่นๆ", time: formatTime(task.time) })) }; if (next.status === "ใช้ ชม." || next.status === "VAC = ลา") next.break = "12.00"; return next; }
function formatTime(value) { const text = String(value || "").trim(); if (!text) return ""; const match = text.replace(/[–—]/g, "-").match(/^(\d{1,2}(?:[.:]\d{1,2})?)\s*-\s*(\d{1,2}(?:[.:]\d{1,2})?)/); if (!match) return text; const normalize = (token) => { const [hour, minute = "00"] = token.replace(":", ".").split("."); return `${String(Number(hour)).padStart(2, "0")}.${String(Number(minute)).padStart(2, "0")}`; }; return `${normalize(match[1])}-${normalize(match[2])} น.`; }
function hoursFromRange(value) { const match = String(value || "").match(/(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})/); if (!match) return 0; let start = Number(match[1]) * 60 + Number(match[2]); let end = Number(match[3]) * 60 + Number(match[4]); if (end < start) end += 1440; return Math.max(0, (end - start) / 60); }
function activityHours(person) { if (person.status === "VAC = ลา") return { leave: 1, hours: 0 }; if (person.status === "ประชุม/อบรม") { const rangeHours = hoursFromRange(person.statusValue); return { leave: 0, hours: rangeHours || clamp(person.statusValue || 1) }; } if (person.status === "Float ออก") return { leave: 0, hours: hoursFromRange(person.statusValue) }; if (person.status === "ใช้ ชม.") { const rangeHours = hoursFromRange(person.statusValue); return { leave: 0, hours: rangeHours || clamp(person.statusValue || 1) }; } return { leave: 0, hours: 0 }; }
function allocationFor(list) { const result = { people: list.length, leave: 0, training: 0, float: 0, useHours: 0, removedHours: 0 }; list.forEach((person) => { const info = activityHours(person); result.leave += info.leave; if (person.status === "ประชุม/อบรม") result.training += info.hours; if (person.status === "Float ออก") result.float += info.hours; if (person.status === "ใช้ ชม.") result.useHours += info.hours; if (person.status !== "VAC = ลา") result.removedHours += info.hours; }); return result; }
function product(plan, list) { if (plan.holiday) return null; const allocation = allocationFor(list); const availablePeople = Math.max(list.length - allocation.leave, 0); const capacity = Math.max(availablePeople * 7 - allocation.removedHours, 1); return Math.round((clamp(plan.forecast) / capacity) * 100); }
function statusOf(value) { if (value === null) return "neutral"; return value > 115 ? "high" : value < 85 ? "low" : "healthy"; }
function statusLabel(value) { return { neutral: "ยังไม่คำนวณ", high: "งานมากกว่าคน", low: "คนมากกว่างาน", healthy: "เหมาะสม" }[value]; }
function productDisplay(value) { if (value === null || value === undefined) return "—"; if (value < 85) return "< 85%"; if (value > 115) return "> 115%"; return "85–115%"; }
function optionHtml(options, value) { return options.map((item) => `<option value="${esc(item)}" ${item === value ? "selected" : ""}>${esc(item)}</option>`).join(""); }
function normalizeCodeValues(value, options) { const source = Array.isArray(value) ? value : String(value || "").split(/\s*(?:·|,|\|)\s*/).filter(Boolean); return [...new Set(source.map((item) => { const token = String(item || "").trim(); return options.find((option) => option === token || option.startsWith(token)) || null; }).filter(Boolean))]; }
function codeToggleHtml(index, field, options, selectedValues) { return options.map((option) => `<button type="button" class="code-toggle ${selectedValues.includes(option) ? "is-active" : ""}" data-code-toggle="${index}" data-code-type="${field}" data-code-value="${esc(option)}" title="${esc(option)}">${esc(option)}</button>`).join(""); }
function statusValueControl(person, index) { if (!["ประชุม/อบรม", "Float ออก", "ใช้ ชม."].includes(person.status)) return ""; const options = person.status === "Float ออก" ? FLOAT_OPTIONS : HOUR_OPTIONS; const isCustom = !options.includes(person.statusValue) || person.statusValue === "กรอกเอง"; return `<div class="status-value"><select data-field="statusValue" data-index="${index}">${optionHtml(options, isCustom ? "กรอกเอง" : person.statusValue)}</select>${isCustom ? `<input data-field="statusCustom" data-index="${index}" value="${esc(person.statusValue === "กรอกเอง" ? "" : person.statusValue)}" placeholder="${person.status === "Float ออก" || person.status === "ประชุม/อบรม" ? "08.00-10.00" : "ชั่วโมง"}" />` : ""}<small>${["Float ออก", "ประชุม/อบรม"].includes(person.status) ? `คำนวณได้ ${activityHours(person).hours} ชม.` : person.status === "ใช้ ชม." ? `คำนวณได้ ${activityHours(person).hours} ชม. · หักจาก Product` : "หักจาก Product"}</small></div>`; }
function statusButtonsHtml(person, index) { return `<div class="status-buttons">${STATUS_OPTIONS.map((status) => `<button type="button" class="status-button ${person.status === status ? "is-active" : ""}" data-field="status" data-value="${esc(status)}" data-index="${index}">${esc(status)}</button>`).join("")}</div>`; }
function statusTaskHtml(person) {
  if (person.status === "ปฏิบัติงาน") return "";
  const info = activityHours(person);
  const detail = person.status === "VAC = ลา" ? "" : person.status === "ประชุม/อบรม" ? ` ${info.hours} ชม.` : person.status === "Float ออก" ? ` ${person.statusValue || ""} (${info.hours} ชม.)` : ` ${person.statusValue || ""} (${info.hours} ชม.)`;
  return `<div class="status-task-line"><span>สถานะ</span><strong>${esc(person.status)}${esc(detail)}</strong></div>`;
}
function tasksHtml(person, index) { const tasks = person.tasks?.length ? person.tasks : defaultTasks(person.role); return tasks.map((item, taskIndex) => { const options = [...(ROLE_TASKS[person.role] || []), "อื่นๆ"]; const custom = !options.includes(item.task); return `<div class="task-line"><span>${taskIndex + 1}.</span><select data-field="task" data-index="${index}" data-task-index="${taskIndex}">${optionHtml(options, custom ? "อื่นๆ" : item.task)}</select>${custom || item.task === "อื่นๆ" ? `<input data-field="customTask" data-index="${index}" data-task-index="${taskIndex}" value="${custom ? esc(item.task) : ""}" placeholder="หน้าที่อื่นๆ" />` : ""}<input data-field="time" data-index="${index}" data-task-index="${taskIndex}" value="${esc(item.time)}" placeholder="เช่น 8-12" aria-label="เวลา${taskIndex + 1}" />${taskIndex ? `<button type="button" class="remove-task" data-index="${index}" data-task-index="${taskIndex}">ลบ</button>` : ""}</div>`; }).join(""); }
function renderSelectors() { const unitSelect = document.getElementById("unitSelect"); unitSelect.innerHTML = UNITS.map((unit) => `<option value="${unit.id}" ${unit.id === selectedUnitId ? "selected" : ""}>${esc(unit.name)}</option>`).join(""); const unit = currentUnit(); if (!unit.clinics.includes(selectedClinic)) selectedClinic = unit.clinics[0]; document.getElementById("clinicSelect").innerHTML = unit.clinics.map((clinic) => `<option ${clinic === selectedClinic ? "selected" : ""}>${esc(clinic)}</option>`).join(""); document.getElementById("selectedScope").textContent = `${unit.name} · ${selectedClinic}`; }
function renderPlanning() { const plans = plansForScope(); document.getElementById("planningRows").innerHTML = plans.map((plan, index) => { const value = product(plan, assignmentsForDate(plan.date)); const status = lastCalculated ? statusOf(value) : "neutral"; return `<div class="table-row planning-row planning-columns ${plan.holiday ? "is-holiday" : ""}"><div class="day-cell"><b class="day-initial">${DAY_SHORT[index]}</b><span class="day-copy"><span class="day-name">${plan.label}</span><small class="day-date">${toThaiDate(new Date(`${plan.date}T00:00:00`))}</small></span></div><div><input class="number-input" data-plan-index="${index}" data-plan-field="scheduled" type="number" min="0" value="${clamp(plan.scheduled)}" /></div><div><input class="number-input" data-plan-index="${index}" data-plan-field="walkIn" type="number" min="0" value="${clamp(plan.walkIn)}" /></div><div><input class="number-input" data-plan-index="${index}" data-plan-field="outside" type="number" min="0" value="${clamp(plan.outside)}" /></div><div class="total-cell">${plan.holiday ? "—" : clamp(plan.forecast)} ราย</div><div><button type="button" class="holiday-button ${plan.holiday ? "is-set" : ""}" data-holiday-index="${index}">${plan.holiday ? "ยกเลิกวันหยุด" : "ตั้งเป็นวันหยุด"}</button><div class="day-status status-${status}">${status === "neutral" ? "ยังไม่คำนวณ" : `Product ${value}% · ${statusLabel(status)}`}</div></div></div>`; }).join(""); document.querySelectorAll("[data-plan-index][data-plan-field]").forEach((input) => input.addEventListener("change", () => { const plans = plansForScope(); const plan = plans[Number(input.dataset.planIndex)]; plan[input.dataset.planField] = clamp(input.value); plan.forecast = clamp(plan.scheduled) + clamp(plan.walkIn) + clamp(plan.outside); savePlans(plans); renderAll(); })); document.querySelectorAll("[data-holiday-index]").forEach((button) => button.addEventListener("click", () => { const plans = plansForScope(); const plan = plans[Number(button.dataset.holidayIndex)]; plan.holiday = !plan.holiday; savePlans(plans); renderAll(); })); }
function renderAssignmentDays() { const plans = plansForScope(); document.getElementById("assignmentDayButtons").innerHTML = plans.map((plan) => `<button type="button" class="assignment-day-button ${plan.date === assignmentDate ? "is-active" : ""} ${plan.holiday ? "is-holiday" : ""}" data-date="${plan.date}"><b>${plan.label}</b><small>${toThaiDate(new Date(`${plan.date}T00:00:00`))}</small></button>`).join(""); document.querySelectorAll("[data-date]").forEach((button) => button.addEventListener("click", () => { saveAssignments(assignmentsForDate()); assignmentDate = button.dataset.date; renderAll(); })); }
function renderAssignments() { renderAssignmentDays(); const list = assignmentsForDate(); document.getElementById("dailyForecast").value = clamp(plansForScope().find((plan) => plan.date === assignmentDate)?.forecast); const container = document.getElementById("assignmentRows"); if (!list.length) { container.innerHTML = `<div class="empty-state">ยังไม่มีเจ้าหน้าที่ในห้องตรวจนี้ กรุณาเพิ่มจากเมนูจัดการเจ้าหน้าที่</div>`; return; } container.innerHTML = list.map((person, index) => `<div class="assignment-row status-${person.status === "ปฏิบัติงาน" ? "work" : person.status === "VAC = ลา" ? "leave" : "activity"}"><div class="assignment-person"><strong>${esc(person.name)}</strong><small>${esc(person.role)}</small></div><div class="activity-cell">${statusButtonsHtml(person, index)}${statusValueControl(person, index)}</div><div><select data-field="break" data-index="${index}" ${["VAC = ลา", "ใช้ ชม."].includes(person.status) ? "disabled" : ""}>${optionHtml(BREAK_OPTIONS, person.break)}</select></div><div class="tasks-cell">${statusTaskHtml(person)}${tasksHtml(person, index)}<button type="button" class="add-task add-task-button" data-index="${index}"><span aria-hidden="true">＋</span> เพิ่มหน้าที่</button></div><div class="location-buttons">${LOCATION_OPTIONS.map((location) => `<button type="button" data-location="${location}" data-index="${index}" class="location-button ${person.location === location ? "is-active" : ""}">${location}</button>`).join("")}</div><div class="code-cell"><div class="code-group"><small>อัคคีภัย</small><div class="code-toggle-list">${codeToggleHtml(index, "fire", FIRE_CODE_OPTIONS, person.fireCodes || [])}</div></div><div class="code-group"><small>CPR</small><div class="code-toggle-list">${codeToggleHtml(index, "cpr", CPR_CODE_OPTIONS, person.cprCodes || [])}</div></div></div><div class="arrival-cell"><input data-field="arrival" data-index="${index}" value="${esc(person.arrival)}" placeholder="เวลาเข้า/เซ็นชื่อ" /><input data-field="note" data-index="${index}" value="${esc(person.note)}" placeholder="หมายเหตุ" /></div></div>`).join(""); document.querySelectorAll("#assignmentRows [data-field]").forEach((element) => element.addEventListener("change", () => updateAssignment(element))); document.querySelectorAll("#assignmentRows [data-field=\"status\"][data-value]").forEach((button) => button.addEventListener("click", () => updateAssignment(button))); document.querySelectorAll("[data-location]").forEach((button) => button.addEventListener("click", () => { const list = assignmentsForDate(); list[Number(button.dataset.index)].location = button.dataset.location; commitAssignments(list); })); document.querySelectorAll("[data-code-toggle]").forEach((button) => button.addEventListener("click", () => { const list = assignmentsForDate(); const person = list[Number(button.dataset.codeToggle)]; const field = button.dataset.codeType; const key = `${field}Codes`; const options = field === "fire" ? FIRE_CODE_OPTIONS : CPR_CODE_OPTIONS; const values = Array.isArray(person[key]) ? [...person[key]] : []; const value = button.dataset.codeValue; person[key] = values.includes(value) ? values.filter((item) => item !== value) : [...values, value]; commitAssignments(list); })); document.querySelectorAll("[data-index][data-task-index]").forEach((element) => element.addEventListener("change", () => updateTask(element))); document.querySelectorAll(".add-task").forEach((button) => button.addEventListener("click", () => { const list = assignmentsForDate(); list[Number(button.dataset.index)].tasks.push({ task: "อื่นๆ", time: "" }); commitAssignments(list); })); document.querySelectorAll(".remove-task").forEach((button) => button.addEventListener("click", () => { const list = assignmentsForDate(); list[Number(button.dataset.index)].tasks.splice(Number(button.dataset.taskIndex), 1); commitAssignments(list); })); }
function updateAssignment(element) { const list = assignmentsForDate(); const person = list[Number(element.dataset.index)]; const field = element.dataset.field; if (field === "status") { person.status = element.value || element.dataset.value; person.statusValue = person.status === "Float ออก" ? FLOAT_OPTIONS[0] : person.status === "ประชุม/อบรม" || person.status === "ใช้ ชม." ? "1" : ""; } else if (field === "statusValue") { person.statusValue = element.value; } else if (field === "statusCustom") { person.statusValue = ["ประชุม/อบรม", "Float ออก", "ใช้ ชม."].includes(person.status) ? formatTime(element.value) : element.value; } else person[field] = element.value; commitAssignments(list); }
function updateTask(element) { const list = assignmentsForDate(); const person = list[Number(element.dataset.index)]; const task = person.tasks[Number(element.dataset.taskIndex)]; if (element.dataset.field === "task") task.task = element.value; if (element.dataset.field === "customTask") task.task = element.value || "อื่นๆ"; if (element.dataset.field === "time") task.time = formatTime(element.value); commitAssignments(list); }
function commitAssignments(list) { saveAssignments(list); renderAll(); }
function resetStaffForm() {
  editingStaffId = null;
  editingStaffScopeKey = null;
  const form = document.getElementById("staffForm");
  if (form) { form.reset(); form.classList.remove("is-editing"); }
  const submitButton = document.getElementById("staffSubmitButton");
  if (submitButton) submitButton.textContent = "+ เพิ่มเจ้าหน้าที่";
  const cancelButton = document.getElementById("cancelStaffEdit");
  if (cancelButton) cancelButton.hidden = true;
}
function startStaffEdit(staffId) {
  const person = staffForScope().find((item) => item.id === staffId);
  if (!person) return;
  editingStaffId = person.id;
  editingStaffScopeKey = scopeKey();
  document.getElementById("staffName").value = person.name;
  document.getElementById("staffRole").value = person.role;
  document.getElementById("staffSubmitButton").textContent = "บันทึกการแก้ไข";
  document.getElementById("cancelStaffEdit").hidden = false;
  document.getElementById("staffForm").classList.add("is-editing");
  document.getElementById("staffForm").scrollIntoView({ behavior: "smooth", block: "center" });
  document.getElementById("staffName").focus({ preventScroll: true });
  showToast(`กำลังแก้ไข ${person.name}`);
}
function renderStaff() {
  if (editingStaffId && editingStaffScopeKey !== scopeKey()) resetStaffForm();
  const list = staffForScope();
  const container = document.getElementById("staffList");
  const cancelButton = document.getElementById("cancelStaffEdit");
  if (cancelButton) cancelButton.onclick = resetStaffForm;
  container.innerHTML = list.length ? list.map((person) => `<div class="staff-item"><div class="staff-item-person"><strong>${esc(person.name)}</strong><span>${esc(person.role)}</span></div><div class="staff-item-actions"><button type="button" class="staff-edit-button" data-edit-staff="${esc(person.id)}" aria-label="แก้ไข ${esc(person.name)}">แก้ไข</button><button type="button" class="staff-delete-button" data-remove-staff="${esc(person.id)}" aria-label="ลบ ${esc(person.name)}">ลบ</button></div></div>`).join("") : `<div class="empty-state">ยังไม่มีเจ้าหน้าที่ในพื้นที่นี้</div>`;
  container.querySelectorAll("[data-edit-staff]").forEach((button) => button.addEventListener("click", () => startStaffEdit(button.dataset.editStaff)));
  container.querySelectorAll("[data-remove-staff]").forEach((button) => button.addEventListener("click", () => {
    if (editingStaffId === button.dataset.removeStaff) resetStaffForm();
    const next = staffForScope().filter((person) => person.id !== button.dataset.removeStaff);
    saveStaff(next);
    renderAll();
    showToast("ลบเจ้าหน้าที่แล้ว");
  }));
}
function renderMetrics() { const plans = plansForScope(); const list = assignmentsForDate(); const active = plans.filter((plan) => !plan.holiday); const products = lastCalculated ? active.map((plan) => product(plan, assignmentsForDate(plan.date))).filter((value) => value !== null) : []; const average = products.length ? Math.round(products.reduce((sum, value) => sum + value, 0) / products.length) : null; document.getElementById("totalDemand").textContent = active.reduce((sum, plan) => sum + clamp(plan.forecast), 0).toLocaleString("th-TH"); document.getElementById("demandDetail").textContent = `${active.length} วันทำการ · ${currentUnit().name}`; document.getElementById("totalStaff").textContent = list.length; document.getElementById("staffDetail").textContent = `${selectedClinic} · RN/HN/Incharge/PN/HP`; document.getElementById("plannedDays").textContent = `${active.length} / 5`; document.getElementById("holidayDetail").textContent = `${plans.length - active.length} วันหยุด`; document.getElementById("averageProduct").textContent = productDisplay(average); if (average === null) { document.getElementById("averageDetail").textContent = "กดคำนวณเพื่อดูภาพรวม"; } else { const healthyDays = products.filter((value) => value >= 85 && value <= 115).length; const highDays = products.filter((value) => value > 115).length; const lowDays = products.filter((value) => value < 85).length; const highLabels = active.filter((plan) => { const value = product(plan, assignmentsForDate(plan.date)); return value !== null && value > 115; }).map((plan) => plan.label).join(", "); const lowLabels = active.filter((plan) => { const value = product(plan, assignmentsForDate(plan.date)); return value !== null && value < 85; }).map((plan) => plan.label).join(", "); const healthyLabels = active.filter((plan) => { const value = product(plan, assignmentsForDate(plan.date)); return value !== null && value >= 85 && value <= 115; }).map((plan) => plan.label).join(", "); document.getElementById("averageDetail").textContent = `เฉลี่ยสัปดาห์ ${average}% · พอดี: ${healthyLabels || "ไม่มี"} · ต้องจัดสรรเพิ่ม (>115%): ${highLabels || "ไม่มี"} · พิจารณาปรับ/โยก (<85%): ${lowLabels || "ไม่มี"}`; } }
function renderAllUnitsSummary() {
  const allAssignments = store.read(STORAGE.assignments, {});
  const allPlans = store.read(STORAGE.plans, {});
  const details = [];
  const roomCard = (unit, clinic) => {
    const key = `${unit.id}::${clinic}`;
    const staff = staffForScope(key);
    const plans = allPlans[`${key}::${weekKey()}`] || makeDays();
    const active = plans.filter((plan) => !plan.holiday);
    const daily = active.map((plan) => ({ plan, list: Object.values(allAssignments[`${key}::${plan.date}`] || {}) }));
    const allPeople = daily.flatMap((day) => day.list);
    const assignedPeople = new Set(allPeople.map((person) => person.id)).size;
    const staffCount = staff.length || assignedPeople;
    const forecast = plans.reduce((sum, plan) => sum + clamp(plan.forecast), 0);
    const products = daily.map(({ plan, list }) => product(plan, list)).filter((value) => value !== null && Number.isFinite(value));
    const averageProduct = products.length ? Math.round(products.reduce((sum, value) => sum + value, 0) / products.length) : null;
    const roleTotals = aggregateRoleStats(daily);
    const weeklyAllocation = daily.reduce((sum, day) => {
      const value = allocationFor(day.list);
      Object.keys(sum).forEach((field) => { sum[field] += value[field] || 0; });
      return sum;
    }, { people: 0, leave: 0, training: 0, float: 0, useHours: 0, removedHours: 0 });
    const index = details.length;
    details.push({ unit, clinic, forecast, staffCount, assignedPeople, averageProduct, weeklyAllocation, roleTotals, activeDays: active.length });
    return `<article class="scope-summary ${key === scopeKey() ? "is-selected" : ""}"><header class="scope-summary-header"><div class="scope-title"><h3>${esc(clinic)}</h3></div><button type="button" class="summary-detail-button" data-summary-index="${index}" aria-expanded="false">Detail <span>＋</span></button></header><div class="scope-summary-metrics"><div class="summary-metric forecast"><b>${forecast.toLocaleString("th-TH")}</b><span>ผู้ป่วยคาดการณ์</span></div><div class="summary-metric staff"><b>${staffCount}</b><span>เจ้าหน้าที่</span></div><div class="summary-metric product"><b>${productDisplay(averageProduct)}</b><span>Product เฉลี่ย${averageProduct === null ? "" : ` · ${averageProduct}%`}</span></div><div class="summary-metric assigned"><b>${assignedPeople}/${staffCount}</b><span>จ่ายงานแล้ว</span></div></div><div class="summary-detail-panel" data-summary-detail="${index}" hidden></div></article>`;
  };
  const html = UNITS.map((unit) => `<section class="unit-summary-group"><header class="unit-summary-header"><span class="unit-summary-kicker">หน่วยตรวจ</span><h3>${esc(unit.name)}</h3><span>${unit.clinics.length} ห้องตรวจในสังกัด</span></header><div class="unit-summary-rooms">${unit.clinics.map((clinic) => roomCard(unit, clinic)).join("")}</div></section>`).join("");
  const container = document.getElementById("allUnitsSummary");
  container.innerHTML = html;
  container.querySelectorAll("[data-summary-index]").forEach((button) => button.addEventListener("click", () => {
    const index = Number(button.dataset.summaryIndex);
    const detail = details[index];
    const panel = container.querySelector(`[data-summary-detail="${index}"]`);
    if (!panel) return;
    if (panel.hidden) {
      const a = detail.weeklyAllocation;
      panel.innerHTML = `<div class="summary-detail-heading"><strong>รายละเอียดการจัดสรร · ${esc(detail.unit.name)} / ${esc(detail.clinic)}</strong><span>${detail.activeDays} วันทำการ</span></div><div class="summary-detail-grid"><div><b>${detail.forecast.toLocaleString("th-TH")}</b><span>ยอดผู้ป่วยคาดการณ์</span></div><div><b>${detail.staffCount}</b><span>กำลังคนทั้งหมด</span></div><div><b>${detail.assignedPeople}/${detail.staffCount}</b><span>จ่ายงานแล้ว / ทั้งหมด</span></div><div class="detail-role-block"><strong>Nurse</strong><span>ลา <b>${detail.roleTotals.nurse.leave} คน</b></span><span>อ/ป <b>${detail.roleTotals.nurse.training} ชม.</b></span><span>Float <b>${detail.roleTotals.nurse.float} ชม.</b></span><span>ใช้ ชม. <b>${detail.roleTotals.nurse.useHours} ชม.</b></span></div><div class="detail-role-block"><strong>PN</strong><span>ลา <b>${detail.roleTotals.pn.leave} คน</b></span><span>อ/ป <b>${detail.roleTotals.pn.training} ชม.</b></span><span>Float <b>${detail.roleTotals.pn.float} ชม.</b></span><span>ใช้ ชม. <b>${detail.roleTotals.pn.useHours} ชม.</b></span></div><div class="detail-role-block"><strong>HP</strong><span>ลา <b>${detail.roleTotals.hp.leave} คน</b></span><span>อ/ป <b>${detail.roleTotals.hp.training} ชม.</b></span><span>Float <b>${detail.roleTotals.hp.float} ชม.</b></span><span>ใช้ ชม. <b>${detail.roleTotals.hp.useHours} ชม.</b></span></div><div><b>${productDisplay(detail.averageProduct)}</b><span>Product เฉลี่ย</span></div><div><b>${a.removedHours}</b><span>ชม. หักจาก Product</span></div></div><div class="summary-detail-footnote">Product ยังคงใช้สูตรต้นฉบับเป็นค่า Default</div>`;
      panel.hidden = false; button.setAttribute("aria-expanded", "true"); button.innerHTML = "ปิด Detail <span>−</span>";
    } else { panel.hidden = true; button.setAttribute("aria-expanded", "false"); button.innerHTML = "Detail <span>＋</span>"; }
  }));
}
function allocationRole(role) { return ["RN", "HN", "Incharge"].includes(role) ? "nurse" : role === "PN" ? "pn" : "hp"; }
function roleAllocation(list, role) { return allocationFor(list.filter((person) => allocationRole(person.role) === role)); }
function allocationRoleCell(list, role) { const value = roleAllocation(list, role); return `<div class="allocation-role-cell role-${role}"><strong>${role === "nurse" ? "Nurse" : role.toUpperCase()}</strong><span><em>ลา</em><b>${value.leave} คน</b></span><span><em>อ/ป</em><b>${value.training} ชม.</b></span><span><em>Float</em><b>${value.float} ชม.</b></span><span><em>ใช้ ชม.</em><b>${value.useHours} ชม.</b></span></div>`; }
function aggregateRoleStats(daily) { return ["nurse", "pn", "hp"].reduce((result, role) => { result[role] = daily.reduce((sum, day) => { const value = roleAllocation(day.list, role); Object.keys(sum).forEach((field) => { sum[field] += value[field] || 0; }); return sum; }, { people: 0, leave: 0, training: 0, float: 0, useHours: 0, removedHours: 0 }); return result; }, {}); }
function renderAllocation() { const list = assignmentsForDate(); const allocation = allocationFor(list); const rows = plansForScope().map((plan) => { const dayList = assignmentsForDate(plan.date); return `<div class="table-row staffing-row staffing-columns ${plan.holiday ? "is-holiday" : ""}"><div class="allocation-day"><b>${esc(plan.label)}</b><small>${toThaiDate(new Date(`${plan.date}T00:00:00`))}</small></div>${allocationRoleCell(dayList, "nurse")}${allocationRoleCell(dayList, "pn")}${allocationRoleCell(dayList, "hp")}</div>`; }).join(""); document.getElementById("staffingRows").innerHTML = rows; document.getElementById("allocationSummary").innerHTML = `<div class="allocation-kpi"><b>${allocation.people}</b><span>คนที่จ่ายงาน</span></div><div class="allocation-kpi"><b>${allocation.leave}</b><span>คนลา</span></div><div class="allocation-kpi"><b>${allocation.training}</b><span>ชม. ประชุม/อบรม</span></div><div class="allocation-kpi"><b>${allocation.float}</b><span>ชม. Float ออก</span></div><div class="allocation-kpi"><b>${allocation.useHours}</b><span>ชม. ใช้ ชม.</span></div><div class="allocation-kpi emphasis"><b>${allocation.removedHours}</b><span>ชม. หักจาก Product</span></div>`; }
function renderAll() { renderSelectors(); document.getElementById("weekLabel").textContent = weekLabel(selectedWeek); document.getElementById("weekInput")?.setAttribute("value", toWeekValue(selectedWeek)); renderPlanning(); renderAssignments(); renderStaff(); renderAllocation(); renderMetrics(); renderAllUnitsSummary(); }
function addStaff(event) {
  event.preventDefault();
  const name = document.getElementById("staffName").value.trim();
  const role = document.getElementById("staffRole").value;
  if (!name) return;
  const list = staffForScope();
  if (editingStaffId) {
    if (editingStaffScopeKey !== scopeKey()) {
      resetStaffForm();
      renderAll();
      showToast("พื้นที่เปลี่ยนแล้ว กรุณาเลือกเจ้าหน้าที่ใหม่");
      return;
    }
    const index = list.findIndex((person) => person.id === editingStaffId);
    if (index < 0) {
      resetStaffForm();
      renderAll();
      showToast("ไม่พบเจ้าหน้าที่ กรุณาลองใหม่");
      return;
    }
    const previous = list[index];
    list[index] = { ...previous, name, role };
    if (previous.role !== role) list[index].tasks = defaultTasks(role);
    saveStaff(list);
    resetStaffForm();
    renderAll();
    showToast(`แก้ไขข้อมูล ${name} แล้ว`);
    return;
  }
  list.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, role, tasks: defaultTasks(role) });
  saveStaff(list);
  resetStaffForm();
  renderAll();
  showToast(`เพิ่ม ${name} แล้ว`);
}
function resetWeek() { const all = store.read(STORAGE.plans, {}); delete all[`${scopeKey()}::${weekKey()}`]; store.write(STORAGE.plans, all); Object.keys(store.read(STORAGE.assignments, {})).filter((key) => key.startsWith(`${scopeKey()}::`)).forEach(() => {}); lastCalculated = false; renderAll(); showToast("รีเซ็ตแผนสัปดาห์นี้แล้ว"); }
function resetAll() { if (!window.confirm("ต้องการล้างข้อมูล local ทั้งหมดหรือไม่?")) return; Object.values(STORAGE).forEach((key) => store.remove(key)); location.reload(); }
function showToast(message) { const toast = document.getElementById("toast"); toast.textContent = message; toast.classList.add("is-visible"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600); }
function calculate() { lastCalculated = true; renderAll(); document.getElementById("allocation").scrollIntoView({ behavior: "smooth", block: "start" }); }
function pdfStatusHtml(person) { const info = activityHours(person); const value = person.status === "Float ออก" || person.status === "ใช้ ชม." ? ` ${formatTime(person.statusValue || "")} (${info.hours} ชม.)` : person.status === "ประชุม/อบรม" ? ` ${info.hours} ชม.` : ""; const className = person.status === "ปฏิบัติงาน" ? "activity-pill-work" : person.status === "VAC = ลา" ? "activity-pill-leave" : person.status === "ประชุม/อบรม" ? "activity-pill-training" : person.status === "Float ออก" ? "activity-pill-float" : "activity-pill-use"; return `<span class="status-pill ${className}">${esc(person.status)}${value}</span>`; }
function pdfTaskHtml(person) { return (person.tasks || []).map((task, index) => `<span class="pdf-task-line">${index + 1}. ${esc(task.task)} ${esc(formatTime(task.time))}</span>`).join(""); }
function pdfDayHtml(plan, list) { const rows = list.map((person) => { const rowClass = person.status === "VAC = ลา" ? "leave-row" : person.status === "ประชุม/อบรม" ? "training-row" : person.status === "ใช้ ชม." ? "collect-row" : person.status === "Float ออก" ? "float-row" : ""; return `<tr class="${rowClass}"><td><b>${esc(person.name)}</b><br><small>${esc(person.role)}</small></td><td>${pdfStatusHtml(person)}<br>พัก ${esc(person.break)} น.</td><td>${pdfTaskHtml(person)}</td><td>${esc(person.location || "-")}</td><td><strong>อัคคีภัย</strong><br>${esc((person.fireCodes || []).join(" · ") || "—")}<br><strong>CPR</strong><br>${esc((person.cprCodes || []).join(" · ") || "—")}</td><td>${esc(person.arrival || "")}${person.note ? `<br>${esc(person.note)}` : ""}</td></tr>`; }).join(""); const a=allocationFor(list); const nurse=roleAllocation(list,"nurse"); const pn=roleAllocation(list,"pn"); const hp=roleAllocation(list,"hp"); const forecast=clamp(plan.forecast); const value=product(plan,list); const productText=value === null ? "—" : `${value}% · ${productDisplay(value)}`; const productClass=value !== null && value > 115 ? "pdf-product-high" : value !== null && value < 85 ? "pdf-product-low" : "pdf-product-ok"; const roleSummary=(label,subtitle,data,extraClass) => `<div class="pdf-role-summary ${extraClass}"><strong>${label}<small>${subtitle}</small></strong><span>ลา <b>${data.leave} คน</b></span><span>อบรม/ประชุม <b>${data.training} ชม.</b></span><span>Float <b>${data.float} ชม.</b></span><span>ใช้ ชม. <b>${data.useHours} ชม.</b></span></div>`; return `<section class="print-day"><div class="print-day-head"><div><div class="print-day-kicker">DAILY WORKFORCE ALLOCATION</div><h2>${esc(plan.label)} · ${shortThaiDate(new Date(`${plan.date}T00:00:00`))}</h2><p>ตารางจ่ายงานบุคลากรประจำวัน · ${esc(selectedClinic)}</p></div><div class="print-day-kpis"><span><b>${forecast}</b>ผู้ป่วยคาดการณ์</span><span class="${productClass}"><b>${productText}</b>Product จริง</span></div></div><div class="print-workforce-summary"><div class="pdf-role-summary-title">การจัดสรรสถานะรายตำแหน่ง</div>${roleSummary("NURSE","HN / Incharge / RN",nurse,"role-nurse")}${roleSummary("PN","ผู้ช่วยพยาบาล",pn,"role-pn")}${roleSummary("HP","ผู้ช่วย",hp,"role-hp")}<span class="summary-chip removed">หักจาก Product <b>${a.removedHours} ชม.</b></span></div><table><thead><tr><th>ชื่อ / ตำแหน่ง</th><th>กิจกรรม / พัก</th><th>หน้าที่ / เวลา</th><th>ปภ.1/2</th><th>Code อัคคีภัย / CPR</th><th>เวลามา / เซ็นชื่อ / หมายเหตุ</th></tr></thead><tbody>${rows || `<tr><td colspan="6">ยังไม่มีเจ้าหน้าที่</td></tr>`}</tbody></table></section>`; }
async function generateWeeklyPdf() { const PdfConstructor = window.jspdf?.jsPDF; if (typeof html2canvas !== "function" || typeof PdfConstructor !== "function") { showToast("ไม่พบส่วนสร้าง PDF กรุณาตรวจสอบไฟล์ PDF ในโปรเจกต์"); return; } const activePlans=plansForScope().filter((plan)=>!plan.holiday); if(!activePlans.length){showToast("สัปดาห์นี้ไม่มีวันทำการให้สร้าง PDF");return;} saveAssignments(assignmentsForDate()); const pdf=new PdfConstructor({unit:"mm",format:"a4",orientation:"portrait",compress:true}); const host=document.createElement("div"); host.className="download-pdf-host"; Object.assign(host.style,{position:"absolute",left:"0",top:"0",width:"190mm",background:"#fff",zIndex:"9999"}); document.body.appendChild(host); showToast("กำลังสร้างไฟล์ PDF A4…"); try { for (let i=0;i<activePlans.length;i+=1){ if(i) pdf.addPage("a4","portrait"); const plan=activePlans[i]; host.innerHTML=`<div class="print-schedule weekly-print download-pdf"><div class="print-cover"><div><h1>ตารางจ่ายงานรายสัปดาห์</h1><p>${shortThaiDate(selectedWeek)} - ${shortThaiDate(addDays(selectedWeek, 4))} · Multi Clinic Workforce Management</p><p>Product จริงรายวัน · สรุปลา อบรม/ประชุม ใช้ ชม. และ Float ออก</p></div><div class="print-kpis"><div class="print-kpi"><b>${activePlans.length}</b><span>วันทำการ</span></div><div class="print-kpi"><b>${activePlans.reduce((sum,item)=>sum+clamp(item.forecast),0)}</b><span>ผู้ป่วยคาดการณ์</span></div><div class="print-kpi"><b>${staffForScope().length}</b><span>บุคลากร</span></div></div></div>${pdfDayHtml(plan,assignmentsForDate(plan.date))}<div class="print-code-legend"><strong>คำอธิบาย Code และสถานที่</strong><br>C1 สื่อสาร/ประสานงาน · C2 เคลื่อนย้าย · C3 ดับเพลิง<br>P1 ควบคุมสั่งการ · P2 AED/Defibrillator · P3 สารน้ำ/ยา/เจาะเลือด · P4 บันทึก CPR · P5 ทางเดินหายใจ · P6 chest compression<br>A ตามแพทย์/ประสานงาน: RR team โทร 38799 · ER โทร 36333 · เปล/เคลื่อนย้าย โทร 35692–35693</div></div>`; await new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve))); const report=host.firstElementChild; const canvas=await html2canvas(report,{scale:1.5,useCORS:true,backgroundColor:"#fff",logging:false,width:report.scrollWidth,windowWidth:report.scrollWidth}); const image=canvas.toDataURL("image/jpeg",.96); const margin=7, contentWidth=196, contentHeight=283, scale=Math.min(contentWidth/canvas.width,contentHeight/canvas.height); pdf.addImage(image, "JPEG", margin+(contentWidth-canvas.width*scale)/2, margin, canvas.width*scale, canvas.height*scale, undefined, "FAST"); } pdf.save(`ตารางจ่ายงาน ${selectedClinic} วันที่ ${shortThaiDate(selectedWeek)} - ${shortThaiDate(addDays(selectedWeek, 4))}.pdf`); showToast("ดาวน์โหลดไฟล์ PDF เรียบร้อยแล้ว"); } catch(error){console.error(error);showToast("สร้าง PDF ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");} finally{host.remove();} }
function bindEvents() { document.querySelectorAll("[data-scroll]").forEach((button) => button.addEventListener("click", () => { document.getElementById(button.dataset.scroll)?.scrollIntoView({ behavior: "smooth" }); document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item === button)); })); document.getElementById("unitSelect").addEventListener("change", (event) => { selectedUnitId = event.target.value; selectedClinic = currentUnit().clinics[0]; store.write(STORAGE.selection, { unitId: selectedUnitId, clinic: selectedClinic }); renderAll(); }); document.getElementById("clinicSelect").addEventListener("change", (event) => { selectedClinic = event.target.value; store.write(STORAGE.selection, { unitId: selectedUnitId, clinic: selectedClinic }); renderAll(); }); document.getElementById("staffForm").addEventListener("submit", addStaff); document.getElementById("dailyForecast").addEventListener("change", (event) => { const plans = plansForScope(); const plan = plans.find((item) => item.date === assignmentDate); if (plan) { plan.scheduled = clamp(event.target.value); plan.walkIn = 0; plan.outside = 0; plan.forecast = plan.scheduled; savePlans(plans); renderAll(); } }); document.getElementById("applyDefaultAssignments").addEventListener("click", () => { const list = assignmentsForDate().map((person) => ({ ...person, ...(defaultsForScope()[person.id] || {}) })); saveAssignments(list); renderAll(); showToast("ใช้ Default แล้ว"); }); document.getElementById("calculateButton").addEventListener("click", calculate); document.getElementById("resetWeek").addEventListener("click", resetWeek); document.getElementById("resetAll").addEventListener("click", resetAll); document.getElementById("generatePdfButton").addEventListener("click", generateWeeklyPdf); document.getElementById("weekButton").addEventListener("click", () => { const picker = document.getElementById("weekPicker"); picker.hidden = !picker.hidden; }); document.getElementById("weekInput").addEventListener("change", (event) => { selectedWeek = mondayFromWeekValue(event.target.value); assignmentDate = dateKey(selectedWeek); lastCalculated = false; renderAll(); document.getElementById("weekPicker").hidden = true; }); document.getElementById("previousWeek").addEventListener("click", () => { selectedWeek = addDays(selectedWeek, -7); assignmentDate = dateKey(selectedWeek); lastCalculated = false; renderAll(); }); document.getElementById("nextWeek").addEventListener("click", () => { selectedWeek = addDays(selectedWeek, 7); assignmentDate = dateKey(selectedWeek); lastCalculated = false; renderAll(); }); window.addEventListener("storage", (event) => { if (event.key?.startsWith("opd2-local-v4:")) renderAll(); }); }
function updateClock() { document.getElementById("liveClock").textContent = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()); }
bindEvents(); updateClock(); setInterval(updateClock, 30000); renderAll();

function renderOriginalRecords() {
  const records = store.read("weekly-records", []);
  const container = document.getElementById("recordsList");
  if (!container) return;
  container.innerHTML = records.length ? records.slice().reverse().map((record) => `<article class="record-item"><strong>${esc(record.week)}</strong><span>${esc(record.scope)} · ${record.staff} คน · ผู้ป่วยคาดการณ์ ${record.forecast} ราย</span></article>`).join("") : `<div class="empty-state">ยังไม่มีบันทึกข้อมูลรายสัปดาห์</div>`;
}
function saveOriginalRecord() {
  const plans = plansForScope();
  const records = store.read("weekly-records", []);
  records.push({ week: weekLabel(selectedWeek), scope: `${currentUnit().name} · ${selectedClinic}`, staff: staffForScope().length, forecast: plans.reduce((sum, plan) => sum + clamp(plan.forecast), 0), savedAt: new Date().toISOString() });
  store.write("weekly-records", records.slice(-20));
  renderOriginalRecords();
  showToast("บันทึกสัปดาห์นี้แล้ว");
}
function openOriginalReport() {
  const modal = document.getElementById("reportModal");
  if (!modal) return;
  const plans = plansForScope();
  const values = plans.filter((plan) => !plan.holiday).map((plan) => product(plan, assignmentsForDate(plan.date))).filter((value) => value !== null);
  const average = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  document.getElementById("reportSummary").textContent = `${currentUnit().name} · ${selectedClinic} · ${weekLabel(selectedWeek)}`;
  document.getElementById("reportAverage").textContent = productDisplay(average);
  document.getElementById("reportHealthy").textContent = `${values.filter((value) => value >= 85 && value <= 115).length} วัน`;
  document.getElementById("reportAlerts").textContent = `${values.filter((value) => value < 85 || value > 115).length} วัน`;
  document.getElementById("reportList").innerHTML = values.length ? values.map((value, index) => `<div class="report-row report-${statusOf(value)}"><span>${DAYS[index]}</span><strong>${value}% · ${statusLabel(statusOf(value))}</strong></div>`).join("") : `<div class="empty-state">ยังไม่มีข้อมูลสำหรับสร้างรายงาน</div>`;
  modal.hidden = false;
}
document.getElementById("saveRecord")?.addEventListener("click", saveOriginalRecord);
document.getElementById("viewReport")?.addEventListener("click", openOriginalReport);
document.getElementById("closeModal")?.addEventListener("click", () => { document.getElementById("reportModal").hidden = true; });
document.getElementById("dismissReport")?.addEventListener("click", () => { document.getElementById("reportModal").hidden = true; });
renderOriginalRecords();
