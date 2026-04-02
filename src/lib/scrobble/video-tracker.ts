/**
 * The playback state of an observed video.
 */
export interface PlaybackState {
  /**
   * The percent of runtime watched, as a float 0–100.
   */
  progress: number;

  /**
   * The current playback position, in seconds.
   */
  position: number;

  /**
   * The total runtime, in seconds.
   */
  duration: number;
}

/**
 * A listener receiving `(event, payload)` from a {@link VideoTracker}.
 */
export type VideoEventListener = (event: string, payload: PlaybackState) => void;

/**
 * Observes an HTML5 video element and emits scrobble-shaped events.
 */
export default class VideoTracker {
  /**
   * The interval between live progress emits while playing, in milliseconds.
   */
  static PROGRESS_INTERVAL_MS = 5000;

  /**
   * The observed video element.
   */
  #video: HTMLVideoElement;

  /**
   * The listener receiving `(event, payload)`.
   */
  #onEvent: VideoEventListener;

  /**
   * Whether `complete` was already emitted for this video.
   */
  #completed = false;

  /**
   * Whether the video is currently in a playing state.
   */
  #playing = false;

  /**
   * The bound handlers.
   */
  #handlers: Record<string, () => void> = {};

  /**
   * The live-progress timer.
   */
  #progressTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Create a new tracker instance.
   *
   * @param video - The video element to observe.
   * @param onEvent - The listener receiving `(event, payload)`.
   */
  constructor(video: HTMLVideoElement, onEvent: VideoEventListener) {
    this.#video = video;
    this.#onEvent = onEvent;
  }

  /**
   * Starts observing the video.
   */
  attach(): void {
    this.#handlers = {
      play: () => this.#play(),
      playing: () => this.#play(),
      pause: () => this.#pause(),
      seeked: () => this.#sync(),
      ended: () => this.#complete(),
    };

    Object.entries(this.#handlers).forEach(([event, handler]) => {
      this.#video.addEventListener(event, handler);
    });
  }

  /**
   * Stops observing the video.
   */
  detach(): void {
    this.#stopProgress();

    Object.entries(this.#handlers).forEach(([event, handler]) => {
      this.#video.removeEventListener(event, handler);
    });
  }

  /**
   * Rearms the tracker for a new episode in the same player.
   */
  reset(): void {
    this.#stopProgress();
    this.#completed = false;
    this.#playing = false;
  }

  /**
   * The current playback state.
   */
  playbackState(): PlaybackState {
    const duration = this.#video.duration || 0;
    const position = this.#video.currentTime || 0;

    return {
      progress: duration > 0 ? Math.min((position / duration) * 100, 100) : 0,
      position: position,
      duration: duration,
    };
  }

  /**
   * Enters the playing state, emitting `play` once.
   */
  #play(): void {
    if (this.#playing) {
      return;
    }

    this.#playing = true;
    this.#emit('play');
    this.#startProgress();
  }

  /**
   * Leaves the playing state on a genuine pause, ignoring seek transients.
   */
  #pause(): void {
    // A seek fires a pause while the video keeps playing.
    if (this.#video.seeking || !this.#playing) {
      return;
    }

    this.#playing = false;
    this.#stopProgress();
    this.#emit('pause');
  }

  /**
   * Reports the post-seek position under whichever state the element settled into.
   */
  #sync(): void {
    if (!this.#video.paused && !this.#video.ended) {
      this.#playing = true;
      this.#emit('play');
      this.#startProgress();
    } else {
      this.#playing = false;
      this.#stopProgress();
      this.#emit('pause');
    }
  }

  /**
   * Emits the `complete` event once.
   */
  #complete(): void {
    if (this.#completed) {
      return;
    }

    this.#completed = true;
    this.#stopProgress();
    this.#emit('complete');
  }

  /**
   * Starts the throttled live-progress emit, idempotently.
   */
  #startProgress(): void {
    if (this.#progressTimer !== null) {
      return;
    }

    this.#progressTimer = setInterval(() => this.#emit('progress'), VideoTracker.PROGRESS_INTERVAL_MS);
  }

  /**
   * Stops the throttled live-progress emit, idempotently.
   */
  #stopProgress(): void {
    if (this.#progressTimer === null) {
      return;
    }

    clearInterval(this.#progressTimer);
    this.#progressTimer = null;
  }

  /**
   * Emits an event with the current playback state.
   *
   * @param event - The event name.
   */
  #emit(event: string): void {
    this.#onEvent(event, this.playbackState());
  }
}
