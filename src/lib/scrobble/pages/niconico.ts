import { type EpisodeIdentity, type PageModule } from '../page-registry';

/**
 * The Niconico page module.
 */
const niconico: PageModule = {
  name: 'niconico',

  matches(url) {
    return new URL(url).hostname.endsWith('nicovideo.jp');
  },

  isWatchPage(url) {
    return /\/watch\//.test(new URL(url).pathname);
  },

  identify(pageDocument) {
    const identity = identityFromWatchData(pageDocument);

    if (identity === null) {
      return null;
    }

    return {
      seriesKey: this.name + ':' + identity.title.toLowerCase(),
      ...identity,
      episode: identity.episode ?? 1,
    };
  },
};

export default niconico;

/**
 * The identity parsed from the watch page's embedded data.
 *
 * @param pageDocument - The document to inspect.
 */
function identityFromWatchData(pageDocument: Document): EpisodeIdentity | null {
  const raw = pageDocument.querySelector('#js-initial-watch-data')?.getAttribute('data-api-data');
  let data: any = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  const videoTitle = data?.video?.title ?? pageDocument.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
  const seriesTitle = typeof data?.series?.title === 'string' ? data.series.title : null;
  const title = (seriesTitle ?? stripEpisode(videoTitle)).trim();

  if (title === '') {
    return null;
  }

  return {
    title: title,
    season: null,
    episode: episodeNumber(videoTitle),
    episodeTitle: seriesTitle ? videoTitle : null,
  };
}

/**
 * The episode number read from a video title, or null when absent.
 *
 * @param title - The video title.
 */
function episodeNumber(title: string): number | null {
  const match = title.match(/第(\d+)話|#(\d+)|episode\s*(\d+)|ep\.?\s*(\d+)/i);
  const number = match?.[1] ?? match?.[2] ?? match?.[3] ?? match?.[4];

  return number ? parseInt(number, 10) : null;
}

/**
 * A video title with any trailing episode marker removed.
 *
 * @param title - The video title.
 */
function stripEpisode(title: string): string {
  return title.replace(/第\d+話.*$|#\d+.*$|episode\s*\d+.*$/i, '').trim() || title;
}
