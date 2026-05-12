// Native Bridge — Type-safe interface to Electron's preload APIs
// Falls back gracefully when running in browser (web deploy)

export interface NowPlayingInfo {
  title: string;
  artist: string;
  album: string;
  playing: boolean;
}

export interface EQStatus {
  available: boolean;
  enabled: boolean;
  reason?: string;
}

interface MoodBridge {
  eq: {
    setBands: (bands: number[]) => Promise<{ success: boolean; error?: string }>;
    toggle: (enabled: boolean) => Promise<{ success: boolean; enabled?: boolean; error?: string }>;
    getStatus: () => Promise<EQStatus>;
  };
  nowPlaying: {
    get: () => Promise<NowPlayingInfo>;
    onUpdate: (callback: (info: NowPlayingInfo) => void) => () => void;
  };
  calendar: {
    auth: () => Promise<{ success: boolean; error?: string }>;
    getEvents: () => Promise<{ success: boolean; events?: any[]; error?: string }>;
  };
  globalInput: {
    onMouse: (callback: (e: any) => void) => () => void;
    onKey: (callback: (e: any) => void) => () => void;
  };
  platform: string;
  isElectron: boolean;
}

declare global {
  interface Window {
    moodBridge?: MoodBridge;
  }
}

// Check if running inside Electron
export function isElectron(): boolean {
  return !!(window as any).moodBridge?.isElectron;
}

// Get the bridge (returns null in browser)
export function getBridge(): MoodBridge | null {
  return (window as any).moodBridge || null;
}

// Convenience: subscribe to now playing updates
export function onNowPlayingUpdate(cb: (info: NowPlayingInfo) => void): () => void {
  const bridge = getBridge();
  if (!bridge) return () => {};
  return bridge.nowPlaying.onUpdate(cb);
}

// Convenience: set system EQ bands
export async function setSystemEQ(bands: number[]): Promise<boolean> {
  const bridge = getBridge();
  if (!bridge) return false;
  const result = await bridge.eq.setBands(bands);
  return result.success;
}

// Convenience: toggle system EQ
export async function toggleSystemEQ(enabled: boolean): Promise<boolean> {
  const bridge = getBridge();
  if (!bridge) return false;
  const result = await bridge.eq.toggle(enabled);
  return result.success;
}
