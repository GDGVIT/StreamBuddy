<p align="center">
<a href="https://dscvit.com">
	<img width="400" src="https://user-images.githubusercontent.com/56252312/159312411-58410727-3933-4224-b43e-4e9b627838a3.png#gh-light-mode-only" alt="GDSC VIT"/>
</a>
	<h2 align="center"> StreamBuddy </h2>
	<h4 align="center"> An automated clipping and AI processing tool for streamers. </h4>
</p>

---
[![Join Us](https://img.shields.io/badge/Join%20Us-Developer%20Student%20Clubs-red)](https://dsc.community.dev/vellore-institute-of-technology/)

## About The Project

StreamBuddy is a desktop app that turns your best stream moments into short vertical
videos. Press one hotkey while you play: StreamBuddy saves the last stretch of gameplay
from your OBS Replay Buffer, transcribes what you said, and builds a 9:16 clip with your
webcam on top, the game in the middle and subtitles underneath, ready for TikTok,
YouTube Shorts or Reels.

## Features
- **One-key clipping:** a global hotkey (F5 by default) saves your OBS Replay Buffer and starts the clip, even while your game is in focus. Press it again to cancel.
- **AI subtitles:** OpenAI's Whisper transcribes your voice on your own PC, and each word lights up in yellow as you say it.
- **Vertical layout:** your webcam (from the top-left corner of your stream layout) sits above the centre of the gameplay, over a blurred copy of the game instead of black bars.
- **Clip library:** browse, search, rename, export and delete your clips. Each account only sees the clips it made.
- **Accounts:** sign in with email or Google, with email confirmation and password reset.

<br>

## Download

Get **StreamBuddy-Setup.exe** from the [latest release](https://github.com/GDGVIT/StreamBuddy/releases/latest)
and run it. It installs in one click and opens StreamBuddy when it's done. Everything
it needs, including the AI model and FFmpeg, comes with it.

**Requirements:** Windows 10 or 11 (64-bit) and [OBS Studio](https://obsproject.com) 28 or newer.

The installer isn't code-signed yet, so Windows may say "Windows protected your PC" the
first time. Click **More info → Run anyway**.

### Setting up OBS

StreamBuddy talks to OBS through its built-in WebSocket server. In OBS:

1. **Tools → WebSocket Server Settings:** tick **Enable WebSocket server**, keep the port at **4455**, and untick **Enable Authentication** (StreamBuddy can't send a password yet).
2. **Settings → Output → Replay Buffer:** tick **Enable Replay Buffer**.
3. Put your webcam in the **top-left corner** of your scene, where StreamBuddy looks for it.

StreamBuddy's setup checks the connection and explains what to change if something's off.

## Tech Stack
- **Desktop app:** Electron, React, Tailwind CSS, Vite and Electron Forge
- **Accounts:** Supabase (email and Google sign-in, plus an Edge Function for deleting accounts)
- **Clip pipeline:** Python, OpenAI Whisper on PyTorch, and FFmpeg
- **Tests:** Vitest and Testing Library for the app, pytest for the pipeline

## Project Structure
```
app/        Electron app (main process in src/main.js, screens in src/components)
ml/         Clip pipeline: transcription, subtitles and the vertical video (pipeline.py)
supabase/   Supabase settings and the delete-account Edge Function
web/        Email templates and the email confirmation page
```

## Running Locally

You'll need Windows, [Node.js](https://nodejs.org) 20 or newer, Python 3.11 or newer,
[FFmpeg](https://ffmpeg.org) on your `PATH`, and OBS set up as above.

### 1. Set up the Python ML pipeline
```powershell
cd ml
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```
Keep this terminal's venv active when you start the app, because the app runs the
pipeline with the Python on your `PATH`.

### 2. Add the Supabase keys
Create `app/.env.local` with your project's URL and publishable key (Supabase dashboard →
Project Settings → API):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```
Git ignores this file, so the keys never get committed.

### 3. Run the Electron app
```powershell
cd app
npm install
npm run start
```

## Tests
```powershell
cd app
npm test                          # app: main process and every screen
cd ..\ml
python -m pytest -m "not e2e"     # pipeline: quick unit tests
python -m pytest -m e2e           # pipeline: full runs on real footage
```
See [TESTING.md](TESTING.md) for what each suite covers and the sample recording the
end-to-end tests use.

## Packaging for Production
This builds `StreamBuddy-Setup.exe`, a one-click Windows installer. It brings its own
copy of the pipeline, FFmpeg and the Whisper model, so players don't need Python or
FFmpeg installed.

Build it on Windows, from the root of the repository, with the ML venv set up as above:

```powershell
ml\venv\Scripts\activate
pip install -r ml\requirements-dev.txt
cd app
npm run bundle:pipeline   # builds the pipeline into app/bundle (takes a few minutes)
npm run make              # builds the installer
```

The installer is written to `app/out/make/squirrel.windows/x64/StreamBuddy-Setup.exe`.
`app/.env.local` must be there when you run `npm run make`, because the Supabase URL and
key are built into the app. Run `npm run bundle:pipeline` again whenever `ml/pipeline.py`
or its requirements change.

## Contributors

- [Parzaan](https://github.com/Parzaan)
- [Syon](https://github.com/syon-vt)

<p align="center">
	Made with ❤ by <a href="https://dscvit.com">GDSC-VIT</a>
</p>
