import OfflineQueue from './offline-queue';
import ScrobbleResolver from './resolver';
import type { ScrobbleEvent } from 'kurozorakit';
import type { KurozoraKit } from 'kurozorakit';
import type { PageIdentity } from './page-registry';

/**
 * A playback event reported by a tab's player frame.
 */
export interface PlaybackEvent {
  /**
   * The scrobble event name (`play`, `pause`, `complete`).
   */
  event?: string;

  /**
   * The percent of runtime watched, as a float 0–100.
   */
  progress: number;

  /**
   * The current playback position, in seconds.
   */
  position: number | null;

  /**
   * The total runtime, in seconds.
   */
  duration?: number;
}

/**
 * An active tab session.
 */
interface Session {
  /**
   * The page identity playing in the tab.
   */
  identity: PageIdentity;

  /**
   * The comparison key of the identity.
   */
  identityKey: string;

  /**
   * Whether a `start` was reported for the session.
   */
  started: boolean;

  /**
   * Whether the play was committed.
   */
  completed: boolean;

  /**
   * The last reported progress.
   */
  lastProgress: number;

  /**
   * The last reported position.
   */
  lastPosition: number | null;

  /**
   * The server-resolved episode's Kurozora public id, once a scrobble resolves it.
   */
  episodePublicID: string | null;
}

/**
 * Correlates page identities with video events and drives the scrobble API.
 */
export default class ScrobbleSessionManager {
  /**
   * The kit performing the requests.
   */
  #kit: KurozoraKit;

  /**
   * The resolver mapping page identities to scrobble identities.
   */
  #resolver: ScrobbleResolver;

  /**
   * The queue replaying commits that failed to send.
   */
  #queue: OfflineQueue;

  /**
   * The active sessions, keyed by tab id.
   */
  #sessions: Map<number, Session> = new Map();

  /**
   * The callback invoked after a play commits as watched.
   */
  #onCommit: () => void;

  /**
   * Create a new manager instance.
   *
   * @param kit - The kit performing the requests.
   * @param onCommit - Invoked after a play commits as watched.
   */
  constructor(kit: KurozoraKit, onCommit: () => void = () => {}) {
    this.#kit = kit;
    this.#onCommit = onCommit;
    this.#resolver = new ScrobbleResolver(kit);
    this.#queue = new OfflineQueue(kit);
  }

  /**
   * Replays plays that queued while offline.
   */
  async replayQueue(): Promise<void> {
    await this.#queue.replay();
  }

