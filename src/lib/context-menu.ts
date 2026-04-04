import { browser } from 'wxt/browser';
import { SearchType } from './search-type';

/**
 * The id of the parent "Kurozora" selection menu.
 */
const PARENT_ID = 'Kurozora-Search';

/**
 * Rebuilds the selection context menu with one entry per search type.
 *
 * Called on install and whenever synced settings change, so the existing
 * entries are cleared first to avoid duplicate-id errors.
 */
export const setupContextMenu = async (): Promise<void> => {
  browser.contextMenus.removeAll();

  // Create menu and submenu entries.
  browser.contextMenus.create({
    id: PARENT_ID,
    title: 'Kurozora',
    contexts: ['selection'],
  });

  Object.keys(SearchType).forEach((key) => {
    const searchType = SearchType[key as keyof typeof SearchType];

    browser.contextMenus.create(
      {
        parentId: PARENT_ID,
        id: `search-${searchType.query}`,
        title: `Search for ${key}`,
        contexts: ['selection'],
        icons: {
          '16': searchType.symbol,
        },
      },
      onCreated,
    );
  });
};

/**
 * Performs a search when a context menu item is selected.
 *
 * @param info - The clicked menu item's data.
 */
const performSearch = async ({ selectionText, menuItemId }: { selectionText?: string; menuItemId: string | number }): Promise<void> => {
  switch (menuItemId) {
    case `search-${SearchType.Anime.query}`: {
      return searchOnKurozora(selectionText, SearchType.Anime.query);
    }
    case `search-${SearchType.Manga.query}`: {
      return searchOnKurozora(selectionText, SearchType.Manga.query);
    }
    case `search-${SearchType.Game.query}`: {
      return searchOnKurozora(selectionText, SearchType.Game.query);
    }
    case `search-${SearchType.Song.query}`: {
      return searchOnKurozora(selectionText, SearchType.Song.query);
    }
    case `search-${SearchType.Character.query}`: {
      return searchOnKurozora(selectionText, SearchType.Character.query);
    }
    case `search-${SearchType.Episode.query}`: {
      return searchOnKurozora(selectionText, SearchType.Episode.query);
    }
    case `search-${SearchType.Person.query}`: {
      return searchOnKurozora(selectionText, SearchType.Person.query);
    }
    case `search-${SearchType.Studio.query}`: {
      return searchOnKurozora(selectionText, SearchType.Studio.query);
    }
  }
};

/**
 * Opens a Kurozora search tab for the given query and catalog type.
 *
 * @param query - The search query.
 * @param type - The catalog type to search.
 */
const searchOnKurozora = (query: string | undefined, type: string): void => {
  browser.tabs.create({
    url: `https://kurozora.app/search?q=${query}&type=${type}`,
  });
};

/**
 * Logs whether a menu item was created, or the error that prevented it.
 */
const onCreated = (): void => {
  if (browser.runtime.lastError) {
    console.log(`Error: ${browser.runtime.lastError}`);
  } else {
    console.log('Item created successfully');
  }
};

// Attach listener.
browser.contextMenus.onClicked.addListener((info) => {
  void performSearch(info);
});
