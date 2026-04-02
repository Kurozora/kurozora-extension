import an1me from './pages/an1me';
import animeOdcinki from './pages/anime-odcinki';
import animeonsen from './pages/animeonsen';
import animepahe from './pages/animepahe';
import crunchyroll from './pages/crunchyroll';
import jkanime from './pages/jkanime';
import witanime from './pages/witanime';

/**
 * The episode identity parsed from a page, before it is keyed to a series.
 */
export interface EpisodeIdentity {
  /**
   * The series title.
   */
  title: string;

  /**
   * The season number, when the site exposes one.
   */
  season: number | null;

  /**
   * The episode number.
   */
  episode: number | null;

  /**
   * The episode's own title, when the site exposes one.
   */
  episodeTitle?: string | null;
}

/**
 * The playing episode's identity, keyed to a stable per-series identifier.
 */
export interface PageIdentity extends EpisodeIdentity {
  /**
   * The stable series key, prefixed with the site name.
   */
  seriesKey: string;
}

/**
 * A page module, one per supported streaming site.
 */
export interface PageModule {
  /**
   * The site identifier used in series keys.
   */
  name: string;

  /**
   * Whether the module handles the URL's host.
   *
   * @param url - The page URL.
   */
  matches(url: string): boolean;

  /**
   * Whether the URL is a playback page.
   *
   * @param url - The page URL.
   */
  isWatchPage(url: string): boolean;

  /**
   * The playing episode as a {@link PageIdentity}, or null when unreadable.
   *
   * @param pageDocument - The document to inspect.
   * @param url - The page URL.
   */
  identify(pageDocument: Document, url: string): PageIdentity | null;
}

/**
 * The registered page modules, one per supported streaming site.
 */
const pages: PageModule[] = [
  an1me,
  animeOdcinki,
  animeonsen,
  animepahe,
  crunchyroll,
  jkanime,
  witanime,
];

/**
 * The page module handling the given URL.
 *
 * @param url - The page URL.
 */
export function pageFor(url: string): PageModule | null {
  return pages.find((page) => page.matches(url)) ?? null;
}

/**
 * The episode identity parsed from the page's JSON-LD, when present.
 *
 * Streaming sites commonly embed a `TVEpisode` structured-data block;
 * this is the most reliable cross-site strategy.
 *
 * @param pageDocument - The document to inspect.
 */
export function identityFromJsonLd(pageDocument: Document): EpisodeIdentity | null {
  const scripts = pageDocument.querySelectorAll('script[type="application/ld+json"]');

  for (const script of scripts) {
    let payload: any = null;

    try {
      payload = JSON.parse(script.textContent ?? '');
    } catch {
      continue;
    }

    const nodes = Array.isArray(payload) ? payload : [payload];

    for (const node of nodes) {
      if (node?.['@type'] !== 'TVEpisode') {
        continue;
      }

      const title = node.partOfSeries?.name ?? null;

      if (title === null) {
        continue;
      }

      return {
        title: title,
        season: node.partOfSeason?.seasonNumber != null ? parseInt(node.partOfSeason.seasonNumber, 10) : null,
        episode: node.episodeNumber != null ? parseInt(node.episodeNumber, 10) : null,
        episodeTitle: typeof node.name === 'string' ? node.name : null,
      };
    }
  }

  return null;
}
