<p align="center">
<a href="https://dscvit.com">
	<img width="400" src="https://user-images.githubusercontent.com/56252312/159312411-58410727-3933-4224-b43e-4e9b627838a3.png#gh-light-mode-only" alt="GDSC VIT"/>
</a>
	<h2 align="center"> StreamBuddy </h2>
	<h4 align="center"> An automated clipping and AI processing tool for streamers. <h4>
</p>

---
[![Join Us](https://img.shields.io/badge/Join%20Us-Developer%20Student%20Clubs-red)](https://dsc.community.dev/vellore-institute-of-technology/)

## About The Project

StreamBuddy is an all-in-one desktop application designed to make clipping and editing stream highlights effortless. With a simple hotkey, it integrates directly with your OBS Replay Buffer to capture your latest gameplay, and then automatically runs it through an advanced AI pipeline to produce a polished, 9:16 vertical video perfect for TikTok, YouTube Shorts, or Reels. 

## Features
- **OBS Integration:** Automatically triggers and saves your OBS Replay Buffer with a global hotkey.
- **AI Subtitles:** Uses OpenAI's Whisper model to accurately transcribe your voice and burn styled subtitles directly into the video.
- **Auto-Framing:** Detects your OBS facecam layout to perfectly crop and overlay your webcam above the action.
- **Vertical Composition:** Converts standard 16:9 gameplay into an engaging 9:16 vertical format with blurred backgrounds.


<br>

## Dependencies
 - Node.js (v18+) and npm
 - Python 3.11+
 - FFmpeg
 - PyTorch & OpenAI Whisper
 - OpenCV (cv2)

## Running Locally

### 1. Setup the Python ML Pipeline
```bash
cd ml
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run the Electron App
```bash
cd app
npm install
npm run start
```

## Packaging for Production
TBI

## Contributors

- [Parzaan](https://github.com/Parzaan)
- [Syon](https://github.com/syon-vt)

<p align="center">
	Made with ❤ by <a href="https://dscvit.com">GDSC-VIT</a>
</p>
