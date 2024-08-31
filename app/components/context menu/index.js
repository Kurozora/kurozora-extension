import browser from 'webextension-polyfill'
import SearchOnKurozora from './search-on-kurozora'

export const setupContextMenu = async () => {
    browser.contextMenus.removeAll()

    await SearchOnKurozora.setupContextMenu()
}
