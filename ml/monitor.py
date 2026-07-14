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

from pipeline import process_video_pipeline


class OBSFolderHandler(PatternMatchingEventHandler):

    patterns = ["*.mp4"]

    def on_created(self, event):
        logging.info(f"New file detected by watchdog: {event.src_path}")


        file_path = event.src_path
        historical_size = -1

        logging.info("Waiting for OBS to finish writing file to disk...")
        while True:
            time.sleep(1)
            try:
                current_size = os.path.getsize(file_path)
                if current_size == historical_size and current_size > 0:
                    break
                historical_size = current_size
            except FileNotFoundError:
                return

        logging.info(
            f"File fully stable ({historical_size} bytes). Triggering processing pipeline!"
        )

        facecam_config = "auto"

        process_video_pipeline(file_path, facecam_config)


if __name__ == "__main__":
    
    WATCH_DIRECTORY = r"raw_videos"

    event_handler = OBSFolderHandler()
    observer = Observer()
    observer.schedule(event_handler, path=WATCH_DIRECTORY, recursive=False)

    logging.info(f"Watchdog active! Monitoring folder: {WATCH_DIRECTORY}")
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logging.info("Stopping folder monitor watchdog.")
        observer.stop()
    observer.join()
