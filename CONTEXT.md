# Mood — AI Equalizer: Project Context

## What This Project Is
A web app called "Mood — AI Equalizer" that:
1. Captures system audio via Web Audio API (`getDisplayMedia`)
2. Runs it through an 8-band parametric EQ (BiquadFilterNode peaking)
3. Visualizes EQ bars in real-time (AnalyserNode + requestAnimationFrame)
4. Eventually detects mood from audio and auto-adjusts EQ bands

## Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express + tsx (dev server)
- **Port**: 5000
- **Location**: `C:\Users\sanke\Downloads\mood-eq\`

## How to Run (PowerShell)
```powershell
cd C:\Users\sanke\Downloads\mood-eq
npm install
npm run dev
```
Then open http://localhost:5000

## Files Already Created

### `client/src/lib/audioPipeline.ts`
Core Web Audio pipeline — singleton export:
- `getDisplayMedia` with 1×1 video workaround (required for audio-only capture)
- 8 `BiquadFilterNode` nodes (type: "peaking") for EQ bands
- `AnalyserNode` for real-time visualization
- Exports: `startAudio()`, `stopAudio()`, `setGain(bandIndex, dB)`, `getFrequencyData()`

### `client/src/pages/Home.tsx`
Main UI — fully rewritten:
- Visual EQ bars with `linear-gradient` animation driven by RAF loop
- 4-state audio capture panel: idle → requesting → active → error
- 8 EQ band sliders (32Hz to 16kHz)
- Connects to `audioPipeline.ts`

### `vercel.json`
```json
{
  "buildCommand": "npm run build:client",
  "outputDirectory": "dist/public",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### `DEPLOY.md`
Step-by-step: git init → push to GitHub → import to Vercel

### `start-dev.bat` and `run-server.vbs`
Launcher scripts (blocked by Windows security policy — ignore these)

## What's Working
- Project structure is complete
- All source files written
- `npm install` runs successfully
- `npm run dev` starts the server at http://localhost:5000

## What Still Needs to Be Done

### 1. Verify the app works end-to-end
- Open http://localhost:5000
- Check EQ bars render correctly
- Test "Connect Audio" button — should request screen share with audio
- Verify EQ visualization responds to audio input

### 2. Fix any bugs found during testing
- The audio pipeline uses `getDisplayMedia` — browser may show a screen share picker; user should select a tab/window and check "Share audio"
- Some browsers require a user gesture before `AudioContext` starts

### 3. GitHub + Vercel deployment
```bash
# In mood-eq folder:
git init
git add .
git commit -m "Initial commit"
# Create repo at github.com/new named mood-eq, then:
git remote add origin https://github.com/sankethverma07/mood-eq.git
git push -u origin main
```
Then go to vercel.com/new → Import GitHub repo → Deploy (vercel.json handles config)

### 4. Optional: Mood detection
- Analyze frequency data from AnalyserNode
- Map dominant frequency ranges to moods (e.g., bass-heavy = energetic, mid-heavy = warm)
- Auto-adjust EQ band gains based on detected mood

### 5. Optional: Supabase integration
- Store mood history with timestamps
- Requires Supabase project + env vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)

## Key Technical Notes
- `getDisplayMedia` requires HTTPS in production (Vercel handles this automatically)
- In development (localhost), it works over HTTP
- The `&&` operator doesn't work in PowerShell — use separate commands
- User's email: sankethverma07@gmail.com

## Current Status
Server launches successfully with `npm install` then `npm run dev`. App is at http://localhost:5000. Needs end-to-end testing and then GitHub/Vercel deployment.
