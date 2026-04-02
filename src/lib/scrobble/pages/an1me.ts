import { identityFromJsonLd, type EpisodeIdentity, type PageModule } from '../page-registry';

/**
 * The An1me page module.
 */
const an1me: PageModule = {
  name: 'an1me',

  matches(url) {
    return new URL(url).hostname.endsWith('an1me.to');
  },

  isWatchPage(url) {
    return /\/watch\/[^/]+-episode-\d+/i.test(new URL(url).pathname);
  },

  identify(pageDocument, url) {
    const identity = identityFromJsonLd(pageDocument)
      ?? identityFromBreadcrumb(pageDocument)
      ?? identityFromText(pageDocument.title)
      ?? identityFromText(pageDocument.querySelector('h1')?.textContent);

    if (identity === null || identity.episode === null) {
      return null;
    }

    return {
      seriesKey: this.name + ':' + (seriesSlug(url) ?? identity.title.toLowerCase()),
      ...identity,
    };
  },
};

export default an1me;

/**
 * The identity parsed from the `BreadcrumbList` structured data.
 *
 * @param pageDocument - The document to inspect.
 */
function identityFromBreadcrumb(pageDocument: Document): EpisodeIdentity | null {
  const scripts = pageDocument.querySelectorAll('script[type="application/ld+json"]');

  for (const script of scripts) {
    let payload: any = null;

    try {
      payload = JSON.parse(script.textContent ?? '');
    } catch {
      continue;
    }

    let nodes: any[] = [payload];

    if (Array.isArray(payload)) {
      nodes = payload;
    } else if (Array.isArray(payload?.['@graph'])) {
      nodes = payload['@graph'];
    }

    for (const node of nodes) {
      if (node?.['@type'] !== 'BreadcrumbList') {
        continue;
      }

      const items = Array.isArray(node.itemListElement) ? node.itemListElement : [];
      const series = items.find((item: any) => typeof item.item === 'string' && item.item.includes('/anime/'));
      const episode = episodeNumber(items[items.length - 1]?.name);

      if (series?.name == null || episode === null) {
        continue;
      }

      return {
        title: series.name.trim(),
        season: null,
        episode: episode,
      };
    }
  }

  return null;
}

/**
 * The identity parsed from an "{series} Episode {N}" text string.
 *
 * @param text - The text to parse.
 */
function identityFromText(text: string | null | undefined): EpisodeIdentity | null {
  if (typeof text !== 'string') {
    return null;
  }

  const match = text.match(/(?:Παρακολουθήστε\s+)?(.+?)\s+Episode\s+(\d+)/i);

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
 * The episode number parsed from an "… Episode {N}" text string.
 *
 * @param text - The text to parse.
 */
function episodeNumber(text: string | null | undefined): number | null {
  if (typeof text !== 'string') {
    return null;
  }

  const match = text.match(/Episode\s+(\d+)/i);

  return match !== null ? parseInt(match[1], 10) : null;
}

/**
 * The series slug parsed from a watch-page URL.
 *
 * @param url - The page URL.
 */
function seriesSlug(url: string): string | null {
  const match = new URL(url).pathname.match(/\/watch\/(.+?)-episode-\d+/i);

  return match !== null ? match[1].toLowerCase() : null;
}
