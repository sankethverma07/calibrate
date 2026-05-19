# Calibrate · Case Study

**Closed-loop biofeedback EQ for your computer's audio.**
A passive cognitive-state detector that retunes your system equalizer in real time using your typing rhythm and mouse precision — no wearables, no cloud, no calibration friction.

By **Sanketh Verma** · 2026 · Built in Cowork mode with Claude as engineering co-pilot.
Live at **calibrate-bay.vercel.app** · Source: **github.com/sankethverma07/calibrate**

---

## TL;DR

Spotify EQ doesn't know how you feel. Calibrate does. It watches the rhythm of your keystrokes and the precision of your mouse — signals you're already producing — and infers whether you're cruising, locked-in, drifting, or restless. Each state maps to an 8-band system-wide EQ curve applied via Equalizer APO, so YouTube, Spotify, Discord, Zoom — *every* app's audio — retunes in sync with your cognitive state.

The unique angle: **adaptive audio without sensors**. Endel needs a heart-rate watch. Brain.fm plays at you, not from you. Spotify EQ is static. Calibrate is the only closed-loop system that uses passive computer input as the biofeedback signal.

---

## The hypothesis

Keystroke dynamics (inter-key timing, error rate, burst patterns) and pointer microbehavior (jitter, sharp turns, idle gaps) carry signal about cognitive state. HCI literature already documents this for stress detection and biometric identification — Calibrate is a UX-first product built on that science, asking *"if we can detect state passively, what should the system DO with it?"*

The answer it commits to: **retune the audio environment**, because audio is the only sensory channel the system can modulate in real time without interrupting the user.

---

## Architecture overview

```
┌──────────────────────────────────────────────────────────────┐
│  PASSIVE INPUT  ──→  MOOD DETECTOR  ──→  EQ ROUTER  ──→ EAR  │
│                                                              │
│  uIOhook (global)    moodEngine.ts        Equalizer APO      │
│  keystroke + mouse   IKI / IKI-SD         8-band curves      │
│  →  rolling window   error rate           system-wide        │
│      metrics         mouse jitter         (writes config)    │
│                      → 4 moods × 3 sub                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ↓
                  ┌───────────────────────┐
                  │  CALIBRATE WINDOW UI  │
                  │  • Wave (mood-coded)  │
                  │  • Cards (tinted)     │
                  │  • Section legend     │
                  │  • Breathing pulse    │
                  │  • Gamified profile   │
                  └───────────────────────┘
                              │
                              ↓
                  ┌───────────────────────┐
                  │  PERSISTENCE          │
                  │  localStorage (local) │
                  │  Supabase (opt-in)    │
                  └───────────────────────┘
```

**The five core layers, in build order:**

1. **Detector** — `lib/moodEngine.ts` consumes keystroke + mouse streams. Validated moods + sub-levels with confidence scores.
2. **EQ router** — `electron/src/main.js` writes Equalizer APO config when validated mood changes. 8 bands at 60/170/310/600/1k/3k/6k/12k Hz.
3. **UI shell** — `dist/public/index.html` (single-file rendered HTML, ~6,500 lines including embedded CSS/JS). Six scroll-snap sections (Mood / Schedule / Now playing / Profile / Custom EQ / Playground).
4. **Profile + gamification** — Per-minute mood buckets, focus streak, 8 unlockable achievements, mood-split-over-7-days chart.
5. **Sync + distribution** — Supabase schema + sync module (opt-in), GitHub Releases (signed installer), Vercel marketing site.

---

## Design decisions (the interesting ones)

### Mood color propagates app-wide via one CSS variable

A single `--mood-rgb` is written to `:root` every animation frame, driven by the lerp-smoothed motion controller that animates the particle wave. Every tintable surface (cards, pills, text, achievements, the section legend dot, the breathing-pulse glow) reads that variable. **One source of truth → 60+ surfaces tinting simultaneously, in lockstep with the wave.**

The cards take a 5–10 % alpha background wash; pill borders take 22–40 %; the hero title is a tinted-white blend at 32–60 % (heavy tuning to avoid washed-out illegibility on the dark wave band).

### The wave IS the EQ visualization

