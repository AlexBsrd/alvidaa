"use strict";
const fs = require("fs");
const TARGET = "/APPS/websdk/Appinfo.json";
const BACKUP = "/APPS/websdk/Appinfo.json.alvidaa-home.bak";
const APP_ID = "vidaa-home";
const SOURCE = __filename;
let selfDeleted = false;
try { fs.unlinkSync(SOURCE); selfDeleted = !fs.existsSync(SOURCE); } catch (e) { selfDeleted = "ERR:" + e.code; }
function parse(raw) { const value = JSON.parse(raw); if (!value || !Array.isArray(value.AppInfo)) throw new Error("Appinfo.json lacks AppInfo array"); return value; }
module.exports = async function () {
  const out = { selfDeleted, uid: process.getuid?.(), action: "remove Alvidaa Home app entry", target: TARGET };
  try {
    const st = fs.statSync(TARGET);
    if (!st.isFile() || st.uid !== 314 || st.gid !== 902 || (st.mode & 0o777) !== 0o664) throw new Error("registry metadata changed; refusing to write");
    const currentRaw = fs.readFileSync(TARGET, "utf8"), current = parse(currentRaw);
    const matching = current.AppInfo.filter(a => a && a.Id === APP_ID);
    if (!matching.length) { out.alreadyRemoved = true; return out; }
    if (matching.length !== 1) throw new Error("multiple vidaa-home entries found; leaving them untouched");
    out.removedUrl = matching[0].URL;
    let originalRaw = null, backup = null;
    try { originalRaw = fs.readFileSync(BACKUP, "utf8"); backup = parse(originalRaw); }
    catch (e) { if (e.code !== "ENOENT") throw e; }
    const kept = current.AppInfo.filter(a => !a || a.Id !== APP_ID);
    const after = Object.assign({}, current, { AppInfo: kept });
    const canRestoreExact = backup && JSON.stringify(after) === JSON.stringify(backup);
    fs.writeFileSync(TARGET, canRestoreExact ? originalRaw : JSON.stringify(after), "utf8");
    const verified = parse(fs.readFileSync(TARGET, "utf8"));
    if (verified.AppInfo.some(a => a && a.Id === APP_ID)) throw new Error("readback still contains vidaa-home");
    out.removed = true;
    out.restoredExactBackup = !!canRestoreExact;
    out.backupRetainedForRecovery = !!backup && !canRestoreExact;
    if (canRestoreExact) { fs.unlinkSync(BACKUP); out.backupRemoved = !fs.existsSync(BACKUP); }
    out.appCount = verified.AppInfo.length;
  } catch (e) { out.error = e.code || String(e); }
  return out;
};
