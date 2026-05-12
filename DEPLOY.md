# Mood — AI Equalizer · Deploy Guide

## Step 1 — Push to GitHub (run in Git Bash inside this folder)

```bash
git init
git add -A
git commit -m "feat: Mood AI Equalizer — real EQ pipeline + Vercel deploy"
git branch -M main

# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/mood-eq.git
git push -u origin main
```

Create the **mood-eq** repo at https://github.com/new (make it Public, no README).

---

## Step 2 — Deploy to Vercel (takes ~2 minutes)

1. Go to **https://vercel.com/new**
2. Click **"Import Git Repository"** → select `mood-eq`
3. Vercel auto-detects the settings from `vercel.json`:
   - **Build Command:** `npm run build:client`
   - **Output Directory:** `dist/public`
4. Click **Deploy**

Your app will be live at `https://mood-eq.vercel.app` (or similar).

---

## Step 3 — Using the Audio EQ

Once the app is open in Chrome:

1. Click **"Connect Audio"** in the bottom-right panel
2. In the Chrome share dialog that appears:
   - Pick the tab or window playing audio, **OR**
   - For all system audio: check **"Also share system audio"** at the bottom
3. Click **Share**

The 8-band EQ will now route your audio through the mood-based equalizer in real time.
The EQ preset shifts automatically as your mood changes (or you can pick one manually).

---

## Local Dev (optional)

```bash
npm install
npm run dev
```

App runs at http://localhost:5000
