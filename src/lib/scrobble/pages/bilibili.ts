import { type PageModule } from '../page-registry';

/**
 * The Bilibili page module.
 */
const bilibili: PageModule = {
  name: 'bilibili',

  matches(url) {
    return new URL(url).hostname.endsWith('bilibili.tv');
  },

  isWatchPage(url) {
    return /\/play\//.test(new URL(url).pathname);
  },

  identify(pageDocument) {
    const raw = pageDocument.title.replace(/\s*-\s*BiliBili\s*$/i, '').trim();
    const marker = raw.match(/^(.+?)\s+E(\d+)\b/i);
    const title = (marker ? marker[1] : raw).trim();

    if (title === '') {
      return null;
    }

    return {
      seriesKey: this.name + ':' + title.toLowerCase(),
      title: title,
      season: null,
      episode: marker ? parseInt(marker[2], 10) : 1,
    };
  },
};

export default bilibili;
