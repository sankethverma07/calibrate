// ═════════════════════════════════════════════════════════════════════
// Calibrate · Closed-loop biofeedback EQ for your computer's audio.
//
// © 2026 Sanketh Verma <sankethverma07@gmail.com>
// Originally published at https://github.com/sankethverma07/calibrate
// Licensed under MIT (see LICENSE in the repo root).
// If you fork or redistribute Calibrate, keep this attribution visible.
// ═════════════════════════════════════════════════════════════════════
// Calibrate Desktop — Electron Main Process
// =====================================================================
// This rewrite:
//   - Loads dist/public/index.html directly from disk (no dev server)
//   - Single-instance lock (only one Calibrate window can ever exist)
//   - Equalizer APO is the EQ actuator (no audio capture, no mic prompt)
//   - Windows Now Playing detection via PowerShell + GlobalSystemMediaTransportControlsSessionManager
//   - IPC bridge: renderer calls window.moodBridge.eq.setBands(bands) → APO config rewritten
// =====================================================================

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Structured logger + crash capture. Initializing as early as possible
// so even ESM-loader / GPU-init failures land in the rolling log file
// instead of disappearing into stderr.
const logger = require('./logger');
logger.init();
const log = logger.scope('main');

// Optional native dependency for global input capture (typing/mouse outside
// the Calibrate window). Loaded with try/catch so the app degrades gracefully
// if uiohook-napi isn't installed yet.
let uIOhook = null;
try {
  uIOhook = require('uiohook-napi').uIOhook;
  log.info('uiohook-napi loaded — global input capture available');
} catch (e) {
  log.warn('uiohook-napi not installed — running with in-window input only', {
    hint: 'cd electron && npm install uiohook-napi',
  });
}

let mainWindow = null;

// ══════════════════════════════════════════
// SINGLE-INSTANCE LOCK
// ══════════════════════════════════════════
// Prevents multiple Calibrate windows from spawning. If a second instance is
// launched, focus the first one instead of creating a new window.

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ══════════════════════════════════════════
// WINDOW SETUP
// ══════════════════════════════════════════

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    // Windows 11 native overlay: keeps the dark aesthetic but gives back
    // functional min/max/close buttons + native drag-to-move + resize handles.
    backgroundColor: '#0a0c14',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0c14',        // matches app background
      symbolColor: '#f5f3ee',  // cream symbols (cream/Neue Montreal)
      height: 32,
    },
    trafficLightPosition: { x: 16, y: 16 }, // macOS only, ignored on Windows
    movable: true,
    resizable: true,
    maximizable: true,
    minimizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // preload uses ipcRenderer
    },
  });

  // Load the prebuilt mood3 bundle directly from disk.
  // No dev server, no localhost, no HTTP — file:// loaded straight from dist/public.
  const indexPath = path.resolve(__dirname, '..', '..', 'dist', 'public', 'index.html');
  console.log('[Calibrate] loading from disk:', indexPath);

  if (!fs.existsSync(indexPath)) {
    console.error('[Calibrate] FATAL: dist/public/index.html not found. Run npm run build:client from the project root first.');
    mainWindow.loadURL(
      'data:text/html;charset=utf-8,' +
      encodeURIComponent(`<html><body style="background:#0a0c14;color:#f0a050;font-family:sans-serif;padding:40px">
        <h1>Calibrate · build missing</h1>
        <p>Could not find <code>dist/public/index.html</code>.</p>
        <p>From the project root, run: <code>npm run build:client</code> — then relaunch.</p>
      </body></html>`)
    );
    return;
  }

  mainWindow.loadFile(indexPath);

  // Open DevTools on first load if dev mode flagged
  if (process.env.CALIBRATE_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Register AppUserModelID on Windows so HTML5 Notifications appear as
  // proper toasts in Action Center (not transient). Harmless on Mac/Linux.
  try {
    if (process.platform === 'win32' && typeof app.setAppUserModelId === 'function') {
      app.setAppUserModelId('com.calibrate.desktop');
    }
  } catch (e) { /* non-fatal */ }

  createWindow();
  setupIPC();
  startNowPlayingMonitor();
  startGlobalInputHooks();
  console.log('[Calibrate] Ready. EQ actuator: Equalizer APO. Source signals: typing + mouse (no audio capture).');
});

