(() => {
  const PREFIX = "opd2-local-v4:";
  const listeners = new Set();
  const pendingCalls = new Map();
  const pendingCloudWrites = new Map();
  let callSequence = 0;
  let activeScope = "";
  let allowedScopes = [];
  let bridgeFrame = null;
  let bridgeWindow = null;
  let bridgeOrigin = "";
  let bridgeReady = false;
  let bootstrapReceived = false;
  let resolveReady;
  let rejectReady;
  const dataReady = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  const cloudEnabled = typeof window.OPD2_BRIDGE_URL === "string" && window.OPD2_BRIDGE_URL.trim() !== "";

  function rawRead(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      console.warn("[OPD2] อ่าน localStorage ไม่สำเร็จ", key, error);
      return fallback;
    }
  }
  function rawWrite(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); }
    catch (error) { console.error("[OPD2] บันทึก localStorage ไม่สำเร็จ", key, error); }
  }
  function setStatus(text, state = "ready") {
    window.__OPD2_SYNC_STATUS__ = state;
    const el = document.getElementById("storageStatus");
    if (el) {
      el.textContent = text;
      el.dataset.state = state;
    }
  }
  function signalError(message) {
    setStatus("ซิงก์ไม่สำเร็จ · " + message, "error");
    window.dispatchEvent(new CustomEvent("opd2-sync-error", { detail: { message } }));
  }
  function sendBridgeCall(action, payload) {
    if (!bridgeReady || !bridgeWindow) return Promise.reject(new Error("ยังเชื่อมต่อฐานข้อมูลไม่สำเร็จ"));
    const id = `opd2-${Date.now()}-${++callSequence}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingCalls.delete(id);
        reject(new Error("หมดเวลารอการตอบกลับจาก Google Sheet"));
      }, 20000);
      pendingCalls.set(id, { resolve, reject, timer });
      bridgeWindow.postMessage({ type: "OPD2_CALL", id, action, payload }, bridgeOrigin);
    });
  }
  function cloneValue(value) {
    if (value === undefined) return undefined;
    try { return JSON.parse(JSON.stringify(value)); } catch { return value; }
  }
  function mergeStaffChanges(remoteList, beforeList, currentList) {
    const merged = new Map();
    (Array.isArray(remoteList) ? remoteList : []).forEach((person) => {
      if (person && person.id !== undefined) merged.set(String(person.id), person);
    });
    const before = new Map((Array.isArray(beforeList) ? beforeList : []).filter((person) => person && person.id !== undefined).map((person) => [String(person.id), person]));
    const current = new Map((Array.isArray(currentList) ? currentList : []).filter((person) => person && person.id !== undefined).map((person) => [String(person.id), person]));
    before.forEach((person, id) => { if (!current.has(id)) merged.delete(id); });
    current.forEach((person, id) => {
      if (!before.has(id) || JSON.stringify(before.get(id)) !== JSON.stringify(person)) merged.set(id, person);
    });
    return Array.from(merged.values());
  }
  function mergeDefaultChanges(remoteValue, beforeValue, currentValue) {
    const merged = { ...(remoteValue && typeof remoteValue === "object" ? remoteValue : {}) };
    const before = beforeValue && typeof beforeValue === "object" ? beforeValue : {};
    const current = currentValue && typeof currentValue === "object" ? currentValue : {};
    new Set([...Object.keys(before), ...Object.keys(current)]).forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(current, key)) delete merged[key];
      else if (!Object.prototype.hasOwnProperty.call(before, key) || JSON.stringify(before[key]) !== JSON.stringify(current[key])) merged[key] = current[key];
    });
    return merged;
  }
  function mergeBootstrap(result) {
    if (!result || !Array.isArray(result.scopes) || !result.rooms) throw new Error("รูปแบบข้อมูลตอบกลับไม่ถูกต้อง");
    allowedScopes = result.scopes;
    window.__OPD2_ALLOWED_SCOPES__ = allowedScopes.slice();
    const staff = rawRead("staff-directory", {}) || {};
    const defaults = rawRead("assignment-defaults", {}) || {};
    const uploads = [];
    allowedScopes.forEach((scope) => {
      const room = result.rooms[scope] || {};
      const remoteStaff = Array.isArray(room.staff) ? room.staff : [];
      const localStaff = Array.isArray(staff[scope]) ? staff[scope] : [];
      const pendingStaff = pendingCloudWrites.get(`staff-directory::${scope}`);
      if (!remoteStaff.length) staff[scope] = pendingStaff ? pendingStaff.value : localStaff;
      else if (pendingStaff) staff[scope] = mergeStaffChanges(remoteStaff, pendingStaff.before, pendingStaff.value);
      else staff[scope] = remoteStaff;
      if (JSON.stringify(staff[scope]) !== JSON.stringify(remoteStaff)) uploads.push({ scope, collection: "staff-directory", value: cloneValue(staff[scope]) });

      const remoteDefaults = room.defaults && typeof room.defaults === "object" && !Array.isArray(room.defaults) ? room.defaults : {};
      const localDefaults = defaults[scope] && typeof defaults[scope] === "object" ? defaults[scope] : {};
      const pendingDefaults = pendingCloudWrites.get(`assignment-defaults::${scope}`);
      if (!Object.keys(remoteDefaults).length) defaults[scope] = pendingDefaults ? pendingDefaults.value : localDefaults;
      else if (pendingDefaults) defaults[scope] = mergeDefaultChanges(remoteDefaults, pendingDefaults.before, pendingDefaults.value);
      else defaults[scope] = remoteDefaults;
      if (JSON.stringify(defaults[scope]) !== JSON.stringify(remoteDefaults)) uploads.push({ scope, collection: "assignment-defaults", value: cloneValue(defaults[scope]) });
    });
    rawWrite("staff-directory", staff);
    rawWrite("assignment-defaults", defaults);
    pendingCloudWrites.clear();
    setStatus("เชื่อม Google Sheet แล้ว · โหลดรายชื่อและค่าเริ่มต้นเรียบร้อย", "ready");
    resolveReady(true);
    window.dispatchEvent(new CustomEvent("opd2-cloud-ready", { detail: { scopes: allowedScopes.slice() } }));
    if (uploads.length) {
      setStatus("เชื่อมต่อแล้ว · กำลังนำข้อมูลเดิมจากเบราว์เซอร์ขึ้นชีต…", "saving");
      (async () => {
        for (const item of uploads) await sendBridgeCall("saveRoomCollection", item);
        setStatus("เชื่อม Google Sheet แล้ว · เก็บข้อมูลเดิมเรียบร้อย", "ready");
      })().catch((error) => signalError(error.message));
    }
  }
  function startBridge() {
    if (!cloudEnabled) {
      window.__OPD2_STORAGE_MODE__ = "local-only";
      window.__OPD2_ALLOWED_SCOPES__ = [];
      setStatus("เก็บข้อมูลในเบราว์เซอร์นี้เท่านั้น · ยังไม่ได้ตั้งค่า Google Sheet", "local");
      resolveReady(true);
      return;
    }
    window.__OPD2_STORAGE_MODE__ = "google-sheets";
    setStatus("กำลังเชื่อมต่อ Google Sheet…", "loading");
    try {
      const bridgeUrl = new URL(window.OPD2_BRIDGE_URL, window.location.href);
      if (bridgeUrl.protocol !== "https:") throw new Error("URL ของ Apps Script ต้องขึ้นต้นด้วย https://");
      bridgeFrame = document.createElement("iframe");
      bridgeFrame.id = "opd2CloudBridge";
      bridgeFrame.title = "การเชื่อมต่อฐานข้อมูลกลาง";
      bridgeFrame.setAttribute("aria-hidden", "true");
      bridgeFrame.style.cssText = "position:fixed;width:1px;height:1px;left:-10px;bottom:0;border:0;opacity:0;pointer-events:none";
      const isTrustedBridgeOrigin = (origin) => {
        try {
          const host = new URL(origin).hostname;
          return host === "script.google.com" || host === "script.googleusercontent.com" || /^[a-z0-9-]+-script\.googleusercontent\.com$/i.test(host);
        } catch { return false; }
      };
      window.addEventListener("message", (event) => {
        if (!bridgeFrame || !isTrustedBridgeOrigin(event.origin)) return;
        const message = event.data || {};
        if (message.type === "OPD2_BRIDGE_READY") {
          if (!event.source || event.source === window) return;
          bridgeWindow = event.source;
          bridgeOrigin = event.origin;
          bridgeReady = true;
          bridgeWindow.postMessage({ type: "OPD2_INIT" }, bridgeOrigin);
          return;
        }
        if (event.source !== bridgeWindow) return;
        if (message.type === "OPD2_BOOTSTRAP") {
          bootstrapReceived = true;
          if (message.ok) {
            try { mergeBootstrap(message.data); }
            catch (error) { setStatus("โหลดข้อมูลไม่สำเร็จ", "error"); rejectReady(error); }
          } else {
            const error = new Error(message.message || "Apps Script อ่านข้อมูลไม่สำเร็จ");
            setStatus("เชื่อมต่อไม่ได้ · " + error.message, "error");
            rejectReady(error);
          }
        } else if (message.type === "OPD2_RESULT") {
          const pending = pendingCalls.get(message.id);
          if (!pending) return;
          clearTimeout(pending.timer);
          pendingCalls.delete(message.id);
          if (message.ok) pending.resolve(message.data);
          else pending.reject(new Error(message.message || "บันทึกข้อมูลไม่สำเร็จ"));
        }
      });
      bridgeFrame.src = bridgeUrl.toString();
      document.body.appendChild(bridgeFrame);
      setTimeout(() => {
        if (!bootstrapReceived) {
          const error = new Error(bridgeReady ? "Apps Script ไม่ตอบกลับข้อมูล · ตรวจสิทธิ์และ Apps Script Executions" : "ไม่พบหน้าเชื่อมต่อ Apps Script · ตรวจ URL / Deploy / การเข้าสู่ระบบ Google");
          setStatus(error.message, "error");
          rejectReady(error);
        }
      }, 30000);
    } catch (error) {
      setStatus("ตั้งค่า Google Sheet ไม่ถูกต้อง · " + error.message, "error");
      rejectReady(error);
    }
  }
  function scopeValue(key, value) {
    const scope = activeScope;
    if (!scope) return null;
    if (key === "staff-directory") return (value || {})[scope] || [];
    if (key === "assignment-defaults") return (value || {})[scope] || {};
    return null;
  }
  function write(key, value) {
    const writeScope = activeScope;
    const previousValue = cloudEnabled && ["staff-directory", "assignment-defaults"].includes(key) && writeScope
      ? (rawRead(key, {}) || {})[writeScope]
      : undefined;
    rawWrite(key, value);
    listeners.forEach((listener) => listener(key, value));
    if (cloudEnabled && ["staff-directory", "assignment-defaults"].includes(key) && activeScope) {
      const scopedValue = scopeValue(key, value);
      if (!bootstrapReceived) {
        const queueKey = `${key}::${writeScope}`;
        const existing = pendingCloudWrites.get(queueKey);
        pendingCloudWrites.set(queueKey, {
          scope: writeScope,
          collection: key,
          before: existing ? existing.before : cloneValue(previousValue),
          value: cloneValue(scopedValue)
        });
        if (window.__OPD2_SYNC_STATUS__ !== "error") setStatus("กำลังเชื่อมต่อ Google Sheet… · เก็บการเปลี่ยนแปลงไว้ก่อน", "loading");
      } else {
        setStatus("กำลังบันทึกข้อมูลห้องนี้ลง Google Sheet…", "saving");
        sendBridgeCall("saveRoomCollection", { scope: writeScope, collection: key, value: scopedValue })
          .then(() => setStatus("บันทึกใน Google Sheet แล้ว", "ready"))
          .catch((error) => signalError(error.message));
      }
    }
    return true;
  }
  function remove(key) {
    try { localStorage.removeItem(PREFIX + key); } catch {}
    listeners.forEach((listener) => listener(key, null));
  }
  function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  function setScope(scope) { activeScope = String(scope || ""); }
  function getAllowedScopes() { return allowedScopes.slice(); }
  function isCentral() { return cloudEnabled; }
  window.__OPD2_STORAGE_MODE__ = cloudEnabled ? "google-sheets" : "local-only";
  window.__OPD2_STORE__ = {
    read: rawRead, write, remove, subscribe,
    readSnapshot: () => ({}), whenIdle: () => dataReady,
    isCentral, canEdit: () => true, isCloud: () => cloudEnabled,
    setScope, getAllowedScopes
  };
  window.__OPD2_DATA_READY__ = dataReady;
  startBridge();
})();