Most EQ apps show a separate EQ graph card. Calibrate's particle floor IS the EQ — each X-zone's height equals the band gain at that frequency, smoothly interpolated across the 8 bands. So the user is always seeing their EQ curve as the room's ambient motion.

### Asymmetric scroll-snap so cards never bleed

Every section is exactly `100vh` tall with internal `padding: 70px 16px`. `justify-content: center` puts the card at the visual viewport center (50vh) regardless of card height. Adjacent sections sit completely off-screen. The section legend tracks scroll position with an `IntersectionObserver` on multiple thresholds (0.35 / 0.55 / 0.75) so the active-dot pick is stable even during fast scrolling.

### Active mood chip uses a contrasting fill, not the ambient tint

Original mistake: I tinted the active chip with `--mood-rgb` like everything else, which made it indistinguishable from the ambient mood. Fix: scope the "selected" treatment to `.cal-chip[data-mood][data-active="true"]` (Auto sense excluded) and use the chip's own signature color (cruising = teal, locked = blue, drift = magenta, restless = amber) as a saturated fill with near-white text. The active chip now visually "lights up" against the tinted background regardless of which mood is currently set.

### Hero text tint scanner (the workaround)

The Dashboard's headline ("Calibrating · X%", "You're restless", etc.) is rendered by the precompiled React bundle with hashed Tailwind classes. CSS rules couldn't reliably reach it. Solution: a lightweight scanner module that on a 500 ms interval finds candidate `h1/h2/h3/span` elements with text matching a small regex set (`Calibrating`, `You're cruising`, `SENSING`, `FOCUSED`, etc.), tags them with `data-mood-title` / `-badge` / `-detail`, and writes `style.color` inline using the live `--mood-rgb`. Subsequent ticks just re-tint already-tagged elements — the scan is amortized.

### Per-song mood memory uses passive observation, not user labels

Every 5 seconds while a song is playing, sample `state.validatedMood` and increment the per-song count. After ≥8 samples (~40 s), expose the dominant as a recommendation. The user can override with a manual tag, but the default flow learns silently. **No upfront classification labor — the system figures out what works for you.**

### Privacy-local by default; sync is opt-in

`localStorage` is the source of truth. Supabase sync is a wrapper that mirrors writes when an auth session exists, no-ops when it doesn't. The anon key shipped in client code is safe because all five Supabase tables enforce `auth.uid() = user_id` RLS. A signed-out user gets a fully-functional local experience.

---

## Iteration journey (selected)

