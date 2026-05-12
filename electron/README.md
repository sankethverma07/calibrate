# Mood Desktop App

Electron wrapper for Mood that adds native capabilities:

## Features
- **System-wide EQ** (Windows) — writes filter configs to Equalizer APO
- **Now Playing** — detects currently playing track from any app (Spotify, YouTube, Apple Music, etc.)
- **Global input hooks** — senses keyboard/mouse even when app is in background
- **Google Calendar** — OAuth integration for real calendar events

## Prerequisites

### Windows
1. Install [Equalizer APO](https://sourceforge.net/projects/equalizerapo/) for system-wide EQ
2. During installation, select your audio output device

### macOS
- Now Playing works automatically via AppleScript for Spotify and Apple Music
- System-wide EQ requires [eqMac](https://eqmac.app/) or [SoundSource](https://rogueamoeba.com/soundsource/)

### Google Calendar (optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project, enable Google Calendar API
3. Create OAuth 2.0 credentials (Desktop app type)
4. Set environment variables:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

## Development

```bash
cd electron
npm install

# Start the web dev server first (from project root)
cd .. && npm run dev

# Then start Electron (in another terminal)
cd electron
NODE_ENV=development npm start
```

## Production Build

```bash
# Build the web UI
cd .. && npm run build

# Package the desktop app
cd electron
npm run package:win    # Windows .exe
npm run package:mac    # macOS .dmg
npm run package:linux  # Linux .AppImage
```

## Architecture

```
electron/
├── src/
│   ├── main.js        # Main process — EQ, Now Playing, Calendar, Input hooks
│   └── preload.js     # Bridge between main process and React renderer
├── package.json       # Electron deps + build config
└── README.md

client/src/lib/
└── nativeBridge.ts    # Type-safe API for React to call native features
```

The React app checks `window.moodBridge` at runtime. If it exists (Electron), native features are enabled. If not (web browser), the app runs in demo mode with simulated data.
