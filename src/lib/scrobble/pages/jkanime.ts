import { identityFromJsonLd, type EpisodeIdentity, type PageModule } from '../page-registry';

/**
 * The JKAnime page module.
 */
const jkanime: PageModule = {
  name: 'jkanime',

  matches(url) {
    return /(^|\.)jkanime\.[a-z]+$/i.test(new URL(url).hostname);
  },

  isWatchPage(url) {
    return /^\/[^\/]+\/\d+\/?$/.test(new URL(url).pathname);
  },

  identify(pageDocument, url) {
    const identity = identityFromJsonLd(pageDocument)
      ?? identityFromTitle(pageDocument)
      ?? identityFromHeading(pageDocument);

    if (identity === null || identity.episode === null) {
      return null;
    }

    return {
      seriesKey: this.name + ':' + (seriesSlug(url) ?? identity.title.toLowerCase()),
      ...identity,
    };
  },
};

export default jkanime;

/**
 * The identity parsed from the document title.
 *
 * @param pageDocument - The document to inspect.
 */
function identityFromTitle(pageDocument: Document): EpisodeIdentity | null {
  const match = pageDocument.title.match(/^(.+?)\s+(\d+)\s+Sub\s/i);

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
 * The identity parsed from the episode heading.
 *
 * @param pageDocument - The document to inspect.
 */
function identityFromHeading(pageDocument: Document): EpisodeIdentity | null {
  for (const heading of pageDocument.querySelectorAll('h1')) {
    const match = (heading.textContent ?? '').match(/Episodio\s+(\d+)\b[\s\S]*?-\s*(.+)$/i);

    if (match === null) {
      continue;
    }

    return {
      title: match[2].trim(),
      season: null,
      episode: parseInt(match[1], 10),
    };
  }

  return null;
}

/**
 * The series slug from a watch-page URL.
 *
 * @param url - The page URL.
 */
function seriesSlug(url: string): string | null {
  const match = new URL(url).pathname.match(/^\/([^\/]+)\/\d+\/?$/);

  return match !== null ? match[1].toLowerCase() : null;
}
