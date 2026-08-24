import { browser } from "wxt/browser";
import { KurozoraKit, KKServices, KurozoraAPI } from "kurozorakit";
import { browserStore } from "@/lib/kit-storage";
import { API_KEY, CLIENT_IDENTIFIER } from "@/lib/config";

/** Creates a kit carrying the extension's developer token and storage. */
export function createKit(): KurozoraKit {
  return new KurozoraKit({
    apiKey: API_KEY,
    clientIdentifier: CLIENT_IDENTIFIER,
    source: "kurozora-extension/" + browser.runtime.getManifest().version,
    services: new KKServices(browserStore),
  });
}

/**
 * Points a kit at the stored environment and restores the stored session.
 *
 * @param kit - The kit to prepare.
 *
 * @returns The restored authentication key, when one is stored.
 */
export async function prepareKit(kit: KurozoraKit): Promise<string | null> {
  const stored = await browser.storage.local.get("apiEnvironment");

  kit.apiEndpoint =
    KurozoraAPI[stored.apiEnvironment as keyof typeof KurozoraAPI] ?? KurozoraAPI.v1;

  return kit.services.restoreAuthenticationKey();
}
