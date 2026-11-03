"""Builds everything the installed app needs to make clips, into app/bundle/.

Gamers won't have Python, Whisper or ffmpeg installed, so the installer brings its
own. forge.config.js copies these folders into the app's resources folder:

    app/bundle/pipeline/  pipeline.py as a standalone program (PyInstaller), with
                          Python, Whisper and PyTorch inside
    app/bundle/ffmpeg/    ffmpeg, which Whisper and the pipeline both run
    app/bundle/whisper/   the Whisper "base" model, so nothing downloads on first use

Run it with the Python that has requirements.txt and requirements-dev.txt installed
(the ml venv), on the same OS as the installer you're making:

    python ml/build_pipeline.py

ffmpeg is taken from PATH, or from the FFMPEG environment variable if that's set.
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

ML_DIR = Path(__file__).resolve().parent
BUNDLE = ML_DIR.parent / "app" / "bundle"
BUILD = ML_DIR / "build"
EXE = ".exe" if sys.platform == "win32" else ""

# Installed alongside Whisper or for development, but never imported by the pipeline
UNUSED_MODULES = [
    "torchvision",
    "torchaudio",
    "tkinter",
    "matplotlib",
    "IPython",
    "pytest",
]


def fresh_folder(path):
    """An empty folder at path, replacing whatever was there."""
    shutil.rmtree(path, ignore_errors=True)
    path.mkdir(parents=True)
    return path


def build_pipeline():
    """Freezes pipeline.py into a folder with its own Python (a "onedir" build).

    A single-file build would unpack about a gigabyte to a temporary folder every
    time a clip is made, so the folder version starts much faster.
    """
    print("Building the pipeline with PyInstaller (takes a few minutes)...", flush=True)
    subprocess.run(
        [
            sys.executable,
            "-m",
            "PyInstaller",
            str(ML_DIR / "pipeline.py"),
            "--name",
            "pipeline",
            "--onedir",
            "--console",  # the app reads its output; main.js keeps the window hidden
            "--noconfirm",
            "--clean",
            "--distpath",
            str(BUILD / "dist"),
            "--workpath",
            str(BUILD / "work"),
            "--specpath",
            str(BUILD),
            "--collect-data",
            "whisper",  # mel filters and tokenizer files
            *[f"--exclude-module={name}" for name in UNUSED_MODULES],
        ],
        check=True,
    )
    target = BUNDLE / "pipeline"
    shutil.rmtree(target, ignore_errors=True)
    shutil.copytree(BUILD / "dist" / "pipeline", target)


# Microsoft's C++ runtime, which PyTorch needs. Many PCs already have it, but a fresh
# Windows install may not, so copies go in next to the pipeline (Microsoft allows this)
VC_RUNTIME = [
    "msvcp140.dll",
    "msvcp140_1.dll",
    "vcruntime140.dll",
    "vcruntime140_1.dll",
]


def add_vc_runtime():
    """Puts any C++ runtime DLLs PyInstaller didn't pick up into the pipeline folder."""
    if sys.platform != "win32":
        return
    internal = BUNDLE / "pipeline" / "_internal"
    system32 = Path(os.environ.get("SystemRoot", r"C:\Windows")) / "System32"
    for name in VC_RUNTIME:
        if not (internal / name).exists() and (system32 / name).exists():
            shutil.copy2(system32 / name, internal / name)
    missing = [name for name in VC_RUNTIME if not (internal / name).exists()]
    if missing:
        print(f"Warning: couldn't find {', '.join(missing)} to include.", flush=True)


def copy_ffmpeg():
    """Copies ffmpeg, plus its DLLs if it's a "shared" build that needs them."""
    found = os.environ.get("FFMPEG") or shutil.which("ffmpeg")
    if not found:
        sys.exit("ffmpeg wasn't found. Put it on PATH or set FFMPEG to ffmpeg's path.")
    source = Path(found).resolve()
    target = fresh_folder(BUNDLE / "ffmpeg")
    shutil.copy2(source, target / f"ffmpeg{EXE}")
    for dll in source.parent.glob("*.dll"):
        shutil.copy2(dll, target)
    # FFmpeg builds with x264 are GPL-licensed, which asks that the licence and a way to
    # get the source come with the program
    (target / "README.txt").write_text(
        "This is FFmpeg (https://ffmpeg.org), which StreamBuddy uses to read and encode\n"
        "video. It is licensed under the GNU General Public License. Its source code is\n"
        "available at https://ffmpeg.org/download.html, and `ffmpeg -buildconf` lists\n"
        "the options this copy was built with.\n",
        encoding="utf-8",
    )
    print(f"Copied ffmpeg from {source}", flush=True)


def copy_model():
    """Copies the Whisper model, downloading it first if this PC doesn't have it."""
    source = Path.home() / ".cache" / "whisper" / "base.pt"
    if not source.exists():
        import whisper  # pylint: disable=import-outside-toplevel

        print("Downloading the Whisper model...", flush=True)
        whisper.load_model("base", device="cpu")
    target = fresh_folder(BUNDLE / "whisper")
    shutil.copy2(source, target / "base.pt")


def smoke_test():
    """Starts the built program once, to prove it runs without this Python."""
    program = BUNDLE / "pipeline" / f"pipeline{EXE}"
    completed = subprocess.run(
        [str(program), str(BUILD / "no-such-recording.mp4")],
        capture_output=True,
        text=True,
        timeout=300,
        check=False,
    )
    if "STAGE:ERROR:The recording couldn't be found." not in completed.stdout:
        print(completed.stdout, completed.stderr, sep="\n")
        sys.exit("The built pipeline didn't start properly (output above).")
    print(f"The pipeline starts on its own: {program}", flush=True)


if __name__ == "__main__":
    BUNDLE.mkdir(parents=True, exist_ok=True)
    build_pipeline()
    add_vc_runtime()
    copy_ffmpeg()
    copy_model()
    smoke_test()
    size = sum(f.stat().st_size for f in BUNDLE.rglob("*") if f.is_file())
    print(f"Done: {BUNDLE} ({size / 1e6:.0f} MB)")
