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
    'https://*.yonaplay.net/*',
    'https://*.videa.hu/*',
    'https://*.videas.fr/*',
    'https://*.hgcloud.to/*',
    'https://*.vibuxer.com/*',
    'https://*.hanerix.com/*',
    'https://*.audinifer.com/*',
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
      currentEpisodeNumber = identity.episode;
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
      currentEpisodeNumber = null;
      restoreTabTitle();

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
     * @param isFiller - Whether the episode is a filler.
     */
    function showTrackingPill(animeTitle: string, episode: number, episodeTitle: string | null, isFiller: boolean): void {
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

      if (isFiller) {
        const fillerChip = document.createElement('span');
        fillerChip.textContent = 'FILLER';
        fillerChip.style.cssText = 'margin-left:8px;padding:1px 6px;border-radius:4px;background:#ff453a;color:#fff;font:700 10px/1.4 system-ui;letter-spacing:.4px;vertical-align:middle;';
        body.appendChild(fillerChip);
      }

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

      if (message?.action === 'controls:show') {
        showControlStrip();
      }
    });

    /**
     * The playback speeds the strip's speed button cycles through.
     */
    const STRIP_SPEEDS = [1, 1.25, 1.5, 1.75, 2];

    /**
     * Shows the on-player control strip next to the tracked video.
     */
    function showControlStrip(): void {
      const video = trackedVideo;
      const host = video?.parentElement;

      if (video === null || host === null || host === undefined || host.querySelector(':scope > .kurozora-control-strip') !== null) {
        return;
      }

      const strip = document.createElement('div');
      strip.className = 'kurozora-control-strip';
      strip.style.cssText = 'position:absolute;z-index:2147483647;top:12px;right:12px;display:flex;gap:6px;padding:4px;border-radius:8px;background:rgba(28,28,30,.85);opacity:.35;transition:opacity .15s ease-in-out;';
      strip.addEventListener('mouseenter', () => (strip.style.opacity = '1'));
      strip.addEventListener('mouseleave', () => (strip.style.opacity = '.35'));

      const speedButton = stripButton(video.playbackRate + '×');
      speedButton.title = 'Playback speed';
      speedButton.addEventListener('click', () => {
        const nextIndex = (STRIP_SPEEDS.indexOf(video.playbackRate) + 1) % STRIP_SPEEDS.length;
        video.playbackRate = STRIP_SPEEDS[nextIndex];
        speedButton.textContent = STRIP_SPEEDS[nextIndex] + '×';
      });

      const skipButton = stripButton('+85s');
      skipButton.title = 'Skip intro';
      skipButton.addEventListener('click', () => {
        video.currentTime = Math.min(video.currentTime + 85, video.duration || video.currentTime + 85);
      });

      const watchedButton = stripButton('✓');
      watchedButton.title = 'Mark as watched';
      watchedButton.addEventListener('click', () => {
        watchedButton.textContent = '✓ Watched';
        watchedButton.disabled = true;

        browser.runtime
          .sendMessage({ action: 'controls:markWatched' })
          .catch((error) => console.warn('[Kurozora] mark watched failed', error?.message));
      });

      strip.append(speedButton, skipButton, watchedButton);

      if (getComputedStyle(host).position === 'static') {
        host.style.position = 'relative';
      }

      host.appendChild(strip);
    }

    /**
     * Removes the on-player control strip.
     */
    function hideControlStrip(): void {
      document.querySelector('.kurozora-control-strip')?.remove();
    }

    /**
     * A styled control-strip button.
     *
     * @param label - The button label.
     */
    function stripButton(label: string): HTMLButtonElement {
      const button = document.createElement('button');
      button.textContent = label;
      button.style.cssText = 'all:unset;cursor:pointer;padding:4px 8px;border-radius:6px;color:#fff;font:700 11px/1 system-ui;letter-spacing:.2px;background:rgba(255,255,255,.12);';

      return button;
    }

    /**
     * The site's own title, captured before the first live rewrite.
     */
    let siteTitle: string | null = null;

    /**
     * The season's episode facts for on-page badges, when received.
     */
    let gridEpisodes: { number: number; fillerKind: number; isWatched: boolean }[] | null = null;

    /**
     * Whether filler badges are injected.
     */
    let gridBadges = true;

    /**
     * Whether badges distinguish fillers without relying on color.
     */
    let gridAccessible = false;

    /**
     * Whether unwatched episodes ahead of the current one are covered.
     */
    let gridAntiSpoiler = false;

    /**
     * The episode number currently playing, per the reported identity.
     */
    let currentEpisodeNumber: number | null = null;

    /**
     * The earliest time the grid may be annotated again.
     */
    let nextAnnotateAt = 0;

    /**
     * Rewrites the tab title with the live playback summary.
     *
     * @param title - The series title.
     * @param episode - The episode number, when known.
     * @param position - The playback position, in seconds.
     * @param duration - The runtime, in seconds.
     * @param playing - Whether playback is running.
     */
    function applyTabTitle(title: string, episode: number | null, position: number, duration: number, playing: boolean): void {
      if (siteTitle === null) {
        siteTitle = document.title;
      }

      const timing = duration > 0 ? ' (' + formatTime(position) + '/' + formatTime(duration) + ')' : '';

      document.title = (playing ? '▶ ' : '⏸ ') + title + (episode !== null ? ' · Ep ' + episode : '') + timing;
    }

    /**
     * Restores the site's own tab title after a rewrite.
     */
    function restoreTabTitle(): void {
      if (siteTitle !== null) {
        document.title = siteTitle;
        siteTitle = null;
      }
    }

    /**
     * Annotates the site's episode grid with filler badges and spoiler covers.
     */
    function annotateGrid(): void {
      if (gridEpisodes === null || page?.episodeCells === undefined) {
        return;
      }

      const facts = new Map(gridEpisodes.map((episode) => [episode.number, episode]));
      const watchedCeiling = Math.max(
        currentEpisodeNumber ?? 0,
        ...gridEpisodes.filter((episode) => episode.isWatched).map((episode) => episode.number),
      );

      page.episodeCells(document).forEach(({ element, episode }) => {
        const fact = facts.get(episode);

        if (fact === undefined) {
          return;
        }

        if (gridBadges && element.dataset.kurozoraBadge !== String(fact.fillerKind)) {
          injectFillerBadge(element, fact.fillerKind);
        }

        if (gridAntiSpoiler && !fact.isWatched && episode > watchedCeiling && element.dataset.kurozoraSpoiler === undefined) {
          injectSpoilerCover(element, episode);
        }
      });
    }

    /**
     * The label and color for a filler-kind badge.
     *
     * @param fillerKind - The episode's filler kind.
     */
    function fillerBadgeStyle(fillerKind: number): { label: string; color: string; textColor: string } {
      switch (fillerKind) {
        case 1: return { label: 'FILLER', color: '#ff453a', textColor: '#fff' };
        case 2: return { label: 'MANGA CANON', color: '#32d74b', textColor: '#fff' };
        case 3: return { label: 'MIXED', color: '#ffd60a', textColor: '#1c1c1e' };
        default: return { label: 'ANIME CANON', color: '#0a84ff', textColor: '#fff' };
      }
    }

    /**
     * Injects a filler-kind badge into an episode cell.
     *
     * @param element - The episode cell.
     * @param fillerKind - The episode's filler kind.
     */
    function injectFillerBadge(element: HTMLElement, fillerKind: number): void {
      element.dataset.kurozoraBadge = String(fillerKind);
      element.querySelector(':scope > .kurozora-filler-badge')?.remove();

      const style = fillerBadgeStyle(fillerKind);
      const badge = document.createElement('span');
      badge.className = 'kurozora-filler-badge';
      badge.title = style.label.charAt(0) + style.label.slice(1).toLowerCase() + ' episode';

      if (gridAccessible) {
        // Distinguish without relying on color: a visible text label.
        badge.textContent = style.label;
        badge.style.cssText = 'position:absolute;z-index:10;top:4px;left:4px;padding:1px 5px;border-radius:4px;font:700 9px/1.4 system-ui;letter-spacing:.4px;pointer-events:none;color:'
          + style.textColor + ';background:' + style.color + ';';
      } else {
        badge.style.cssText = 'position:absolute;z-index:10;top:6px;left:6px;width:10px;height:10px;border-radius:50%;box-shadow:0 0 0 2px rgba(0,0,0,.5);pointer-events:none;background:'
          + style.color + ';';
      }

      if (getComputedStyle(element).position === 'static') {
        element.style.position = 'relative';
      }

      element.appendChild(badge);
    }

    /**
     * Covers an unwatched future episode cell until the user reveals it.
     *
     * @param element - The episode cell.
     * @param episode - The episode number.
     */
    function injectSpoilerCover(element: HTMLElement, episode: number): void {
      element.dataset.kurozoraSpoiler = '1';

      const cover = document.createElement('div');
      cover.className = 'kurozora-spoiler-cover';
      cover.textContent = 'Spoiler · Ep ' + episode + ' · Click to reveal';
      cover.style.cssText = 'position:absolute;inset:0;z-index:11;display:flex;align-items:center;justify-content:center;text-align:center;padding:4px;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);background:rgba(28,28,30,.35);color:#fff;font:700 11px/1.3 system-ui;letter-spacing:.4px;cursor:pointer;';
      cover.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        cover.remove();
      });

      if (getComputedStyle(element).position === 'static') {
        element.style.position = 'relative';
      }

      element.appendChild(cover);
    }

    /**
     * Removes every injected filler badge and clears its cell marker.
     */
    function clearFillerBadges(): void {
      document.querySelectorAll('.kurozora-filler-badge').forEach((badge) => badge.remove());
      document.querySelectorAll<HTMLElement>('[data-kurozora-badge]').forEach((cell) => {
        delete cell.dataset.kurozoraBadge;
      });
    }

    if (window === window.top) {
      browser.runtime.onMessage.addListener((message: { action?: string; animeTitle?: string; episode?: number | null; episodeTitle?: string | null; isFiller?: boolean; title?: string; position?: number; duration?: number; playing?: boolean; episodes?: { number: number; fillerKind: number; isWatched: boolean }[]; badges?: boolean; accessible?: boolean; antiSpoiler?: boolean }) => {
        if (message?.action === 'tracking:show' && typeof message.animeTitle === 'string') {
          showTrackingPill(message.animeTitle, message.episode ?? 0, message.episodeTitle ?? null, message.isFiller === true);
        }

        if (message?.action === 'title:update' && typeof message.title === 'string') {
          applyTabTitle(message.title, message.episode ?? null, message.position ?? 0, message.duration ?? 0, message.playing === true);
        }

        if (message?.action === 'grid:update' && Array.isArray(message.episodes)) {
          gridEpisodes = message.episodes;
          gridBadges = message.badges !== false;
          gridAccessible = message.accessible === true;
          gridAntiSpoiler = message.antiSpoiler === true;
          clearFillerBadges();
          annotateGrid();
        }
      });

      // Display settings apply live; the badge and title toggles take effect
      // without reloading the page.
      browser.storage.local.onChanged.addListener((changes) => {
        if (changes.dynamicTitle?.newValue === false) {
          restoreTabTitle();
        }

        let regridded = false;

        if (changes.fillerBadges !== undefined) {
          gridBadges = changes.fillerBadges.newValue !== false;
          regridded = true;
        }

        if (changes.accessibleBadges !== undefined) {
          gridAccessible = changes.accessibleBadges.newValue === true;
          regridded = true;
        }

        // Re-render from the cached grid; the background re-sends a fresh one
        // when a toggle turns on and this tab holds no grid yet.
        if (regridded) {
          clearFillerBadges();
          annotateGrid();
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
          gridEpisodes = null;
          restoreTabTitle();
          hideControlStrip();
          clearIdentity();
        }

        reportIdentity();

        if (Date.now() >= nextAnnotateAt) {
          nextAnnotateAt = Date.now() + 2000;
          annotateGrid();
        }
      }).observe(document.documentElement, { subtree: true, childList: true });
    }

    let tracker: VideoTracker | null = null;
    let trackedVideo: HTMLVideoElement | null = null;

    /**
     * The locked playback speed, or null when the lock is off.
     */
    let preferredSpeed: number | null = null;

    /**
     * Applies the locked playback speed to the tracked video.
     */
    function applyPreferredSpeed(): void {
      if (preferredSpeed !== null && trackedVideo !== null && trackedVideo.isConnected) {
        trackedVideo.playbackRate = preferredSpeed;
      }
    }

    browser.storage.local.get('playbackSpeed').then((stored) => {
      preferredSpeed = typeof stored.playbackSpeed === 'number' ? stored.playbackSpeed : null;
      applyPreferredSpeed();
    });

    browser.storage.local.onChanged.addListener((changes) => {
      if (changes.playbackSpeed !== undefined) {
        preferredSpeed = typeof changes.playbackSpeed.newValue === 'number' ? changes.playbackSpeed.newValue : null;
        applyPreferredSpeed();
      }
    });

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

      // Sites reset the rate on every new episode; the lock re-applies it.
      applyPreferredSpeed();
      video.addEventListener('loadeddata', applyPreferredSpeed);

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
