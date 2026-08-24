import { LibraryKind, type LibraryKindValue } from "kurozorakit";
import { fetchImage } from "./image-cache";
import type { MediaKind } from "./configuration";

/** The website a media resource links to. */
const WEB_BASE_URL = "https://kurozora.app";

/** The website path segment of each media kind. */
const WEB_PATHS: Record<MediaKind, string> = {
  episodes: "episodes",
  shows: "anime",
  games: "games",
  literatures: "manga",
};

/** The library each media kind is tracked in. */
const LIBRARY_KINDS: Record<MediaKind, LibraryKindValue> = {
  episodes: LibraryKind.anime,
  shows: LibraryKind.anime,
  games: LibraryKind.games,
  literatures: LibraryKind.literatures,
};

/**
 * The relationship each media kind arrives under.
 *
 * Ordered by the precedence a media resource resolves its relationship with.
 */
const RELATIONSHIPS: ReadonlyArray<[string, MediaKind]> = [
  ["episodes", "episodes"],
  ["shows", "shows"],
  ["games", "games"],
  ["literatures", "literatures"],
];

/**
 * The library entry a media resource is tracked as.
 */
export interface LibraryTarget {
  /**
   * The library the media is tracked in.
   */
  kind: LibraryKindValue;

  /**
   * The media's library id.
   */
  id: string;
}

/**
 * The media an image belongs to.
 */
export interface MediaReference {
  /**
   * The kind of media.
   */
  kind: MediaKind;

  /**
   * The media's catalog id.
   */
  id: string;

  /**
   * The media's title, once the catalog has described it.
   */
  title: string | null;

  /**
   * The page the media links to, once its route key is known.
   */
  url: string | null;

  /**
   * The library entry the media is tracked as.
   *
   * An episode is tracked as the series it belongs to, and carries none until
   * the catalog has described it.
   */
  library: LibraryTarget | null;
}

/**
 * A media image displayed by the Date new tab.
 */
export interface Banner {
  /**
   * The URL of the image of the media.
   */
  url: string | null;

  /**
   * The height of the media.
   */
  height: number | null;

  /**
   * The width of the media.
   */
  width: number | null;

  /**
   * The background color of the media.
   */
  backgroundColor: string | null;

  /**
   * The media the image belongs to.
   */
  media: MediaReference | null;
}

/** The banner shown when no media is available. */
export const PLACEHOLDER_BANNER: Banner = Object.freeze({
  url: null,
  height: null,
  width: null,
  backgroundColor: null,
  media: null,
});

/**
 * Whether a library entry can be reminded of.
 *
 * @param target - The library entry.
 */
export function isRemindable(target: LibraryTarget): boolean {
  return target.kind === LibraryKind.anime;
}

/**
 * The website page of a media resource.
 *
 * Website routes bind on the slug, except episodes, which bind on the public id.
 *
 * @param kind - The kind of media.
 * @param routeKey - The resource's slug, or its public id for an episode.
 */
export function webURL(kind: MediaKind, routeKey: string): string {
  return WEB_BASE_URL + "/" + WEB_PATHS[kind] + "/" + routeKey;
}

/**
 * The media the image belongs to, resolved from its relationships.
 *
 * @param media - The media resource.
 *
 * @returns The reference, or `null` when the media carries no linkable relationship.
 */
export function mediaReference(media: any): MediaReference | null {
  const relationships = media?.relationships;

  if (!relationships) {
    return null;
  }

  for (const [relationship, kind] of RELATIONSHIPS) {
    const identity = relationships[relationship]?.data?.[0];

    if (identity?.id !== undefined) {
      const id = String(identity.id);

      return {
        kind: kind,
        id: id,
        title: null,
        url: kind === "episodes" ? webURL(kind, id) : null,
        library: kind === "episodes" ? null : { kind: LIBRARY_KINDS[kind], id: id },
      };
    }
  }

  return null;
}

/**
 * Converts a media resource to a `Banner`, downloading and caching its image.
 *
 * @param media - The media resource.
 *
 * @returns The banner to display.
 */
export async function asBanner(media: any): Promise<Banner> {
  const url = typeof media?.url === "string" ? media.url : null;

  if (url !== null) {
    await fetchImage(url);
  }

  return {
    url: url,
    height: typeof media?.height === "number" ? media.height : null,
    width: typeof media?.width === "number" ? media.width : null,
    backgroundColor: typeof media?.backgroundColor === "string" ? media.backgroundColor : null,
    media: mediaReference(media),
  };
}
