"use strict";
const fs = require("fs");
const TARGET = "/APPS/websdk/Appinfo.json";
const BACKUP = "/APPS/websdk/Appinfo.json.alvidaa-home.bak";
const APP_ID = "vidaa-home";
const SOURCE = __filename;
let selfDeleted = false;
try { fs.unlinkSync(SOURCE); selfDeleted = !fs.existsSync(SOURCE); } catch (e) { selfDeleted = "ERR:" + e.code; }

function parse(raw, label) {
  const value = JSON.parse(raw);
  if (!value || !Array.isArray(value.AppInfo)) throw new Error(label + " does not contain an AppInfo array");
  return value;
}

module.exports = async function (args) {
  const HOME_URL = args && args.homeUrl;
  const out = { selfDeleted, uid: process.getuid?.(), action: "add Alvidaa Home app entry", target: TARGET, homeUrl: HOME_URL };
  if (typeof HOME_URL !== "string" || !/^https?:\/\/[^/]+\/$/.test(HOME_URL)) {
    out.error = "configured Home URL is missing or invalid";
    return out;
  }
  const ICON_URL = HOME_URL + "icon.png";
  let original, backupCreated = false;
  try {
    const st = fs.statSync(TARGET);
    out.targetMetadata = { uid: st.uid, gid: st.gid, mode: (st.mode & 0o777).toString(8), bytes: st.size };
    if (!st.isFile() || st.uid !== 314 || st.gid !== 902 || (st.mode & 0o777) !== 0o664) {
      throw new Error("registry metadata changed since preflight; refusing to write");
    }
    original = fs.readFileSync(TARGET, "utf8");
    const registry = parse(original, "Appinfo.json");
    const targetEntries = registry.AppInfo.filter(a => a && a.Id === APP_ID);
    if (targetEntries.length) {
      out.alreadyInstalled = targetEntries.some(a => a.URL === HOME_URL && a.StartCommand === HOME_URL);
      if (out.alreadyInstalled) return out;
      throw new Error("an existing vidaa-home entry points elsewhere; leaving it untouched");
    }
    const conflictingHome = registry.AppInfo.filter(a => a && (a.AppName === "Home" || a.Title === "Home"));
    if (conflictingHome.length) {
      out.conflictingHomeIds = conflictingHome.map(a => ({ Id: a.Id, URL: a.URL }));
      throw new Error("another Home tile exists; refusing to create a duplicate");
    }
    if (fs.existsSync(BACKUP)) throw new Error("backup path already exists; refusing to overwrite it");

    const entry = {
      Id: APP_ID, AppName: "Home", Title: "Home",
      URL: HOME_URL, StartCommand: HOME_URL,
      IconURL: ICON_URL, Icon_96: ICON_URL, Image: ICON_URL, Thumb: ICON_URL,
      Type: "Browser", InstallTime: new Date().toISOString().slice(0, 10),
      RunTimes: 0, StoreType: "custom", PreInstall: false
    };
    const updated = Object.assign({}, registry, { AppInfo: registry.AppInfo.concat([entry]) });
    const backupFd = fs.openSync(BACKUP, "wx", 0o600);
    try { fs.writeFileSync(backupFd, original, "utf8"); fs.fsyncSync(backupFd); }
    finally { fs.closeSync(backupFd); }
    backupCreated = true;
    out.backup = BACKUP;

    fs.writeFileSync(TARGET, JSON.stringify(updated), "utf8");
    const readback = parse(fs.readFileSync(TARGET, "utf8"), "written Appinfo.json");
    const verified = readback.AppInfo.filter(a => a && a.Id === APP_ID && a.URL === HOME_URL && a.StartCommand === HOME_URL);
    const preservedRegistry = Object.assign({}, readback, { AppInfo: readback.AppInfo.filter(a => !a || a.Id !== APP_ID) });
    const preserved = JSON.stringify(preservedRegistry) === JSON.stringify(registry);
    if (verified.length !== 1 || !preserved) throw new Error("readback did not match the planned entry; restoring the original registry");
    out.installed = true;
    out.entry = verified[0];
    out.appCount = readback.AppInfo.length;
    out.metadataAfter = { uid: fs.statSync(TARGET).uid, gid: fs.statSync(TARGET).gid, mode: (fs.statSync(TARGET).mode & 0o777).toString(8) };
  } catch (e) {
    out.error = e.code || String(e);
    if (original !== undefined && backupCreated) {
      try {
        fs.writeFileSync(TARGET, original, "utf8");
        out.rollbackAfterError = fs.readFileSync(TARGET, "utf8") === original ? "restored" : "readback mismatch";
      } catch (restoreError) { out.rollbackAfterError = restoreError.code || String(restoreError); }
    }
  }
  return out;
};
