import { identityFromJsonLd, mergeIdentity, type EpisodeIdentity, type PageModule } from '../page-registry';

/**
 * The Crunchyroll page module.
 */
const crunchyroll: PageModule = {
  name: 'crunchyroll',

  matches(url) {
    return new URL(url).hostname.endsWith('crunchyroll.com');
  },

  isWatchPage(url) {
    return /\/watch\/[^\/]+/.test(new URL(url).pathname);
  },

  networkMatches(url) {
    return /\/content\/v2\/cms\/(objects|episodes|seasons)\//.test(new URL(url).pathname);
  },

  captureNetwork(_url, body) {
    let payload: any = null;

    try {
      payload = JSON.parse(body);
    } catch {
      return null;
    }

    const items: any[] = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.items) ? payload.items : [payload];

    for (const item of items) {
      const metadata = item?.episode_metadata ?? item;
      const episode = episodeNumber(metadata);
      const title = typeof metadata?.series_title === 'string' ? metadata.series_title.trim() : '';

      if (episode === null || title === '') {
        continue;
      }

      const episodeTitle = typeof item?.title === 'string' ? item.title.trim() : '';

      return {
        title: title,
        season: Number.isFinite(metadata.season_number) ? metadata.season_number : null,
        episode: episode,
        episodeTitle: episodeTitle !== '' ? episodeTitle : null,
        duration: Number.isFinite(metadata.duration_ms) ? Math.round(metadata.duration_ms / 1000) : null,
        seriesID: typeof metadata.series_id === 'string' && metadata.series_id !== '' ? metadata.series_id : null,
      };
    }

    return null;
  },

  identify(pageDocument, _url, captured) {
    const identity = mergeIdentity(captured, identityFromJsonLd(pageDocument) ?? identityFromTitle(pageDocument));

    if (identity === null || identity.episode === null) {
      return null;
    }

    const seriesIdentifier = captured?.seriesID ?? identity.title.toLowerCase();

    return {
      seriesKey: this.name + ':' + seriesIdentifier,
      ...identity,
    };
  },
};

export default crunchyroll;

/**
 * The episode number read from a captured item.
 *
 * @param metadata - The episode metadata object.
 */
function episodeNumber(metadata: any): number | null {
  if (Number.isFinite(metadata?.episode_number)) {
    return metadata.episode_number;
  }

  if (typeof metadata?.episode === 'string') {
    const parsed = parseInt(metadata.episode, 10);

    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * The identity parsed from the document title.
 *
 * @param pageDocument - The document to inspect.
 */
function identityFromTitle(pageDocument: Document): EpisodeIdentity | null {
  const match = pageDocument.title.match(/^Watch (.+?)(?: Season (\d+))? Episode (\d+)/i);

  if (match === null) {
    return null;
  }

  return {
    title: match[1].trim(),
    season: match[2] !== undefined ? parseInt(match[2], 10) : null,
    episode: parseInt(match[3], 10),
  };
}
