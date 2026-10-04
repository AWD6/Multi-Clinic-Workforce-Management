(() => {
  const PREFIX = "opd2-local-v4:";
  const listeners = new Set();
  function read(key, fallback = null) {
    try { const raw = localStorage.getItem(PREFIX + key); return raw === null ? fallback : JSON.parse(raw); }
    catch (error) { console.warn("[OPD2] อ่าน localStorage ไม่สำเร็จ", key, error); return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (error) { console.error("[OPD2] บันทึก localStorage ไม่สำเร็จ", key, error); }
    listeners.forEach((listener) => listener(key, value));
    return true;
  }
  function remove(key) { try { localStorage.removeItem(PREFIX + key); } catch {} listeners.forEach((listener) => listener(key, null)); }
  function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  window.__OPD2_STORAGE_MODE__ = "local-only";
  window.__OPD2_STORE__ = { read, write, remove, subscribe, readSnapshot: () => ({}), whenIdle: () => Promise.resolve(), isCentral: () => false, canEdit: () => true, isCloud: () => false };
  window.__OPD2_DATA_READY__ = Promise.resolve();
})();