// ══════════════════════════════════════════
// GLOBAL INPUT HOOKS (typing/mouse outside the Calibrate window)
// Uses uiohook-napi if available. Forwards events to renderer via IPC.
// ══════════════════════════════════════════
function startGlobalInputHooks() {
  if (!uIOhook) return; // module not installed → silent fallback

  try {
    let lastMouseSend = 0;
    const MOUSE_THROTTLE_MS = 50;

    // Backspace/Delete keycodes from libuiohook (UiohookKey constants).
    // These are platform-stable for Windows / macOS / Linux.
    const KEY_BACKSPACE = 14;
    const KEY_DELETE = 3667;

    uIOhook.on('keydown', (e) => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      const isError = (e.keycode === KEY_BACKSPACE || e.keycode === KEY_DELETE);
      // Skip pure modifiers (we want printable activity)
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      mainWindow.webContents.send('global-input:key', {
        keycode: e.keycode,
        isError: isError,
        t: Date.now(),
      });
    });

    uIOhook.on('mousemove', (e) => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      const now = Date.now();
      if (now - lastMouseSend < MOUSE_THROTTLE_MS) return;
      lastMouseSend = now;
      mainWindow.webContents.send('global-input:mouse', {
        x: e.x, y: e.y, t: now,
      });
    });

    uIOhook.on('mousedown', (e) => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send('global-input:click', {
        x: e.x, y: e.y, button: e.button, t: Date.now(),
      });
    });

    uIOhook.start();
    console.log('[Calibrate] Global input hooks active — sensing input across all apps.');
  } catch (err) {
    console.error('[Calibrate] Failed to start global hooks:', err);
  }
}

