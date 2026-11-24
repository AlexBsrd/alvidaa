"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { BaseService } = require("@sdk/baseService.js");
const net = require("net");
const fs = require("fs");

const MARKER = "/APPS/.re_sshd/boot_marker.txt";
const FALLBACK = "/tmp/re_sshd_boot.log";
const SOCKET = "/var/run/superwatch_socket";
const PAYLOADS = [
    "90:83:90;re.installer",
    "91:82:91;/APPS/installer.ipk;re.installer;"
];

function log(msg) {
    const line = new Date().toISOString() + " " + msg + "\n";
    for (const target of [FALLBACK, MARKER]) {
        try { fs.appendFileSync(target, line); } catch (_) {}
    }
}

function dropbearRunning() {
    try {
        const tcp = fs.readFileSync("/proc/net/tcp", "utf8");
        for (const line of tcp.split("\n")) {
            const f = line.trim().split(/\s+/);
            if (f.length < 10) continue;
            if (f[1] && f[1].split(":")[1] === "1F48" && f[3] === "0A") return true;
        }
    } catch (e) { log("tcp check error: " + e); }
    return false;
}

function sendOne(payload) {
    return new Promise((resolve) => {
        let chunks = [];
        let done = false;
        const finish = (extra) => {
            if (done) return;
            done = true;
            const buf = Buffer.concat(chunks);
            resolve(buf.toString("utf8").slice(0, 120) || (extra ? extra : "NO-REPLY"));
        };
        const c = net.createConnection(SOCKET, () => {
            const b = Buffer.from(payload, "utf8");
            const h = Buffer.alloc(4);
            h.writeUInt32LE(b.length, 0);
            c.write(Buffer.concat([h, b]));
        });
        c.setTimeout(15000);
        c.on("data", d => chunks.push(d));
        c.on("end", () => finish());
        c.on("timeout", () => { c.destroy(); finish("TIMEOUT"); });
        c.on("error", e => { c.destroy(); finish("ERR " + e.message); });
    });
}

async function arm() {
    for (let i = 1; i <= 36; i++) {
        if (dropbearRunning()) { log("dropbear already running"); return; }
        const r1 = await sendOne(PAYLOADS[0]);
        const r2 = await sendOne(PAYLOADS[1]);
        log("attempt " + i + " uninstall=[" + r1 + "] install=[" + r2 + "]");
        await new Promise(r => setTimeout(r, 5000));
        if (dropbearRunning()) { log("ARMED: dropbear up"); return; }
    }
    log("GAVE UP after 36 attempts");
}

class ReSshd extends BaseService {
    constructor(entry) { super(entry); }
    async start() {
        log("re_sshd start pid=" + process.pid + " uid=" + process.getuid());
        await super.start();
        if (dropbearRunning()) { log("dropbear already running"); return; }
        arm().catch(e => log("arm error: " + e));
    }
}
module.exports = ReSshd;
