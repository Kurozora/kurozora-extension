import { identityFromJsonLd, type EpisodeIdentity, type PageModule } from '../page-registry';

/**
 * The AnimeOnsen page module.
 *
 * Watch pages live at `/watch/{contentID}` with the episode carried in an
 * optional `?episode={N}` query, and each episode is a full server render.
 * Identity comes from the server-rendered head — the `ao-content-episode`
 * meta paired with the Open Graph title — then falls back to the document
 * title and finally the client-rendered player metadata. The stable series
 * key is the content ID, not the localized title.
 */
const animeonsen: PageModule = {
  name: 'animeonsen',

  matches(url) {
    return new URL(url).hostname.endsWith('animeonsen.xyz');
  },

  isWatchPage(url) {
    return /\/watch\/[^\/]+/.test(new URL(url).pathname);
  },

  identify(pageDocument, url) {
    const identity = identityFromJsonLd(pageDocument)
      ?? identityFromMeta(pageDocument)
      ?? identityFromTitle(pageDocument)
      ?? identityFromPlayer(pageDocument);

    if (identity === null || identity.episode === null) {
      return null;
    }

    const seriesIdentifier = contentIdentifier(pageDocument, url) ?? identity.title.toLowerCase();

    return {
      seriesKey: this.name + ':' + seriesIdentifier,
      ...identity,
    };
  },
};

export default animeonsen;

/**
 * The identity parsed from the server-rendered head metadata.
 *
 * The watch page renders an `ao-content-episode` meta and Open Graph tags on
 * every load; `og:image:alt` carries the clean series title while `og:title`
 * appends " Episode {N}".
 *
 * @param pageDocument - The document to inspect.
 */
function identityFromMeta(pageDocument: Document): EpisodeIdentity | null {
  const episode = metaContent(pageDocument, 'meta[name="ao-content-episode"]');
  const title = metaContent(pageDocument, 'meta[property="og:image:alt"]')
    ?? stripEpisodeSuffix(metaContent(pageDocument, 'meta[property="og:title"]'));

  if (episode === null || title === null) {
    return null;
  }

  return {
    title: title,
    season: null,
    episode: parseInt(episode, 10),
  };
}

/**
 * The identity parsed from the document title.
 *
 * The title follows "{series} Episode {N} - AnimeOnsen".
 *
 * @param pageDocument - The document to inspect.
 */
function identityFromTitle(pageDocument: Document): EpisodeIdentity | null {
  const match = pageDocument.title.match(/^(.+?) Episode (\d+)/i);

  if (match === null) {
    return null;
  }

  return {
    title: match[1].trim(),
    season: null,
    episode: parseInt(match[2], 10),
  };
}

/**
 * The identity parsed from the client-rendered player metadata.
 *
 * A last resort for when the head metadata is missing; the player renders the
 * series title into `.ao-player-metadata-title` and an "Episode {N}: …" label
 * into `.ao-player-metadata-episode`.
 *
 * @param pageDocument - The document to inspect.
 */
function identityFromPlayer(pageDocument: Document): EpisodeIdentity | null {
  const title = pageDocument.querySelector('.ao-player-metadata-title')?.textContent?.trim() ?? null;
  const label = pageDocument.querySelector('.ao-player-metadata-episode')?.textContent ?? '';
  const match = label.match(/Episode (\d+)/i);

  if (title === null || title === '' || match === null) {
    return null;
  }

  return {
    title: title,
    season: null,
    episode: parseInt(match[1], 10),
  };
}

/**
 * The stable series identifier for the page.
 *
 * Prefers the server-rendered `ao-content-id` meta and falls back to the
 * content ID in the `/watch/{contentID}` path.
 *
 * @param pageDocument - The document to inspect.
 * @param url - The page URL.
 */
function contentIdentifier(pageDocument: Document, url: string): string | null {
  const meta = metaContent(pageDocument, 'meta[name="ao-content-id"]');

  if (meta !== null) {
    return meta.toLowerCase();
  }

  const match = new URL(url).pathname.match(/\/watch\/([^\/?#]+)/);

  return match !== null ? match[1].toLowerCase() : null;
}

/**
 * The trimmed content of the first matching meta tag.
 *
 * @param pageDocument - The document to inspect.
 * @param selector - The meta tag selector.
 */
function metaContent(pageDocument: Document, selector: string): string | null {
  const content = pageDocument.querySelector<HTMLMetaElement>(selector)?.content?.trim();

  return content !== undefined && content !== '' ? content : null;
}

/**
 * The series title with a trailing " Episode {N}" removed.
 *
 * @param title - The title to trim.
 */
function stripEpisodeSuffix(title: string | null): string | null {
  if (title === null) {
    return null;
  }

  return title.replace(/ Episode \d+.*$/i, '').trim();
}
