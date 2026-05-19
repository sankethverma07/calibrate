// ═════════════════════════════════════════════════════════════════════
// Calibrate · Structured logger + crash capture
//
// © 2026 Sanketh Verma <sankethverma07@gmail.com>
// Licensed under MIT.
// ═════════════════════════════════════════════════════════════════════
//
// Why this exists
// ───────────────
// Calibrate is a privacy-first local app, so we do NOT ship a hosted
// telemetry pipeline (no Sentry, no Datadog, no remote crash reporter).
// But "no remote service" doesn't mean "no logs": when a user files an
// issue, we want them to be able to attach a clean, structured log file
// instead of pasting a Notepad screenshot of a console error.
//
// What this module does
// ─────────────────────
// • Writes one JSON-line per log call to  userData/logs/calibrate.log
//   (timestamp · level · scope · message · meta). Easy to grep, easy to
//   feed into jq, easy to attach to a GitHub issue.
// • Rotates the active log when it grows past MAX_BYTES; keeps MAX_FILES
//   historical files (calibrate.log.1, .2, …) and drops the oldest. No
//   unbounded growth on a laptop's SSD.
// • Captures `uncaughtException` and `unhandledRejection` in the main
//   process so a crashing IPC handler doesn't disappear into the void.
// • Exposes IPC channel  log:write  so the renderer (the React UI in
//   dist/public/index.html) can emit structured logs through the same
//   pipeline via window.moodBridge.log.{info,warn,error}.
//
// What this module deliberately does NOT do
// ─────────────────────────────────────────
// • Ship logs off the device.
// • Persist PII. Callers are responsible for not putting emails / file
//   paths / arbitrary user input into the `meta` object.
// ═════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');

// ── Rotation policy ────────────────────────────────────────────────────
// Keep the on-disk footprint tiny by default — even a chatty session
// shouldn't push past a few MB across all retained files.
const MAX_BYTES  = 1 * 1024 * 1024; // 1 MB per file
const MAX_FILES  = 4;               // active + 3 archived = ~4 MB ceiling

// ── State ──────────────────────────────────────────────────────────────
let logDir   = null;
let logPath  = null;
let writeBuf = [];     // queued lines while we wait for the first flush
let writing  = false;  // simple lock so concurrent calls don't interleave
let initialized = false;

function getLogDir() {
  // app.getPath('userData') is per-user, per-platform, and survives
  // upgrades. On Windows this is %APPDATA%\Calibrate.
  return path.join(app.getPath('userData'), 'logs');
}

function ensureDir() {
  if (logDir) return logDir;
  logDir = getLogDir();
  try { fs.mkdirSync(logDir, { recursive: true }); } catch (e) { /* best-effort */ }
  logPath = path.join(logDir, 'calibrate.log');
  return logDir;
}

function rotateIfNeeded() {
  try {
    const st = fs.statSync(logPath);
    if (st.size < MAX_BYTES) return;
  } catch (e) {
    // File doesn't exist yet — nothing to rotate.
    return;
  }
  // Shift .N-1 → .N, drop the tail.
  for (let i = MAX_FILES - 1; i >= 1; i--) {
    const src = i === 1 ? logPath : `${logPath}.${i - 1}`;
    const dst = `${logPath}.${i}`;
    try { if (fs.existsSync(src)) fs.renameSync(src, dst); } catch (e) {}
  }
}

function flush() {
  if (writing || writeBuf.length === 0) return;
  writing = true;
  const lines = writeBuf.join('');
  writeBuf = [];
  // Use append-mode write so multiple instances (shouldn't happen due to
  // the single-instance lock, but defensive) can't truncate each other.
  fs.appendFile(logPath, lines, 'utf8', (err) => {
    writing = false;
    // If a flush slipped in while we were writing, drain it too.
    if (writeBuf.length > 0) setImmediate(flush);
    if (err) {
      // Fall back to stderr so the user can still see something in dev mode.
      try { process.stderr.write('[calibrate-logger] write failed: ' + err.message + '\n'); } catch (e) {}
    }
  });
}

function writeLine(level, scope, message, meta) {
  if (!initialized) init(); // lazy init — safe to call from anywhere
  rotateIfNeeded();
  const entry = {
    t: new Date().toISOString(),
    level: level || 'info',
    scope: scope || 'main',
    msg: typeof message === 'string' ? message : String(message),
  };
  if (meta && typeof meta === 'object') entry.meta = meta;
  writeBuf.push(JSON.stringify(entry) + '\n');
  // Mirror to stdout in dev for live tailing, but skip in packaged builds
  // to avoid spamming the user's console window.
  if (!app.isPackaged) {
    try { console.log(`[${entry.level}] ${entry.scope} · ${entry.msg}`); } catch (e) {}
  }
  flush();
}

function makeApi(scope) {
  return {
    info:  (msg, meta) => writeLine('info',  scope, msg, meta),
    warn:  (msg, meta) => writeLine('warn',  scope, msg, meta),
    error: (msg, meta) => writeLine('error', scope, msg, meta),
    debug: (msg, meta) => writeLine('debug', scope, msg, meta),
  };
}

function init() {
  if (initialized) return;
  initialized = true;
  ensureDir();

  // ── Crash capture ────────────────────────────────────────────────
  // These handlers are intentionally non-fatal — we record the crash,
  // then let the process exit on its own. If we caught and swallowed,
  // we'd leave the app in an undefined state.
  process.on('uncaughtException', (err) => {
    try {
      writeLine('error', 'crash', 'uncaughtException: ' + (err && err.message), {
        stack: err && err.stack,
        name:  err && err.name,
      });
    } catch (e) {}
  });
  process.on('unhandledRejection', (reason) => {
    try {
      const msg = reason && reason.message ? reason.message : String(reason);
      writeLine('error', 'crash', 'unhandledRejection: ' + msg, {
        stack: reason && reason.stack,
      });
    } catch (e) {}
  });

  // ── Renderer bridge ──────────────────────────────────────────────
  // Preload (preload.js) exposes window.moodBridge.log.* which sends
  // through ipcRenderer on this channel. Keep the contract narrow:
  // level, scope, message, plain-object meta. Reject anything else
  // so the log file stays parseable.
  try {
    ipcMain.handle('log:write', (_evt, payload) => {
      if (!payload || typeof payload !== 'object') return false;
      const { level, scope, message, meta } = payload;
      const safeMeta =
        meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : undefined;
      writeLine(
        ['info', 'warn', 'error', 'debug'].includes(level) ? level : 'info',
        typeof scope === 'string' ? scope.slice(0, 64) : 'renderer',
        typeof message === 'string' ? message.slice(0, 4000) : String(message),
        safeMeta,
      );
      return true;
    });
  } catch (e) {
    // ipcMain.handle throws if registered twice — safe to ignore on hot-reload.
  }

  // Boot marker so each session's logs are visually delimited when you
  // tail or grep across runs.
  writeLine('info', 'boot', 'logger initialized', {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    userData: app.getPath('userData'),
  });
}

module.exports = {
  init,
  scope: makeApi,         // const log = logger.scope('eq');  log.info(...)
  // Convenience: a default 'main' scope for callers that don't want to name one.
  ...makeApi('main'),
  // Exposed for the issue-reporting flow ("Open my log folder")
  getLogDir,
  getLogPath: () => logPath,
};
