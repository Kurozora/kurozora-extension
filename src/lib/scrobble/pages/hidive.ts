import { type PageModule } from '../page-registry';

/**
 * The HIDIVE page module.
 */
const hidive: PageModule = {
  name: 'hidive',

  matches(url) {
    return new URL(url).hostname.endsWith('hidive.com');
  },

  isWatchPage(url) {
    return /\/video\//.test(new URL(url).pathname);
  },

  networkMatches(url) {
    return /\/api\//.test(new URL(url).pathname);
  },

  captureNetwork(_url, body) {
    let payload: any = null;

    try {
      payload = JSON.parse(body);
    } catch {
      return null;
    }

    if (payload?.type === 'VOD' && typeof payload.title === 'string') {
      return {
        season: markerNumber(payload.title, /S(\d+)/i),
        episode: markerNumber(payload.title, /E(\d+)/i) ?? 1,
        episodeTitle: payload.title.replace(/^\s*S\d+\s*E\d+\s*[-–:]?\s*/i, '').trim() || null,
      };
    }

    const header = Array.isArray(payload?.elements)
      ? payload.elements.find((element: any) => element?.$zone === 'header')
      : null;
    const seriesTitle = header?.attributes?.header?.attributes?.text;

    if (typeof seriesTitle === 'string' && seriesTitle !== '') {
      return { title: seriesTitle };
    }

    return null;
  },

  identify(_pageDocument, _url, captured) {
    if (!captured || !captured.title) {
      return null;
    }

    return {
      seriesKey: this.name + ':' + captured.title.toLowerCase(),
      title: captured.title,
      season: captured.season ?? null,
      episode: captured.episode ?? 1,
      episodeTitle: captured.episodeTitle ?? null,
    };
  },
};

export default hidive;

/**
 * The number captured by a marker pattern, or null when absent.
 *
 * @param text - The text to search.
 * @param pattern - The single-group pattern to apply.
 */
function markerNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);

  return match ? parseInt(match[1], 10) : null;
}
