/* ════════════════════════════════════════════════════════════════════
   Calibrate · P1 Hero Loop choreography
   ────────────────────────────────────────────────────────────────────
   Paste-into-DevTools-console script. 5 s prep countdown so you can
   hit "Start Recording" in OBS first, then 10 s animated sequence:
     0–2.5 s · pure black hold
     2.5 s   · wave fades up · cruising teal
     5.0 s   · transition to locked-in blue (lerp τ = 0.7s smooths it)
     7.5 s   · transition to drift magenta
     9.0 s   · CALIBRATE wordmark fades in
     10  s   · hold final frame
   ════════════════════════════════════════════════════════════════════ */
(async function calibrateHeroLoop() {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // 1. Hide all chrome (everything that isn't the wave)
  const HIDE = [
    '.cal-titlebar', '.cal-topbar', '.cal-pill', '.cal-bottom-right',
    '.cal-sticky-stats', '.cal-sticky-panel', '.cal-section-legend',
    '.cal-click-dock', '.cal-overlay',
    '.cal-new-mood-face', '.cal-new-mood-title', '.cal-new-mood-detail',
    '.cal-new-stats-toggle', '.cal-new-stats-graph', '.cal-new-scroll-hint',
    '.cal-new-card', '.cal-pg-mode', '.cal-pg-prompt'
  ];
  HIDE.forEach(sel => document.querySelectorAll(sel).forEach(e => {
    e.dataset.heroHidden = '1';
    e.style.display = 'none';
  }));

  // 2. Black overlay covering everything (will fade to reveal wave)
  const overlay = document.createElement('div');
  overlay.id = 'heroBlackOverlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99998;
    background: #000; opacity: 1;
    transition: opacity 2s cubic-bezier(0.22, 1, 0.36, 1);
    pointer-events: none;
  `;
  document.body.appendChild(overlay);

  // 3. Countdown overlay (visible during 5s prep)
  const counter = document.createElement('div');
  counter.id = 'heroCounter';
  counter.style.cssText = `
    position: fixed; left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    z-index: 99999;
    font-family: 'PP Neue Montreal', sans-serif;
    font-size: 12vw; font-weight: 200;
    color: rgba(255,255,255,0.55);
    pointer-events: none;
    letter-spacing: -0.04em;
  `;
  document.body.appendChild(counter);

  // 4. CALIBRATE wordmark (revealed at 9s)
  const word = document.createElement('div');
  word.id = 'heroWordmark';
  word.textContent = 'CALIBRATE';
  word.style.cssText = `
    position: fixed; left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    z-index: 99999;
    font-family: 'PP Neue Montreal', sans-serif;
    font-size: 7vw; font-weight: 300;
    letter-spacing: 0.45em;
    color: rgba(255,255,255,0.94);
    opacity: 0;
    transition: opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1),
                letter-spacing 1.6s cubic-bezier(0.22, 1, 0.36, 1);
    text-shadow:
      0 0 60px rgba(255,255,255,0.35),
      0 0 120px rgba(var(--mood-rgb), 0.40);
    padding-left: 0.45em;
    pointer-events: none;
  `;
  document.body.appendChild(word);

  // 5. Force cruising mood as starting state
  state.manualMood = 'cruising';
  state.source = 'manual';
  state.lastWrittenMood = null;

  // ─── 5-SECOND PREP COUNTDOWN ─────────────────────────────────
  console.log('%c▶ HERO LOOP', 'color:#2dd4bf;font-size:18px;font-weight:bold');
  console.log('%cStart OBS recording NOW. Animation begins in 5 s.', 'color:#fff;font-size:14px');
  for (let n = 5; n >= 1; n--) {
    counter.textContent = String(n);
    counter.style.opacity = '1';
    await sleep(1000);
  }
  counter.textContent = '';
  counter.remove();

  // ─── T = 0  ·  Pure black hold ───────────────────────────────
  await sleep(2500);

  // ─── T = 2.5 s  ·  Wave fades up · cruising teal ─────────────
  overlay.style.opacity = '0';
  await sleep(2500);

  // ─── T = 5 s  ·  Transition to locked ────────────────────────
  state.manualMood = 'locked';
  state.lastWrittenMood = null;
  await sleep(2500);

  // ─── T = 7.5 s  ·  Transition to drift ───────────────────────
  state.manualMood = 'drift';
  state.lastWrittenMood = null;
  await sleep(1500);

  // ─── T = 9 s  ·  CALIBRATE wordmark fades in ─────────────────
  word.style.opacity = '1';
  word.style.letterSpacing = '0.34em';
  await sleep(1000);

  // ─── T = 10 s  ·  Hold (recording can stop) ──────────────────
  console.log('%c✓ HERO LOOP DONE', 'color:#2dd4bf;font-size:18px;font-weight:bold');
  console.log('%cStop recording in OBS. Run __resetHero() to restore the UI.', 'color:#fff;font-size:14px');

  // ─── RESET HELPER ────────────────────────────────────────────
  window.__resetHero = function () {
    document.querySelectorAll('[data-hero-hidden]').forEach(e => {
      e.style.display = '';
      delete e.dataset.heroHidden;
    });
    document.getElementById('heroBlackOverlay')?.remove();
    document.getElementById('heroWordmark')?.remove();
    document.getElementById('heroCounter')?.remove();
    state.manualMood = null;
    state.source = state.previousSource || 'validated';
    state.autoSenseOn = true;
    state.lastWrittenMood = null;
    console.log('%c✓ UI RESTORED', 'color:#2dd4bf;font-size:16px');
  };
})();
