import browser from 'webextension-polyfill'
import {SearchType} from '/app/enums/search-type'

const setupContextMenu = async () => {
    const parentID = 'Kurozora-Search'

    // Create menu and submenu entries
    browser.contextMenus.create({
        id: parentID,
        title: 'Kurozora',
        contexts: ['selection'],
    });

    Object.keys(SearchType).forEach(function (key) {
        let searchType = SearchType[key]

        browser.contextMenus.create(
            {
                parentId: parentID,
                id: `search-${searchType.query}`,
                title: `Search for ${key}`,
                contexts: ['selection'],
                icons: {
                    '16': searchType.symbol
                }
            },
            onCreated,
        )
    })
}

/**
 * Perform search when a context menu is selected.
 *
 * @param selectionText - selectionText
 * @param menuItemId - menuItemId
 * @param tab - tab
 * @returns {Promise<void>}
 */
const performSearch = async ({ selectionText, menuItemId }, tab) => {
    switch (menuItemId) {
        case `search-${SearchType.Anime.query}`: {
            return searchOnKurozora(selectionText, SearchType.Anime.query)
        }
        case `search-${SearchType.Manga.query}`: {
            return searchOnKurozora(selectionText, SearchType.Manga.query)
        }
        case `search-${SearchType.Games.query}`: {
            return searchOnKurozora(selectionText, SearchType.Games.query)
        }
        case `search-${SearchType.Songs.query}`: {
            return searchOnKurozora(selectionText, SearchType.Songs.query)
        }
        case `search-${SearchType.Characters.query}`: {
            return searchOnKurozora(selectionText, SearchType.Characters.query)
        }
        case `search-${SearchType.Episodes.query}`: {
            return searchOnKurozora(selectionText, SearchType.Episodes.query)
        }
        case `search-${SearchType.People.query}`: {
            return searchOnKurozora(selectionText, SearchType.People.query)
        }
        case `search-${SearchType.Studios.query}`: {
            return searchOnKurozora(selectionText, SearchType.Studios.query)
        }
    }
}

/**
 * Search on Kurozora for the given query in the specified catalogue type.
 *
 * @param query - query
 * @param type - type
 */
const searchOnKurozora = (query, type) => {
    browser.tabs.create({
        url: `https://kurozora.app/search?q=${query}&type=${type}`
    })
}

/**
 * Called when the item has been created, or when creation failed due to an error.
 * We'll just log success/failure here.
 */
const onCreated = () => {
    if (browser.runtime.lastError) {
        console.log(`Error: ${browser.runtime.lastError}`)
    } else {
        console.log("Item created successfully")
    }
}

// Attach listener
browser.contextMenus.onClicked.addListener(performSearch)

export default {
    setupContextMenu
}
