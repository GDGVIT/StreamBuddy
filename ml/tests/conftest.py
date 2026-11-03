"""Shared pytest setup for the ML pipeline tests."""

import importlib.util
import os
import sys
import types

ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

# The unit tests only exercise the subtitle helpers, so they shouldn't need the
# multi-gigabyte Whisper/PyTorch install. When Whisper isn't available, register an
# empty stand-in module so `import whisper` inside pipeline.py succeeds. The
# end-to-end tests check for the real thing and skip themselves without it.
if importlib.util.find_spec("whisper") is None:
    sys.modules["whisper"] = types.ModuleType("whisper")
