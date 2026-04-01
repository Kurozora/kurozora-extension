import { browser } from "wxt/browser";
import { KurozoraKit, KKServices, KurozoraAPI } from "kurozorakit";
import { browserStore } from "@/lib/kit-storage";
import { API_KEY, CLIENT_IDENTIFIER } from "@/lib/config";

/** The shared KurozoraKit instance used across the popup. */
export const kit = new KurozoraKit({
  apiKey: API_KEY,
  clientIdentifier: CLIENT_IDENTIFIER,
  source: "kurozora-extension/" + browser.runtime.getManifest().version,
  services: new KKServices(browserStore),
});

/**
 * Points the kit at the stored environment and restores the stored session.
 *
 * @returns The restored authentication key, when one is stored.
 */
export async function prepare(): Promise<string | null> {
  const stored = await browser.storage.local.get("apiEnvironment");

  kit.apiEndpoint =
    KurozoraAPI[stored.apiEnvironment as keyof typeof KurozoraAPI] ??
    KurozoraAPI.v1;

  return kit.services.restoreAuthenticationKey();
}

/** Sign-in platform metadata derived from the browser's user agent. */
export interface PlatformInfo {
  platform: string;
  platformVersion: string;
  deviceVendor: string;
  deviceModel: string;
}

/** Returns platform metadata parsed from the browser's user agent for sign-in. */
export function platformInfo(): PlatformInfo {
  const userAgent = navigator.userAgent;

  const browserMatch = userAgent.match(/(Chrome|Firefox|Safari)\/(\S+)/);
  const browserVendor = browserMatch ? browserMatch[1] : "Unknown";
  const browserVersion = browserMatch ? browserMatch[2] : "Unknown";

  const deviceInfoMatch = userAgent.match(/\(([^)]+)\)/);
  const deviceInfo = deviceInfoMatch ? deviceInfoMatch[1] : "";
  const [deviceModel] = deviceInfo.split(";").map((part) => part.trim());

  return {
    platform: "Web",
    platformVersion: browserVersion,
    deviceVendor: browserVendor,
    deviceModel: deviceModel || "Unknown",
  };
}
