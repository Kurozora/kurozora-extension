import { createKit, prepareKit } from "@/lib/kit";
import { loadNewTabEnabled } from "@/lib/new-tab";
import { loadConfiguration, type DateConfiguration } from "@/lib/date-widget/configuration";
import { resolveImage } from "@/lib/date-widget/image-cache";
import { loadBlurShortcut, type Shortcut } from "@/lib/date-widget/shortcut";
import {
  entryFor,
  isExpired,
  loadTimeline,
  type Timeline,
  type TimelineEntry,
} from "@/lib/date-widget/timeline";

/** The kit the page performs its requests with. */
export const kit = createKit();

/**
 * The state a page starts from.
 */
export interface PreloadedState {
  /**
   * Whether new tabs open the Date page.
   */
  enabled: boolean;

  /**
   * Whether a session was restored onto the kit.
   */
  isSignedIn: boolean;

  /**
   * The configuration to render with.
   */
  configuration: DateConfiguration;

  /**
   * The shortcut that toggles the blur, when one is assigned.
   */
  blurShortcut: Shortcut | null;

  /**
   * The stored timeline, when one is current.
   */
  timeline: Timeline | null;

  /**
   * The entry to display, when the stored timeline is current.
   */
  entry: TimelineEntry | null;

  /**
   * The displayable image of that entry.
   */
  image: { src: string; isObjectURL: boolean } | null;
}

/** The stored state, read as this module loads. */
export const preloaded: Promise<PreloadedState> = (async () => {
  const [enabled, configuration, blurShortcut, timeline, authenticationKey] = await Promise.all([
    loadNewTabEnabled(),
    loadConfiguration(),
    loadBlurShortcut(),
    loadTimeline(),
    prepareKit(kit).catch(() => null),
  ]);

  const isSignedIn = authenticationKey !== null && authenticationKey !== "";

  if (!enabled || isExpired(timeline, configuration, Date.now())) {
    return { enabled, isSignedIn, configuration, blurShortcut, timeline, entry: null, image: null };
  }

  const entry = entryFor(timeline as Timeline, Date.now());

  return {
    enabled,
    isSignedIn,
    configuration,
    blurShortcut,
    timeline,
    entry,
    image: await resolveImage(entry.banner.url),
  };
})();
