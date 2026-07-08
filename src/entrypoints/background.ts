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

  /**
   * Whether incognito suspends all tracking.
   */
  let incognitoEnabled = false;

  /**
   * The site domains tracking is disabled on.
   */
  let blockedDomains: string[] = [];

  /**
   * The streaming site domains scrobbling has run on.
   */
  const visitedDomains = new Set<string>();

  /**
   * Whether tracking is suspended globally or for the reporting tab's site.
   *
   * @param tabURL - The reporting tab's URL, when known.
   */
  function trackingSuspended(tabURL: string | undefined): boolean {
    if (incognitoEnabled) {
      return true;
    }

    if (tabURL === undefined || tabURL === '') {
      return false;
    }

    try {
      return blockedDomains.includes(siteDomain(new URL(tabURL).hostname));
    } catch {
      return false;
    }
  }

  /**
   * Restores the incognito and per-site tracking preferences.
   */
  async function restoreTrackingRules(): Promise<void> {
    const stored = await browser.storage.local.get(['incognito', 'blockedDomains', 'visitedDomains', 'dynamicTitle', 'fillerBadges', 'accessibleBadges']);

    incognitoEnabled = stored.incognito === true;
    blockedDomains = Array.isArray(stored.blockedDomains) ? stored.blockedDomains : [];
    dynamicTitleEnabled = stored.dynamicTitle !== false;
    fillerBadgesEnabled = stored.fillerBadges !== false;
    accessibleBadgesEnabled = stored.accessibleBadges === true;

    if (Array.isArray(stored.visitedDomains)) {
      stored.visitedDomains.forEach((domain: string) => visitedDomains.add(domain));
    }
  }

  /**
   * Records a streaming domain scrobbling has run on, for the sites screen.
   *
   * @param tabURL - The reporting tab's URL.
   */
  async function recordVisitedDomain(tabURL: string | undefined): Promise<void> {
    if (tabURL === undefined || tabURL === '') {
      return;
    }

    try {
      const domain = siteDomain(new URL(tabURL).hostname);

      if (visitedDomains.has(domain)) {
        return;
      }

      visitedDomains.add(domain);
      await browser.storage.local.set({ visitedDomains: [...visitedDomains] });
    } catch {
    }
  }

  const scrobbleSessions = new ScrobbleSessionManager(kit, () => {
    refreshUpNext().catch((error: { message?: string }) => console.warn('[Kurozora] up-next refresh failed', error?.message));
  }, showTrackingNotification, offerResume, (tabID, episodePublicID) => {
    sendEpisodeGrid(tabID, episodePublicID)
      .catch((error: { message?: string }) => console.warn('[Kurozora] episode grid failed', error?.message));
  });

  /**
   * Whether the tab title is rewritten with live playback.
   */
  let dynamicTitleEnabled = true;

  /**
   * Whether filler badges are injected onto site episode grids.
   */
  let fillerBadgesEnabled = true;

  /**
   * Whether badges distinguish fillers without relying on color.
   */
  let accessibleBadgesEnabled = false;

  /**
   * The per-season grid payloads already fetched, keyed by season id.
   */
  const gridCache = new Map<string, { number: number; fillerKind: number; isWatched: boolean }[]>();

  /**
   * Sends the tab the season's episode facts for on-page badges.
   *
   * @param tabID - The tab playing the episode.
   * @param episodePublicID - The playing episode's public id.
   */
  async function sendEpisodeGrid(tabID: number, episodePublicID: string): Promise<void> {
    if (!fillerBadgesEnabled) {
      return;
    }

    const episode = (await kit.episodes.views([episodePublicID])).data?.[0];
    const seasonID: string | undefined = episode?.relationships?.seasons?.data?.[0]?.id;

    if (seasonID === undefined) {
      return;
    }

    let grid = gridCache.get(seasonID);

    if (grid === undefined) {
      grid = await loadSeasonGrid(seasonID);
      gridCache.set(seasonID, grid);
    }

    await browser.tabs.sendMessage(
      tabID,
      { action: 'grid:update', episodes: grid, accessible: accessibleBadgesEnabled },
      { frameId: 0 },
    );
  }

  /**
   * The season's episode facts, loaded page by page.
   *
   * @param seasonID - The season id.
   */
  async function loadSeasonGrid(seasonID: string): Promise<{ number: number; fillerKind: number; isWatched: boolean }[]> {
    const identities = (await kit.seasons.episodes(seasonID)).data ?? [];
    const episodeIDs: string[] = identities.map((identity: { id: string }) => identity.id);
    const grid: { number: number; fillerKind: number; isWatched: boolean }[] = [];

    for (let index = 0; index < episodeIDs.length; index += 25) {
      const episodes = (await kit.episodes.views(episodeIDs.slice(index, index + 25))).data ?? [];

      episodes.forEach((episode: any) => {
        const attributes = episode.attributes ?? {};

        if (typeof attributes.number === 'number') {
          grid.push({
            number: attributes.number,
            // `fillerKind` supersedes the deprecated `isFiller`; derive it while
            // servers without the new field are still in rotation.
            fillerKind: typeof attributes.fillerKind === 'number'
              ? attributes.fillerKind
              : (attributes.isFiller === true ? 1 : 0),
            isWatched: attributes.isWatched === true,
          });
        }
      });
    }

    return grid;
  }

  /**
   * Re-sends the episode grid to every actively tracking tab.
   */
  function resendActiveGrids(): void {
    for (const tabID of scrobbleSessions.activeTabIDs()) {
      const episodePublicID = scrobbleSessions.episodePublicIDFor(tabID);

      if (episodePublicID != null) {
        sendEpisodeGrid(tabID, episodePublicID)
          .catch((error: { message?: string }) => console.warn('[Kurozora] episode grid failed', error?.message));
      }
    }
  }

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
        isFiller: info.isFiller,
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
    .then(() => restoreTrackingRules())
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
   * Sends the tab a live playback summary for its title, when enabled.
   *
   * @param tabID - The tab the playback came from.
   * @param event - The playback event name.
   * @param playback - The playback state.
   */
  function updateTabTitle(tabID: number, event: string, playback: PlaybackState): void {
    if (!dynamicTitleEnabled) {
      return;
    }

    const identity = scrobbleSessions.identityFor(tabID);

    if (identity === null) {
      return;
    }

    browser.tabs
      .sendMessage(tabID, {
        action: 'title:update',
        title: identity.title,
        episode: identity.episode,
        position: playback.position,
        duration: playback.duration || identity.duration || 0,
        playing: event === 'play' || event === 'progress',
      }, { frameId: 0 })
      .catch(() => {});
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

    if (changes.incognito !== undefined) {
      incognitoEnabled = changes.incognito.newValue === true;

      // Silence the live presence of every active session at once, so a
      // share-screen doesn't keep broadcasting until the next pause.
      if (incognitoEnabled) {
        scrobbleSessions.activeTabIDs().forEach((tabID) => {
          whisperPosition(tabID, 'pause', { progress: 0, position: 0, duration: 0 });
        });
      }
    }

    if (changes.blockedDomains !== undefined) {
      blockedDomains = Array.isArray(changes.blockedDomains.newValue) ? changes.blockedDomains.newValue : [];
    }

    if (changes.dynamicTitle !== undefined) {
      dynamicTitleEnabled = changes.dynamicTitle.newValue !== false;
    }

    if (changes.fillerBadges !== undefined) {
      fillerBadgesEnabled = changes.fillerBadges.newValue !== false;
    }

    if (changes.accessibleBadges !== undefined) {
      accessibleBadgesEnabled = changes.accessibleBadges.newValue === true;
    }

    // A badge toggle needs the grid re-sent to tabs that never received it;
    // the flags above are already current for the re-send.
    if (changes.fillerBadges !== undefined || changes.accessibleBadges !== undefined) {
      resendActiveGrids();
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
      if (trackingSuspended(sender.tab.url)) {
        scrobbleSessions.handleIdentity(sender.tab.id, null);
      } else {
        recordVisitedDomain(sender.tab.url).catch(() => {});
        scrobbleSessions.handleIdentity(sender.tab.id, request.identity, sender.tab.url ?? null, request.fresh === true);
      }
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
      if (trackingSuspended(sender.tab.url)) {
        return;
      }

      const tabID = sender.tab.id;
      const event = request.event as string;
      const playback = request.playback as PlaybackState;

      kitReady.then(async () => {
        whisperPosition(tabID, event, playback, sender.tab);
        updateTabTitle(tabID, event, playback);

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

    if (request.action === 'popup:clearScrobble' && typeof request.episodeID === 'string') {
      kitReady
        .then(() => kit.episodes.clearWatched(request.episodeID))
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
