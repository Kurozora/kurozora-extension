import { browser } from "wxt/browser";
import type { KeyValueStore } from "kurozorakit";

/** A {@link KeyValueStore} backed by the extension's local storage. */
export const browserStore: KeyValueStore = {
  async get(key) {
    const stored = await browser.storage.local.get(key);
    return (stored[key] as string | undefined) ?? null;
  },
  async set(key, value) {
    await browser.storage.local.set({ [key]: value });
  },
  async remove(key) {
    await browser.storage.local.remove(key);
  },
};
