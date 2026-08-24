import {
  FavoriteKind,
  LibraryKind,
  LibraryStatus,
  type FavoriteKindValue,
  type KurozoraKit,
  type LibraryKindValue,
  type LibraryStatusValue,
} from "kurozorakit";
import type { LibraryTarget } from "./media";

/** The value standing for a title that is not tracked. */
export const NO_STATUS = -1;

/** The value standing for the option that stops tracking a title. */
export const REMOVE_STATUS = -2;

/** The statuses a title can be tracked under, in the order they are offered. */
export const LIBRARY_STATUSES: ReadonlyArray<LibraryStatusValue> = [
  LibraryStatus.inProgress,
  LibraryStatus.planning,
  LibraryStatus.completed,
  LibraryStatus.onHold,
  LibraryStatus.dropped,
  LibraryStatus.interested,
  LibraryStatus.ignored,
];

/** The label each library gives the in-progress status. */
const IN_PROGRESS_LABELS: Record<LibraryKindValue, string> = {
  [LibraryKind.anime]: "Watching",
  [LibraryKind.literatures]: "Reading",
  [LibraryKind.games]: "Playing",
};

/** The label of every status shared across libraries. */
const STATUS_LABELS: Partial<Record<LibraryStatusValue, string>> = {
  [LibraryStatus.planning]: "Planning",
  [LibraryStatus.completed]: "Completed",
  [LibraryStatus.onHold]: "On-Hold",
  [LibraryStatus.dropped]: "Dropped",
  [LibraryStatus.interested]: "Interested",
  [LibraryStatus.ignored]: "Ignored",
};

/** The kind each library reports its resources as when favorited. */
const FAVORITE_KINDS: Record<LibraryKindValue, FavoriteKindValue> = {
  [LibraryKind.anime]: FavoriteKind.anime,
  [LibraryKind.literatures]: FavoriteKind.literatures,
  [LibraryKind.games]: FavoriteKind.games,
};

/**
 * The signed-in user's relationship with a title.
 */
export interface LibraryState {
  /**
   * The status the title is tracked under, or `null` when it is untracked.
   */
  status: number | null;

  /**
   * Whether the title is favorited.
   */
  isFavorited: boolean;

  /**
   * Whether the title is reminded of.
   */
  isReminded: boolean;
}

/** The state of a title the user does not track. */
export const UNTRACKED: LibraryState = Object.freeze({
  status: null,
  isFavorited: false,
  isReminded: false,
});

/**
 * The name a library gives a status.
 *
 * @param kind - The library the title is tracked in.
 * @param status - The status to name.
 */
export function statusLabel(kind: LibraryKindValue, status: LibraryStatusValue): string {
  return status === LibraryStatus.inProgress ? IN_PROGRESS_LABELS[kind] : (STATUS_LABELS[status] ?? "");
}

/**
 * Fetches the catalog resource of a library entry.
 *
 * @param kit - The kit performing the request.
 * @param target - The library entry.
 *
 * @returns The response body with resource `data`.
 */
function fetchResource(kit: KurozoraKit, target: LibraryTarget): Promise<any> {
  switch (target.kind) {
    case LibraryKind.literatures:
      return kit.literatures.views([target.id]);
    case LibraryKind.games:
      return kit.games.views([target.id]);
    default:
      return kit.anime.views([target.id]);
  }
}

/**
 * The state carried by a catalog resource.
 *
 * @param resource - The catalog resource.
 */
function stateOf(resource: any): LibraryState {
  const library = resource?.attributes?.library ?? {};

  return {
    status: typeof library.status === "number" ? library.status : null,
    isFavorited: library.isFavorited === true,
    isReminded: library.isReminded === true,
  };
}

/**
 * Reads how the signed-in user relates to a title.
 *
 * @param kit - The kit performing the request.
 * @param target - The library entry.
 *
 * @returns The state, or `null` when the catalog cannot describe the title.
 */
export async function loadLibraryState(kit: KurozoraKit, target: LibraryTarget): Promise<LibraryState | null> {
  const resource = (await fetchResource(kit, target)).data?.[0];

  return resource !== undefined ? stateOf(resource) : null;
}

/**
 * Tracks a title under the given status.
 *
 * @param kit - The kit performing the request.
 * @param target - The library entry.
 * @param status - The status to track the title under.
 * @param state - The state to update.
 *
 * @returns The resulting state.
 */
export async function setLibraryStatus(
  kit: KurozoraKit,
  target: LibraryTarget,
  status: LibraryStatusValue,
  state: LibraryState,
): Promise<LibraryState> {
  await kit.library.add({ kind: target.kind, status: status, ids: [target.id] });

  return { ...state, status: status };
}

/**
 * Stops tracking a title, clearing its favorite and reminder.
 *
 * @param kit - The kit performing the request.
 * @param target - The library entry.
 *
 * @returns The resulting state.
 */
export async function removeFromLibrary(kit: KurozoraKit, target: LibraryTarget): Promise<LibraryState> {
  await kit.library.remove({ kind: target.kind, ids: [target.id] });

  return { ...UNTRACKED };
}

/**
 * Favorites a title, or unfavorites it when already favorited.
 *
 * @param kit - The kit performing the request.
 * @param target - The library entry.
 * @param state - The state to update.
 *
 * @returns The resulting state.
 */
export async function toggleFavorite(
  kit: KurozoraKit,
  target: LibraryTarget,
  state: LibraryState,
): Promise<LibraryState> {
  const body = await kit.favorites.toggle({ kind: FAVORITE_KINDS[target.kind], ids: [target.id] });

  return { ...state, isFavorited: body?.data?.isFavorited === true };
}

/**
 * Reminds of a title, or forgets it when already reminded of.
 *
 * @param kit - The kit performing the request.
 * @param target - The library entry.
 * @param state - The state to update.
 *
 * @returns The resulting state.
 */
export async function toggleReminder(
  kit: KurozoraKit,
  target: LibraryTarget,
  state: LibraryState,
): Promise<LibraryState> {
  const body = await kit.reminders.toggle({ kind: target.kind, ids: [target.id] });

  return { ...state, isReminded: body?.data?.isReminded === true };
}