1. **First pass: detector + APO router only.** No UI beyond the React bundle inherited from the original Perplexity prototype.
2. **Mood tint propagation.** Started with cards only → realized the topbar pills, bottom pills, and hero text needed it too → built the CSS variable system and the React-bypass scanner.
3. **Layout debugging marathon.** Auto sense toggle had three separate bugs: (a) inverted ON/OFF semantics, (b) white halo bleeding through because the active-chip rule applied too broadly, (c) topbar Y-shift on toggle because `align-items: center` recentered as the content grew. Fixed iteratively — the third one required switching to `align-items: flex-start` with fixed `height: 38px`.
4. **Stats for nerds lag.** Panel was rebuilding its DOM every second (`innerHTML = …`), destroying CSS transitions. Refactored to build scaffold once and mutate `style.width` / `textContent` in place — fluid 0.7 s eases came back for free.
5. **Sparklines.** Replaced static bars with rolling SVG paths driven by per-metric 30-sample histories on `window.__sigHistory`. Each sparkline ends in a CSS-transitionable dot at the right edge (`transform: translate(...)` since SVG `cx`/`cy` aren't reliably transitionable).
6. **Breathing pulse.** Added when researching anxiety/ADHD self-regulation. 4 s in / 4 s out paced via a half-sine RAF loop, triggered on sustained restless mood, paired with a sub-bass (60 Hz, peak gain 0.045) bloom that feels like body resonance instead of an alarm-tone. One silent OS notification per session.
7. **Profile section + gamification.** 8 achievements unlocking at meaningful milestones (5 min focused, 30-min streak, 2-hour day, etc.). Per-minute mood-bucket time series with a 7-day rolling window.
8. **Custom EQ section.** First built with rotated `<input type="range">` — turned out Chromium's rotated hit-box is unreliable for drag, so replaced with a direct `pointerdown` / `pointermove` / `pointerup` handler. Now supports drag, scroll wheel, and arrow-key fine-tuning + Page Up/Down for big jumps.
9. **Playground.** Type test with monkeytype-style char rendering against an 18-prompt rotating corpus. Hover test with auto-cycling random bezier curves that the cursor traces. Both auto-cycle on completion — no buttons, no instructions, just the test.
10. **Distribution pivot.** Originally planned a full browser version on Vercel. Realized the unique value (system EQ, global keystroke capture, SMTC) only works in Electron. Vercel became marketing-only; Electron is the distributable.
11. **Public release.** Repo pushed to GitHub, MIT licensed with attribution clause. Marketing site deployed to Vercel. Supabase schema + sync infrastructure built and wired (Account panel inside Profile). One commit at a time, all in a single Cowork session.

---

## Tech stack

- **Frontend** — vanilla HTML/CSS/JS in `dist/public/index.html` overlaid on a precompiled React bundle (the original Perplexity prototype). Custom CSS-variable theming, no UI framework for the custom layer.
- **Desktop runtime** — Electron 28 (Chromium 120+).
- **Native input** — `uiohook-napi` for global keystroke + mouse capture across all apps.
- **System EQ** — Equalizer APO config file rewrites on mood change.
- **Now Playing** — Windows SMTC via PowerShell + WinRT bridge.
- **Backend (opt-in)** — Supabase Postgres + Auth + RLS.
- **Marketing site** — Vercel static deploy (single-file landing page).
- **Distribution** — electron-builder NSIS installer, GitHub Releases.

---

## What shipped (feature-complete list)

- ✅ Real-time mood detection from passive input
- ✅ System-wide EQ via Equalizer APO (8 bands)
- ✅ Custom EQ per mood + named user presets (drag/scroll/keyboard)
- ✅ Breathing pulse (visual + audio) with first-of-session notification
- ✅ Profile section with mood history + 8 achievements + 7-day split
- ✅ Per-song mood memory + "Optimize EQ for this song" button
- ✅ Section legend (right-edge dot navigator, scroll-tracked)
- ✅ Mood-tint propagation across 60+ surfaces
- ✅ Stats for nerds panel with live sparkline graphs
- ✅ Click feedback (Thock / Click / Wood synthesized via Web Audio, system-wide)
- ✅ Playground sandbox (Type + Hover, auto-cycling)
- ✅ Custom topbar + Auto sense pill with green ON-confirmation
- ✅ Supabase sync (schema + module + Account UI)
- ✅ Marketing landing page on Vercel
- ✅ Public GitHub repo, MIT licensed, attribution-respected

## What's next

- Signed Windows installer + auto-update
- macOS support (BlackHole + AU plugin)
- Linux support (PipeWire EQ)
- Mood-engine research collaboration (open invitation in CONTRIBUTING.md)
- Per-genre / artist-fingerprint EQ heuristics

---

## Honest critique (what I'd push back on if I were reviewing it)

1. **Hypothesis validation.** The "typing rhythm predicts cognitive state" claim has HCI literature support for stress and fatigue, but the specific four-mood classification is heuristic. Shipping with a clear "experimental" framing and an opt-in to share anonymized data for model improvement is the honest path.
2. **First-run friction.** 90 s of calibration before EQ tuning is meaningful is a lot. A "skip calibration with sensible defaults" path would help.
3. **EQ subjectivity.** "Optimal EQ for locked-in" is a guess. The Custom EQ section gives power users the override they need; sensible defaults ship for everyone else.
4. **Windows-only.** APO is the cleanest path to system-wide EQ on Windows; macOS and Linux equivalents are meaningfully harder. The market is narrower than it looks until those land.

---

## Credits

Built by **Sanketh Verma** ([@sankethverma07](mailto:sankethverma07@gmail.com)).

Engineering pair-programming with **Claude** (Anthropic) in Cowork mode — the design hypotheses, product calls, and aesthetic decisions are mine; the implementation work was collaborative across hundreds of micro-iterations in one continuous session.

The original Perplexity calibrate prototype provided the React shell that the custom UI overlays.

MIT licensed — fork, modify, redistribute. Attribution requested. See LICENSE for terms.
