import type { FontStyle, FontWeight, FontWidth } from "./configuration";

/** A font design a font style resolves to. */
export type FontDesign = "default" | "rounded" | "serif";

/** The system family each design renders with. */
const FONT_FAMILIES: Record<FontDesign, string> = {
  default: "var(--font-sans)",
  rounded: "var(--font-rounded)",
  serif: "var(--font-serif)",
};

/** The CSS weight of each font weight. */
const WEIGHT_VALUES: Record<FontWeight, number> = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  heavy: 800,
  black: 900,
};

/** The CSS width percentage of each font width. */
const WIDTH_VALUES: Record<FontWidth, number> = {
  compressed: 62.5,
  condensed: 75,
  standard: 100,
  expanded: 125,
};

/** The width a family renders at when its width axis is unavailable. */
const STANDARD_WIDTH = 100;

/** The tracking, in `em`, standing in for 100% of narrowing. */
const NARROWING_TRACKING = 0.1;

/** The tracking, in `em`, standing in for 100% of widening. */
const WIDENING_TRACKING = 0.2;

/** The text each family is measured with. */
const PROBE_TEXT = "Wednesday";

/** The width axis of each family measured so far. */
const widthAxes = new Map<string, boolean>();

/**
 * The design a font style renders with.
 *
 * @param font - The font style.
 */
export function fontDesign(font: FontStyle): FontDesign {
  switch (font) {
    case "rounded":
      return "rounded";
    case "serif":
      return "serif";
    default:
      return "default";
  }
}

/**
 * Whether a font style implies compressed width, overriding the user's width
 * selection.
 *
 * @param font - The font style.
 */
export function isCompressedStyle(font: FontStyle): boolean {
  return font === "compressed";
}

/**
 * The effective width for a font style and the user's width selection.
 *
 * @param font - The font style.
 * @param width - The user's width selection.
 */
export function effectiveWidth(font: FontStyle, width: FontWidth): FontWidth {
  return isCompressedStyle(font) ? "compressed" : width;
}

/**
 * The tracking standing in for a width the family cannot render.
 *
 * @param width - The requested width percentage.
 *
 * @returns The tracking, in `em`.
 */
function tracking(width: number): string {
  const offset = (width - STANDARD_WIDTH) / 100;

  return (offset * (offset < 0 ? NARROWING_TRACKING : WIDENING_TRACKING)).toFixed(4) + "em";
}

/**
 * Whether a family carries a width axis.
 *
 * The result is measured once per family and kept for the page's lifetime.
 *
 * @param family - The CSS font family.
 */
function hasWidthAxis(family: string): boolean {
  const measured = widthAxes.get(family);

  if (measured !== undefined) {
    return measured;
  }

  const probe = document.createElement("span");

  probe.textContent = PROBE_TEXT;
  probe.style.cssText =
    "position: absolute; visibility: hidden; white-space: nowrap; font-size: 100px; font-family: " +
    family;
  document.body.append(probe);

  const standard = probe.getBoundingClientRect().width;

  probe.style.fontStretch = "62.5%";

  const narrowed = probe.getBoundingClientRect().width;

  probe.remove();
  widthAxes.set(family, narrowed !== standard);

  return narrowed !== standard;
}

/**
 * The CSS custom properties rendering the date in the configured typography.
 *
 * @param font - The font style.
 * @param weight - The font weight.
 * @param width - The font width.
 *
 * @returns The properties, keyed by custom property name.
 */
export function typographyProperties(
  font: FontStyle,
  weight: FontWeight,
  width: FontWidth,
): Record<string, string> {
  const family = FONT_FAMILIES[fontDesign(font)];
  const widthValue = WIDTH_VALUES[effectiveWidth(font, width)];

  return {
    "--date-font-family": family,
    "--date-font-weight": String(WEIGHT_VALUES[weight]),
    "--date-font-stretch": widthValue + "%",
    "--date-letter-spacing": hasWidthAxis(family) ? "0" : tracking(widthValue),
  };
}

/**
 * Renders custom properties as an inline `style` attribute value.
 *
 * @param properties - The properties, keyed by custom property name.
 */
export function inlineStyle(properties: Record<string, string>): string {
  return Object.entries(properties)
    .map(([name, value]) => name + ": " + value)
    .join("; ");
}
