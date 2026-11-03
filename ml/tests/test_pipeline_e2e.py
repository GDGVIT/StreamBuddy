"""End-to-end tests: run pipeline.py the way the Electron app does and check the clip.

These use the real Whisper model and ffmpeg, so they're slow (about a minute) and are
skipped automatically when either isn't installed. Run only these with: pytest -m e2e

The real-footage checks need a sample recording, which isn't kept in the repo: a
1080p gameplay clip with the webcam in the top-left corner and someone talking. Put
it at ml/examples/test.mp4 (ignored by git) or point STREAMBUDDY_SAMPLE_VIDEO at it.
Without one, those checks skip and the generated-video checks still run.

To check the standalone build the installer ships instead of pipeline.py, point
STREAMBUDDY_PIPELINE_EXE at it (app/bundle/pipeline/pipeline.exe, made by
build_pipeline.py).
"""

import importlib
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ML_DIR = Path(__file__).resolve().parent.parent
PIPELINE = ML_DIR / "pipeline.py"
PIPELINE_EXE = os.environ.get("STREAMBUDDY_PIPELINE_EXE")
SAMPLE = Path(
    os.environ.get("STREAMBUDDY_SAMPLE_VIDEO", ML_DIR / "examples" / "test.mp4")
)
FACECAM = "384:216:0:0"  # the app's default: webcam in the top-left corner
SAMPLE_SECONDS = 12

WHISPER_MODEL = Path.home() / ".cache" / "whisper" / "base.pt"
# conftest.py puts an empty placeholder in place of Whisper when it isn't installed,
# so check for the real thing by looking for its load_model function
HAS_TOOLS = (
    shutil.which("ffmpeg") is not None
    and shutil.which("ffprobe") is not None
    and hasattr(importlib.import_module("whisper"), "load_model")
)

pytestmark = [
    pytest.mark.e2e,
    pytest.mark.skipif(
        not HAS_TOOLS, reason="needs ffmpeg, ffprobe and openai-whisper"
    ),
    pytest.mark.skipif(
        not WHISPER_MODEL.exists(),
        reason="Whisper 'base' model not downloaded (run the pipeline once)",
    ),
]

# numpy comes with openai-whisper; without it there's nothing to run here anyway
media = pytest.importorskip(
    "tests.media", reason="needs numpy (installed with Whisper)"
)


class Run:  # pylint: disable=too-few-public-methods
    """The result of one pipeline run: its exit code, output lines and STAGE events."""

    def __init__(self, completed, source, output_dir, temp_dir):
        self.source = source
        self.temp_dir = temp_dir
        self.returncode = completed.returncode
        self.stdout = completed.stdout
        self.stderr = completed.stderr
        self.output_dir = output_dir
        self.stages = [
            line.strip()[len("STAGE:") :]
            for line in completed.stdout.splitlines()
            if line.startswith("STAGE:")
        ]

    def subtitle_cues(self):
        """The subtitles the run printed (pipeline.py logs the .srt it burns in)."""
        srt = self.stdout.split("DEBUG: srt content:\n", 1)[1].split("STAGE:", 1)[0]
        cues = []
        for start, end, text in re.findall(
            r"\d+\n(\S+) --> (\S+)\n(.*?)\n(?:\n|$)", srt, flags=re.S
        ):
            cues.append((to_seconds(start), to_seconds(end), text))
        return cues


def to_seconds(timestamp):
    """'00:00:01,420' → 1.42"""
    hours, minutes, rest = timestamp.split(":")
    seconds, millis = rest.split(",")
    return int(hours) * 3600 + int(minutes) * 60 + int(seconds) + int(millis) / 1000


