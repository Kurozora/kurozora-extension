import { createKit, prepareKit } from "@/lib/kit";

/** The shared KurozoraKit instance used across the popup. */
export const kit = createKit();

/**
 * Points the kit at the stored environment and restores the stored session.
 *
 * @returns The restored authentication key, when one is stored.
 */
export async function prepare(): Promise<string | null> {
  return prepareKit(kit);
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
