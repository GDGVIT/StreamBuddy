import logging
import os
import time

from watchdog.events import PatternMatchingEventHandler
from watchdog.observers import Observer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# Import your existing pipeline functions
# Assumes your pipeline.py has a main execution function we can call
from pipeline import process_video_pipeline


class OBSFolderHandler(PatternMatchingEventHandler):
    # Watch only for finished MP4 files
    patterns = ["*.mp4"]

    def on_created(self, event):
        logging.info(f"New file detected by watchdog: {event.src_path}")

        # CRITICAL: OBS takes a few seconds to finish writing the video stream to disk.
        # We check the file size progressively until it stops growing to ensure it's fully closed.
        file_path = event.src_path
        historical_size = -1

        logging.info("Waiting for OBS to finish writing file to disk...")
        while True:
            time.sleep(1)  # Check size every second
            try:
                current_size = os.path.getsize(file_path)
                if current_size == historical_size and current_size > 0:
                    break  # File size stabilized, OBS is done writing
                historical_size = current_size
            except FileNotFoundError:
                # Handle edge cases where temp files are rapidly created/deleted
                return

        logging.info(
            f"File fully stable ({historical_size} bytes). Triggering processing pipeline!"
        )

        # Define where your fallback configuration layout string is
        facecam_config = "384:216:0:0"

        # Execute your pipeline!
        process_video_pipeline(file_path, facecam_config)


if __name__ == "__main__":
    # Set this to your exact OBS Recording path
    WATCH_DIRECTORY = r"raw_videos"

    event_handler = OBSFolderHandler()
    observer = Observer()
    observer.schedule(event_handler, path=WATCH_DIRECTORY, recursive=False)

    logging.info(f"Watchdog active! Monitoring folder: {WATCH_DIRECTORY}")
    observer.start()

    try:
        while True:
            time.sleep(1)  # Keeps the main thread alive running in the background
    except KeyboardInterrupt:
        logging.info("Stopping folder monitor watchdog.")
        observer.stop()
    observer.join()
