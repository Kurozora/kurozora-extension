import { identityFromJsonLd, type EpisodeIdentity, type PageModule } from '../page-registry';

/**
 * The WitAnime page module.
 */
const witanime: PageModule = {
  name: 'witanime',

  matches(url) {
    const hostname = new URL(url).hostname.replace(/^www\./, '');

    return KNOWN_DOMAINS.includes(hostname) || /^witanime\./.test(hostname);
  },

  isWatchPage(url) {
    return /^\/episode\//.test(new URL(url).pathname);
  },

  identify(pageDocument, url) {
    const identity = identityFromJsonLd(pageDocument)
      ?? identityFromMeta(pageDocument)
      ?? identityFromDom(pageDocument);

    if (identity === null || identity.episode === null) {
      return null;
    }

    const seriesIdentifier = seriesSlug(pageDocument) ?? identity.title;

    return {
      seriesKey: this.name + ':' + seriesIdentifier.toLowerCase(),
      title: identity.title,
      season: identity.season,
      episode: identity.episode,
    };
  },
};

export default witanime;

/**
 * The domains WitAnime has recently served from.
 */
const KNOWN_DOMAINS: string[] = [
  'witanime.you',
  'witanime.uno',
  'witanime.red',
  'witanime.pro',
  'witanime.com',
  'witanime.xyz',
  'witanime.video',
  'witanime.today',
  'witanime.life',
];

/**
 * The identity parsed from the page's Open Graph title, then the document title.
 *
 * @param pageDocument - The document to inspect.
 */
function identityFromMeta(pageDocument: Document): EpisodeIdentity | null {
  const heading = pageDocument.querySelector('meta[property="og:title"]')?.getAttribute('content')
    ?? pageDocument.title;

  return heading ? episodeIdentity(heading) : null;
}

/**
 * The identity parsed from stable DOM elements.
 *
 * @param pageDocument - The document to inspect.
 */
function identityFromDom(pageDocument: Document): EpisodeIdentity | null {
  const heading = [...pageDocument.querySelectorAll('h1, h2, h3')]
    .map((node) => (node.textContent ?? '').trim())
    .find((text) => EPISODE_PATTERN.test(text));

  if (heading === undefined) {
    return null;
  }

  const identity = episodeIdentity(heading);

  if (identity === null) {
    return null;
  }

  const title = pageDocument.querySelector('.anime-page-link a')?.textContent?.trim();

  return {
    title: title || identity.title,
    season: null,
    episode: identity.episode,
  };
}

/**
 * The series slug from the canonical `/anime/{slug}/` link, when present.
 *
 * @param pageDocument - The document to inspect.
 */
function seriesSlug(pageDocument: Document): string | null {
  const href = pageDocument.querySelector('.anime-page-link a')?.getAttribute('href');
  const match = href?.match(/\/anime\/([^\/]+)/) ?? null;

  return match !== null ? decodeURIComponent(match[1]) : null;
}

/**
 * The title and episode number parsed from an "انمي {series} الحلقة {N} …" heading.
 *
 * @param heading - The heading text to parse.
 */
function episodeIdentity(heading: string): EpisodeIdentity | null {
  const match = heading.match(EPISODE_PATTERN);

  if (match === null) {
    return null;
  }

  const title = heading.slice(0, match.index).replace(/^انمي\s+/, '').trim();

  if (title === '') {
    return null;
  }

  return {
    title: title,
    season: null,
    episode: parseInt(match[1], 10),
  };
}

/**
 * The Arabic "الحلقة {N}" ("episode {N}") marker capturing the episode number.
 */
const EPISODE_PATTERN = /الحلقة\s*(\d+)/;
