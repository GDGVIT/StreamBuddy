import os
import subprocess
import sys

import whisper


def format_timestamp(seconds):
    """Converts a float number of seconds into standard HH:MM:SS,mmm format."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    milliseconds = round((seconds % 1) * 1000)
    if milliseconds >= 1000:
        milliseconds -= 1000
        secs += 1
        if secs >= 60:
            secs -= 60
            minutes += 1
            if minutes >= 60:
                minutes -= 60
                hours += 1
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"


def create_srt_file(whisper_results, output_srt_path="temp_subs.srt"):
    """Parses raw Whisper segments and writes them to a standard SubRip (.srt) file in 3-word chunks."""
    segments = whisper_results.get("segments", [])

    with open(output_srt_path, "w", encoding="utf-8") as f:
        if not segments:
            # No speech detected — write a placeholder so ffmpeg's subtitles
            # filter always gets a valid, non-empty srt file to parse.
            f.write("1\n00:00:00,000 --> 00:00:02,000\n \n\n")
            return

        counter = 1
        for segment in segments:
            words = segment.get("words", [])
            if not words:
                start_str = format_timestamp(segment["start"])
                end_str = format_timestamp(segment["end"])
                f.write(
                    f"{counter}\n{start_str} --> {end_str}\n{segment['text'].strip()}\n\n"
                )
                counter += 1
                continue

            chunk_size = 3
            for i in range(0, len(words), chunk_size):
                chunk = words[i : i + chunk_size]

                for j, target_word in enumerate(chunk):
                    start_time = target_word["start"]
                    # End time connects seamlessly to the next word to prevent flickering
                    if j + 1 < len(chunk):
                        end_time = chunk[j + 1]["start"]
                    else:
                        end_time = target_word["end"]

                    # Fix negative or zero durations caused by Whisper overlap bugs
                    if end_time <= start_time:
                        end_time = start_time + 0.1

                    start_str = format_timestamp(start_time)
                    end_str = format_timestamp(end_time)

                    display_words = []
                    for k, w in enumerate(chunk):
                        word_text = w["word"].strip()
                        if k == j:
                            # Highlight the active word in Yellow using SRT-native HTML font tags
                            display_words.append(
                                f'<font color="#ffff00">{word_text}</font>'
                            )
                        else:
                            # Standard word (defaults to White base style)
                            display_words.append(word_text)

                    text = " ".join(display_words)
                    f.write(f"{counter}\n{start_str} --> {end_str}\n{text}\n\n")
                    counter += 1


def burn_subtitles_to_video(
    video_input, srt_input, facecam_crop, video_output="polished_clip.mp4"
):
    """
    Uses an FFmpeg complex filter graph to build a vertical 9:16 video:
    - Blurred background
    - Centered gameplay crop
    - Facecam at the top
    - Hardcoded subtitles
    Copies the audio stream directly without re-encoding to maximize execution speed.
    """
    print("STAGE:FINALIZING", flush=True)

    # FFmpeg's subtitles filter is unreliable with absolute Windows drive-letter
    # paths even when the colon is escaped. Sidestep this entirely by running
    # ffmpeg with its working directory set to the srt file's folder, and
    # referencing it by filename only.
    srt_dir = os.path.dirname(os.path.abspath(srt_input))
    srt_filename = os.path.basename(srt_input)

    # Subtitle styling constraints (Impact font, White base color, shifted into the bottom blank space)
    sub_style = "FontName=Impact,Alignment=2,MarginV=80,FontSize=16,PrimaryColour=&H00FFFFFF&,Outline=2,Shadow=1,OutlineColour=&H00000000&"

    filter_complex = (
        # 1. Background Canvas: Scale source, crop to 9:16, apply heavy blur
        "[0:v]scale=-1:1920,crop=1080:1920,gblur=sigma=20[bg];"
        # 2. Webcam Slicing: Crop facecam dynamically, scale up for visibility
        f"[0:v]crop={facecam_crop},scale=900:-1[cam];"
        # 3. Gameplay Slicing: Center crop (1080x1080 at x=420) to keep crosshair & hotbar perfectly centered
        "[0:v]crop=1080:1080:420:0[game];"
        # 4. Compositing: Overlay gameplay centrally on background
        "[bg][game]overlay=(W-w)/2:(H-h)/2[bg_game];"
        # 5. Compositing: Overlay webcam near the top (y=50)
        "[bg_game][cam]overlay=(W-w)/2:50[bg_game_cam];"
        # 6. Burn Subtitles: Apply SubRip with ASS styling (relative filename, cwd set below)
        f"[bg_game_cam]subtitles=./{srt_filename}:force_style='{sub_style}'[outv]"
    )

    command = [
        "ffmpeg",
        "-y",  # Overwrite the file if it exists
        "-i",
        os.path.abspath(video_input),  # Raw source video input path
        "-filter_complex",
        filter_complex,  # Apply the 9:16 compositing filter graph
        "-map",
        "[outv]",  # Map the processed video stream
        "-map",
        "0:a",  # Map the original audio stream
        "-c:v",
        "libx264",
        "-crf",
        "22",  # Use software x264 encoding for reliable video layout
        "-c:a",
        "copy",  # Direct stream-copy audio track
        os.path.abspath(video_output),  # Output target path
    ]

    print(f"DEBUG: srt_dir={srt_dir}", flush=True)
    print(
        f"DEBUG: srt exists? {os.path.exists(os.path.join(srt_dir, srt_filename))}",
        flush=True,
    )
    print(f"DEBUG: cwd listing: {os.listdir(srt_dir)}", flush=True)

    try:
        subprocess.run(
            command,
            check=True,
            capture_output=True,
            cwd=srt_dir,  # Run from the srt's folder so the relative filename resolves
        )
        absolute_output_path = os.path.abspath(video_output)

        if not os.path.exists(absolute_output_path):
            print(
                f"ERROR: Output file was not created: {absolute_output_path}",
                flush=True,
            )
            return None

        return absolute_output_path
    except subprocess.CalledProcessError as e:
        print("ERROR: FFmpeg subtitle injection failed.", flush=True)
        print("STDERR:", e.stderr.decode("utf-8", errors="ignore"), flush=True)
        print("STDOUT:", e.stdout.decode("utf-8", errors="ignore"), flush=True)
        return None


def process_video_pipeline(
    input_video_path, facecam_config="384:216:0:0", output_dir=None
):
    """
    The main execution pipeline container wrapper that runs transcription,
    subtitle assembly, composition layers, and cleanup sweeps.
    """
    if not os.path.exists(input_video_path):
        print(
            f"ERROR: Specified source file does not exist: {input_video_path}",
            flush=True,
        )
        return None

    ml_dir = os.path.dirname(os.path.abspath(__file__))
    srt_file_path = os.path.join(ml_dir, "temp_subs.srt")

    try:
        # 1. Step One: Run AI Speech-to-Text Transcription
        print("STAGE:TRANSCRIBING", flush=True)
        model = whisper.load_model("base", device="cpu")
        results = model.transcribe(input_video_path, word_timestamps=True)

        # 2. Step Two: Build Subtitle Timing Constraints
        create_srt_file(results, srt_file_path)
        print(
            f"DEBUG: srt file size = {os.path.getsize(srt_file_path)} bytes", flush=True
        )
        with open(srt_file_path, "r", encoding="utf-8") as debug_f:
            print(f"DEBUG: srt content:\n{debug_f.read()}", flush=True)

        # 3. Step Three: Burn Overlay into Destination Stream
        if not output_dir:
            output_dir = os.path.join(ml_dir, "finished_videos")
        os.makedirs(output_dir, exist_ok=True)

        base_name = os.path.basename(input_video_path)
        output_path = os.path.join(output_dir, f"polished_{base_name}")

        final_video_path = burn_subtitles_to_video(
            input_video_path, srt_file_path, facecam_config, video_output=output_path
        )

        if final_video_path:
            print(f"STAGE:DONE:{final_video_path}", flush=True)
        else:
            print("STAGE:ERROR:Subtitle burn failed", flush=True)

        return final_video_path

    finally:
        # 4. Clean up temporary text file artifacts
        if os.path.exists(srt_file_path):
            os.remove(srt_file_path)


if __name__ == "__main__":
    # Standard fallback logic for standalone testing straight from the CLI
    if len(sys.argv) < 2:
        print(
            "ERROR: Missing path argument pointing to the source video file.",
            flush=True,
        )
        sys.exit(1)

    cli_input_path = sys.argv[1]

    # Verified top-left configurations layout parameter defaults (avoid chat)
    DEFAULT_FACECAM = "384:216:0:0"
    cli_facecam_config = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_FACECAM
    cli_output_dir = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else None

    process_video_pipeline(cli_input_path, cli_facecam_config, cli_output_dir)
