/**
 * A catalog search type exposed in the context menu.
 */
export interface SearchTypeEntry {
  /**
   * The `type` query parameter passed to the Kurozora search page.
   */
  query: string;

  /**
   * The path to the menu item's icon.
   */
  symbol: string;
}

/**
 * The catalog types searchable from the selection context menu.
 */
export const SearchType = Object.freeze({
  Anime: {
    query: 'shows',
    symbol: 'img/symbols/tv_fill.svg',
  },
  Manga: {
    query: 'literatures',
    symbol: 'img/symbols/book_fill.svg',
  },
  Game: {
    query: 'games',
    symbol: 'img/symbols/gamecontroller_fill.svg',
  },
  Song: {
    query: 'song',
    symbol: 'img/symbols/music_note.svg',
  },
  Character: {
    query: 'characters',
    symbol: 'img/symbols/totoro_fill.svg',
  },
  Episode: {
    query: 'episodes',
    symbol: 'img/symbols/photo_tv.svg',
  },
  Person: {
    query: 'people',
    symbol: 'img/symbols/person_fill.svg',
  },
  Studio: {
    query: 'studios',
    symbol: 'img/symbols/building_2_fill.svg',
  },
}) satisfies Record<string, SearchTypeEntry>;
