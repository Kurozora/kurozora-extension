import { browser } from 'wxt/browser';
import type { ScrobbleEvent } from 'kurozorakit';
import type { KurozoraKit } from 'kurozorakit';
import type { PageIdentity } from './page-registry';

/**
 * A cached series mapping.
 */
interface SeriesMapping {
  /**
   * The MyAnimeList id the series resolved to, or null when unresolved.
   */
  malID: number | string | null;

  /**
   * The catalog title the series resolved to.
   */
  animeTitle: string | null;

  /**
   * The server-resolved episode ids, keyed by `"season:number"`.
   */
  episodes: Record<string, string>;
}

/**
 * The mapping cache, keyed by series key.
 */
type MappingCache = Record<string, SeriesMapping>;

/**
 * Resolves page identities to Kurozora scrobble identities.
 */
export default class ScrobbleResolver {
  /**
   * The storage key holding the mapping cache.
   */
  static STORAGE_KEY = 'scrobbleMappings';

  /**
   * The kit performing catalog searches.
   */
  #kit: KurozoraKit;

  /**
   * The in-memory mapping cache, keyed by series key.
   */
  #mappings: MappingCache | null = null;

  /**
   * Create a new resolver instance.
   *
   * @param kit - The kit performing catalog searches.
   */
  constructor(kit: KurozoraKit) {
    this.#kit = kit;
  }

  /**
   * The scrobble identity block for the given page identity.
   *
   * @param identity - The page identity.
   *
   * @returns The identity payload, or null when unresolvable.
   */
  async identityPayload(identity: PageIdentity): Promise<ScrobbleEvent | null> {
    const mappings = await this.#loadMappings();
    const existing: SeriesMapping | undefined = mappings[identity.seriesKey];

    const mapping = existing?.malID != null ? existing : await this.#resolveSeries(identity);

    if (mapping === null || mapping.malID === null) {
      console.warn('[Kurozora] series has no catalog match', identity.title);

      return null;
    }

    const episodeID: string | null = mapping.episodes[this.#episodeKey(identity)] ?? null;

    if (episodeID !== null) {
      return { episode: { kurozoraID: episodeID } };
    }

    return {
      anime: {
        ids: { mal: mapping.malID },
        season: identity.season,
        number: identity.episode,
      },
    };
  }

  /**
   * Caches the server-resolved episode id for the given page identity.
   *
   * @param identity - The page identity.
   * @param episodeID - The episode's Kurozora public id.
   */
  async cacheEpisode(identity: PageIdentity, episodeID: string): Promise<void> {
    const mappings = await this.#loadMappings();
    const mapping: SeriesMapping | undefined = mappings[identity.seriesKey];

    if (!mapping) {
      return;
    }

    mapping.episodes[this.#episodeKey(identity)] = episodeID;

    await this.#storeMappings();
  }

  /**
   * The catalog title the series resolved to, or null when unresolved.
   *
   * @param seriesKey - The series key.
   */
  async animeTitleFor(seriesKey: string): Promise<string | null> {
    const mappings = await this.#loadMappings();

    return mappings[seriesKey]?.animeTitle ?? null;
  }

  /**
   * Forgets the mapping for the series.
   *
   * @param seriesKey - The series key to forget.
   */
  async forget(seriesKey: string): Promise<void> {
    const mappings = await this.#loadMappings();

    delete mappings[seriesKey];

    await this.#storeMappings();
  }

  /**
   * Resolves the series through catalog search and caches the outcome.
   *
   * @param identity - The page identity.
   *
   * @returns The cached mapping.
   */
  async #resolveSeries(identity: PageIdentity): Promise<SeriesMapping | null> {
    const mappings = await this.#loadMappings();
    let malID: number | string | null = null;
    let animeTitle: string | null = null;

    try {
      const results = await this.#kit.search.index(identity.title, { types: ['shows'], limit: 5 });
      const candidateIDs = (results?.data?.shows?.data ?? []).map((show: { id: string }) => show.id);

      if (candidateIDs.length > 0) {
        const shows = (await this.#kit.anime.views(candidateIDs)).data ?? [];
        const bestMatch = this.#bestMatch(identity.title, shows);

        malID = bestMatch?.attributes?.malID ?? null;
        animeTitle = bestMatch?.attributes?.title ?? null;
      }
    } catch (error) {
      const apiError = error as { status?: number | null; message?: string };
      console.warn('[Kurozora] series search failed', apiError.status, apiError.message);

      return null;
    }

    console.log('[Kurozora] series resolved', identity.title, '→', animeTitle, 'mal:' + malID);

    const mapping: SeriesMapping = { malID: malID, animeTitle: animeTitle, episodes: {} };

    if (malID !== null) {
      mappings[identity.seriesKey] = mapping;
      await this.#storeMappings();
    }

    return mapping;
  }

  /**
   * The search result best matching the series title.
   *
   * @param title - The series title from the page.
   * @param shows - The search results.
   */
  #bestMatch(title: string, shows: any[]): any {
    const normalized = this.#normalize(title);

    // A confident title match only; never fall back to the top search hit, so
    // a title absent from the catalog resolves to nothing rather than the
    // closest Meilisearch result.
    return shows.find((show) => {
      const attributes = show.attributes ?? {};
      const synonymTitles = Array.isArray(attributes.synonymTitles)
        ? attributes.synonymTitles
        : Object.values(attributes.synonymTitles ?? {});
      const candidates = [attributes.title, attributes.originalTitle, ...synonymTitles];

      return candidates.some((candidate: string | null | undefined) => candidate && this.#normalize(candidate) === normalized);
    }) ?? null;
  }

  /**
   * The normalized form of a title for comparison.
   *
   * @param title - The title to normalize.
   */
  #normalize(title: string): string {
    return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }

  /**
   * The cache key of an episode within its series mapping.
   *
   * @param identity - The page identity.
   */
  #episodeKey(identity: PageIdentity): string {
    return (identity.season ?? '') + ':' + identity.episode;
  }

  /**
   * The mapping cache.
   */
  async #loadMappings(): Promise<MappingCache> {
    if (this.#mappings === null) {
      const stored = await browser.storage.local.get(ScrobbleResolver.STORAGE_KEY);
      this.#mappings = (stored[ScrobbleResolver.STORAGE_KEY] as MappingCache | undefined) ?? {};
    }

    return this.#mappings;
  }

  /**
   * Persists the mapping cache.
   */
  async #storeMappings(): Promise<void> {
    await browser.storage.local.set({
      [ScrobbleResolver.STORAGE_KEY]: this.#mappings,
    });
  }
}