def run_pipeline(video, output_dir, cwd, env_overrides=None):
    """Runs the pipeline as a separate process, exactly like main.js spawns it."""
    # A temporary folder of its own, to check that it cleans up after itself
    temp_dir = Path(cwd) / "temp"
    temp_dir.mkdir(exist_ok=True)
    env = {
        **os.environ,
        "PYTHONIOENCODING": "utf-8",
        "TMPDIR": str(temp_dir),
        "TEMP": str(temp_dir),
        "TMP": str(temp_dir),
        **(env_overrides or {}),
    }
    program = (
        [str(Path(PIPELINE_EXE).resolve())]
        if PIPELINE_EXE
        else [sys.executable, str(PIPELINE)]
    )
    completed = subprocess.run(
        [*program, str(video), FACECAM, str(output_dir)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        cwd=cwd,  # Electron doesn't run it from the ml folder
        env=env,
        timeout=600,
        check=False,
    )
    return Run(completed, Path(video), output_dir, temp_dir)


def make_video(path, *ffmpeg_args):
    """Builds a small test video with ffmpeg's built-in generators."""
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", *ffmpeg_args, str(path)],
        check=True,
        capture_output=True,
    )
    return path


@pytest.fixture(name="real_clip", scope="module")
def fixture_real_clip(tmp_path_factory):
    """One run on real streamer footage, shared by the checks below.

    The first 12 seconds of the sample are copied to a name like OBS gives replays
    (with spaces), into a folder that also has spaces, as on most Windows PCs.
    """
    if not SAMPLE.exists():
        pytest.skip(f"no sample recording at {SAMPLE} (see the top of this file)")
    root = tmp_path_factory.mktemp("real clip")
    source = root / "Replay 2026-11-03 13-47-26.mp4"
    make_video(source, "-i", str(SAMPLE), "-t", str(SAMPLE_SECONDS), "-c", "copy")
    output_dir = root / "My Clips"
    return run_pipeline(source, output_dir, cwd=root)


# ── Real footage ───────────────────────────────────────────────────────────────


def test_reports_every_stage_in_order(real_clip):
    """The app shows these stages in the dashboard, so they must all arrive."""
    assert real_clip.returncode == 0, real_clip.stderr[-2000:]
    expected_output = real_clip.output_dir / f"polished_{real_clip.source.name}"
    assert real_clip.stages == ["TRANSCRIBING", "FINALIZING", f"DONE:{expected_output}"]


def test_output_is_a_vertical_1080x1920_video_with_the_original_audio(real_clip):
    """Shorts/Reels/TikTok format: 9:16, H.264, same length, audio kept."""
    output = real_clip.output_dir / f"polished_{real_clip.source.name}"
    out = media.probe(output)
    source = media.probe(real_clip.source)
    assert (out["width"], out["height"]) == (1080, 1920)
    assert out["video_codec"] == "h264"
    assert out["audio_codecs"] == ["aac"]
    assert out["fps"] == source["fps"]
    assert abs(out["duration"] - source["duration"]) < 0.25


def test_transcribes_what_the_streamer_says(real_clip):
    """Whisper hears the streamer; words are in order and within the clip."""
    cues = real_clip.subtitle_cues()
    assert len(cues) >= 5, "expected the sample to have someone talking"
    spoken = " ".join(re.sub(r"<[^>]+>", "", text) for _, _, text in cues)
    assert re.search(r"[A-Za-z]{3}", spoken)  # real words, not just punctuation
    for start, end, _ in cues:
        assert 0 <= start < end <= SAMPLE_SECONDS + 0.5
    starts = [start for start, _, _ in cues]
    assert starts == sorted(starts)


def test_every_subtitle_highlights_exactly_one_word(real_clip):
    """The karaoke effect: one yellow word per cue."""
    for _, _, text in real_clip.subtitle_cues():
        assert text.count('<font color="#ffff00">') == 1, text


def test_webcam_is_placed_at_the_top(real_clip):
    """The facecam corner of the recording, scaled to 900px wide, sits at y=50."""
    output = real_clip.output_dir / f"polished_{real_clip.source.name}"
    expected = media.frame(
        real_clip.source, 5.0, f"scale=1920:1080,crop={FACECAM},scale=900:-1"
    )
    actual = media.frame(output, 5.0)[50 : 50 + expected.shape[0], 90:990]
    assert media.similarity(actual, expected) > 0.9


