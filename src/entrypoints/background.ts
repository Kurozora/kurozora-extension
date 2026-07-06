import { KurozoraKit, KKServices, KurozoraAPI } from 'kurozorakit';
import { browserStore } from '@/lib/kit-storage';
import ScrobbleSessionManager, { type TrackingInfo } from '@/lib/scrobble/session-manager';
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

  const providers = new Map<string, { name: string; logo?: string }>();

  const scrobbleSessions = new ScrobbleSessionManager(kit, () => {
    refreshUpNext().catch((error: { message?: string }) => console.warn('[Kurozora] up-next refresh failed', error?.message));
  }, showTrackingNotification, offerResume);

  /**
   * Shows an in-page toast of the catalog anime and episode a session is tracking.
   *
   * @param tabID - The tab to show the toast in.
   * @param info - The resolved catalog facts.
   */
  function showTrackingNotification(tabID: number, info: TrackingInfo): void {
    browser.tabs
      .sendMessage(tabID, {
        action: 'tracking:show',
        animeTitle: info.animeTitle,
        episode: info.episode,
        episodeTitle: info.episodeTitle,
      })
      .catch((error: { message?: string }) => console.warn('[Kurozora] tracking toast failed', error?.message));
  }

  /**
   * Offers the tab a resume point, honoring the resume-playback setting.
   *
   * @param tabID - The tab playing the episode.
   * @param position - The resume position, in seconds.
   */
  function offerResume(tabID: number, position: number): void {
    browser.storage.local
      .get('resumeMode')
      .then((stored) => {
        const automatic = stored.resumeMode === 'auto';

        return browser.tabs.sendMessage(tabID, { action: 'resume:offer', position: position, automatic: automatic });
      })
      .catch((error: { message?: string }) => console.warn('[Kurozora] resume offer failed', error?.message));
  }

  /**
   * Opens a watch URL, reusing a tab already on that site when one exists.
   *
   * @param url - The watch page URL.
   */
  async function continueWatching(url: string): Promise<void> {
    const site = siteDomain(new URL(url).hostname);
    const tabs = await browser.tabs.query({});
    const existing = tabs.find((tab) => {
      if (tab.url === undefined || tab.url === '') {
        return false;
      }

      try {
        return siteDomain(new URL(tab.url).hostname) === site;
      } catch {
        return false;
      }
    });

    if (existing?.id !== undefined) {
      await browser.tabs.update(existing.id, { url: url, active: true });

      if (existing.windowId !== undefined) {
        await browser.windows.update(existing.windowId, { focused: true });
      }

      return;
    }

    await browser.tabs.create({ url: url });
  }

  /**
   * The registrable domain of a hostname, e.g. `www.crunchyroll.com` → `crunchyroll.com`.
   *
   * @param hostname - The hostname to reduce.
   */
  function siteDomain(hostname: string): string {
    return hostname.split('.').slice(-2).join('.');
  }

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
    .then(() => restoreNotificationSetting())
    .then(() => {
      console.log('[Kurozora] ready', { endpoint: kit.apiEndpoint.baseURL, signedIn: kit.authenticationKey !== '' });

      loadProviders().catch(() => {});

      if (kit.authenticationKey !== '') {
        connectPresence();
      }
    });

  /**
   * Applies the stored tracking-notification preference.
   */
  async function restoreNotificationSetting(): Promise<void> {
    const stored = await browser.storage.local.get('trackingNotifications');
    const enabled = stored.trackingNotifications === true;

    console.log('[Kurozora] tracking notifications', enabled ? 'on' : 'off');
    scrobbleSessions.setNotificationsEnabled(enabled);
  }

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
   * Loads the watch providers, keyed by slug and alternative name for logo lookup.
   */
  async function loadProviders(): Promise<void> {
    try {
      const response = await kit.request('GET', 'providers');
      const data = (response.body?.data ?? []) as { attributes?: { slug?: string; name?: string; alternativeNames?: unknown; logo?: { url?: string } } }[];

      providers.clear();

      for (const provider of data) {
        const attributes = provider.attributes ?? {};
        const info = { name: attributes.name ?? attributes.slug ?? '', logo: attributes.logo?.url };
        const keys = [attributes.slug, ...(Array.isArray(attributes.alternativeNames) ? attributes.alternativeNames : [])];

        for (const key of keys) {
          if (typeof key === 'string' && key !== '') {
            providers.set(key.toLowerCase(), info);
          }
        }
      }
    } catch (error) {
      console.warn('[Kurozora] provider logos failed', (error as { message?: string })?.message);
    }
  }

  /**
   * Whispers the current playback position on the user's private channel.
   *
   * @param tabID - The tab the playback came from.
   * @param event - The playback event name.
   * @param playback - The playback state.
   * @param tab -
   */
  function whisperPosition(tabID: number, event: string, playback: PlaybackState, tab?: { url?: string; favIconUrl?: string }): void {
    const identity = scrobbleSessions.identityFor(tabID);

    if (identity === null || kit.authenticationKey === '') {
      return;
    }

    const siteModule = tab?.url ? pageFor(tab.url) : null;
    const provider = siteModule ? providers.get(siteModule.name.toLowerCase()) : undefined;
    const siteName = provider?.name
      ?? (siteModule ? siteModule.name.charAt(0).toUpperCase() + siteModule.name.slice(1) : undefined);
    const duration = playback.duration || identity.duration || undefined;
    const faviconURL = provider?.logo
      ?? (tab?.favIconUrl && /^https?:\/\//.test(tab.favIconUrl) ? tab.favIconUrl : undefined);
    const episodeID = scrobbleSessions.episodePublicIDFor(tabID) ?? undefined;

    kit.presence.whisper('scrobble.position', {
      seriesKey: identity.seriesKey,
      title: identity.title,
      episode: identity.episode,
      ...(episodeID ? { episodeID: episodeID } : {}),
      position: playback.position,
      progress: playback.progress,
      playing: event === 'play' || event === 'progress',
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
      loadProviders().catch(() => {});

      if (kit.authenticationKey !== '') {
        connectPresence();
      }
    }

    if (changes.trackingNotifications !== undefined) {
      scrobbleSessions.setNotificationsEnabled(changes.trackingNotifications.newValue === true);
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

  browser.runtime.onMessage.addListener((request: any, sender, sendResponse) => {
    if (request.action === 'scrobble:identity' && sender.tab?.id !== undefined) {
      scrobbleSessions.handleIdentity(sender.tab.id, request.identity, sender.tab.url ?? null, request.fresh === true);
    }

    if (request.action === 'resume:accept' && sender.tab?.id !== undefined) {
      browser.tabs
        .sendMessage(sender.tab.id, { action: 'resume:seek', position: request.position })
        .catch((error: { message?: string }) => console.warn('[Kurozora] resume seek failed', error?.message));
    }

    if (request.action === 'popup:continueWatching' && typeof request.url === 'string') {
      continueWatching(request.url)
        .catch((error: { message?: string }) => console.warn('[Kurozora] continue watching failed', error?.message));
    }

    if (request.action === 'scrobble:playback' && sender.tab?.id !== undefined) {
      const tabID = sender.tab.id;
      const event = request.event as string;
      const playback = request.playback as PlaybackState;

      kitReady.then(async () => {
        whisperPosition(tabID, event, playback, sender.tab);

        if (event !== 'progress') {
          await scrobbleSessions.handlePlayback(tabID, { event: event, ...playback });
        }
      });

      return;
    }

    if (request.action === 'popup:getUpNext') {
      kitReady
        .then(() => ensureUpNext())
        .then((rows) => sendResponse({ rows: rows }))
        .catch((error: { message?: string }) => sendResponse({ rows: [], error: error?.message ?? 'Please try again.' }));

      return true;
    }

    if (request.action === 'popup:refreshUpNext') {
      kitReady
        .then(() => refreshUpNext())
        .then((rows) => sendResponse({ rows: rows }))
        .catch((error: { message?: string }) => sendResponse({ rows: upNextCache ?? [], error: error?.message ?? 'Please try again.' }));

      return true;
    }
  });

  browser.tabs.onRemoved.addListener((tabID) => {
    scrobbleSessions.handleTabClosed(tabID);
  });

  browser.runtime.onInstalled.addListener(async () => {
    await setupContextMenu();
  });
  browser.storage.sync.onChanged.addListener(setupContextMenu);
});
