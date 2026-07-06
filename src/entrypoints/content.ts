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
    'https://*.youtube.com/*',
    'https://*.bilibili.tv/*',
    'https://*.iq.com/*',
    'https://*.nicovideo.jp/*',
    'https://abema.tv/*',
    'https://*.abema.tv/*',
    'https://video.unext.jp/*',
    'https://app.plex.tv/*',
    'https://*.animationdigitalnetwork.com/*',
    'https://*.animationdigitalnetwork.fr/*',
    'https://*.animationdigitalnetwork.de/*',
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
     * Whether the identity was already cleared for the current non-watch page.
     */
    let identityCleared = false;

    /**
     * Whether an identity was reported since this content script loaded.
     */
    let hasReportedIdentity = false;

    /**
     * How long a retired identity stays suppressed after a navigation, in milliseconds.
     */
    const RETIRE_GRACE_MS = 5000;

    /**
     * The identity key retired by a navigation.
     */
    let retiredIdentity: string | null = null;

    /**
     * The time until which the retired identity stays suppressed.
     */
    let retiredUntil = 0;

    /**
     * Episode metadata captured from the site's own network responses.
     */
    let capturedNetwork: CapturedEpisode | null = null;

    /**
     * Reports the playing episode's identity to the background, or clears it
     * when nothing trackable is on the page.
     */
    function reportIdentity(): void {
      const identity = page !== null && page.isWatchPage(location.href)
        ? page.identify(document, location.href, capturedNetwork)
        : null;

      if (identity === null) {
        clearIdentity();

        return;
      }

      const identityKey = JSON.stringify(identity);

      // Right after a navigation the previous video's metadata lingers for a
      // beat; ignore it until the new video's own metadata takes its place.
      if (identityKey === retiredIdentity && Date.now() < retiredUntil) {
        return;
      }

      if (identityKey === lastReportedIdentity) {
        return;
      }

      identityCleared = false;
      lastReportedIdentity = identityKey;
      console.log('[Kurozora] identity', identity);

      // The first report after a page load resets the tab's server-side session.
      const fresh = !hasReportedIdentity;
      hasReportedIdentity = true;

      browser.runtime
        .sendMessage({ action: 'scrobble:identity', identity: identity, fresh: fresh })
        .catch((error) => console.warn('[Kurozora] identity send failed', error?.message));
    }

    /**
     * Clears the tab's identity and tracking pill, once per non-watch page.
     */
    function clearIdentity(): void {
      hideTrackingPill();

      if (identityCleared) {
        return;
      }

      identityCleared = true;
      lastReportedIdentity = null;

      browser.runtime
        .sendMessage({ action: 'scrobble:identity', identity: null })
        .catch((error) => console.warn('[Kurozora] identity clear failed', error?.message));
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

    /**
     * Shows or updates the pill naming the tracked anime and episode.
     *
     * @param animeTitle - The catalog anime title.
     * @param episode - The episode number.
     * @param episodeTitle - The episode's title, when known.
     */
    function showTrackingPill(animeTitle: string, episode: number, episodeTitle: string | null): void {
      let pill = document.getElementById('kurozora-tracking-pill');

      if (pill === null) {
        pill = document.createElement('div');
        pill.id = 'kurozora-tracking-pill';
        pill.style.cssText = 'position:fixed;z-index:2147483647;bottom:16px;left:16px;max-width:320px;padding:8px 12px;border-radius:10px;border-left:3px solid #ff9300;background:rgba(28,28,30,.92);color:#fff;font:600 13px/1.35 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.4);pointer-events:none;';
        (document.body ?? document.documentElement).appendChild(pill);
      }

      const heading = document.createElement('div');
      heading.textContent = 'Kurozora · Tracking';
      heading.style.cssText = 'font:700 10px/1 system-ui;letter-spacing:.6px;text-transform:uppercase;color:#ff9300;margin-bottom:4px;';

      const body = document.createElement('div');
      body.textContent = animeTitle + ' · Episode ' + episode + (episodeTitle ? ': ' + episodeTitle : '');

      pill.replaceChildren(heading, body);
    }

    /**
     * Removes the tracking pill.
     */
    function hideTrackingPill(): void {
      document.getElementById('kurozora-tracking-pill')?.remove();
    }

    /**
     * The resume position awaiting a video ready enough to seek.
     */
    let pendingSeek: number | null = null;

    /**
     * The readiness-poll timer for the pending seek.
     */
    let seekTimer: number | null = null;

    /**
     * Requests a resume seek, applying it once the video is ready.
     *
     * @param position - The resume position, in seconds.
     */
    function seekTo(position: number): void {
      pendingSeek = position;
      tryPendingSeek();
      armSeek();
    }

    /**
     * Seeks to the pending position when the video can accept it.
     *
     * Players such as AnimePahe don't load until the user presses play and can
     * miss one-shot readiness events, so the seek is polled until it sticks
     * rather than assuming a single ready moment; the position is held until
     * then instead of being dropped onto an unready element.
     */
    function tryPendingSeek(): void {
      if (pendingSeek === null) {
        clearSeekTimer();

        return;
      }

      const video = trackedVideo;

      if (video === null || !video.isConnected) {
        // Retried from attachToVideo once an element is present.
        return;
      }

      const target = pendingSeek;

      // Beyond the runtime, or already at the target: nothing left to do.
      if ((Number.isFinite(video.duration) && video.duration > 0 && target > video.duration - 5)
        || Math.abs(video.currentTime - target) < 2) {
        pendingSeek = null;
        clearSeekTimer();

        return;
      }

      // Only seek once metadata is loaded; the next poll confirms it took.
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA && Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = target;
      }
    }

    /**
     * Starts polling to apply the pending seek, idempotently.
     */
    function armSeek(): void {
      if (seekTimer !== null || pendingSeek === null) {
        return;
      }

      let attempts = 0;

      seekTimer = window.setInterval(() => {
        attempts += 1;

        if (pendingSeek === null || attempts > 80) {
          clearSeekTimer();

          return;
        }

        tryPendingSeek();
      }, 250);
    }

    /**
     * Stops the readiness poll.
     */
    function clearSeekTimer(): void {
      if (seekTimer !== null) {
        clearInterval(seekTimer);
        seekTimer = null;
      }
    }

    /**
     * The resume position awaiting a player frame to host the prompt.
     */
    let pendingResumePosition: number | null = null;

    /**
     * Shows a resume button at the player's lower-right, above its controls.
     *
     * The button counts down five seconds and fades out; hovering it holds the
     * countdown, and leaving restarts it.
     *
     * @param position - The resume position, in seconds.
     */
    function showResumePrompt(position: number): void {
      const video = trackedVideo;
      const host = video?.parentElement ?? null;

      if (video === null || host === null) {
        // Shown from attachToVideo once the player frame has its video.
        pendingResumePosition = position;

        return;
      }

      pendingResumePosition = null;
      host.querySelector(':scope > .kurozora-resume-prompt')?.remove();

      const prompt = document.createElement('button');
      prompt.className = 'kurozora-resume-prompt';
      prompt.textContent = 'Resume from ' + formatTime(position);
      prompt.style.cssText = 'position:absolute;z-index:2147483646;right:16px;bottom:70px;padding:8px 14px;border:0;border-radius:8px;background:rgba(28,28,30,.92);color:#fff;font:700 13px/1 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.45);cursor:pointer;opacity:0;transition:opacity .25s ease-in-out;';

      let fadeTimer: number | null = null;

      const stopFade = (): void => {
        if (fadeTimer !== null) {
          clearTimeout(fadeTimer);
          fadeTimer = null;
        }
      };

      const startFade = (): void => {
        stopFade();
        fadeTimer = window.setTimeout(() => {
          prompt.style.opacity = '0';
          window.setTimeout(() => prompt.remove(), 300);
        }, 5000);
      };

      prompt.addEventListener('mouseenter', () => {
        stopFade();
        prompt.style.opacity = '1';
      });
      prompt.addEventListener('mouseleave', startFade);
      prompt.addEventListener('click', () => {
        stopFade();
        prompt.remove();

        browser.runtime
          .sendMessage({ action: 'resume:accept', position: position })
          .catch((error) => console.warn('[Kurozora] resume accept failed', error?.message));
      });

      if (getComputedStyle(host).position === 'static') {
        host.style.position = 'relative';
      }

      host.appendChild(prompt);

      // Fade in, then begin the auto-hide countdown.
      requestAnimationFrame(() => {
        prompt.style.opacity = '1';
        startFade();
      });
    }

    /**
     * Removes the resume prompt, if shown.
     */
    function hideResumePrompt(): void {
      pendingResumePosition = null;
      document.querySelector('.kurozora-resume-prompt')?.remove();
    }

    /**
     * The `h:mm:ss` or `m:ss` display form of a duration.
     *
     * @param seconds - The duration, in seconds.
     */
    function formatTime(seconds: number): string {
      const whole = Math.floor(seconds);
      const hours = Math.floor(whole / 3600);
      const minutes = Math.floor((whole % 3600) / 60);
      const remainder = String(whole % 60).padStart(2, '0');

      return hours > 0
        ? hours + ':' + String(minutes).padStart(2, '0') + ':' + remainder
        : minutes + ':' + remainder;
    }

    browser.runtime.onMessage.addListener((message: { action?: string; position?: number; automatic?: boolean }) => {
      if (message?.action === 'resume:offer' && typeof message.position === 'number') {
        if (message.automatic === true) {
          seekTo(message.position);
        } else {
          // Shown in the frame that owns the video; frames without one stash
          // it harmlessly and never surface it.
          showResumePrompt(message.position);
        }
      }

      if (message?.action === 'resume:seek' && typeof message.position === 'number') {
        seekTo(message.position);
      }
    });

    if (window === window.top) {
      browser.runtime.onMessage.addListener((message: { action?: string; animeTitle?: string; episode?: number; episodeTitle?: string | null }) => {
        if (message?.action === 'tracking:show' && typeof message.animeTitle === 'string') {
          showTrackingPill(message.animeTitle, message.episode ?? 0, message.episodeTitle ?? null);
        }
      });

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

      // `document.documentElement` never gets replaced across in-page
      // navigations, unlike `<title>`, which single-page sites swap out and
      // would orphan an observer bound to it.
      new MutationObserver(() => {
        if (location.href !== lastURL) {
          lastURL = location.href;

          // Stop the outgoing video's presence and drop its session at once,
          // so the incoming video never inherits the previous identity. The
          // retired key survives intermediate pages that report nothing.
          if (tracker !== null) {
            reportPlayback('pause', tracker.playbackState());
          }

          retiredIdentity = lastReportedIdentity ?? retiredIdentity;
          retiredUntil = Date.now() + RETIRE_GRACE_MS;
          capturedNetwork = null;
          pendingSeek = null;
          clearSeekTimer();
          hideResumePrompt();
          clearIdentity();
        }

        reportIdentity();
      }).observe(document.documentElement, { subtree: true, childList: true });
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

      // A video already playing when the tracker attaches never fires `play`.
      if (!video.paused && !video.ended) {
        reportPlayback('play', tracker.playbackState());
      }

      video.addEventListener('loadstart', () => tracker?.reset());

      // A seek or resume prompt requested before this element existed still lands.
      tryPendingSeek();
      armSeek();

      if (pendingResumePosition !== null) {
        showResumePrompt(pendingResumePosition);
      }
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
