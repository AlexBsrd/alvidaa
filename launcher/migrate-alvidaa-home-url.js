"use strict";
const fs = require("fs");
const TARGET = "/APPS/websdk/Appinfo.json";
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
  const out = { selfDeleted, action: "update Alvidaa Home URL", target: TARGET, homeUrl: HOME_URL };
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
    const targets = registry.AppInfo.filter(a => a && a.Id === APP_ID);
    if (targets.length !== 1) throw new Error("expected exactly one vidaa-home entry; leaving the registry untouched");
    out.oldUrl = targets[0].URL;
    if (targets[0].URL === HOME_URL && targets[0].StartCommand === HOME_URL) {
      out.alreadyMigrated = true;
      return out;
    }
    const BACKUP = "/APPS/websdk/Appinfo.json.alvidaa-home.before-ip-update-" +
      Date.now() + ".bak";

    const backupFd = fs.openSync(BACKUP, "wx", 0o600);
    try { fs.writeFileSync(backupFd, original, "utf8"); fs.fsyncSync(backupFd); }
    finally { fs.closeSync(backupFd); }
    backupCreated = true;
    out.backup = BACKUP;

    const updatedEntry = Object.assign({}, targets[0], {
      URL: HOME_URL, StartCommand: HOME_URL,
      IconURL: ICON_URL, Icon_96: ICON_URL, Image: ICON_URL, Thumb: ICON_URL
    });
    const updated = Object.assign({}, registry, {
      AppInfo: registry.AppInfo.map(a => a && a.Id === APP_ID ? updatedEntry : a)
    });
    fs.writeFileSync(TARGET, JSON.stringify(updated), "utf8");

    const readback = parse(fs.readFileSync(TARGET, "utf8"), "written Appinfo.json");
    const verified = readback.AppInfo.filter(a => a && a.Id === APP_ID && a.URL === HOME_URL && a.StartCommand === HOME_URL);
    const preserved = JSON.stringify(readback.AppInfo.filter(a => !a || a.Id !== APP_ID)) === JSON.stringify(registry.AppInfo.filter(a => !a || a.Id !== APP_ID));
    if (verified.length !== 1 || !preserved) throw new Error("readback did not match the planned update; restoring the original registry");
    out.updated = true;
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
