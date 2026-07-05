import { type PageModule } from '../page-registry';

/**
 * The ABEMA page module.
 */
const abema: PageModule = {
  name: 'abema',

  matches(url) {
    const hostname = new URL(url).hostname;

    return hostname === 'abema.tv' || hostname.endsWith('.abema.tv');
  },

  isWatchPage(url) {
    return new URL(url).pathname.startsWith('/video/episode/');
  },

  identify(pageDocument, url) {
    const programID = new URL(url).pathname.match(/^\/video\/episode\/([^/?#]+)/)?.[1];

    if (programID === undefined) {
      return null;
    }

    const marker = programID.match(/_s(\d+)_p(\d+)$/);
    const season = marker ? parseInt(marker[1], 10) : null;
    const episode = marker ? parseInt(marker[2], 10) : null;
    const video = videoJsonLd(pageDocument, programID);

    // The server-rendered JSON-LD carries the richest metadata, but only the
    // first page load produces it; the freshness check ties it to the playing
    // program so in-page navigation never reads the previous episode.
    if (video !== null) {
      const crumbs = breadcrumbItems(pageDocument, programID);
      const label = crumbs?.[crumbs.length - 1]?.name ?? '';
      const seriesTitle = crumbs?.find((crumb) => crumb.item.includes('/video/title/'))?.name
        ?? (typeof video.name === 'string' ? video.name.split(/\s+-\s+第\d+話/)[0].trim() : '');

      if (seriesTitle === '') {
        return null;
      }

      return {
        seriesKey: this.name + ':' + seriesID(programID),
        title: seriesTitle,
        season: season,
        episode: episode ?? markerNumber(label) ?? 1,
        episodeTitle: label.replace(/^第\d+話\s*/, '').trim() || null,
        duration: isoDurationSeconds(video.duration),
      };
    }

    // After in-page navigation only the live meta tags follow along; trust
    // them once the canonical URL references the playing program.
    if (!liveMetaFresh(pageDocument, programID)) {
      return null;
    }

    const heading = (pageDocument.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '').split('|')[0].trim();
    const seriesTitle = heading
      .replace(/\s*（[^）]*）\s*$|\s*\([^)]*\)\s*$/, '')
      .replace(/\s*-\s*シーズン\d+\s*-\s*\d+話\s*$/, '')
      .replace(/\s*-\s*\d+話\s*$/, '')
      .trim();

    if (seriesTitle === '') {
      return null;
    }

    return {
      seriesKey: this.name + ':' + seriesID(programID),
      title: seriesTitle,
      season: season,
      episode: episode ?? markerNumber(heading) ?? 1,
      episodeTitle: null,
    };
  },
};

export default abema;

/**
 * The series portion of a program id like `345-7_s1_p1`.
 *
 * @param programID - The program id from the episode URL.
 */
function seriesID(programID: string): string {
  return programID.split('_')[0];
}

/**
 * The JSON-LD VideoObject rendered for the playing program, when present.
 *
 * @param pageDocument - The document to inspect.
 * @param programID - The program id from the episode URL.
 */
function videoJsonLd(pageDocument: Document, programID: string): { name?: unknown; duration?: unknown } | null {
  for (const script of pageDocument.querySelectorAll('script[type="application/ld+json"]')) {
    let payload: any = null;

    try {
      payload = JSON.parse(script.textContent ?? '');
    } catch {
      continue;
    }

    const nodes = Array.isArray(payload) ? payload : [payload];

    for (const node of nodes) {
      if (node?.['@type'] === 'VideoObject' && String(node['@id'] ?? node.url ?? '').includes(programID)) {
        return node;
      }
    }
  }

  return null;
}

/**
 * The breadcrumb entries rendered for the playing program, when present.
 *
 * @param pageDocument - The document to inspect.
 * @param programID - The program id from the episode URL.
 */
function breadcrumbItems(pageDocument: Document, programID: string): { name: string; item: string }[] | null {
  for (const script of pageDocument.querySelectorAll('script[type="application/ld+json"]')) {
    let payload: any = null;

    try {
      payload = JSON.parse(script.textContent ?? '');
    } catch {
      continue;
    }

    if (payload?.['@type'] !== 'BreadcrumbList' || !Array.isArray(payload.itemListElement)) {
      continue;
    }

    const crumbs = payload.itemListElement
      .filter((element: any) => typeof element?.name === 'string' && typeof element?.item === 'string')
      .map((element: any) => ({ name: element.name as string, item: element.item as string }));

    if (crumbs.length > 0 && crumbs[crumbs.length - 1].item.includes(programID)) {
      return crumbs;
    }
  }

  return null;
}

/**
 * Whether the live meta tags reference the playing program.
 *
 * @param pageDocument - The document to inspect.
 * @param programID - The program id from the episode URL.
 */
function liveMetaFresh(pageDocument: Document, programID: string): boolean {
  const canonical = pageDocument.querySelector('link[rel="canonical"]')?.getAttribute('href')
    ?? pageDocument.querySelector('meta[property="og:url"]')?.getAttribute('content')
    ?? '';

  return canonical.includes(programID);
}

/**
 * The episode number in a `第1話`-style label, or null when absent.
 *
 * @param label - The label to search.
 */
function markerNumber(label: string): number | null {
  const match = label.match(/(\d+)話/);

  return match ? parseInt(match[1], 10) : null;
}

/**
 * The seconds represented by an ISO 8601 duration, or null when unreadable.
 *
 * @param duration - The ISO 8601 duration, e.g. `PT24M14S`.
 */
function isoDurationSeconds(duration: unknown): number | null {
  if (typeof duration !== 'string') {
    return null;
  }

  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);

  if (match === null) {
    return null;
  }

  return parseInt(match[1] ?? '0', 10) * 3600 + parseInt(match[2] ?? '0', 10) * 60 + parseInt(match[3] ?? '0', 10);
}
