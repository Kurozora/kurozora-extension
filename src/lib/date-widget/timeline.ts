import { browser } from "wxt/browser";
import type { KurozoraKit } from "kurozorakit";
import { asBanner, PLACEHOLDER_BANNER, type Banner } from "./media";
import { MEDIA_COLLECTION, sourceKey, type DateConfiguration } from "./configuration";
import { describeMedia } from "./catalog";

/** The number of hourly entries a timeline holds. */
const ENTRY_COUNT = 3;

/** The number of attempts made at drawing images. */
const DRAW_ATTEMPTS = 3;

/** The interval between entries, in milliseconds. */
const ENTRY_INTERVAL = 3_600_000;

/** The lifetime of a reload lock, in milliseconds. */
const LOCK_LIFETIME = 15_000;

/** The longest a tab waits for another tab's reload, in milliseconds. */
const LOCK_WAIT = 20_000;

/** The storage key holding the timeline. */
const TIMELINE_KEY = "dateWidget.timeline";

/** The storage key holding the consecutive failure count. */
const FAILURES_KEY = "dateWidget.consecutiveFailures";

/** The storage key holding the reload lock. */
const LOCK_KEY = "dateWidget.reloadLock";

/**
 * A dated image in a timeline.
 */
export interface TimelineEntry {
  /**
   * The date at which the entry becomes current.
   */
  date: number;

  /**
   * The banner to display.
   */
  banner: Banner;
}

/**
 * The images the Date new tab rotates through.
 */
export interface Timeline {
  /**
   * The entries, ordered by date.
   */
  entries: TimelineEntry[];

  /**
   * The date at which the timeline must be reloaded.
   */
  reloadAt: number;

  /**
   * The image source the entries were fetched for.
   */
  sourceKey: string;
}

/**
 * The next reload interval for a consecutive failure count.
 *
 * Schedule, capped at 4 hours:
 * - 1 failure   -> 10 minutes
 * - 2 failures  -> 30 minutes
 * - 3 failures  -> 1 hour
 * - 4 failures  -> 2 hours
 * - 5+ failures -> 4 hours
 *
 * @param failures - The consecutive failure count.
 *
 * @returns The interval in milliseconds.
 */
export function backoffInterval(failures: number): number {
  switch (failures) {
    case 1:
      return 10 * 60_000;
    case 2:
      return 30 * 60_000;
    case 3:
      return 60 * 60_000;
    case 4:
      return 2 * 60 * 60_000;
    default:
      return failures < 1 ? 60 * 60_000 : 4 * 60 * 60_000;
  }
}

/** Resets the consecutive failure counter after a successful fetch. */
async function recordSuccess(): Promise<void> {
  await browser.storage.local.set({ [FAILURES_KEY]: 0 });
}

/**
 * Increments the consecutive failure counter.
 *
 * @returns The new count.
 */
async function recordFailure(): Promise<number> {
  const stored = (await browser.storage.local.get(FAILURES_KEY))[FAILURES_KEY];
  const failures = (typeof stored === "number" ? stored : 0) + 1;

  await browser.storage.local.set({ [FAILURES_KEY]: failures });

  return failures;
}

/**
 * Loads the persisted timeline.
 *
 * @returns The timeline, or `null` when none is stored.
 */
export async function loadTimeline(): Promise<Timeline | null> {
  const stored = (await browser.storage.local.get(TIMELINE_KEY))[TIMELINE_KEY] as Timeline | undefined;

  if (!stored || !Array.isArray(stored.entries) || stored.entries.length === 0) {
    return null;
  }

  return stored;
}

/**
 * Persists the timeline.
 *
 * @param timeline - The timeline to store.
 */
async function saveTimeline(timeline: Timeline): Promise<void> {
  await browser.storage.local.set({ [TIMELINE_KEY]: timeline });
}

/**
 * Whether a timeline must be reloaded.
 *
 * @param timeline - The timeline to test.
 * @param configuration - The configuration to render with.
 * @param now - The current date.
 */
export function isExpired(timeline: Timeline | null, configuration: DateConfiguration, now: number): boolean {
  return timeline === null || timeline.sourceKey !== sourceKey(configuration) || now >= timeline.reloadAt;
}

/**
 * The entry current at the given date.
 *
 * @param timeline - The timeline to read.
 * @param now - The current date.
 */
export function entryFor(timeline: Timeline, now: number): TimelineEntry {
  let current = timeline.entries[0];

  for (const entry of timeline.entries) {
    if (entry.date <= now) {
      current = entry;
    }
  }

  return current;
}

