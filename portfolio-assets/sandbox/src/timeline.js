/* ════════════════════════════════════════════════════════════════════
   timeline.js · The Director · v2

   25-second, 10-shot cinematic. Storyboard:

   ACT 1 — THE PARTICLE OCEAN (3 angles)
     1.  0.0 –  3.5  Wave macro, low-front angle, cruising teal
     2.  3.5 –  6.5  Wave side profile, drifts across, mood shifts to locked blue
     3.  6.5 – 10.0  Elevated wide, zoom out to "first 10–20% of ocean"

   ACT 2 — THE SLIDER REVEAL
     4. 10.0 – 12.5  Sliders begin to emerge, frequency labels readable
     5. 12.5 – 15.5  ECU on one slider, particles DISSOLVE, mood subtly shifts
     6. 15.5 – 17.5  Pull back, all 8 sliders aligned

   ACT 3 — THE GLASS CARD FORMS
     7. 17.5 – 20.5  Card materialises around sliders, angle 1 (front)
     8. 20.5 – 22.5  Subtle orbit, angle 2 (3/4 view)

   ACT 4 — HERO HOLD
     9. 22.5 – 24.5  Card centered, particle wave breathing behind

   ACT 5 — TITLE
    10. 24.5 – 28.0  Card recedes, "Smart Equalizer" text reveals

   Each keyframe is the ABSOLUTE state at time `t`. App.jsx's useFrame
   linearly interpolates between adjacent keyframes using the easing
   curve specified on the target keyframe.

   © 2026 Sanketh Verma · MIT
   ════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

export const MOOD_NAMES = ['cruising', 'locked', 'drift', 'restless'];

export const director = {
  camPos:  new THREE.Vector3(0, 0.30, 2.5),
  camLook: new THREE.Vector3(0, -0.40, 0),
  focusM:  1.8,
  bokeh:   0.95,
  zoom:    1.0,
  exposure: 0.5,
  cardBuild:    0.0,
  slidersBuild: 0.0,
  moodIdx:      0,
  waveOpacity:  1.0,
  textReveal:   0.0,
  // Per-band EQ gain (-1..+1). Each band modulates the wave's local
  // amplitude where its frequency sits on the X axis. During the slider
  // close-up shot, we animate band 4 (1K) up to show the wave responding.
  eqBands: [0, 0, 0, 0, 0, 0, 0, 0],
  playing: false,
  t:       0,
  startMs: 0,
};

if (typeof window !== 'undefined') window.__director = director;

/* ─── Keyframes ─── */
const KF = [
  // ═══ ACT 1 — PARTICLE OCEAN (three rack-focus holds) ═══
  // The camera barely moves across shots 1-3. What changes is the FOCAL
  // PLANE — it sweeps from foreground → midground → background through
  // the wave, letting different layers of dust become razor-sharp in turn.
  // This is the cinematography move the brief asked for: shift focus from
  // one part to another, not panning the camera unnaturally.

  // ─── MACRO RACK FOCUS · BACK → FRONT ───
  // Like a real macro-shot pull: focal plane STARTS deep in the wave
  // (background razor-sharp), then PULLS toward camera over 10 seconds.
  // The viewer's eye follows the moving focal plane through three layers.
  // Composition: wave centered horizontally and vertically in frame.

  // Shot 1 — far field sharp. Bokeh wall in foreground.
  // Camera centered (lookAt y=-0.3 to keep wave in lower-center).
  { t: 0.0,  p: [0,   0.30, 3.80], l: [0,   -0.30, 4.0],  focusM: 8.5, bokeh: 0.55, zoom: 1.0, exposure: 0.55, cardBuild: 0, slidersBuild: 0, moodIdx: 0, waveOpacity: 1.0, textReveal: 0, ease: 'linear' },
  { t: 3.5,  p: [0,   0.30, 3.80], l: [0,   -0.30, 4.0],  focusM: 7.5, bokeh: 0.55, zoom: 1.0, exposure: 0.55, cardBuild: 0, slidersBuild: 0, moodIdx: 0, waveOpacity: 1.0, textReveal: 0, ease: 'sine' },

  // Shot 2 — focal plane PULLS to midground. Background defocuses into
  // creamy bokeh; midground crystallises with hexagonal aperture detail.
  // Mood crossfade begins (cruising → locked blue, τ=2.5s lerp handles it).
  { t: 3.5001, p: [0, 0.30, 3.80], l: [0, -0.30, 4.0],   focusM: 7.5, bokeh: 0.55, zoom: 1.0, exposure: 0.55, cardBuild: 0, slidersBuild: 0, moodIdx: 1, waveOpacity: 1.0, textReveal: 0, ease: 'cut' },
  { t: 7.0,    p: [0, 0.32, 3.80], l: [0, -0.28, 3.0],   focusM: 4.5, bokeh: 0.55, zoom: 1.0, exposure: 0.55, cardBuild: 0, slidersBuild: 0, moodIdx: 1, waveOpacity: 1.0, textReveal: 0, ease: 'sine' },

  // Shot 3 — focal plane lands at foreground. Razor-sharp pinpricks
  // in the near band of wave dust; the rest of the wave is full bokeh.
  // This is the macro-shot money frame.
  { t: 7.0001, p: [0, 0.32, 3.80], l: [0, -0.28, 3.0],   focusM: 4.5, bokeh: 0.55, zoom: 1.0, exposure: 0.55, cardBuild: 0, slidersBuild: 0, moodIdx: 1, waveOpacity: 1.0, textReveal: 0, ease: 'cut' },
  { t: 10.0,   p: [0, 0.35, 3.75], l: [0, -0.25, 2.0],   focusM: 2.4, bokeh: 0.55, zoom: 1.0, exposure: 0.55, cardBuild: 0, slidersBuild: 0, moodIdx: 1, waveOpacity: 1.0, textReveal: 0, ease: 'sine' },

  // ═══ ACT 2 — SLIDER REVEAL ═══
  // Shot 4 — sliders emerge as camera glides forward into the wave
  { t: 12.5, p: [0,    1.20, 6.20], l: [0,    0.45, 1.5],  focusM: 5.2, bokeh: 0.42, zoom: 1.0, exposure: 0.30, cardBuild: 0, slidersBuild: 0.45, moodIdx: 1, waveOpacity: 0.75, textReveal: 0, eqBands: [0,0,0,0,0,0,0,0], ease: 'power2' },

  // Shot 5 — ECU on single slider (band 4 — the 1K Hz band).
  // The slider is reframed to the LEFT so the viewer can see the wave
  // RESPONDING to it on the RIGHT half of the frame. Particles linger at
  // ~50% opacity so the wave response is visible. The slider's gain
  // animates from 0 → +0.8 across the shot, lifting the local wave amp.
  { t: 12.55, p: [-0.4, 0.65, 2.50], l: [0.0, 0.55, 1.2], focusM: 2.0, bokeh: 0.65, zoom: 1.3, exposure: 0.25, cardBuild: 0, slidersBuild: 0.55, moodIdx: 1, waveOpacity: 0.65, textReveal: 0, eqBands: [0,0,0,0,0,0,0,0], ease: 'cut' },
  // Mid-shot — slider lifts, wave on right side BLOOMS up in the 1K band
  { t: 14.0,  p: [-0.4, 0.70, 2.40], l: [0.0, 0.55, 1.2], focusM: 2.0, bokeh: 0.65, zoom: 1.3, exposure: 0.25, cardBuild: 0, slidersBuild: 0.55, moodIdx: 2, waveOpacity: 0.65, textReveal: 0, eqBands: [0,0,0,0.55,0,0,0,0], ease: 'sine' },
  // End — band 4 fully pushed up, wave amplitude visibly boosted
  { t: 15.5,  p: [-0.4, 0.70, 2.40], l: [0.0, 0.55, 1.2], focusM: 2.1, bokeh: 0.60, zoom: 1.3, exposure: 0.25, cardBuild: 0, slidersBuild: 0.55, moodIdx: 2, waveOpacity: 0.70, textReveal: 0, eqBands: [0,0,0,0.85,0,0,0,0], ease: 'sine' },

  // Shot 6 — pull back, all 8 sliders aligned, particles return
  { t: 15.55, p: [0,   1.00, 5.20], l: [0,    0.55, 1.2],  focusM: 4.5, bokeh: 0.55, zoom: 1.0, exposure: 0.20, cardBuild: 0, slidersBuild: 1.0, moodIdx: 2, waveOpacity: 0.45, textReveal: 0, ease: 'cut' },
  { t: 17.5, p: [0,   1.10, 5.80], l: [0,    0.55, 1.2],  focusM: 4.8, bokeh: 0.50, zoom: 1.0, exposure: 0.15, cardBuild: 0, slidersBuild: 1.0, moodIdx: 2, waveOpacity: 0.70, textReveal: 0, ease: 'sine' },

  // ═══ ACT 3 — GLASS CARD FORMS ═══
  // Shot 7 — front angle, glass materialises around sliders, mood returns to locked
  { t: 20.5, p: [0,   1.18, 6.50], l: [0,    0.55, 1.2],  focusM: 5.4, bokeh: 0.40, zoom: 1.0, exposure: 0.10, cardBuild: 1.0, slidersBuild: 1.0, moodIdx: 1, waveOpacity: 0.75, textReveal: 0, ease: 'power2' },

  // Shot 8 — subtle orbit to 3/4 angle
  { t: 22.5, p: [1.40, 1.10, 6.10], l: [0,    0.55, 1.2],  focusM: 5.0, bokeh: 0.40, zoom: 1.0, exposure: 0.10, cardBuild: 1.0, slidersBuild: 1.0, moodIdx: 1, waveOpacity: 0.80, textReveal: 0, ease: 'sine' },

  // ═══ ACT 4 — HERO HOLD ═══
  { t: 24.5, p: [0,   1.20, 7.20], l: [0,    0.55, 1.2],  focusM: 6.2, bokeh: 0.32, zoom: 1.0, exposure: 0.00, cardBuild: 1.0, slidersBuild: 1.0, moodIdx: 1, waveOpacity: 0.85, textReveal: 0, ease: 'sine' },

  // ═══ ACT 5 — TITLE ═══
  // Wave fades out completely (no competing motion behind text).
  // Card recedes to nearly invisible — letters take the frame.
  { t: 25.5, p: [0,   1.25, 9.00], l: [0,    0.40, 1.2],  focusM: 7.5, bokeh: 0.40, zoom: 0.85, exposure: -0.20, cardBuild: 0.08, slidersBuild: 0.08, moodIdx: 1, waveOpacity: 0.0, textReveal: 0, ease: 'sine' },
  { t: 26.5, p: [0,   1.25, 9.00], l: [0,    0.40, 1.2],  focusM: 7.5, bokeh: 0.40, zoom: 0.85, exposure: -0.20, cardBuild: 0,    slidersBuild: 0,    moodIdx: 1, waveOpacity: 0.0, textReveal: 1.0, ease: 'sine' },
  // Hold for 5s — 16 letters × 0.09s stagger + 1.4s per-letter dur ≈ 2.9s
  // for the title, plus 1.6s subtitle delay + 1.2s subtitle fade ≈ 2.8s.
  // Total reveal lands by ~31.5s.
  { t: 32.0, p: [0,   1.25, 9.00], l: [0,    0.40, 1.2],  focusM: 7.5, bokeh: 0.40, zoom: 0.85, exposure: -0.20, cardBuild: 0,    slidersBuild: 0,    moodIdx: 1, waveOpacity: 0.0, textReveal: 1.0, ease: 'sine' },
];

