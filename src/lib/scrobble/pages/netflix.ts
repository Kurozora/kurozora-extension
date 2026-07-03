import { identityFromJsonLd, type EpisodeIdentity, type PageModule } from '../page-registry';

/**
 * The Netflix page module.
 */
const netflix: PageModule = {
  name: 'netflix',

  matches(url) {
    return new URL(url).hostname.endsWith('netflix.com');
  },

  isWatchPage(url) {
    return /\/watch\/\d+/.test(new URL(url).pathname);
  },

  identify(pageDocument) {
    const identity = identityFromJsonLd(pageDocument) ?? identityFromPlayer(pageDocument);

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

export default netflix;

/**
 * The identity parsed from the player's title overlay.
 *
 * @param pageDocument - The document to inspect.
 */
function identityFromPlayer(pageDocument: Document): EpisodeIdentity | null {
  const container = pageDocument.querySelector('[data-uia="video-title"]');

  if (container === null) {
    return null;
  }

  const title = container.querySelector('h4')?.textContent?.trim() ?? '';

  if (title === '') {
    return null;
  }

  const spans = [...container.querySelectorAll('span')].map((span) => (span.textContent ?? '').trim());
  const marker = spans.map((span) => span.match(/S(\d+):E(\d+)/i)).find((match): match is RegExpMatchArray => match !== null);

  return {
    title: title,
    season: marker ? parseInt(marker[1], 10) : null,
    episode: marker ? parseInt(marker[2], 10) : null,
    episodeTitle: spans.find((span) => span !== '' && !/S\d+:E\d+/i.test(span)) ?? null,
  };
}
