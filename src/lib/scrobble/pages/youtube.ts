import { type PageModule } from '../page-registry';

/**
 * The channel identifiers whose uploads are treated as anime episodes.
 */
const ANIME_CHANNELS = ['muse', 'ani-one', 'anione', 'gundaminfo', 'crunchyroll'];

/**
 * The YouTube page module.
 */
const youtube: PageModule = {
  name: 'youtube',

  matches(url) {
    return new URL(url).hostname.endsWith('youtube.com');
  },

  isWatchPage(url) {
    return new URL(url).pathname === '/watch';
  },

  identify(pageDocument, url) {
    if (rendersPreviousVideo(pageDocument, url)) {
      return null;
    }

    if (!isAnimeChannel(channelToken(pageDocument))) {
      return null;
    }

    const rawTitle = pageDocument.querySelector('ytd-watch-metadata h1, h1.ytd-watch-metadata, #title h1')?.textContent?.trim()
      || pageDocument.title.replace(/\s*-\s*YouTube\s*$/i, '').trim();
    const parsed = parseEpisode(rawTitle);

    if (parsed === null) {
      return null;
    }

    return {
      seriesKey: this.name + ':' + parsed.title.toLowerCase(),
      title: parsed.title,
      season: null,
      episode: parsed.episode,
    };
  },
};

export default youtube;

/**
 * Whether the watch page still renders the previous video's metadata.
 *
 * In-page navigation swaps the URL before the watch data loads, so the title
 * and channel briefly belong to the outgoing video. The player stamps the
 * rendered video's id on `ytd-watch-flexy`; until it matches the URL's `v`
 * parameter, everything read from the DOM is stale.
 *
 * @param pageDocument - The document to inspect.
 * @param url - The page URL.
 */
function rendersPreviousVideo(pageDocument: Document, url: string): boolean {
  const renderedID = pageDocument.querySelector('ytd-watch-flexy')?.getAttribute('video-id');
  const targetID = new URL(url).searchParams.get('v');

  return typeof renderedID === 'string' && renderedID !== '' && targetID !== null && renderedID !== targetID;
}

/**
 * The lower-cased channel handle and name for the playing video.
 *
 * @param pageDocument - The document to inspect.
 */
function channelToken(pageDocument: Document): string {
  const link = pageDocument.querySelector('ytd-video-owner-renderer a[href], #owner a[href*="/@"], #owner a[href*="/channel/"]');
  const handle = (link?.getAttribute('href') ?? '').match(/\/@([^/?]+)/)?.[1] ?? '';
  const name = pageDocument.querySelector('ytd-channel-name a, #channel-name a')?.textContent ?? '';

  return (handle + ' ' + name).toLowerCase();
}

/**
 * Whether a channel token belongs to an allow-listed anime channel.
 *
 * @param token - The channel token.
 */
function isAnimeChannel(token: string): boolean {
  return ANIME_CHANNELS.some((channel) => token.includes(channel));
}

/**
 * The series title and episode number parsed from a video title.
 *
 * @param rawTitle - The video title.
 */
function parseEpisode(rawTitle: string): { title: string; episode: number } | null {
  const match = rawTitle.match(/(?:episode|ep|folge|#)\s*[.:-]?\s*(\d+)/i);

  if (match === null || match.index === undefined) {
    return null;
  }

  const before = rawTitle.slice(0, match.index);
  const title = (before.split('|')[0] || before).replace(/[\s|\-–—#:]+$/, '').trim();

  if (title === '') {
    return null;
  }

  return { title: title, episode: parseInt(match[1], 10) };
}
