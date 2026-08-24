import { browser } from "wxt/browser";

/** The storage key holding the blur shortcut. */
export const BLUR_SHORTCUT_KEY = "dateWidget.blurShortcut";

/** The keys that only modify another key. */
const MODIFIER_KEYS = ["Alt", "Control", "Meta", "Shift"];

/** The display name of the keys that have no printable character. */
const KEY_NAMES: Record<string, string> = {
  " ": "Space",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  Enter: "↩",
  Escape: "Esc",
};

/** The symbol each modifier is written with. */
const APPLE_MODIFIERS: ReadonlyArray<[keyof Shortcut, string]> = [
  ["ctrlKey", "⌃"],
  ["altKey", "⌥"],
  ["shiftKey", "⇧"],
  ["metaKey", "⌘"],
];

/** The name each modifier is written with. */
const MODIFIER_NAMES: ReadonlyArray<[keyof Shortcut, string]> = [
  ["ctrlKey", "Ctrl"],
  ["altKey", "Alt"],
  ["shiftKey", "Shift"],
  ["metaKey", "Win"],
];

/**
 * A key combination.
 */
export interface Shortcut {
  /**
   * The key the combination ends on, uppercased when it is a single character.
   */
  key: string;

  /**
   * Whether Command, or the Windows key, is held.
   */
  metaKey: boolean;

  /**
   * Whether Control is held.
   */
  ctrlKey: boolean;

  /**
   * Whether Option, or Alt, is held.
   */
  altKey: boolean;

  /**
   * Whether Shift is held.
   */
  shiftKey: boolean;
}

/** The shortcut assigned until the user changes it. */
export const DEFAULT_BLUR_SHORTCUT: Shortcut = Object.freeze({
  key: "B",
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
});

/** Whether the platform names its modifiers with symbols. */
function usesModifierSymbols(): boolean {
  return /Mac|iPhone|iPad/.test(navigator.userAgent);
}

/**
 * The shortcut a stored value holds.
 *
 * @param value - The stored value.
 *
 * @returns The shortcut, or `null` when the value is not one.
 */
function asShortcut(value: unknown): Shortcut | null {
  const shortcut = value as Partial<Shortcut> | null;

  if (typeof shortcut?.key !== "string" || shortcut.key === "") {
    return null;
  }

  return {
    key: shortcut.key,
    metaKey: shortcut.metaKey === true,
    ctrlKey: shortcut.ctrlKey === true,
    altKey: shortcut.altKey === true,
    shiftKey: shortcut.shiftKey === true,
  };
}

/**
 * The shortcut a key event assigns.
 *
 * @param event - The key event.
 *
 * @returns The shortcut, or `null` when the event carries no assignable key.
 */
export function shortcutFor(event: KeyboardEvent): Shortcut | null {
  if (MODIFIER_KEYS.includes(event.key)) {
    return null;
  }

  return {
    key: event.key.length === 1 ? event.key.toUpperCase() : event.key,
    metaKey: event.metaKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
  };
}

/**
 * Whether a key event presses a shortcut.
 *
 * @param shortcut - The shortcut to test.
 * @param event - The key event.
 */
export function matches(shortcut: Shortcut, event: KeyboardEvent): boolean {
  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;

  return (
    key === shortcut.key &&
    event.metaKey === shortcut.metaKey &&
    event.ctrlKey === shortcut.ctrlKey &&
    event.altKey === shortcut.altKey &&
    event.shiftKey === shortcut.shiftKey
  );
}

/**
 * Whether a shortcut carries a modifier.
 *
 * @param shortcut - The shortcut to test.
 */
export function hasModifier(shortcut: Shortcut): boolean {
  return shortcut.metaKey || shortcut.ctrlKey || shortcut.altKey;
}

/**
 * The shortcut written the way the platform writes it.
 *
 * @param shortcut - The shortcut to describe.
 */
export function describe(shortcut: Shortcut): string {
  const key = KEY_NAMES[shortcut.key] ?? shortcut.key;

  if (usesModifierSymbols()) {
    return APPLE_MODIFIERS.filter(([held]) => shortcut[held]).map(([, symbol]) => symbol).join("") + key;
  }

  return [...MODIFIER_NAMES.filter(([held]) => shortcut[held]).map(([, name]) => name), key].join("+");
}

/**
 * Loads the shortcut that toggles the blur.
 *
 * @returns The shortcut, or `null` when the user has cleared it.
 */
export async function loadBlurShortcut(): Promise<Shortcut | null> {
  const stored = await browser.storage.local.get(BLUR_SHORTCUT_KEY);

  if (!(BLUR_SHORTCUT_KEY in stored)) {
    return { ...DEFAULT_BLUR_SHORTCUT };
  }

  return asShortcut(stored[BLUR_SHORTCUT_KEY]);
}

/**
 * Persists the shortcut that toggles the blur.
 *
 * @param shortcut - The shortcut to assign, or `null` to clear it.
 */
export async function saveBlurShortcut(shortcut: Shortcut | null): Promise<void> {
  await browser.storage.local.set({ [BLUR_SHORTCUT_KEY]: shortcut });
}
