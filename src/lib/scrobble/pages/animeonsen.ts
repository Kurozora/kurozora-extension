import { identityFromJsonLd, mergeIdentity, type EpisodeIdentity, type PageModule } from '../page-registry';

/**
 * The AnimeOnsen page module.
 */
const animeonsen: PageModule = {
  name: 'animeonsen',

  matches(url) {
    return new URL(url).hostname.endsWith('animeonsen.xyz');
  },

  isWatchPage(url) {
    return /\/watch\/[^\/]+/.test(new URL(url).pathname);
  },

  networkMatches(url) {
    const parsed = new URL(url);

    return parsed.hostname === 'api.animeonsen.xyz' && /^\/v4\/content\/[^/]+\/video\/\d+/.test(parsed.pathname);
  },

  captureNetwork(_url, body) {
    let payload: any = null;

    try {
      payload = JSON.parse(body);
    } catch {
      return null;
    }

    const metadata = payload?.metadata;

    if (metadata == null) {
      return null;
    }

    // `metadata.episode` is [number, currentEpisode, episodesByNumber].
    const episodeData: any[] = Array.isArray(metadata.episode) ? metadata.episode : [];
    const number = Number(episodeData[0]);
    const current = typeof episodeData[1] === 'object' ? episodeData[1] : null;
    const mapped = !Number.isNaN(number) && typeof episodeData[2] === 'object' ? episodeData[2]?.[String(number)] : null;

    return {
      title: cleanString(metadata.content_title_en) ?? cleanString(metadata.content_title),
      episode: Number.isNaN(number) ? null : number,
      episodeTitle: cleanString(current?.contentTitle_episode_en) ?? cleanString(mapped?.contentTitle_episode_en),
    };
  },

  identify(pageDocument, url, captured) {
    const identity = mergeIdentity(
      captured,
      identityFromJsonLd(pageDocument)
        ?? identityFromMeta(pageDocument)
        ?? identityFromTitle(pageDocument)
        ?? identityFromPlayer(pageDocument),
    );

    if (identity === null || identity.episode === null) {
      return null;
    }

    const seriesIdentifier = contentIdentifier(pageDocument, url) ?? identity.title.toLowerCase();

    return {
      seriesKey: this.name + ':' + seriesIdentifier,
      ...identity,
    };
  },
};

export default animeonsen;

/**
 * The trimmed string, or null when empty or not a string.
 *
 * @param value - The value to clean.
 */
function cleanString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/**
 * The identity parsed from the server-rendered head metadata.
 *
 * @param pageDocument - The document to inspect.
 */
function identityFromMeta(pageDocument: Document): EpisodeIdentity | null {
  const episode = metaContent(pageDocument, 'meta[name="ao-content-episode"]');
  const title = metaContent(pageDocument, 'meta[property="og:image:alt"]')
    ?? stripEpisodeSuffix(metaContent(pageDocument, 'meta[property="og:title"]'));

  if (episode === null || title === null) {
    return null;
  }

  return {
    title: title,
    season: null,
    episode: parseInt(episode, 10),
  };
}

/**
 * The identity parsed from the document title.
 *
 * @param pageDocument - The document to inspect.
 */
function identityFromTitle(pageDocument: Document): EpisodeIdentity | null {
  const match = pageDocument.title.match(/^(.+?) Episode (\d+)/i);

  if (match === null) {
    return null;
  }

  return {
    title: match[1].trim(),
    season: null,
    episode: parseInt(match[2], 10),
  };
}

/**
 * The identity parsed from the client-rendered player metadata.
 *
 * @param pageDocument - The document to inspect.
 */
function identityFromPlayer(pageDocument: Document): EpisodeIdentity | null {
  const title = pageDocument.querySelector('.ao-player-metadata-title')?.textContent?.trim() ?? null;
  const label = pageDocument.querySelector('.ao-player-metadata-episode')?.textContent ?? '';
  const match = label.match(/Episode (\d+)/i);

  if (title === null || title === '' || match === null) {
    return null;
  }

  return {
    title: title,
    season: null,
    episode: parseInt(match[1], 10),
  };
}

/**
 * The stable series identifier for the page.
 *
 * @param pageDocument - The document to inspect.
 * @param url - The page URL.
 */
function contentIdentifier(pageDocument: Document, url: string): string | null {
  const meta = metaContent(pageDocument, 'meta[name="ao-content-id"]');

  if (meta !== null) {
    return meta.toLowerCase();
  }

  const match = new URL(url).pathname.match(/\/watch\/([^\/?#]+)/);

  return match !== null ? match[1].toLowerCase() : null;
}

/**
 * The trimmed content of the first matching meta tag.
 *
 * @param pageDocument - The document to inspect.
 * @param selector - The meta tag selector.
 */
function metaContent(pageDocument: Document, selector: string): string | null {
  const content = pageDocument.querySelector<HTMLMetaElement>(selector)?.content?.trim();

  return content !== undefined && content !== '' ? content : null;
}

/**
 * The series title with a trailing " Episode {N}" removed.
 *
 * @param title - The title to trim.
 */
function stripEpisodeSuffix(title: string | null): string | null {
  if (title === null) {
    return null;
  }

  return title.replace(/ Episode \d+.*$/i, '').trim();
}
