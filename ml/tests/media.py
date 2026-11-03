"""ffmpeg/ffprobe helpers the end-to-end tests use to inspect videos."""

import json
import subprocess

import numpy as np


def probe(path):
    """Returns ffprobe's description of a video's streams and container."""
    out = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_streams",
            "-show_format",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    info = json.loads(out)
    video = next(s for s in info["streams"] if s["codec_type"] == "video")
    audio = [s for s in info["streams"] if s["codec_type"] == "audio"]
    return {
        "width": video["width"],
        "height": video["height"],
        "video_codec": video["codec_name"],
        "fps": video["r_frame_rate"],
        "audio_codecs": [s["codec_name"] for s in audio],
        "duration": float(info["format"]["duration"]),
    }


def frame(path, seconds, video_filter=None):
    """Decodes the frame at `seconds` (after an optional filter) as an RGB array."""
    command = ["ffmpeg", "-v", "error", "-ss", f"{seconds:.3f}", "-i", str(path)]
    if video_filter:
        command += ["-vf", video_filter]
    command += ["-frames:v", "1", "-f", "image2pipe", "-vcodec", "ppm", "-"]
    data = subprocess.run(command, check=True, capture_output=True).stdout
    return _read_ppm(data)


def _read_ppm(data):
    """Parses a binary PPM (what ffmpeg writes for -vcodec ppm)."""
    header = []
    pos = 0
    while len(header) < 4:
        end = data.index(b"\n", pos)
        line = data[pos:end]
        pos = end + 1
        if not line.startswith(b"#"):
            header.extend(line.split())
    width, height = int(header[1]), int(header[2])
    pixels = np.frombuffer(data[pos : pos + width * height * 3], dtype=np.uint8)
    return pixels.reshape(height, width, 3)


def similarity(a, b):
    """Correlation of two same-sized images in grayscale: 1 = identical, ~0 = unrelated."""
    gray_a = a.astype(np.float64).mean(axis=2).ravel()
    gray_b = b.astype(np.float64).mean(axis=2).ravel()
    return float(np.corrcoef(gray_a, gray_b)[0, 1])


def sharpness(image):
    """Variance of the Laplacian: high for detailed areas, low for blurred ones."""
    gray = image.astype(np.float64).mean(axis=2)
    lap = (
        -4 * gray[1:-1, 1:-1]
        + gray[:-2, 1:-1]
        + gray[2:, 1:-1]
        + gray[1:-1, :-2]
        + gray[1:-1, 2:]
    )
    return float(lap.var())


def yellow_pixels(image):
    """Counts pixels close to the #ffff00 used for the highlighted subtitle word."""
    r = image[..., 0].astype(int)
    g = image[..., 1].astype(int)
    b = image[..., 2].astype(int)
    return int(((r > 200) & (g > 200) & (b < 90)).sum())
