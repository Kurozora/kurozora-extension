import VideoTracker, { type PlaybackState } from '@/lib/scrobble/video-tracker';
import { pageFor } from '@/lib/scrobble/page-registry';

export default defineContentScript({
  matches: [
    'https://www.crunchyroll.com/*',
    'https://static.crunchyroll.com/*',
    'https://*.an1me.to/*',
    'https://*.anime-odcinki.pl/*',
    'https://*.animeonsen.xyz/*',
    'https://*.animepahe.pw/*',
    'https://*.kwik.cx/*',
    'https://*.kwik.si/*',
    'https://*.mewcdn.online/*',
    'https://*.jkanime.net/*',
    'https://*.witanime.you/*',
    'https://*.mp4upload.com/*',
  ],
  allFrames: true,
  runAt: 'document_idle',
  main() {
    // Runs in every frame of supported streaming sites. The top frame reports
    // the playing episode's identity; whichever frame hosts the <video>
    // reports playback. The background session manager correlates both by tab.

    const page = pageFor(location.href);
    const frame = window === window.top ? 'top' : 'sub';

    console.log('[Kurozora] content script running', { frame, url: location.href, hasPageModule: page !== null });

    /**
     * The identity key last reported, to skip redundant messages.
     */
    let lastReportedIdentity: string | null = null;

    /**
     * Reports the playing episode's identity to the background.
     */
    function reportIdentity(): void {
      if (page === null || !page.isWatchPage(location.href)) {
        return;
      }

      const identity = page.identify(document, location.href);
      const identityKey = identity === null ? null : JSON.stringify(identity);

      if (identityKey === lastReportedIdentity) {
        return;
      }

      lastReportedIdentity = identityKey;
      console.log('[Kurozora] identity', identity);

      browser.runtime
        .sendMessage({ action: 'scrobble:identity', identity: identity })
        .catch((error) => console.warn('[Kurozora] identity send failed', error?.message));
    }

    /**
     * Reports a playback event to the background.
     *
     * @param event - The playback event name.
     * @param playback - The playback state.
     */
    function reportPlayback(event: string, playback: PlaybackState): void {
      console.log('[Kurozora] → playback', event, `${playback.progress.toFixed(1)}%`, `${playback.position.toFixed(0)}/${playback.duration.toFixed(0)}s`);

      browser.runtime
        .sendMessage({ action: 'scrobble:playback', event: event, playback: playback })
        .catch((error) => console.warn('[Kurozora] playback send failed', error?.message));
    }

    if (window === window.top) {
      // Streaming sites navigate client-side; watch the URL and title.
      let lastURL = location.href;

      reportIdentity();

      new MutationObserver(() => {
        if (location.href !== lastURL) {
          lastURL = location.href;
          lastReportedIdentity = null;
        }

        reportIdentity();
      }).observe(document.querySelector('head > title') ?? document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    }

    // Track the current video, re-attaching if the player swaps the element.
    let tracker: VideoTracker | null = null;
    let trackedVideo: HTMLVideoElement | null = null;

    /**
     * Attaches the tracker to the frame's video, following element swaps.
     */
    function attachToVideo(): void {
      const video = document.querySelector('video');

      // Already tracking this exact, still-connected element.
      if (video !== null && video === trackedVideo && video.isConnected) {
        return;
      }

      if (video === null) {
        return;
      }

      // The player replaced the element; drop the stale tracker.
      if (tracker !== null) {
        tracker.detach();
      }

      trackedVideo = video;
      tracker = new VideoTracker(video, reportPlayback);
      tracker.attach();

      console.log('[Kurozora] video tracker attached', {
        url: location.href,
        paused: video.paused,
        ended: video.ended,
        readyState: video.readyState,
        currentTime: video.currentTime,
        duration: video.duration,
      });

      // Diagnostic: confirm the element fires playback events at all.
      (['play', 'playing', 'pause', 'timeupdate', 'ended', 'loadeddata', 'emptied'] as const).forEach((event) => {
        video.addEventListener(
          event,
          () => console.log('[Kurozora] video event', event, video.paused ? 'paused' : 'playing', `${video.currentTime.toFixed(0)}s`),
          { once: event === 'timeupdate' },
        );
      });

      // A video already playing when the tracker attaches never fires `play`.
      if (!video.paused && !video.ended) {
        reportPlayback('play', tracker.playbackState());
      }

      // A new source in the same element is a new episode.
      video.addEventListener('loadstart', () => tracker?.reset());
    }

    attachToVideo();

    new MutationObserver(attachToVideo).observe(document.documentElement, {
      subtree: true,
      childList: true,
    });

    // Park the resume position when the page goes away mid-play.
    window.addEventListener('pagehide', () => {
      if (tracker !== null) {
        reportPlayback('pause', tracker.playbackState());
      }
    });
  },
});
