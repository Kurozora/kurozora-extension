import { LibraryKind, type KurozoraKit } from "kurozorakit";
import type { MediaKind } from "./configuration";
import { webURL, type LibraryTarget, type MediaReference } from "./media";

/**
 * How a catalog resource is presented.
 */
interface Description {
  /**
   * The resource's title.
   */
  title: string;

  /**
   * The route key the resource's website page binds on.
   */
  routeKey: string;

  /**
   * The library entry the resource is tracked as.
   */
  library: LibraryTarget | null;
}

/**
 * Reads the description of a resource of the given kind.
 *
 * An episode is presented under its own title, falling back to the series it
 * belongs to when it carries none.
 *
 * @param kind - The kind of media.
 * @param resource - The catalog resource.
 *
 * @returns The description, or `null` when the resource carries no title.
 */
function describe(kind: MediaKind, resource: any): Description | null {
  const attributes = resource?.attributes ?? {};

  if (kind === "episodes") {
    const episodeTitle = typeof attributes.title === "string" ? attributes.title : "";
    const showTitle = typeof attributes.showTitle === "string" ? attributes.showTitle : "";
    const title = episodeTitle !== "" ? episodeTitle : showTitle;

    if (title === "") {
      return null;
    }

    const showID = resource?.relationships?.shows?.data?.[0]?.id;

    return {
      title: title,
      routeKey: String(resource.id),
      library: showID !== undefined ? { kind: LibraryKind.anime, id: String(showID) } : null,
    };
  }

  const slug = typeof attributes.slug === "string" ? attributes.slug : "";

  if (typeof attributes.title !== "string" || attributes.title === "" || slug === "") {
    return null;
  }

  return { title: attributes.title, routeKey: slug, library: null };
}

/**
 * Fetches the catalog resources of the given kind.
 *
 * @param kit - The kit performing the request.
 * @param kind - The kind of media.
 * @param ids - The resource ids, 25 max.
 *
 * @returns The response body with resource `data`.
 */
function fetchResources(kit: KurozoraKit, kind: MediaKind, ids: string[]): Promise<any> {
  switch (kind) {
    case "episodes":
      return kit.episodes.views(ids);
    case "games":
      return kit.games.views(ids);
    case "literatures":
      return kit.literatures.views(ids);
    case "shows":
      return kit.anime.views(ids);
  }
}

/**
 * Fills in the title and website page of the given references.
 *
 * References the catalog cannot describe keep their `null` title.
 *
 * @param kit - The kit performing the requests.
 * @param references - The references to describe.
 */
export async function describeMedia(kit: KurozoraKit, references: MediaReference[]): Promise<void> {
  const byKind = new Map<MediaKind, MediaReference[]>();

  for (const reference of references) {
    byKind.set(reference.kind, [...(byKind.get(reference.kind) ?? []), reference]);
  }

  await Promise.all(
    [...byKind].map(async ([kind, kindReferences]) => {
      const ids = [...new Set(kindReferences.map((reference) => reference.id))];

      let resources: any[] = [];

      try {
        resources = (await fetchResources(kit, kind, ids)).data ?? [];
      } catch {
        return;
      }

      const descriptions = new Map<string, Description>();

      for (const resource of resources) {
        const description = describe(kind, resource);

        if (description !== null) {
          descriptions.set(String(resource.id), description);
        }
      }

      for (const reference of kindReferences) {
        const description = descriptions.get(reference.id);

        if (description !== undefined) {
          reference.title = description.title;
          reference.url = webURL(kind, description.routeKey);
          reference.library = reference.library ?? description.library;
        }
      }
    }),
  );
}
