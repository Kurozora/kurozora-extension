import type { EpisodeIdentity, PageModule } from '../page-registry';

/**
 * The AnimePahe page module.
 *
 * Watch pages live at `/play/{anime-session}/{episode-session}` across the
 * site's rotating mirrors (`.pw`, `.com`, `.org`, `.si`, `.ru`). AnimePahe
 * embeds no structured data, so identity comes from the document title, which
 * follows "{series} Ep. {N} :: animepahe", then falls back to the
 * `.theatre-info h1` heading. The stable series key is the numeric anime id in
 * `meta[name=id]`, which survives the rotating session URLs, with the title as
 * a fallback. The video itself plays in a cross-origin Kwik iframe, so the
 * background correlates that frame's playback with this frame's identity.
 */
const animepahe: PageModule = {
  name: 'animepahe',

  matches(url) {
    return /(^|\.)animepahe\.(com|org|si|ru|pw)$/.test(new URL(url).hostname);
  },

  isWatchPage(url) {
    return /\/play\/[^\/]+/.test(new URL(url).pathname);
  },

  identify(pageDocument, url) {
    const identity = identityFromTitle(pageDocument) ?? identityFromHeading(pageDocument);

    if (identity === null || identity.episode === null) {
      return null;
    }

    return {
      seriesKey: this.name + ':' + seriesIdentifier(pageDocument, identity.title),
      ...identity,
    };
  },
};

export default animepahe;

/**
 * The identity parsed from the document title.
 *
 * The title follows "{series} Ep. {N} :: animepahe"; the series name and
 * episode number precede the " :: animepahe" branding.
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
 * The `.theatre-info h1` links the series through a nested `<a>`; the episode
 * number is the heading's own text, read apart from the linked title so a year
 * in the title (e.g. "(2023)") is never mistaken for the episode.
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
 * AnimePahe exposes its numeric anime id in `meta[name=id]`, which is stable
 * across the rotating per-episode session URLs; the title is the fallback.
 *
 * @param pageDocument - The document to inspect.
 * @param title - The series title fallback.
 */
function seriesIdentifier(pageDocument: Document, title: string): string {
  const id = pageDocument.querySelector('meta[name="id"]')?.getAttribute('content')?.trim();

  return (id || title).toLowerCase();
}
