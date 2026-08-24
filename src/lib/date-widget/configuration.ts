import { browser } from "wxt/browser";

/** The storage key holding the Date new tab configuration. */
const STORAGE_KEY = "dateWidget.configuration";

/** The set of available media kinds. */
export const MEDIA_KINDS = ["shows", "episodes", "games", "literatures"] as const;

/** A kind of media the new tab draws images from. */
export type MediaKind = (typeof MEDIA_KINDS)[number];

/** The display name of a media kind. */
export const MEDIA_KIND_LABELS: Record<MediaKind, string> = {
  shows: "Shows",
  episodes: "Episodes",
  games: "Games",
  literatures: "Literatures",
};

/** The collection the new tab draws images from. */
export const MEDIA_COLLECTION = "banner";

/** The set of available font styles. */
export const FONT_STYLES = ["defaultStyle", "rounded", "serif", "compressed"] as const;

/** A font style applied to the date. */
export type FontStyle = (typeof FONT_STYLES)[number];

/** The display name of a font style. */
export const FONT_STYLE_LABELS: Record<FontStyle, string> = {
  defaultStyle: "Default",
  rounded: "Rounded",
  serif: "Serif",
  compressed: "Compressed",
};

/** The set of available font weights. */
export const FONT_WEIGHTS = ["regular", "medium", "semibold", "bold", "heavy", "black"] as const;

/** A font weight applied to the date. */
export type FontWeight = (typeof FONT_WEIGHTS)[number];

/** The display name of a font weight. */
export const FONT_WEIGHT_LABELS: Record<FontWeight, string> = {
  regular: "Regular",
  medium: "Medium",
  semibold: "Semibold",
  bold: "Bold",
  heavy: "Heavy",
  black: "Black",
};

/** The set of available font widths. */
export const FONT_WIDTHS = ["compressed", "condensed", "standard", "expanded"] as const;

/** A font width applied to the date. */
export type FontWidth = (typeof FONT_WIDTHS)[number];

/** The display name of a font width. */
export const FONT_WIDTH_LABELS: Record<FontWidth, string> = {
  compressed: "Compressed",
  condensed: "Condensed",
  standard: "Standard",
  expanded: "Expanded",
};

/**
 * The Date new tab configuration.
 */
export interface DateConfiguration {
  /**
   * The kind of media to draw images from.
   */
  kind: MediaKind;

  /**
   * Whether to dim the image.
   */
  isDimmed: boolean;

  /**
   * Whether to blur the image.
   */
  isBlurred: boolean;

  /**
   * Whether to adapt to the browser's accented and vibrant rendering modes.
   */
  isAdaptive: boolean;

  /**
   * Whether to show the date.
   */
  isDateShown: boolean;

  /**
   * The font style.
   */
  font: FontStyle;

  /**
   * The font weight.
   */
  fontWeight: FontWeight;

  /**
   * The font width.
   */
  fontWidth: FontWidth;
}

/** The configuration applied until the user changes it. */
export const DEFAULT_CONFIGURATION: DateConfiguration = Object.freeze({
  kind: "shows",
  isDimmed: false,
  isBlurred: false,
  isAdaptive: true,
  isDateShown: true,
  font: "defaultStyle",
  fontWeight: "bold",
  fontWidth: "standard",
});

/**
 * Returns the value when it is a member of the given set, otherwise the fallback.
 *
 * @param value - The stored value.
 * @param allowed - The set the value must belong to.
 * @param fallback - The value returned when the stored value is not a member.
 */
function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * Loads the stored configuration, falling back to the defaults per option.
 *
 * @returns The configuration to render with.
 */
export async function loadConfiguration(): Promise<DateConfiguration> {
  const stored = (await browser.storage.local.get(STORAGE_KEY))[STORAGE_KEY] as
    | Partial<DateConfiguration>
    | undefined;

  if (!stored) {
    return { ...DEFAULT_CONFIGURATION };
  }

  return {
    kind: oneOf(stored.kind, MEDIA_KINDS, DEFAULT_CONFIGURATION.kind),
    isDimmed: typeof stored.isDimmed === "boolean" ? stored.isDimmed : DEFAULT_CONFIGURATION.isDimmed,
    isBlurred: typeof stored.isBlurred === "boolean" ? stored.isBlurred : DEFAULT_CONFIGURATION.isBlurred,
    isAdaptive: typeof stored.isAdaptive === "boolean" ? stored.isAdaptive : DEFAULT_CONFIGURATION.isAdaptive,
    isDateShown: typeof stored.isDateShown === "boolean" ? stored.isDateShown : DEFAULT_CONFIGURATION.isDateShown,
    font: oneOf(stored.font, FONT_STYLES, DEFAULT_CONFIGURATION.font),
    fontWeight: oneOf(stored.fontWeight, FONT_WEIGHTS, DEFAULT_CONFIGURATION.fontWeight),
    fontWidth: oneOf(stored.fontWidth, FONT_WIDTHS, DEFAULT_CONFIGURATION.fontWidth),
  };
}

/**
 * Persists the configuration.
 *
 * @param configuration - The configuration to store.
 */
export async function saveConfiguration(configuration: DateConfiguration): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: { ...configuration } });
}

/**
 * The key identifying the image source a timeline was fetched for.
 *
 * @param configuration - The configuration to key.
 */
export function sourceKey(configuration: DateConfiguration): string {
  return configuration.kind + "/" + MEDIA_COLLECTION;
}