  /**
   * Records the identity playing in a tab.
   *
   * @param tabID - The reporting tab.
   * @param identity - The page identity, or null when unreadable.
   */
  handleIdentity(tabID: number, identity: PageIdentity | null): void {
    const session = this.#sessions.get(tabID);

    if (identity === null) {
      this.#sessions.delete(tabID);

      return;
    }

    if (session?.identityKey !== this.#identityKey(identity)) {
      console.log('[Kurozora] session started for tab', tabID, identity.seriesKey, 'ep', identity.episode);
      this.#sessions.set(tabID, {
        identity: identity,
        identityKey: this.#identityKey(identity),
        started: false,
        completed: false,
        lastProgress: 0,
        lastPosition: null,
        episodePublicID: null,
      });
    }
  }

  /**
   * Handles a playback event from a tab's player frame.
   *
   * @param tabID - The reporting tab.
   * @param playback - The event: `{event, progress, position, duration}`.
   */
  async handlePlayback(tabID: number, playback: PlaybackEvent): Promise<void> {
    const session = this.#sessions.get(tabID);

    if (!session || session.completed) {
      console.log('[Kurozora] playback ignored', playback.event, session ? 'already completed' : 'no identity for tab');

      return;
    }

    if (this.#kit.authenticationKey === '') {
      console.warn('[Kurozora] not signed in; scrobbling disabled');

      return;
    }

    session.lastProgress = playback.progress;
    session.lastPosition = playback.position;

    switch (playback.event) {
      case 'play':
        if (!session.started) {
          console.log('[Kurozora] scrobbling to', this.#kit.apiEndpoint.baseURL);
        }

        await this.#send(session, 'start', playback);
        session.started = true;
        break;
      case 'pause':
        if (session.started) {
          await this.#send(session, 'pause', playback);
        }
        break;
      case 'complete':
        await this.#commit(session, playback);
        break;
    }
  }

  /**
   * The page identity playing in a tab, or null when none is tracked.
   *
   * @param tabID - The tab to inspect.
   */
  identityFor(tabID: number): PageIdentity | null {
    return this.#sessions.get(tabID)?.identity ?? null;
  }

  /**
   * The server-resolved episode's Kurozora public id for a tab, when known.
   *
   * @param tabID - The tab to inspect.
   */
  episodePublicIDFor(tabID: number): string | null {
    return this.#sessions.get(tabID)?.episodePublicID ?? null;
  }

  /**
   * Parks the session when its tab closes mid-play.
   *
   * @param tabID - The closed tab.
   */
  handleTabClosed(tabID: number): void {
    const session = this.#sessions.get(tabID);

    this.#sessions.delete(tabID);

    if (session?.started && !session.completed && session.lastProgress > 0) {
      this.#send(session, 'pause', {
        progress: session.lastProgress,
        position: session.lastPosition,
      });
    }
  }

  /**
   * Sends a non-committing session event.
   *
   * @param session - The tab session.
   * @param event - The scrobble event name.
   * @param playback - The playback state.
   */
  async #send(session: Session, event: 'start' | 'pause' | 'stop', playback: PlaybackEvent): Promise<void> {
    const payload = await this.#payload(session, playback);

    if (payload === null) {
      console.warn('[Kurozora] identity unresolved; skipping', event, session.identity);

      return;
    }

    try {
      const result = await this.#kit.scrobble[event](payload);
      console.log('[Kurozora]', event, 'sent', result.attributes);

      if (result.episodeIDs.length > 0) {
        session.episodePublicID = result.episodeIDs[0];
      }
    } catch (error) {
      const apiError = error as { status?: number | null; message?: string };
      console.warn('[Kurozora]', event, 'failed', apiError.status, apiError.message);
    }
  }

  /**
   * Commits the play as watched, caching the resolved episode on success.
   *
   * @param session - The tab session.
   * @param playback - The playback state.
   */
  async #commit(session: Session, playback: PlaybackEvent): Promise<void> {
    const payload = await this.#payload(session, playback);

    if (payload === null) {
      console.warn('[Kurozora] identity unresolved; commit skipped', session.identity);

      return;
    }

    try {
      const result = await this.#kit.scrobble.stop(payload);
      console.log('[Kurozora] commit', result.isPending ? 'pending (catalog resolving)' : 'watched', result.attributes);

      session.completed = true;

      if (result.episodeIDs.length > 0) {
        session.episodePublicID = result.episodeIDs[0];
        await this.#resolver.cacheEpisode(session.identity, result.episodeIDs[0]);
      }

      await this.#queue.replay();

      this.#onCommit();
    } catch (error) {
      const apiError = error as { status?: number | null; message?: string };
      console.warn('[Kurozora] commit failed', apiError.status, apiError.message);

      if (apiError.status === 409) {
        session.completed = true;
      } else if (apiError.status === undefined || apiError.status === null) {
        session.completed = true;

        await this.#queue.enqueue({
          ...payload,
          watchedAt: Math.floor(Date.now() / 1000),
        });
      }
    }
  }

  /**
   * The scrobble payload for the session's identity and playback state.
   *
   * @param session - The tab session.
   * @param playback - The playback state.
   */
  async #payload(session: Session, playback: PlaybackEvent): Promise<ScrobbleEvent | null> {
    const identityPayload = await this.#resolver.identityPayload(session.identity);

    if (identityPayload === null) {
      return null;
    }

    return {
      ...identityPayload,
      progress: Math.round(playback.progress * 10) / 10,
      ...(playback.position != null ? { position: Math.floor(playback.position) } : {}),
    };
  }

  /**
   * The comparison key of a page identity.
   *
   * @param identity - The page identity.
   */
  #identityKey(identity: PageIdentity): string {
    return identity.seriesKey + '#' + (identity.season ?? '') + ':' + identity.episode;
  }
}
