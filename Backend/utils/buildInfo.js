'use strict';

// Which code is this process running? The FTP deploy writes BUILD_INFO.json
// (commit + time) next to index.js; local runs have none. Read once at boot,
// so a process that outlived a deploy keeps reporting its OLD commit — that's
// exactly what makes a stale process easy to spot in /api/health and alerts.
const os = require('os');
let info = { sha: 'local', builtAt: null };
try { info = { ...info, ...require('../BUILD_INFO.json') }; } catch (_) { /* not a deployed build */ }

// Process start = now − uptime, so it's right even though this module is
// first loaded lazily (on the first /api/health call or alert).
const startedAt = new Date(Date.now() - process.uptime() * 1000);

function buildInfo() {
  return {
    sha: String(info.sha || 'local').slice(0, 8),
    builtAt: info.builtAt || null,
    startedAt: startedAt.toISOString(),
    pid: process.pid,
    host: os.hostname(),
  };
}

// One line for alerts: "build 1a2b3c4d · pid 1234 · up 3h 12m".
function buildLine() {
  const b = buildInfo();
  const mins = Math.floor(process.uptime() / 60);
  const up = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  return `build ${b.sha} · pid ${b.pid} · up ${up}`;
}

module.exports = { buildInfo, buildLine };
