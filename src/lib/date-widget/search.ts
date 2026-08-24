import { browser } from "wxt/browser";

/** The search page queried when the browser exposes no search engine. */
const SEARCH_PAGE_URL = "https://kurozora.app/search?q=";

/**
 * Runs a query with the browser's default search engine.
 *
 * Blank queries are ignored.
 *
 * @param query - The text to search for.
 */
export async function search(query: string): Promise<void> {
  const trimmed = query.trim();

  if (trimmed === "") {
    return;
  }

  const api = (browser as any).search;

  try {
    if (typeof api?.query === "function") {
      await api.query({ text: trimmed, disposition: "CURRENT_TAB" });
      return;
    }

    if (typeof api?.search === "function") {
      await api.search({ query: trimmed });
      return;
    }
  } catch {
    // Falls through to the search page.
  }

  window.location.assign(SEARCH_PAGE_URL + encodeURIComponent(trimmed));
}
