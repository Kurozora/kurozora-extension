import VideoTracker, { type PlaybackState } from '@/lib/scrobble/video-tracker';
import { pageFor, type CapturedEpisode } from '@/lib/scrobble/page-registry';
import { SNIFFER_MESSAGE, type SnifferMessage } from '@/lib/scrobble/sniffer-protocol';

/**
 * Folds a fresh capture over the accumulated one, keeping each defined field.
 *
 * @param base - The accumulated capture, when present.
 * @param next - The freshly parsed capture.
 */
function mergeCaptured(base: CapturedEpisode | null, next: CapturedEpisode): CapturedEpisode {
  const merged: CapturedEpisode = { ...base };

  (Object.keys(next) as (keyof CapturedEpisode)[]).forEach((key) => {
    const value = next[key];

    if (value !== undefined && value !== null) {
      (merged[key] as CapturedEpisode[typeof key]) = value;
    }
  });

  return merged;
}

export default defineContentScript({
  matches: [
    'https://www.crunchyroll.com/*',
    'https://static.crunchyroll.com/*',
    'https://*.netflix.com/*',
    'https://*.disneyplus.com/*',
    'https://tv.apple.com/*',
    'https://*.hidive.com/*',
    'https://*.an1me.to/*',
    'https://*.anime-odcinki.pl/*',
    'https://*.lycoris.cafe/*',
    'https://*.sibnet.ru/*',
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
    const page = pageFor(location.href);
    const frame = window === window.top ? 'top' : 'sub';

    console.log('[Kurozora] content script running', { frame, url: location.href, hasPageModule: page !== null });

    /**
     * The identity key last reported.
     */
    let lastReportedIdentity: string | null = null;

    /**
     * Episode metadata captured from the site's own network responses.
     */
    let capturedNetwork: CapturedEpisode | null = null;

    /**
     * Reports the playing episode's identity to the background.
     */
    function reportIdentity(): void {
      if (page === null || !page.isWatchPage(location.href)) {
        return;
      }

      const identity = page.identify(document, location.href, capturedNetwork);
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
      window.addEventListener('message', (event) => {
        if (event.source !== window || page === null) {
          return;
        }

        const message = event.data as SnifferMessage | undefined;

        if (message?.source !== SNIFFER_MESSAGE || message.kind !== 'capture') {
          return;
        }

        const parsed = page.captureNetwork?.(message.url, message.body, location.href) ?? null;

        if (parsed === null) {
          return;
        }

        capturedNetwork = mergeCaptured(capturedNetwork, parsed);
        lastReportedIdentity = null;
        reportIdentity();
      });

      window.postMessage({ source: SNIFFER_MESSAGE, kind: 'flush' } as SnifferMessage, location.origin);

      let lastURL = location.href;

      reportIdentity();

      new MutationObserver(() => {
        if (location.href !== lastURL) {
          lastURL = location.href;
          lastReportedIdentity = null;
          capturedNetwork = null;
        }

        reportIdentity();
      }).observe(document.querySelector('head > title') ?? document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    }

    let tracker: VideoTracker | null = null;
    let trackedVideo: HTMLVideoElement | null = null;

    /**
     * Attaches the tracker to the frame's video, following element swaps.
     */
    function attachToVideo(): void {
      const video = document.querySelector('video');

      if (video !== null && video === trackedVideo && video.isConnected) {
        return;
      }

      if (video === null) {
        return;
      }

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

      video.addEventListener('loadstart', () => tracker?.reset());
    }

    attachToVideo();

    new MutationObserver(attachToVideo).observe(document.documentElement, {
      subtree: true,
      childList: true,
    });

    window.addEventListener('pagehide', () => {
      if (tracker !== null) {
        reportPlayback('pause', tracker.playbackState());
      }
    });
  },
});
