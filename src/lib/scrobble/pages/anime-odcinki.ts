import { identityFromJsonLd, type PageModule } from '../page-registry';

/**
 * The anime-odcinki page module.
 */
const animeOdcinki: PageModule = {
  name: 'anime-odcinki',

  matches(url) {
    return new URL(url).hostname.endsWith('anime-odcinki.pl');
  },

  isWatchPage(url) {
    return /^\/anime\/[^\/]+\/\d+\/?$/.test(new URL(url).pathname);
  },

  identify(pageDocument, url) {
    const watch = watchInfoFromURL(url);

    if (watch === null) {
      return null;
    }

    const identity = identityFromJsonLd(pageDocument);
    const title = identity?.title ?? titleFromDocument(pageDocument) ?? titleFromHeader(pageDocument);

    if (title === null) {
      return null;
    }

    return {
      seriesKey: this.name + ':' + watch.slug.toLowerCase(),
      title: title,
      season: identity?.season ?? null,
      episode: identity?.episode ?? watch.episode,
    };
  },
};

export default animeOdcinki;

/**
 * The series slug and episode number parsed from a watch URL.
 *
 * @param url - The page URL.
 */
function watchInfoFromURL(url: string): { slug: string; episode: number } | null {
  const match = new URL(url).pathname.match(/^\/anime\/([^\/]+)\/(\d+)\/?$/);

  if (match === null) {
    return null;
  }

  return {
    slug: match[1],
    episode: parseInt(match[2], 10),
  };
}

/**
 * The series title parsed from the document title.
 *
 * @param pageDocument - The document to inspect.
 */
function titleFromDocument(pageDocument: Document): string | null {
  return cleanSeriesTitle(pageDocument.title.split(' - Anime Odcinki')[0].trim());
}

/**
 * The series title parsed from the page header.
 *
 * @param pageDocument - The document to inspect.
 */
function titleFromHeader(pageDocument: Document): string | null {
  const header = pageDocument.querySelector('h1.ao-page-header');

  if (header === null) {
    return null;
  }

  return cleanSeriesTitle((header.textContent ?? '').trim());
}

/**
 * A series title with any trailing "{episode} PL" marker removed.
 *
 * @param text - The raw heading or title text.
 */
function cleanSeriesTitle(text: string): string | null {
  const title = text.replace(/\s+\d+\s+PL\b.*$/i, '').trim();

  return title.length > 0 ? title : null;
}
