# Contributing to Calibrate

Thanks for considering a contribution. Calibrate is maintained by **Sanketh Verma** ([@sankethverma07](mailto:sankethverma07@gmail.com)) and welcomes help.

## Where to start

The most valuable areas right now:

- **Mood-engine validation** — `client/src/lib/moodEngine.ts`. The current thresholds are heuristic. If you have HCI / affective-computing background, opening an issue to discuss validation methodology is a great first step.
- **macOS / Linux audio backends** — the EQ chain currently writes to Equalizer APO (Windows). Equivalents on macOS (BlackHole + AU plugin) and Linux (PipeWire EQ) are open.
- **Web companion** — a Vercel-deployable Next.js / Vite version with in-page input capture and Web-Audio EQ. Most of the UI code in `dist/public/index.html` is portable.
- **Achievement design** — eight tiles is a starting set. Propose more.

## Dev setup

```bash
# clone + install deps
git clone https://github.com/<your-username>/calibrate.git
cd calibrate
npm install
cd electron && npm install && cd ..

# launch (Windows)
"Launch Calibrate.cmd"
```

The active rendered UI lives in `dist/public/index.html` — it's the file the Electron window loads. The React bundle in `client/public/assets/index-DsMTLuBT.js` is a precompiled subsystem that Calibrate overlays its own logic on top of.

## Pull request guidelines

1. **One concern per PR.** Big "kitchen-sink" PRs are hard to review.
2. **Match the existing style.** No bundlers running on top-level HTML — keep edits readable as plain HTML/CSS/JS in `dist/public/index.html`.
3. **Test on Windows + Equalizer APO** if your change touches the audio chain.
4. **Update the README roadmap** if you ship a major feature.
5. **Keep the attribution header** in any file where it exists.

## Reporting bugs

Open an issue with:
- OS + version
- Calibrate version / commit SHA
- The console output from `View → Toggle Developer Tools → Console`
- Steps to reproduce

## Privacy stance

Calibrate is **privacy-local by default**. Any feature that exfiltrates user data to a remote server must:
- Be opt-in (off by default)
- Show a clear disclosure of what's sent and where
- Live behind a clearly-named feature flag

PRs that violate this stance will not be accepted.

## Code of conduct

Be kind. Disagree with ideas, not people. The author moderates with discretion.

## License

By submitting code, you agree it'll be licensed under the project's [MIT License](./LICENSE).
