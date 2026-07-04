import { type PageModule } from '../page-registry';

/**
 * The Animation Digital Network page module.
 */
const adn: PageModule = {
  name: 'adn',

  matches(url) {
    return /(^|\.)animationdigitalnetwork\.(com|fr|de)$/.test(new URL(url).hostname);
  },

  isWatchPage(url) {
    const segments = new URL(url).pathname.split('/').filter(Boolean);

    return segments[0] === 'video' && segments.length >= 3;
  },

  identify(pageDocument, url) {
    const title = pageDocument.querySelector('div[data-testid="player-content"] h1 a')?.textContent?.trim() ?? '';

    if (title === '') {
      return null;
    }

    const episode = url.match(/(?:episode|folge)-(\d+)/i);

    return {
      seriesKey: this.name + ':' + title.toLowerCase(),
      title: title,
      season: null,
      episode: episode ? parseInt(episode[1], 10) : 1,
    };
  },
};

export default adn;
