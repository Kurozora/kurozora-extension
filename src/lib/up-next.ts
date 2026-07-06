import type { KurozoraKit } from 'kurozorakit';

/**
 * A rendered up-next episode row.
 */
export interface UpNextRow {
  /**
   * The episode's public id.
   */
  id: string;

  /**
   * The kurozora.app episode URL.
   */
  href: string;

  /**
   * The poster (or banner fallback) image URL.
   */
  posterURL: string;

  /**
   * The parent anime's title.
   */
  animeTitle: string;

  /**
   * The "Episode N · title" secondary line.
   */
  episodeInfo: string;

  /**
   * The watch page URL to jump back to, when recorded.
   */
  resumeURL: string | null;

  /**
   * The resume position in seconds, when mid-episode.
   */
  resumePosition: number | null;

  /**
   * The provider the episode was last watched on, when catalogued.
   */
  watchedFromName: string | null;
}

/**
 * Loads the signed-in user's up-next episodes and resolves their display rows.
 *
 * @param kit - The kit performing the requests.
 *
 * @returns The resolved rows, empty when nothing is up next.
 */
export async function loadUpNext(kit: KurozoraKit): Promise<UpNextRow[]> {
  const upNext = await kit.me.upNextEpisodes({ limit: 15 });
  const episodeIDs: string[] = (upNext.data ?? []).map((identity: { id: string }) => identity.id);

  if (episodeIDs.length === 0) {
    return [];
  }

  const episodes: any[] = (await kit.episodes.views(episodeIDs)).data ?? [];
  const animeTitles = await animeTitlesFor(kit, episodes);

  return episodes.map((episode: any): UpNextRow => {
    const attributes = episode.attributes ?? {};
    const animeID = episode.relationships?.shows?.data?.[0]?.id ?? null;

    return {
      id: episode.id,
      href: 'https://kurozora.app/episodes/' + episode.id,
      posterURL: attributes.poster?.url ?? attributes.banner?.url ?? '',
      animeTitle: animeTitles[animeID] ?? attributes.title ?? '',
      episodeInfo: 'Episode ' + attributes.number + (attributes.title ? ' · ' + attributes.title : ''),
      resumeURL: typeof attributes.watchedFromURL === 'string' ? attributes.watchedFromURL : null,
      resumePosition: typeof attributes.resumePosition === 'number' ? attributes.resumePosition : null,
      watchedFromName: typeof attributes.watchedFromName === 'string' ? attributes.watchedFromName : null,
    };
  });
}

/**
 * Whether two row lists are identical by id order and displayed fields.
 *
 * @param first - The first row list.
 * @param second - The second row list.
 */
export function upNextRowsEqual(first: UpNextRow[], second: UpNextRow[]): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((row, index) => {
    const other = second[index];

    return row.id === other.id
      && row.href === other.href
      && row.posterURL === other.posterURL
      && row.animeTitle === other.animeTitle
      && row.episodeInfo === other.episodeInfo
      && row.resumeURL === other.resumeURL
      && row.resumePosition === other.resumePosition
      && row.watchedFromName === other.watchedFromName;
  });
}

/**
 * The anime titles keyed by id for the episodes' shows.
 *
 * @param kit - The kit performing the requests.
 * @param episodes - The episode resources.
 */
async function animeTitlesFor(kit: KurozoraKit, episodes: any[]): Promise<Record<string, string>> {
  const animeIDs = [
    ...new Set(
      episodes
        .map((episode) => episode.relationships?.shows?.data?.[0]?.id)
        .filter((animeID): animeID is string => animeID !== null && animeID !== undefined),
    ),
  ];

  if (animeIDs.length === 0) {
    return {};
  }

  const titles: Record<string, string> = {};
  const anime: any[] = (await kit.anime.views(animeIDs)).data ?? [];

  anime.forEach((show: any) => {
    titles[show.id] = show.attributes?.title ?? '';
  });

  return titles;
}
