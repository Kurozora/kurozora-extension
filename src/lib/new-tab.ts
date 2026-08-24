import { browser } from "wxt/browser";

/** The storage key holding whether new tabs open the Date page. */
export const NEW_TAB_STORAGE_KEY = "newTab.enabled";

/** The extension page shown in place of a new tab. */
export const DATE_PAGE = "/date.html";

/** The addresses a browser opens a brand-new, empty tab at. */
const NEW_TAB_URLS = ["about:newtab", "about:home", "chrome://newtab/", "chrome-search://local-ntp/"];

/**
 * Whether the address is a browser's empty-tab page.
 *
 * @param url - The address to test.
 */
export function isNewTabURL(url: string | undefined): boolean {
  return url !== undefined && NEW_TAB_URLS.includes(url);
}

/** Whether new tabs open the Date page. Off until switched on. */
export async function loadNewTabEnabled(): Promise<boolean> {
  return (await browser.storage.local.get(NEW_TAB_STORAGE_KEY))[NEW_TAB_STORAGE_KEY] === true;
}

/**
 * Persists whether new tabs open the Date page.
 *
 * @param enabled - Whether to open the Date page.
 */
export async function saveNewTabEnabled(enabled: boolean): Promise<void> {
  await browser.storage.local.set({ [NEW_TAB_STORAGE_KEY]: enabled });
}
