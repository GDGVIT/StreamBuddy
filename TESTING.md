# Testing

StreamBuddy has two test suites: one for the Electron app and one for the ML
pipeline. Both run on every pull request (see `.github/workflows/test.yml`).

## App (`app/`)

Uses [Vitest](https://vitest.dev) and [Testing Library](https://testing-library.com).

```bash
cd app
npm test            # run everything once
npm run test:watch  # re-run on save
```

- `test/main/` covers the main process without Electron: clip ownership, the clip
  folder (list, export, rename, delete), reading the pipeline's progress output,
  and the local server that finishes Google sign-in.
- `test/renderer/` renders the React screens in a simulated browser with a fake
  `window.electronAPI` and a fake Supabase client: login, sign-up, password reset,
  Google sign-in, session restore, onboarding, the dashboard, settings and export.

## ML pipeline (`ml/`)

Uses [pytest](https://pytest.org).

```bash
cd ml
pip install -r requirements-dev.txt
python -m pytest -m "not e2e"   # quick unit tests (no Whisper needed)
python -m pytest -m e2e         # full run on real footage (~1 minute)
```

The end-to-end tests run `pipeline.py` the same way the app does and check the
finished clip: the stages it reports, 1080x1920 H.264 output with the original
audio, the transcript, the webcam at the top, the gameplay in the middle, the
blurred background and the burned-in subtitles with the yellow highlight. They
also cover 720p recordings, recordings without audio and missing files.

They need ffmpeg, `openai-whisper` and the Whisper `base` model (downloaded the
first time the pipeline runs), and skip themselves if any of those are missing.

### Sample recording

The real-footage checks use the first 12 seconds of a sample recording, which
isn't kept in the repo. Use any 1080p gameplay clip with the webcam in the
top-left corner and someone talking, and either:

- save it as `ml/examples/test.mp4` (git ignores that folder), or
- set `STREAMBUDDY_SAMPLE_VIDEO` to its path.

Without a sample those checks are skipped (as in CI); the checks that build their
own test videos still run.
