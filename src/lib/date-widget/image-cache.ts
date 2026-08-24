/** The cache holding downloaded images. */
const CACHE_NAME = "kurozora-widget";

/** The lifetime of a cached image in milliseconds. */
const CACHE_LIFETIME = 86_400_000;

/** The header recording when an image entered the cache. */
const CACHED_AT_HEADER = "x-kurozora-cached-at";

/** The image shown when no other is available. */
export const FALLBACK_IMAGE_URL = "/img/starry_sky.jpg";

/**
 * Opens the image cache.
 *
 * @returns The cache, or `null` where caching is unavailable.
 */
async function openCache(): Promise<Cache | null> {
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

/**
 * Removes cached images older than the cache lifetime.
 *
 * @param cache - The cache to clean up.
 */
async function cleanup(cache: Cache): Promise<void> {
  const expirationDate = Date.now() - CACHE_LIFETIME;
  const requests = await cache.keys();

  await Promise.all(
    requests.map(async (request) => {
      const response = await cache.match(request);
      const cachedAt = Number(response?.headers.get(CACHED_AT_HEADER) ?? 0);

      if (cachedAt < expirationDate) {
        await cache.delete(request);
      }
    }),
  );
}

/**
 * Whether a cached image is available.
 *
 * @param url - The URL of the image.
 */
export async function cachedImageAvailable(url: string): Promise<boolean> {
  const cache = await openCache();
  return cache !== null && (await cache.match(url)) !== undefined;
}

/**
 * The image at the given address, cached locally for a day.
 *
 * A cached image is served without a network request.
 *
 * @param url - The URL of the image.
 *
 * @returns The image blob, or `null` when the image cannot be fetched.
 */
export async function fetchImage(url: string): Promise<Blob | null> {
  const cache = await openCache();
  const cached = await cache?.match(url);

  if (cached) {
    return cached.blob();
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();

    if (cache !== null) {
      await cache.put(
        url,
        new Response(blob, {
          headers: {
            "content-type": blob.type,
            [CACHED_AT_HEADER]: String(Date.now()),
          },
        }),
      );
      await cleanup(cache);
    }

    return blob;
  } catch {
    return null;
  }
}

/**
 * A random image from the cache.
 *
 * @returns The image blob, or `null` when the cache is empty.
 */
export async function fetchRandomImage(): Promise<Blob | null> {
  const cache = await openCache();

  if (cache === null) {
    return null;
  }

  const requests = await cache.keys();

  if (requests.length === 0) {
    return null;
  }

  const request = requests[Math.floor(Math.random() * requests.length)];
  const response = await cache.match(request);

  return response ? response.blob() : null;
}

/**
 * Resolves an image address to a displayable image.
 *
 * Falls back to a random cached image, then to the bundled image.
 *
 * @param url - The URL of the image, when one is known.
 *
 * @returns The object URL to display, and whether the caller owns it.
 */
export async function resolveImage(url: string | null): Promise<{ src: string; isObjectURL: boolean }> {
  const blob = (url !== null ? await fetchImage(url) : null) ?? (await fetchRandomImage());

  if (blob !== null) {
    return { src: URL.createObjectURL(blob), isObjectURL: true };
  }

  return { src: FALLBACK_IMAGE_URL, isObjectURL: false };
}
