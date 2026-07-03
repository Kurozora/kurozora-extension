import { identityFromJsonLd, type PageModule } from '../page-registry';

/**
 * The Apple TV page module.
 */
const appletv: PageModule = {
  name: 'apple-tv',

  matches(url) {
    return new URL(url).hostname === 'tv.apple.com';
  },

  isWatchPage(url) {
    return /\/(episode|movie)\//.test(new URL(url).pathname);
  },

  identify(pageDocument) {
    const identity = identityFromJsonLd(pageDocument);

    if (identity === null) {
      return null;
    }

    return {
      seriesKey: this.name + ':' + identity.title.toLowerCase(),
      ...identity,
      episode: identity.episode ?? 1,
    };
  },
};

export default appletv;
