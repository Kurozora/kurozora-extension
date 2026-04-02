import { identityFromJsonLd, type EpisodeIdentity, type PageModule } from '../page-registry';

/**
 * The Crunchyroll page module.
 *
 * Watch pages live at `/watch/{id}/{slug}` (optionally locale-prefixed).
 * Identity comes from the JSON-LD `TVEpisode` block first, then from the
 * document title, which follows "Watch {series} Season {S} Episode {N} …".
 */
const crunchyroll: PageModule = {
  name: 'crunchyroll',

  matches(url) {
    return new URL(url).hostname.endsWith('crunchyroll.com');
  },

  isWatchPage(url) {
    return /\/watch\/[^\/]+/.test(new URL(url).pathname);
  },

  identify(pageDocument, url) {
    const identity = identityFromJsonLd(pageDocument) ?? identityFromTitle(pageDocument);

    if (identity === null || identity.episode === null) {
      return null;
    }

    return {
      seriesKey: this.name + ':' + identity.title.toLowerCase(),
      ...identity,
    };
  },
};

export default crunchyroll;

/**
 * The identity parsed from the document title.
 *
 * @param pageDocument - The document to inspect.
 */
function identityFromTitle(pageDocument: Document): EpisodeIdentity | null {
  const match = pageDocument.title.match(/^Watch (.+?)(?: Season (\d+))? Episode (\d+)/i);

  if (match === null) {
    return null;
  }

  return {
    title: match[1].trim(),
    season: match[2] !== undefined ? parseInt(match[2], 10) : null,
    episode: parseInt(match[3], 10),
  };
}
