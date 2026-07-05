import { type CapturedEpisode, type PageModule } from '../page-registry';

/**
 * The U-NEXT page module.
 *
 * Play pages carry no readable metadata of their own, so the identity comes
 * from the GraphQL responses the player fetches, correlated to the title and
 * episode codes in the page URL.
 */
const unext: PageModule = {
  name: 'unext',

  matches(url) {
    return new URL(url).hostname.endsWith('unext.jp');
  },

  isWatchPage(url) {
    return new URL(url).pathname.startsWith('/play/');
  },

  networkMatches(url) {
    return new URL(url).hostname === 'cc.unext.jp';
  },

  captureNetwork(_url, body, pageURL) {
    const playing = playIDs(pageURL ?? '');

    if (playing === null) {
      return null;
    }

    let payload: any = null;

    try {
      payload = JSON.parse(body);
    } catch {
      return null;
    }

    const captured: CapturedEpisode = {};
    const serialized = JSON.stringify(payload);

    // Only trust a series name from a reply that references the playing
    // title, so replies about other titles never bleed into the identity.
    if (serialized.includes(playing.seriesID)) {
      const titleName = findString(payload, 'titleName');

      if (titleName !== null) {
        captured.title = titleName;
        captured.seriesID = playing.seriesID;
      }
    }

    const episodeNode = findNodeWithID(payload, playing.episodeID);

    if (episodeNode !== null) {
      const episode = displayNumber(episodeNode.displayNo);
      const episodeTitle = episodeNode.episodeName;

      if (episode !== null) {
        captured.episode = episode;
      }

      if (typeof episodeTitle === 'string' && episodeTitle !== '') {
        captured.episodeTitle = episodeTitle;
      }
    }

    return Object.keys(captured).length > 0 ? captured : null;
  },

  identify(_pageDocument, url, captured) {
    const playing = playIDs(url);

    if (playing === null || !captured?.title) {
      return null;
    }

    return {
      seriesKey: this.name + ':' + playing.seriesID.toLowerCase(),
      title: captured.title,
      season: captured.season ?? null,
      episode: captured.episode ?? 1,
      episodeTitle: captured.episodeTitle ?? null,
    };
  },
};

export default unext;

/**
 * The title and episode codes in a play URL, or null off a play page.
 *
 * @param url - The page URL, e.g. `…/play/SID0064064/ED00361671`.
 */
function playIDs(url: string): { seriesID: string; episodeID: string } | null {
  const match = url.match(/\/play\/([^/?#]+)\/([^/?#]+)/);

  if (match === null) {
    return null;
  }

  return { seriesID: match[1], episodeID: match[2] };
}

/**
 * The first non-empty string held by the given key anywhere in a payload.
 *
 * @param node - The payload to walk.
 * @param key - The property name to look for.
 */
function findString(node: unknown, key: string): string | null {
  if (Array.isArray(node)) {
    for (const element of node) {
      const found = findString(element, key);

      if (found !== null) {
        return found;
      }
    }

    return null;
  }

  if (node !== null && typeof node === 'object') {
    const record = node as Record<string, unknown>;
    const value = record[key];

    if (typeof value === 'string' && value !== '') {
      return value;
    }

    for (const child of Object.values(record)) {
      const found = findString(child, key);

      if (found !== null) {
        return found;
      }
    }
  }

  return null;
}

/**
 * The first object whose `id` equals the given value anywhere in a payload.
 *
 * @param node - The payload to walk.
 * @param targetID - The id to look for.
 */
function findNodeWithID(node: unknown, targetID: string): Record<string, any> | null {
  if (Array.isArray(node)) {
    for (const element of node) {
      const found = findNodeWithID(element, targetID);

      if (found !== null) {
        return found;
      }
    }

    return null;
  }

  if (node !== null && typeof node === 'object') {
    const record = node as Record<string, any>;

    if (record.id === targetID) {
      return record;
    }

    for (const child of Object.values(record)) {
      const found = findNodeWithID(child, targetID);

      if (found !== null) {
        return found;
      }
    }
  }

  return null;
}

/**
 * The episode number in a `第1話`-style display label, or null when absent.
 *
 * @param displayNo - The display label to parse.
 */
function displayNumber(displayNo: unknown): number | null {
  if (typeof displayNo !== 'string') {
    return null;
  }

  const match = displayNo.match(/(\d+)/);

  return match ? parseInt(match[1], 10) : null;
}
