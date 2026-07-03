import { type EpisodeIdentity, type PageModule } from '../page-registry';

/**
 * The Disney+ page module.
 */
const disneyplus: PageModule = {
  name: 'disney-plus',

  matches(url) {
    return new URL(url).hostname.endsWith('disneyplus.com');
  },

  isWatchPage(url) {
    return /\/play\//.test(new URL(url).pathname);
  },

  identify(pageDocument) {
    const identity = identityFromPlayer(pageDocument);

    if (identity === null) {
      return null;
    }

    return {
      seriesKey: this.name + ':' + identity.title.toLowerCase(),
      ...identity,
    };
  },
};

export default disneyplus;

/**
 * The identity parsed from the player's title fields.
 *
 * @param pageDocument - The document to inspect.
 */
function identityFromPlayer(pageDocument: Document): EpisodeIdentity | null {
  const title = pageDocument.querySelector('.title-field')?.textContent?.trim() ?? '';

  if (title === '') {
    return null;
  }

  const subtitle = pageDocument.querySelector('.subtitle-field')?.textContent?.trim() ?? '';
  const marker = /(\d+).+?(\d+)\s+(.+)/.exec(subtitle);

  return {
    title: title,
    season: marker ? parseInt(marker[1], 10) : null,
    episode: marker ? parseInt(marker[2], 10) : 1,
    episodeTitle: marker ? marker[3].trim() : null,
  };
}
