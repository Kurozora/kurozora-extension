import type { EpisodeIdentity, PageModule } from '../page-registry';

/**
 * The AnimePahe page module.
 */
const animepahe: PageModule = {
  name: 'animepahe',

  matches(url) {
    return /(^|\.)animepahe\.(com|org|si|ru|pw)$/.test(new URL(url).hostname);
  },

  isWatchPage(url) {
    return /\/play\/[^\/]+/.test(new URL(url).pathname);
  },

  identify(pageDocument) {
    const identity = identityFromTitle(pageDocument) ?? identityFromHeading(pageDocument);

    if (identity === null || identity.episode === null) {
      return null;
    }

    return {
      seriesKey: this.name + ':' + seriesIdentifier(pageDocument, identity.title),
      ...identity,
    };
  },

  episodeCells(pageDocument) {
    const cells: { element: HTMLElement; episode: number }[] = [];

    // Episode entries link to "/play/{anime}/{episode}" and label themselves
    // with the episode number; best-effort until verified against the live grid.
    pageDocument.querySelectorAll<HTMLAnchorElement>('a[href*="/play/"]').forEach((anchor) => {
      const label = anchor.getAttribute('title') ?? anchor.textContent ?? '';
      const marker = label.match(/(?:ep(?:isode)?\.?\s*)?(\d+)/i);

      if (marker === null) {
        return;
      }

      cells.push({ element: anchor, episode: parseInt(marker[1], 10) });
    });

    return cells;
  },
};

export default animepahe;

/**
 * The identity parsed from the document title.
 *
 * @param pageDocument - The document to inspect.
 */
function identityFromTitle(pageDocument: Document): EpisodeIdentity | null {
  const match = pageDocument.title.match(/^(.+?) Ep\. ([\d.]+)/);

  if (match === null) {
    return null;
  }

  const episode = Number(match[2]);

  return {
    title: match[1].trim(),
    season: null,
    episode: Number.isNaN(episode) ? null : episode,
  };
}

/**
 * The identity parsed from the theatre heading.
 *
 * @param pageDocument - The document to inspect.
 */
function identityFromHeading(pageDocument: Document): EpisodeIdentity | null {
  const heading = pageDocument.querySelector('.theatre-info h1');
  const link = heading?.querySelector('a');

  if (heading == null || link == null) {
    return null;
  }

  const ownText = Array.from(heading.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? '')
    .join('');
  const match = ownText.match(/[\d.]+/);
  const episode = match !== null ? Number(match[0]) : NaN;

  return {
    title: (link.textContent ?? '').trim(),
    season: null,
    episode: Number.isNaN(episode) ? null : episode,
  };
}

/**
 * The stable series identifier for the given page.
 *
 * @param pageDocument - The document to inspect.
 * @param title - The series title fallback.
 */
function seriesIdentifier(pageDocument: Document, title: string): string {
  const id = pageDocument.querySelector('meta[name="id"]')?.getAttribute('content')?.trim();

  return (id || title).toLowerCase();
}
