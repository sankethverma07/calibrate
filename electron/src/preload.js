// Calibrate preload — exposes the safe IPC bridge to the renderer.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('moodBridge', {
  isElectron: true,
  platform: process.platform,

  // ── EQ control (writes to Equalizer APO config) ──
  eq: {
    setBands:  (bands)   => ipcRenderer.invoke('eq:set-bands', bands),
    toggle:    (enabled) => ipcRenderer.invoke('eq:toggle', enabled),
    getStatus: ()        => ipcRenderer.invoke('eq:get-status'),
  },

  // ── Now Playing ──
  nowPlaying: {
    get: () => ipcRenderer.invoke('now-playing:get'),
    onUpdate: (cb) => {
      const handler = (_event, data) => cb(data);
      ipcRenderer.on('now-playing:update', handler);
      return () => ipcRenderer.removeListener('now-playing:update', handler);
    },
  },

  // ── App info (platform, APO status, etc.) ──
  app: {
    getInfo: () => ipcRenderer.invoke('app:get-info'),
  },

  // ── Window controls (custom titlebar) ──
  window: {
    minimize:       () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    close:          () => ipcRenderer.invoke('window:close'),
    isMaximized:    () => ipcRenderer.invoke('window:is-maximized'),
  },

  // ── Structured log (renderer → main, written to userData/logs) ──
  // Use sparingly: each call is an IPC round-trip. Call signature:
  //   moodBridge.log.info('eq:band-changed', { band: '1k', dB: 3 });
  // Scope is the first argument so logs can be filtered by component.
  log: {
    info:  (scope, message, meta) => ipcRenderer.invoke('log:write', { level: 'info',  scope, message, meta }),
    warn:  (scope, message, meta) => ipcRenderer.invoke('log:write', { level: 'warn',  scope, message, meta }),
    error: (scope, message, meta) => ipcRenderer.invoke('log:write', { level: 'error', scope, message, meta }),
    debug: (scope, message, meta) => ipcRenderer.invoke('log:write', { level: 'debug', scope, message, meta }),
  },

  // ── Global input — events fired even when Calibrate isn't focused ──
  // (Requires uiohook-napi installed in electron/.)
  globalInput: {
    onKey: (cb) => {
      const handler = (_event, data) => cb(data);
      ipcRenderer.on('global-input:key', handler);
      return () => ipcRenderer.removeListener('global-input:key', handler);
    },
    onMouse: (cb) => {
      const handler = (_event, data) => cb(data);
      ipcRenderer.on('global-input:mouse', handler);
      return () => ipcRenderer.removeListener('global-input:mouse', handler);
    },
    onClick: (cb) => {
      const handler = (_event, data) => cb(data);
      ipcRenderer.on('global-input:click', handler);
      return () => ipcRenderer.removeListener('global-input:click', handler);
    },
  },
});
