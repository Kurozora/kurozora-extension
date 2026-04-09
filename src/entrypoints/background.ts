import { KurozoraKit, KKServices, KurozoraAPI } from 'kurozorakit';
import { browserStore } from '@/lib/kit-storage';
import ScrobbleSessionManager from '@/lib/scrobble/session-manager';
import { pageFor } from '@/lib/scrobble/page-registry';
import { API_KEY, CLIENT_IDENTIFIER } from '@/lib/config';
import { loadUpNext, upNextRowsEqual, type UpNextRow } from '@/lib/up-next';
import { setupContextMenu } from '@/lib/context-menu';
import type { PlaybackState } from '@/lib/scrobble/video-tracker';

export default defineBackground(() => {
  console.log('[Kurozora] background running');

  const kit = new KurozoraKit({
    apiKey: API_KEY,
    clientIdentifier: CLIENT_IDENTIFIER,
    source: 'kurozora-extension/' + browser.runtime.getManifest().version,
    services: new KKServices(browserStore),
  });

  let upNextCache: UpNextRow[] | null = null;

  const tabFavicons = new Map<number, string>();

  const scrobbleSessions = new ScrobbleSessionManager(kit, () => {
    refreshUpNext().catch((error: { message?: string }) => console.warn('[Kurozora] up-next refresh failed', error?.message));
  });

  /**
   * Points the kit at the stored API environment.
   */
  async function restoreEnvironment(): Promise<void> {
    const stored = await browser.storage.local.get('apiEnvironment');

    kit.apiEndpoint = KurozoraAPI[stored.apiEnvironment as keyof typeof KurozoraAPI] ?? KurozoraAPI.v1;
  }

  const kitReady = restoreEnvironment()
    .then(() => kit.services.restoreAuthenticationKey())
    .then(() => scrobbleSessions.replayQueue())
    .then(() => {
      console.log('[Kurozora] ready', { endpoint: kit.apiEndpoint.baseURL, signedIn: kit.authenticationKey !== '' });

      if (kit.authenticationKey !== '') {
        connectPresence();
      }
    });

  kit.presence.listen('.user.state.changed', () => {
    refreshUpNext().catch((error: { message?: string }) => console.warn('[Kurozora] up-next refresh failed', error?.message));
  });

  /**
   * Opens the presence channel.
   */
  function connectPresence(): void {
    kit.presence.connect().catch((error: { message?: string }) => console.warn('[Kurozora] presence connect failed', error?.message));
  }

  /**
   * Whispers the current playback position on the user's private channel.
   *
   * @param tabID - The tab the playback came from.
   * @param event - The playback event name.
   * @param playback - The playback state.
   */
  function whisperPosition(tabID: number, event: string, playback: PlaybackState, tab?: { url?: string; favIconUrl?: string }): void {
    const identity = scrobbleSessions.identityFor(tabID);

    if (identity === null || kit.authenticationKey === '') {
      return;
    }

    const siteModule = tab?.url ? pageFor(tab.url) : null;
    const siteName = siteModule ? siteModule.name.charAt(0).toUpperCase() + siteModule.name.slice(1) : undefined;
    const duration = playback.duration || identity.duration || undefined;
    const faviconURL = tabFavicons.get(tabID)
      ?? (tab?.favIconUrl && /^https?:\/\//.test(tab.favIconUrl) ? tab.favIconUrl : undefined);
    const episodeID = scrobbleSessions.episodePublicIDFor(tabID) ?? undefined;

    kit.presence.whisper('scrobble.position', {
      seriesKey: identity.seriesKey,
      title: identity.title,
      episode: identity.episode,
      ...(episodeID ? { episodeID: episodeID } : {}),
      position: playback.position,
      progress: playback.progress,
      playing: event !== 'pause',
      ...(identity.season != null ? { season: identity.season } : {}),
      ...(identity.episodeTitle ? { episodeTitle: identity.episodeTitle } : {}),
      ...(duration ? { duration: duration } : {}),
      ...(siteName ? { siteName: siteName } : {}),
      ...(faviconURL ? { faviconURL: faviconURL } : {}),
    });
  }

  /**
   * Reloads the up-next cache and pushes it to the popup when it changed.
   *
   * @returns The refreshed rows.
   */
  async function refreshUpNext(): Promise<UpNextRow[]> {
    if (kit.authenticationKey === '') {
      upNextCache = [];

      return upNextCache;
    }

    const rows = await loadUpNext(kit);
    const changed = upNextCache === null || !upNextRowsEqual(upNextCache, rows);
    upNextCache = rows;

    if (changed) {
      browser.runtime
        .sendMessage({ action: 'popup:upNextUpdated', rows: rows })
        .catch(() => {});
    }

    return rows;
  }

  /**
   * The cached up-next rows.
   */
  async function ensureUpNext(): Promise<UpNextRow[]> {
    if (upNextCache === null) {
      upNextCache = await loadUpNext(kit);
    }

    return upNextCache;
  }

  browser.storage.local.onChanged.addListener((changes) => {
    if (changes.apiEnvironment !== undefined) {
      kit.apiEndpoint = KurozoraAPI[changes.apiEnvironment.newValue as keyof typeof KurozoraAPI] ?? KurozoraAPI.v1;
      kit.presence.disconnect();
      upNextCache = null;

      if (kit.authenticationKey !== '') {
        connectPresence();
      }
    }

    if (changes[KKServices.STORAGE_KEY] !== undefined) {
      kit.authenticationKey = (changes[KKServices.STORAGE_KEY].newValue as string | undefined) ?? '';
      console.log('[Kurozora] session updated', { signedIn: kit.authenticationKey !== '' });

      if (kit.authenticationKey !== '') {
        connectPresence();
      } else {
        kit.presence.disconnect();
        upNextCache = null;
      }
    }
  });

  browser.runtime.onMessage.addListener((request: any, sender) => {
    console.log('[Kurozora] ← message', request.action, { tab: sender.tab?.id, frame: sender.frameId });

    if (request.action === 'scrobble:identity' && sender.tab?.id !== undefined) {
      if (typeof request.faviconURL === 'string') {
        tabFavicons.set(sender.tab.id, request.faviconURL);
      } else {
        tabFavicons.delete(sender.tab.id);
      }

      scrobbleSessions.handleIdentity(sender.tab.id, request.identity);
    }

    if (request.action === 'scrobble:playback' && sender.tab?.id !== undefined) {
      const tabID = sender.tab.id;
      const event = request.event as string;
      const playback = request.playback as PlaybackState;

      return kitReady.then(async () => {
        whisperPosition(tabID, event, playback, sender.tab);

        if (event !== 'progress') {
          await scrobbleSessions.handlePlayback(tabID, { event: event, ...playback });
        }
      });
    }

    if (request.action === 'popup:getUpNext') {
      return kitReady
        .then(() => ensureUpNext())
        .then((rows) => ({ rows: rows }))
        .catch((error: { message?: string }) => ({ rows: [], error: error?.message ?? 'Please try again.' }));
    }

    if (request.action === 'popup:refreshUpNext') {
      return kitReady
        .then(() => refreshUpNext())
        .then((rows) => ({ rows: rows }))
        .catch((error: { message?: string }) => ({ rows: upNextCache ?? [], error: error?.message ?? 'Please try again.' }));
    }
  });

  browser.tabs.onRemoved.addListener((tabID) => {
    scrobbleSessions.handleTabClosed(tabID);
    tabFavicons.delete(tabID);
  });

  browser.runtime.onInstalled.addListener(async () => {
    await setupContextMenu();
  });
  browser.storage.sync.onChanged.addListener(setupContextMenu);
});
