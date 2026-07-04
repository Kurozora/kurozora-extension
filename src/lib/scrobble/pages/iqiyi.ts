import { type PageModule } from '../page-registry';

/**
 * The iQIYI page module.
 */
const iqiyi: PageModule = {
  name: 'iqiyi',

  matches(url) {
    return new URL(url).hostname.endsWith('iq.com');
  },

  isWatchPage(url) {
    return /\/play\//.test(new URL(url).pathname);
  },

  identify(pageDocument, url) {
    const ogTitle = pageDocument.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
    const clean = ogTitle.split(/[–—]|Download APP/i)[0].trim();

    if (clean === '') {
      return null;
    }

    const marker = clean.match(/^(.+?)\s+Episode\s+(\d+)/i);
    const urlEpisode = url.match(/episode-(\d+)/i);
    const title = stripTag(marker ? marker[1].trim() : clean.replace(/\s+Episode\s+\d+.*$/i, '').trim());

    if (title === '') {
      return null;
    }

    return {
      seriesKey: this.name + ':' + title.toLowerCase(),
      title: title,
      season: null,
      episode: marker ? parseInt(marker[2], 10) : urlEpisode ? parseInt(urlEpisode[1], 10) : 1,
    };
  },
};

export default iqiyi;

/**
 * A title with any leading bracketed tag, such as "【Exclusive】", removed.
 *
 * @param title - The raw title.
 */
function stripTag(title: string): string {
  return title.replace(/^\s*[【[][^】\]]*[】\]]\s*/, '').trim() || title;
}