def test_gameplay_is_centred_between_webcam_and_subtitles(real_clip):
    """The middle 1080x1080 of the game fills the centre of the vertical frame."""
    output = real_clip.output_dir / f"polished_{real_clip.source.name}"
    game = media.frame(real_clip.source, 5.0, "scale=1920:1080,crop=1080:1080:420:0")
    actual = media.frame(output, 5.0)
    # Compare a band that the webcam and subtitles don't cover
    assert media.similarity(actual[600:1150], game[180:730]) > 0.9


def test_background_above_and_below_is_blurred(real_clip):
    """The empty space is a blurred copy of the game, not black bars."""
    output = media.frame(
        real_clip.output_dir / f"polished_{real_clip.source.name}", 5.0
    )
    # The same background without the blur, for comparison
    unblurred = media.frame(
        real_clip.source, 5.0, "scale=1920:1080,scale=-1:1920,crop=1080:1920"
    )
    background = output[1560:1900]
    assert background.mean() > 20  # not black
    assert media.sharpness(background) < 0.1 * media.sharpness(unblurred[1560:1900])


def test_subtitles_are_burned_in_with_the_yellow_highlight(real_clip):
    """At a moment when a word is spoken, the yellow highlight appears on screen."""
    output = real_clip.output_dir / f"polished_{real_clip.source.name}"
    start, end, _ = max(real_clip.subtitle_cues(), key=lambda c: c[1] - c[0])
    moment = (start + end) / 2
    rendered = media.frame(output, moment)[1150:1500]
    # The same area of the plain gameplay, to rule out yellow that's part of the game
    game = media.frame(real_clip.source, moment, "scale=1920:1080,crop=1080:1080:420:0")
    assert media.yellow_pixels(rendered) > media.yellow_pixels(game[730:1080]) + 300


def test_cleans_up_its_temporary_subtitle_file(real_clip):
    """The .srt is only needed while burning the video in."""
    assert real_clip.returncode == 0
    assert not list(real_clip.temp_dir.iterdir())
    assert not (ML_DIR / "temp_subs.srt").exists()


# ── Other recordings streamers will have ───────────────────────────────────────


def test_handles_720p_recordings(tmp_path):
    """OBS is often set to 720p; the crops are in 1080p terms, so it's scaled first."""
    source = make_video(
        tmp_path / "Replay 720p.mp4",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=1280x720:rate=30",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=48000:cl=stereo",
        "-t",
        "3",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-shortest",
    )
    run = run_pipeline(source, tmp_path / "out", cwd=tmp_path)
    assert run.stages[-1].startswith("DONE:"), run.stdout[-2000:]
    out = media.probe(tmp_path / "out" / "polished_Replay 720p.mp4")
    assert (out["width"], out["height"]) == (1080, 1920)


def test_reports_an_error_for_a_recording_without_audio(tmp_path):
    """Instead of crashing, the app is told the audio couldn't be transcribed."""
    source = make_video(
        tmp_path / "silent.mp4",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=1920x1080:rate=30",
        "-t",
        "2",
        "-c:v",
        "libx264",
    )
    run = run_pipeline(source, tmp_path / "out", cwd=tmp_path)
    assert run.stages == ["TRANSCRIBING", "ERROR:Couldn't transcribe the clip's audio."]
    assert not (tmp_path / "out" / "polished_silent.mp4").exists()
    assert not list(run.temp_dir.iterdir())


def test_reports_an_error_when_the_recording_is_missing(tmp_path):
    """e.g. OBS saved somewhere else, or the file was moved before processing."""
    run = run_pipeline(tmp_path / "nowhere.mp4", tmp_path / "out", cwd=tmp_path)
    assert run.stages == ["ERROR:The recording couldn't be found."]
