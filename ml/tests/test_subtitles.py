"""Unit tests for the subtitle helpers in pipeline.py (no Whisper or ffmpeg needed)."""

import io
import sys

import pytest

import pipeline


def word(text, start, end):
    """One word as Whisper reports it with word_timestamps=True."""
    return {"word": text, "start": start, "end": end}


def read_cues(path):
    """Parses an .srt file into (index, start, end, text) tuples."""
    with open(path, encoding="utf-8") as f:
        blocks = [b for b in f.read().split("\n\n") if b.strip()]
    cues = []
    for block in blocks:
        index, timing, *text = block.split("\n")
        start, end = timing.split(" --> ")
        cues.append((int(index), start, end, "\n".join(text)))
    return cues


@pytest.mark.parametrize(
    "seconds, expected",
    [
        (0, "00:00:00,000"),
        (1.5, "00:00:01,500"),
        (61.25, "00:01:01,250"),
        (3600, "01:00:00,000"),
        (3725.042, "01:02:05,042"),
        # Rounding to the next millisecond carries into seconds, minutes and hours
        (59.9996, "00:01:00,000"),
        (3599.9996, "01:00:00,000"),
    ],
)
def test_format_timestamp(seconds, expected):
    """Timestamps use SubRip's HH:MM:SS,mmm format, including carry-over."""
    assert pipeline.format_timestamp(seconds) == expected


def test_no_speech_writes_a_valid_placeholder(tmp_path):
    """ffmpeg's subtitles filter needs at least one cue, even for a silent clip."""
    srt = tmp_path / "subs.srt"
    pipeline.create_srt_file({"segments": []}, str(srt))
    assert read_cues(srt) == [(1, "00:00:00,000", "00:00:02,000", " ")]


def test_words_are_shown_three_at_a_time_with_the_spoken_word_highlighted(tmp_path):
    """Each word gets its own cue; the current word is yellow, the others white."""
    words = [
        word(" I'll", 0.0, 0.4),
        word(" teleport", 0.4, 0.9),
        word(" to", 0.9, 1.1),
        word(" anybody", 1.2, 1.7),
    ]
    srt = tmp_path / "subs.srt"
    pipeline.create_srt_file({"segments": [{"words": words}]}, str(srt))
    cues = read_cues(srt)

    assert [c[3] for c in cues] == [
        '<font color="#ffff00">I\'ll</font> teleport to',
        'I\'ll <font color="#ffff00">teleport</font> to',
        'I\'ll teleport <font color="#ffff00">to</font>',
        '<font color="#ffff00">anybody</font>',
    ]
    assert [c[0] for c in cues] == [1, 2, 3, 4]


def test_cues_run_into_each_other_to_avoid_flicker(tmp_path):
    """Within a group, a cue ends exactly when the next word starts."""
    words = [word("a", 0.0, 0.2), word("b", 0.5, 0.7), word("c", 0.9, 1.4)]
    srt = tmp_path / "subs.srt"
    pipeline.create_srt_file({"segments": [{"words": words}]}, str(srt))
    timings = [(c[1], c[2]) for c in read_cues(srt)]
    assert timings == [
        ("00:00:00,000", "00:00:00,500"),
        ("00:00:00,500", "00:00:00,900"),
        ("00:00:00,900", "00:00:01,400"),
    ]


def test_zero_length_words_still_get_a_visible_cue(tmp_path):
    """Whisper sometimes gives a word no duration; it's stretched to 0.1s."""
    words = [word("glitch", 2.0, 2.0)]
    srt = tmp_path / "subs.srt"
    pipeline.create_srt_file({"segments": [{"words": words}]}, str(srt))
    _, start, end, _ = read_cues(srt)[0]
    assert (start, end) == ("00:00:02,000", "00:00:02,100")


def test_segments_without_word_timings_fall_back_to_whole_lines(tmp_path):
    """Older Whisper output without word timings still produces subtitles."""
    segments = [{"start": 1.0, "end": 3.5, "text": "  GG everyone  "}]
    srt = tmp_path / "subs.srt"
    pipeline.create_srt_file({"segments": segments}, str(srt))
    assert read_cues(srt) == [(1, "00:00:01,000", "00:00:03,500", "GG everyone")]


def test_non_english_speech_is_written_as_utf8(tmp_path):
    """Streamers speak every language; the file must keep those characters."""
    words = [word("नमस्ते", 0.0, 0.5), word("ゲーム", 0.5, 1.0), word("🔥", 1.0, 1.2)]
    srt = tmp_path / "subs.srt"
    pipeline.create_srt_file({"segments": [{"words": words}]}, str(srt))
    text = srt.read_text(encoding="utf-8")
    assert "नमस्ते" in text and "ゲーム" in text and "🔥" in text


def test_output_switches_to_utf8_on_a_legacy_windows_console(monkeypatch):
    """Printing a transcript must not crash when stdout uses the cp1252 code page."""
    raw = io.BytesIO()
    legacy_stdout = io.TextIOWrapper(raw, encoding="cp1252")
    monkeypatch.setattr(sys, "stdout", legacy_stdout)

    pipeline.use_utf8_output()
    print("ゲーム 🔥", flush=True)

    assert raw.getvalue().decode("utf-8").strip() == "ゲーム 🔥"
