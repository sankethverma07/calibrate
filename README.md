# Calibrate

> **Spotify EQ doesn't know how you feel. Calibrate does.**

Calibrate is a closed-loop biofeedback engine for your computer's audio. It reads your typing rhythm and mouse precision, infers your focus state in real time, and retunes the system equalizer to match — automatically, locally, with no wearables and no cloud.

Created and maintained by **Sanketh Verma** ([@sankethverma07](mailto:sankethverma07@gmail.com)) · MIT licensed · attribution required.

---

## What makes it different

Adaptive audio products today fall into three buckets:

- **Static genre EQ** — Spotify EQ presets, Boom 3D. The curve doesn't know it's you.
- **Pre-tuned focus audio** — Brain.fm, Focus@Will. Pours science *at* you, doesn't read *from* you.
- **Sensor-driven adaptive audio** — Endel. Reads heart rate, requires a wearable.

**Calibrate is the only closed-loop system that uses passive computer input — keystrokes you'd already be typing, mouse movements you'd already be making — as the biofeedback signal.** No hardware. No upload. The EQ chain reacts to your actual cognitive state, not your playlist or the time of day.

## How it works

1. **Calibrate watches you type and move your mouse** via uiohook for ~90 seconds to learn *your* baseline rhythm. Inter-keystroke timing, error rate, mouse jitter, sharp turns.
2. **A validated mood detector** classifies deviation from baseline into four states: **Cruising**, **Locked In**, **Drifting**, **Restless** — each with sub-levels (mild / standard / strong).
3. **Each mood maps to an evidence-based 8-band EQ curve**, applied system-wide via [Equalizer APO](https://sourceforge.net/projects/equalizerapo/) on Windows. That means YouTube, Spotify, Discord, and Zoom all get retuned in sync.
4. **A breathing pulse** activates automatically when restless mood is sustained — soft edge glows on the left/right of the window at 4 s in / 4 s out, paired with a sub-bass bloom (60 Hz, peak 0.045 gain). One silent OS notification per session.
5. **Per-song memory** learns which EQ curve correlates with your best focus state for each song. Click **Optimize** on Now Playing and Calibrate applies the curve you focus best with for that track.
6. **Gamification + history** track your focus minutes, longest streak, recoveries from restless, and a 7-day mood split. Eight achievements unlock as you use it.

## Privacy

- All signal processing runs locally. Keystrokes live in a per-word buffer that's discarded the moment the word resolves.
- No raw text, audio, or screen content leaves your machine.
- Aggregate state (mood-bucket counts, achievement timestamps) lives in `localStorage` by default.
- Supabase sync is **opt-in**. Signed-out users get a 100% local experience.

## Install

### Download (Windows)

Grab the latest installer from the [Releases](https://github.com/sankethverma07/calibrate/releases/latest) page. Calibrate is a single-window Electron app — install it, install [Equalizer APO](https://sourceforge.net/projects/equalizerapo/), route APO through your output device, and Calibrate writes its config file directly.

### Build from source

```cmd
git clone https://github.com/sankethverma07/calibrate.git
cd calibrate
npm install
cd electron && npm install
cd ..
"Launch Calibrate.cmd"
```

To build a distributable Windows installer:

```cmd
cd electron
npm run package:win
```

The NSIS installer is dropped in `electron/dist/`.

### Cross-platform

- **macOS**: planned via BlackHole + an Audio Unit plugin. Help wanted — see [CONTRIBUTING.md](./CONTRIBUTING.md).
- **Linux**: planned via PipeWire EQ. Help wanted.

## Configuration

Optional cross-device sync via Supabase. Edit `dist/public/runtime-env.js` directly:

```js
window.__CAL_SUPABASE_URL      = 'https://<your-project>.supabase.co';
window.__CAL_SUPABASE_ANON_KEY = '<your-anon-key>';
```

Without these, Calibrate runs 100 % local with no sync — the Account row in the Profile section auto-hides. See [`supabase/README.md`](./supabase/README.md) for one-time schema setup.

## Marketing site

The landing page in [`site/welcome.html`](./site/welcome.html) deploys to Vercel as a static page. See [`vercel.json`](./vercel.json). It's a marketing front for the desktop download — not a usable web app, because Calibrate's unique value (system-wide EQ, global keystroke capture) only exists in the desktop build.

## Roadmap

- [x] Real-time mood detection from passive input
- [x] System-wide EQ via Equalizer APO
- [x] Custom EQ per mood + named presets
- [x] Breathing pulse + gamified profile
- [x] Per-song mood memory + Optimize
- [x] Supabase sync (schema + module ready, Account UI wired)
- [x] Vercel marketing site + downloads page
- [ ] Signed Windows installer + auto-update
- [ ] macOS support (via BlackHole / AU plugin)
- [ ] Linux support (via PipeWire EQ)
- [ ] Mood-engine research collaboration — open invitation

## Open source & research

The mood engine in `client/src/lib/moodEngine.ts` is open for contributions. The core hypothesis — *keystroke dynamics + mouse precision can passively predict cognitive state with useful signal-to-noise* — has roots in HCI literature on keystroke biometrics, but the specific mood-classification thresholds are heuristic and need empirical validation.

If you're a researcher in HCI, affective computing, or audio cognition and want to validate the mood engine against ground-truth measures, please open an issue or email the author.

## Attribution

If you fork, redistribute, or build on Calibrate, **leave the author attribution intact**:

```
Calibrate — © 2026 Sanketh Verma <sankethverma07@gmail.com>
Originally published at https://github.com/<your-username>/calibrate
Licensed under MIT.
```

This is included in the LICENSE file and as a header comment in `dist/public/index.html` and `electron/src/main.js`.

## License

[MIT](./LICENSE) — © 2026 Sanketh Verma. See LICENSE for the full text.

---

*Built in Cowork mode with Claude as engineering co-pilot. Design hypotheses are the author's; the implementation is collaborative.*
