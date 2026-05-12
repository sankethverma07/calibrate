/**
 * audioPipeline.ts
 * Captures any system / tab / window audio via getDisplayMedia,
 * routes it through an 8-band peaking EQ built from Web Audio API
 * BiquadFilterNodes, and exposes an AnalyserNode for live visualization.
 *
 * Mood → EQ preset values (dB) are pushed via setEQGains() whenever
 * the mood or manual EQ setting changes in Home.tsx.
 */

/** Centre frequencies matching MOOD_EQ bands in moodEngine.ts */
export const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000];

/** Peaking-filter Q — gentle enough not to ring, tight enough to be audible */
const Q = 1.4;

export type PipelineState = 'idle' | 'requesting' | 'active' | 'error';

class AudioPipeline {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private filters: BiquadFilterNode[] = [];
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private _state: PipelineState = 'idle';
  private listeners: ((s: PipelineState) => void)[] = [];
  private _label = '';
  private _error = '';
  private freqBuf: Float32Array | null = null;

  // ─── public API ──────────────────────────────────────────────────────────

  /**
   * Look through the user's audio input devices for a known virtual loopback
   * cable: VB-Cable ("CABLE Output"), Voicemeeter ("Voicemeeter Output"),
   * or similar. Returns the matching MediaDeviceInfo or null if none found.
   *
   * NOTE: device labels are only populated AFTER mic permission has been
   * granted at least once. On the very first call we may need to request a
   * throwaway mic stream to unlock labels — but only if labels appear empty.
   */
  private async findVirtualAudioDevice(): Promise<MediaDeviceInfo | null> {
    const KEYWORDS = ['cable output', 'voicemeeter out', 'voicemeeter output', 'vb-audio'];
    let devices = await navigator.mediaDevices.enumerateDevices();
    let inputs = devices.filter((d) => d.kind === 'audioinput');

    // If labels are empty, we haven't been granted mic permission yet.
    // Briefly grab any mic to unlock the labels, then re-enumerate.
    if (inputs.length && !inputs.some((d) => d.label)) {
      try {
        const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
        probe.getTracks().forEach((t) => t.stop());
        devices = await navigator.mediaDevices.enumerateDevices();
        inputs = devices.filter((d) => d.kind === 'audioinput');
      } catch {
        // user denied — fall through to getDisplayMedia path
        return null;
      }
    }

    const match = inputs.find((d) => {
      const lbl = (d.label || '').toLowerCase();
      return KEYWORDS.some((k) => lbl.includes(k));
    });
    return match || null;
  }

  async start(): Promise<void> {
    this.setState('requesting');
    this._error = '';
    try {
      /**
       * Two paths:
       * 1. PREFERRED — VB-Cable / Voicemeeter virtual audio device installed.
       *    We capture "CABLE Output" (or similar) directly via getUserMedia.
       *    Chrome shows a one-time mic permission prompt, then captures
       *    silently forever after. This grabs ALL system audio (everything
       *    the user has set as Windows default playback).
       *
       * 2. FALLBACK — no virtual device. Use getDisplayMedia, which prompts
       *    the user to pick a tab/window/screen and tick "Share audio".
       */
      let stream: MediaStream | null = null;
      const virtualDevice = await this.findVirtualAudioDevice();

      if (virtualDevice) {
        // Path 1 — getUserMedia on the virtual cable
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: virtualDevice.deviceId },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000,
          },
        });
      } else {
        // Path 2 — getDisplayMedia fallback (share-tab-audio dialog)
        stream = await (navigator.mediaDevices as any).getDisplayMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000,
          },
          video: { width: 1, height: 1, frameRate: 1 },
        });
        // Drop video — we only care about audio
        stream.getVideoTracks().forEach((t) => t.stop());
      }

      const audioTracks = stream.getAudioTracks();
      if (!audioTracks.length) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error(
          virtualDevice
            ? `No audio came through ${virtualDevice.label}. Check Windows Sound settings — is the virtual cable set as default playback?`
            : 'No audio was captured. In the share dialog, tick "Share tab audio" before clicking Share.'
        );
      }

      this._label = virtualDevice
        ? `${virtualDevice.label} (virtual loopback)`
        : audioTracks[0].label || 'System Audio';
      this.stream = stream;

      // ── Build the Web Audio graph ──────────────────────────────────────
      this.ctx = new AudioContext({ sampleRate: 48000 });
      this.source = this.ctx.createMediaStreamSource(stream);

      // 8 peaking EQ filters, one per frequency band
      this.filters = EQ_FREQUENCIES.map(freq => {
        const f = this.ctx!.createBiquadFilter();
        f.type = 'peaking';
        f.frequency.value = freq;
        f.Q.value = Q;
        f.gain.value = 0; // start flat; setEQGains() will update in sync with mood
        return f;
      });

      // Analyser for the live frequency-meter in the UI
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.freqBuf = new Float32Array(this.analyser.frequencyBinCount);

      // Chain: source → filter[0] → … → filter[7] → analyser → speakers
      let node: AudioNode = this.source;
      for (const f of this.filters) { node.connect(f); node = f; }
      node.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Clean up automatically if the user stops sharing
      audioTracks[0].addEventListener('ended', () => this.stop());

      this.setState('active');
    } catch (err: any) {
      // User cancelled the dialog → DOMException name is 'NotAllowedError'
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        this._error = 'Permission denied. Click Connect Audio and allow screen sharing.';
      } else {
        this._error = err?.message ?? 'Failed to capture audio.';
      }
      this.setState('error');
    }
  }

  stop(): void {
    try {
      this.stream?.getTracks().forEach(t => t.stop());
      this.ctx?.close();
    } catch (_) { /* ignore */ }
    this.stream = null;
    this.ctx = null;
    this.source = null;
    this.analyser = null;
    this.filters = [];
    this.freqBuf = null;
    this._label = '';
    this.setState('idle');
  }

  /**
   * Push new EQ gain values (dB) to the filter chain.
   * Called every time eqBands state changes in Home.tsx.
   * Uses setTargetAtTime for smooth 50 ms ramp (no clicks/pops).
   */
  setEQGains(gains: number[]): void {
    if (this._state !== 'active' || !this.ctx) return;
    const now = this.ctx.currentTime;
    gains.forEach((gain, i) => {
      if (this.filters[i]) {
        this.filters[i].gain.setTargetAtTime(gain, now, 0.05); // 50 ms time constant
      }
    });
  }

  /**
   * Returns the latest Float32 frequency-domain data from the AnalyserNode
   * (values in dBFS, roughly −∞ to 0).  Returns null when not active.
   */
  getFreqData(): Float32Array | null {
    if (!this.analyser || !this.freqBuf) return null;
    this.analyser.getFloatFrequencyData(this.freqBuf);
    return this.freqBuf;
  }

  getSampleRate(): number {
    return this.ctx?.sampleRate ?? 48000;
  }

  // ─── state / metadata ────────────────────────────────────────────────────

  get state(): PipelineState { return this._state; }
  get label(): string { return this._label; }
  get error(): string { return this._error; }

  onStateChange(cb: (s: PipelineState) => void): () => void {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter(l => l !== cb); };
  }

  private setState(s: PipelineState): void {
    this._state = s;
    this.listeners.forEach(cb => cb(s));
  }
}

/** Singleton — import this wherever you need to control or read the pipeline */
export const audioPipeline = new AudioPipeline();