/**
 * The date at which the displayed entry changes.
 *
 * @param timeline - The timeline to read.
 * @param now - The current date.
 */
export function nextTransition(timeline: Timeline, now: number): number {
  for (const entry of timeline.entries) {
    if (entry.date > now) {
      return entry.date;
    }
  }

  return timeline.reloadAt;
}

/**
 * Claims the right to reload the timeline.
 *
 * @param now - The current date.
 *
 * @returns Whether the caller holds the lock.
 */
async function acquireReloadLock(now: number): Promise<boolean> {
  const stored = (await browser.storage.local.get(LOCK_KEY))[LOCK_KEY];

  if (typeof stored === "number" && stored > now) {
    return false;
  }

  await browser.storage.local.set({ [LOCK_KEY]: now + LOCK_LIFETIME });

  return true;
}

/** Releases the reload lock. */
async function releaseReloadLock(): Promise<void> {
  await browser.storage.local.remove(LOCK_KEY);
}

/**
 * Waits for another tab to store a timeline.
 *
 * @returns The stored timeline, or `null` when none arrives in time.
 */
async function awaitStoredTimeline(): Promise<Timeline | null> {
  return new Promise((resolve) => {
    const finish = (timeline: Timeline | null) => {
      clearTimeout(timer);
      browser.storage.onChanged.removeListener(listener);
      resolve(timeline);
    };

    const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area === "local" && changes[TIMELINE_KEY]?.newValue !== undefined) {
        finish(changes[TIMELINE_KEY].newValue as Timeline);
      }
    };

    const timer = setTimeout(() => finish(null), LOCK_WAIT);

    browser.storage.onChanged.addListener(listener);
  });
}

/**
 * Fetches a timeline of random images for the configuration.
 *
 * Every image is cached before the timeline is returned. A failed fetch yields
 * a single placeholder entry and backs the next reload off.
 *
 * @param kit - The kit performing the request.
 * @param configuration - The configuration to render with.
 *
 * @returns The timeline to render.
 */
export async function getTimeline(kit: KurozoraKit, configuration: DateConfiguration): Promise<Timeline> {
  const now = Date.now();
  const key = sourceKey(configuration);

  try {
    let media: any[] = [];

    for (let attempt = 0; attempt < DRAW_ATTEMPTS && media.length === 0; attempt += 1) {
      const body = await kit.images.random({
        kind: configuration.kind,
        collection: MEDIA_COLLECTION,
        limit: ENTRY_COUNT,
      });
      media = body?.data ?? [];
    }

    if (media.length === 0) {
      throw new Error("No images returned.");
    }

    const entries: TimelineEntry[] = await Promise.all(
      media.map(async (resource, index) => ({
        date: now + index * ENTRY_INTERVAL,
        banner: await asBanner(resource),
      })),
    );

    await describeMedia(kit, entries
      .map((entry) => entry.banner.media)
      .filter((media): media is NonNullable<typeof media> => media !== null));

    await recordSuccess();

    const timeline: Timeline = {
      entries: entries,
      reloadAt: entries[entries.length - 1].date,
      sourceKey: key,
    };

    await saveTimeline(timeline);

    return timeline;
  } catch {
    const timeline: Timeline = {
      entries: [{ date: now, banner: { ...PLACEHOLDER_BANNER } }],
      reloadAt: now + backoffInterval(await recordFailure()),
      sourceKey: key,
    };

    await saveTimeline(timeline);

    return timeline;
  }
}

/**
 * The timeline to render, reloading it when it has expired.
 *
 * At most one tab reloads at a time; the others adopt its result.
 *
 * @param kit - The kit performing the request.
 * @param configuration - The configuration to render with.
 * @param current - The timeline already loaded, when any.
 *
 * @returns The timeline to render.
 */
export async function resolveTimeline(
  kit: KurozoraKit,
  configuration: DateConfiguration,
  current: Timeline | null,
): Promise<Timeline> {
  const now = Date.now();
  const timeline = current ?? (await loadTimeline());

  if (!isExpired(timeline, configuration, now)) {
    return timeline as Timeline;
  }

  if (!(await acquireReloadLock(now))) {
    const awaited = await awaitStoredTimeline();

    if (awaited !== null && !isExpired(awaited, configuration, Date.now())) {
      return awaited;
    }
  }

  try {
    return await getTimeline(kit, configuration);
  } finally {
    await releaseReloadLock();
  }
}