const TOTAL_DURATION = KF[KF.length - 1].t;
const EQ_ZERO = [0, 0, 0, 0, 0, 0, 0, 0];

function ease(t, kind) {
  const c = Math.max(0, Math.min(1, t));
  switch (kind) {
    case 'linear': return c;
    case 'sine':   return 0.5 - 0.5 * Math.cos(c * Math.PI);
    case 'power2': return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
    case 'cut':    return c < 1 ? 0 : 1;
    default:       return c * c * (3 - 2 * c);
  }
}

function lerp(a, b, k) { return a + (b - a) * k; }

export function tickDirector(now) {
  if (!director.playing) return;
  director.t = (now - director.startMs) / 1000;
  const t = director.t;

  let i = 0;
  while (i < KF.length - 1 && KF[i + 1].t <= t) i++;
  const a = KF[i];
  const b = KF[Math.min(KF.length - 1, i + 1)];

  const span = b.t - a.t;
  const local = span > 0 ? (t - a.t) / span : 1;
  const k = ease(local, b.ease);

  director.camPos.set(
    lerp(a.p[0], b.p[0], k),
    lerp(a.p[1], b.p[1], k),
    lerp(a.p[2], b.p[2], k),
  );
  director.camLook.set(
    lerp(a.l[0], b.l[0], k),
    lerp(a.l[1], b.l[1], k),
    lerp(a.l[2], b.l[2], k),
  );

  director.focusM       = lerp(a.focusM,       b.focusM,       k);
  director.bokeh        = lerp(a.bokeh,        b.bokeh,        k);
  director.zoom         = lerp(a.zoom,         b.zoom,         k);
  director.exposure     = lerp(a.exposure,     b.exposure,     k);
  director.cardBuild    = lerp(a.cardBuild,    b.cardBuild,    k);
  director.slidersBuild = lerp(a.slidersBuild, b.slidersBuild, k);
  director.waveOpacity  = lerp(a.waveOpacity,  b.waveOpacity,  k);
  director.textReveal   = lerp(a.textReveal,   b.textReveal,   k);

  // EQ bands — interpolate per-band, default to zeros if a keyframe omits
  const aEq = a.eqBands || EQ_ZERO;
  const bEq = b.eqBands || EQ_ZERO;
  for (let i = 0; i < 8; i++) {
    director.eqBands[i] = lerp(aEq[i] || 0, bEq[i] || 0, k);
  }

  // Mood snaps to the target at the START of each interval — this lets the
  // wave's slow τ=2.5s color/amp lerp produce a SEAMLESS transition instead
  // of the snappy default. Snapping the target early gives the lerp time
  // to resolve within the shot.
  director.moodIdx = b.moodIdx;

  if (t >= TOTAL_DURATION) {
    director.playing = false;
  }
}

export function runTimeline() {
  resetDirector();
  director.playing = true;
  director.startMs = performance.now();
}

export function resetDirector() {
  const f = KF[0];
  director.camPos.set(...f.p);
  director.camLook.set(...f.l);
  director.focusM       = f.focusM;
  director.bokeh        = f.bokeh;
  director.zoom         = f.zoom;
  director.exposure     = f.exposure;
  director.cardBuild    = f.cardBuild;
  director.slidersBuild = f.slidersBuild;
  director.moodIdx      = f.moodIdx;
  director.waveOpacity  = f.waveOpacity;
  director.textReveal   = f.textReveal;
  director.playing      = false;
  director.t            = 0;
}

export function resetTimeline() { resetDirector(); }
