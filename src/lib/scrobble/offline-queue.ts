import { browser } from 'wxt/browser';
import type { ScrobbleEvent } from 'kurozorakit';
import type { KurozoraKit } from 'kurozorakit';

/**
 * The offline queue for committing plays that failed to send.
 */
export default class OfflineQueue {
  /**
   * The storage key holding the queued plays.
   */
  static STORAGE_KEY = 'scrobbleQueue';

  /**
   * The kit performing the replay.
   */
  #kit: KurozoraKit;

  /**
   * Create a new queue instance.
   *
   * @param kit - The kit performing the replay.
   */
  constructor(kit: KurozoraKit) {
    this.#kit = kit;
  }

  /**
   * Queues a committing play for later replay.
   *
   * @param play - The identity payload plus a `watchedAt` epoch.
   */
  async enqueue(play: ScrobbleEvent): Promise<void> {
    const plays = await this.#loadPlays();

    plays.push(play);

    await browser.storage.local.set({
      [OfflineQueue.STORAGE_KEY]: plays,
    });
  }

  /**
   * Replays every queued play.
   */
  async replay(): Promise<void> {
    const plays = await this.#loadPlays();

    if (plays.length === 0) {
      return;
    }

    try {
      await this.#kit.scrobble.history(plays);
    } catch {
      return;
    }

    await browser.storage.local.remove(OfflineQueue.STORAGE_KEY);
  }

  /**
   * The queued plays.
   */
  async #loadPlays(): Promise<ScrobbleEvent[]> {
    const stored = await browser.storage.local.get(OfflineQueue.STORAGE_KEY);

    return (stored[OfflineQueue.STORAGE_KEY] as ScrobbleEvent[] | undefined) ?? [];
  }
}
