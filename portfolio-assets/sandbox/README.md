# Calibrate · Sandbox

R3F + GSAP scene composer for the Calibrate hero shots.

## Run

From `mood-eq/`:

```
Sandbox-Dev.cmd
```

First run installs deps (~2 min). After that it's instant. Browser opens to http://localhost:5180.

## Architecture

- `src/App.jsx` — root: Canvas, Leva panel, dev/play mode, key bindings
- `src/components/ParticleWave.jsx` — 180×60 grid wave plane, ported from `dist/public/index.html` `startAlienwareParticles()`
- `src/components/EQCard.jsx` — Custom EQ panel in 3D, MeshTransmissionMaterial liquid glass
- `src/components/Cinematic.jsx` — post-processing pipeline (DOF / Bloom / CA / Noise / Vignette)
- `src/timeline.js` — GSAP keyframed shot sequencer

## Controls

| Key   | Action                                          |
|-------|-------------------------------------------------|
| Mouse | Orbit camera (edit mode)                        |
| `P`   | Play cinematic (GSAP timeline)                  |
| `E`   | Return to edit mode                             |
| `R`   | Replay current timeline                         |
| `S`   | Log camera position to console (paste into `timeline.js` SHOTS) |
| `H`   | Toggle FPS stats                                |

## Workflow

1. Open `Sandbox-Dev.cmd`. Browser opens.
2. In edit mode, drag to orbit. Use Leva panel (top right) to tweak wave params, glass IOR, DOF focus distance, etc.
3. Frame a good shot. Press `S`. Open DevTools console — copy the camera position + lookAt.
4. Open `src/timeline.js`, paste into a `SHOTS` entry.
5. Press `P` to play the sequence. `R` to replay. `E` to return to edit.
6. Iterate.

## Recording

When the cinematic looks right:
- Use OBS or Chrome's built-in screen recorder
- Set browser to fullscreen (F11)
- Press `P`
- Record the canvas region

For higher quality, build for production (`npm run build`) and run with `npm run preview` to drop dev-only React overhead.

© 2026 Sanketh Verma — sankethverma07@gmail.com
