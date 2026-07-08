import abema from './pages/abema';
import adn from './pages/adn';
import an1me from './pages/an1me';
import animeOdcinki from './pages/anime-odcinki';
import animeonsen from './pages/animeonsen';
import animepahe from './pages/animepahe';
import appletv from './pages/appletv';
import bilibili from './pages/bilibili';
import crunchyroll from './pages/crunchyroll';
import disneyplus from './pages/disneyplus';
import hidive from './pages/hidive';
import iqiyi from './pages/iqiyi';
import jkanime from './pages/jkanime';
import netflix from './pages/netflix';
import niconico from './pages/niconico';
import plex from './pages/plex';
import unext from './pages/unext';
import witanime from './pages/witanime';
import youtube from './pages/youtube';

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

  /**
   * The episode's runtime in seconds, when the site exposes one.
   */
  duration?: number | null;
}

/**
 * Episode metadata parsed from a site's own network response.
 */
export interface CapturedEpisode {
  /**
   * The series title.
   */
  title?: string | null;

  /**
   * The season number.
   */
  season?: number | null;

  /**
   * The episode number.
   */
  episode?: number | null;

  /**
   * The episode's own title.
   */
  episodeTitle?: string | null;

  /**
   * The episode's runtime in seconds.
   */
  duration?: number | null;

  /**
   * The site's own stable series identifier.
   */
  seriesID?: string | null;
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
   * @param captured - Episode metadata captured from the site's network, when present.
   */
  identify(pageDocument: Document, url: string, captured?: CapturedEpisode | null): PageIdentity | null;

  /**
   * Whether a network response URL carries episode metadata worth capturing.
   *
   * @param url - The response URL.
   */
  networkMatches?(url: string): boolean;

  /**
   * The episode metadata parsed from a captured network response body.
   *
   * @param url - The response URL.
   * @param body - The raw response body.
   * @param pageURL - The watch page's URL.
   */
  captureNetwork?(url: string, body: string, pageURL?: string): CapturedEpisode | null;

  /**
   * The site's on-page episode cells, for badge and overlay injection.
   *
   * @param pageDocument - The document to inspect.
   */
  episodeCells?(pageDocument: Document): { element: HTMLElement; episode: number }[];
}

/**
 * The registered page modules, one per supported streaming site.
 */
const pages: PageModule[] = [
  abema,
  adn,
  an1me,
  animeOdcinki,
  animeonsen,
  animepahe,
  appletv,
  bilibili,
  crunchyroll,
  disneyplus,
  hidive,
  iqiyi,
  jkanime,
  netflix,
  niconico,
  plex,
  unext,
  witanime,
  youtube,
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
 * A network capture folded over a DOM-derived identity, field by field.
 *
 * @param captured - The network-captured metadata, when present.
 * @param dom - The DOM-derived identity, when present.
 */
export function mergeIdentity(captured: CapturedEpisode | null | undefined, dom: EpisodeIdentity | null): EpisodeIdentity | null {
  const title = captured?.title ?? dom?.title ?? null;

  if (title === null || title === '') {
    return dom;
  }

  return {
    title: title,
    season: captured?.season ?? dom?.season ?? null,
    episode: captured?.episode ?? dom?.episode ?? null,
    episodeTitle: captured?.episodeTitle ?? dom?.episodeTitle ?? null,
    duration: captured?.duration ?? dom?.duration ?? null,
  };
}

/**
 * The episode identity parsed from the page's JSON-LD, when present.
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
      if (node?.['@type'] === 'TVEpisode') {
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

      if ((node?.['@type'] === 'Movie' || node?.['@type'] === 'VideoObject') && typeof node.name === 'string') {
        return {
          title: node.name,
          season: null,
          episode: null,
        };
      }
    }
  }

  return null;
}