app.on('will-quit', () => {
  try { if (uIOhook) uIOhook.stop(); } catch (_) {}
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ══════════════════════════════════════════
// IPC HANDLERS
// ══════════════════════════════════════════

function setupIPC() {
  ipcMain.handle('eq:set-bands', async (_event, bands) => setSystemEQ(bands));
  ipcMain.handle('eq:toggle',    async (_event, enabled) => toggleSystemEQ(enabled));
  ipcMain.handle('eq:get-status', async () => getEQStatus());
  ipcMain.handle('now-playing:get', async () => currentNowPlaying);
  ipcMain.handle('app:get-info',   async () => ({
    platform: process.platform,
    isElectron: true,
    apoStatus: getEQStatus(),
  }));

  // ── Window controls (custom titlebar) ────────────────────────────
  ipcMain.handle('window:minimize', () => mainWindow && mainWindow.minimize());
  ipcMain.handle('window:toggle-maximize', () => {
    if (!mainWindow) return false;
    if (mainWindow.isMaximized()) { mainWindow.unmaximize(); return false; }
    mainWindow.maximize();
    return true;
  });
  ipcMain.handle('window:close', () => mainWindow && mainWindow.close());
  ipcMain.handle('window:is-maximized', () => mainWindow ? mainWindow.isMaximized() : false);
}

// ══════════════════════════════════════════
// SYSTEM-WIDE EQ — Equalizer APO config writer
// ══════════════════════════════════════════
// Equalizer APO is a free Windows audio post-processor (kernel-level driver).
// We write a parametric EQ config file; APO reads it and applies the EQ to
// every audio output without capture, replay, or interruption.
//
// Config file lives at: C:\Program Files\EqualizerAPO\config\calibrate-eq.txt
// Master config (config.txt) needs to include calibrate-eq.txt for our values
// to take effect. We auto-edit config.txt to add the include line on first
// successful EQ write.

const APO_DIR = 'C:\\Program Files\\EqualizerAPO\\config';
const EQ_CONFIG_PATH = path.join(APO_DIR, 'calibrate-eq.txt');
const EQ_MAIN_CONFIG = path.join(APO_DIR, 'config.txt');
const EQ_INCLUDE_LINE = 'Include: calibrate-eq.txt';

let eqEnabled = false;
let lastBands = null;

function setSystemEQ(bands) {
  if (process.platform !== 'win32') {
    return { success: false, error: 'System EQ is Windows-only (Equalizer APO required).' };
  }

  // Check APO is installed
  if (!fs.existsSync(APO_DIR)) {
    return {
      success: false,
      error: 'Equalizer APO is not installed. Download from https://sourceforge.net/projects/equalizerapo/ and reboot.',
      apoMissing: true,
    };
  }

  try {
    const freqs = [60, 170, 310, 600, 1000, 3000, 6000, 12000];
    const lines = [
      '# Calibrate EQ — Auto-generated, do not edit manually',
      `# Generated at ${new Date().toISOString()}`,
      'Preamp: -3 dB',
      '',
    ];
    for (let i = 0; i < 8; i++) {
      const g = (bands[i] || 0).toFixed(1);
      lines.push(`Filter: ON PK Fc ${freqs[i]} Hz Gain ${g} dB Q 1.4`);
    }

    fs.writeFileSync(EQ_CONFIG_PATH, lines.join('\n'), 'utf-8');
    lastBands = bands;

    // Auto-enable on first successful write — add include line to APO main config
    if (!eqEnabled) {
      try {
        let mainConfig = fs.readFileSync(EQ_MAIN_CONFIG, 'utf-8');
        if (!mainConfig.includes(EQ_INCLUDE_LINE)) {
          mainConfig += `\n${EQ_INCLUDE_LINE}\n`;
          fs.writeFileSync(EQ_MAIN_CONFIG, mainConfig, 'utf-8');
        }
        eqEnabled = true;
      } catch (e) {
        // If config.txt isn't writable (admin perms missing), still report success on calibrate-eq.txt
        return {
          success: true,
          warning: 'Wrote calibrate-eq.txt but could not auto-include in main config. Run Calibrate as admin once, OR add "Include: calibrate-eq.txt" manually to ' + EQ_MAIN_CONFIG,
        };
      }
    }

    return { success: true, bands };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function toggleSystemEQ(enabled) {
  if (process.platform !== 'win32' || !fs.existsSync(EQ_MAIN_CONFIG)) {
    return { success: false, error: 'Equalizer APO not installed.' };
  }
  try {
    let config = fs.readFileSync(EQ_MAIN_CONFIG, 'utf-8');
    if (enabled && !config.includes(EQ_INCLUDE_LINE)) {
      config += `\n${EQ_INCLUDE_LINE}\n`;
      fs.writeFileSync(EQ_MAIN_CONFIG, config, 'utf-8');
    } else if (!enabled && config.includes(EQ_INCLUDE_LINE)) {
      config = config.replace(new RegExp(`\\n?${EQ_INCLUDE_LINE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n?`, 'g'), '\n');
      fs.writeFileSync(EQ_MAIN_CONFIG, config, 'utf-8');
    }
    eqEnabled = enabled;
    return { success: true, enabled };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getEQStatus() {
  if (process.platform !== 'win32') {
    return { available: false, enabled: false, reason: 'Windows only' };
  }
  const apoExists = fs.existsSync(EQ_MAIN_CONFIG);
  return {
    available: apoExists,
    enabled: eqEnabled,
    lastBands,
    reason: apoExists ? null : 'Equalizer APO not installed (https://sourceforge.net/projects/equalizerapo/)',
  };
}

// ══════════════════════════════════════════
// NOW PLAYING DETECTION (Windows)
// ══════════════════════════════════════════

let currentNowPlaying = { title: '', artist: '', album: '', playing: false };

function startNowPlayingMonitor() {
  if (process.platform !== 'win32') return;

  // External .ps1 file — avoids escape-sequence hell of inline scripts.
  // Invoked with -Sta because WinRT cross-apartment marshaling is unreliable
  // in PowerShell's default MTA. Windows PowerShell 5.1 only — pwsh (7+)
  // doesn't bundle the WinRT bridge.
  const scriptPath = path.join(__dirname, 'nowplaying.ps1');
  const exists = fs.existsSync(scriptPath);
  if (!exists) {
    console.warn('[NowPlaying] script not found at', scriptPath, '— audio detection disabled.');
    return;
  }
  console.log('[NowPlaying] using detector script:', scriptPath);

  let invocationCount = 0;
  const runDetector = () => {
    invocationCount++;
    // Quote-wrap the script path so spaces in user/path names don't break it.
    const cmd = `powershell -NoProfile -Sta -ExecutionPolicy Bypass -File "${scriptPath}"`;
    exec(
      cmd,
      { timeout: 10000, windowsHide: true, maxBuffer: 1024 * 1024 },
      (err, stdout, stderr) => {
        const lines = (stdout || '').split(/\r?\n/).filter(Boolean);
        const verbose = invocationCount <= 3; // dump everything for the first 3 ticks

        if (err) {
          console.warn('[NowPlaying] PowerShell exec FAILED:', err.message);
          if (stderr) console.warn('[NowPlaying] stderr:', stderr.slice(0, 600));
          if (stdout) console.warn('[NowPlaying] stdout:', stdout.slice(0, 600));
          return;
        }

        if (verbose) {
          console.log('[NowPlaying] === tick #' + invocationCount + ' raw output ===');
          lines.forEach(l => console.log('  ' + l));
          if (stderr) console.log('[NowPlaying] stderr:', stderr.slice(0, 400));
          console.log('[NowPlaying] === end tick #' + invocationCount + ' ===');
        }

        const errLine = lines.find(l => l.startsWith('ERROR|||'));
        if (errLine) {
          console.warn('[NowPlaying] PS ERROR:', errLine.slice(8));
          return;
        }

        // Always log DEBUG line (sessions Windows reports) so user can see
        // exactly what's registered with SMTC right now.
        const debugLine = lines.find(l => l.startsWith('DEBUG|||'));
        if (debugLine && (verbose || invocationCount % 5 === 0)) {
          console.log('[NowPlaying]', debugLine);
        }

        if (lines.includes('NOSESSION')) {
          if (currentNowPlaying.title) {
            currentNowPlaying = { title: '', artist: '', album: '', playing: false, source: '' };
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('now-playing:update', currentNowPlaying);
            }
          }
          return;
        }

        const okLine = lines.find(l => l.startsWith('OK|||'));
        if (!okLine) return;
        const parts = okLine.slice(5).split('|||');
        const isPlaying = parts[3] === '4';
        // Send BOTH `playing` and `isPlaying` because the renderer was
        // wired to `isPlaying` but main.js was sending `playing`. Now
        // both fields are populated so existing call sites keep working.
        const next = {
          title:     (parts[0] || '').trim(),
          artist:    (parts[1] || '').trim(),
          album:     (parts[2] || '').trim(),
          playing:   isPlaying,
          isPlaying: isPlaying,
          source:    (parts[4] || '').trim(),
        };
        if (
          next.title !== currentNowPlaying.title ||
          next.playing !== currentNowPlaying.playing ||
          next.artist !== currentNowPlaying.artist
        ) {
          console.log('[NowPlaying]', next.playing ? '▶' : '⏸', next.title, '·', next.artist, '·', next.source);
          currentNowPlaying = next;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('now-playing:update', currentNowPlaying);
          }
        }
      }
    );
  };

  // Kick off the first detection immediately, then every 3s.
  runDetector();
  setInterval(runDetector, 3000);
}
