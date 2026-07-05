import { pageFor } from '@/lib/scrobble/page-registry';
import { SNIFFER_MESSAGE, type SnifferMessage } from '@/lib/scrobble/sniffer-protocol';

export default defineContentScript({
  // Must mirror the isolated content script's `matches` (see `content.ts`).
  matches: [
    'https://www.crunchyroll.com/*',
    'https://static.crunchyroll.com/*',
    'https://*.hidive.com/*',
    'https://video.unext.jp/*',
    'https://*.an1me.to/*',
    'https://*.anime-odcinki.pl/*',
    'https://*.animeonsen.xyz/*',
    'https://*.animepahe.pw/*',
    'https://*.kwik.cx/*',
    'https://*.kwik.si/*',
    'https://*.mewcdn.online/*',
    'https://*.jkanime.net/*',
    'https://*.witanime.you/*',
    'https://*.mp4upload.com/*',
  ],
  allFrames: true,
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    /**
     * The largest response body forwarded.
     */
    const MAX_BODY_BYTES = 512 * 1024;

    /**
     * The most recent captures.
     */
    const buffer: { url: string; body: string }[] = [];

    /**
     * The maximum captures retained for replay.
     */
    const BUFFER_LIMIT = 8;

    const nativeFetch = window.fetch.bind(window);
    const nativeOpen = XMLHttpRequest.prototype.open;
    const nativeSend = XMLHttpRequest.prototype.send;

    /**
     * Whether the current page module wants the given response captured.
     *
     * @param url - The response URL.
     */
    function wants(url: string): boolean {
      const page = pageFor(location.href);

      if (page?.networkMatches == null) {
        return false;
      }

      try {
        return page.networkMatches(url);
      } catch {
        return false;
      }
    }

    /**
     * Posts a captured response to the isolated content script.
     *
     * @param url - The response URL.
     * @param body - The raw response body.
     */
    function forward(url: string, body: string): void {
      if (body.length === 0 || body.length > MAX_BODY_BYTES) {
        return;
      }

      buffer.push({ url: url, body: body });

      if (buffer.length > BUFFER_LIMIT) {
        buffer.shift();
      }

      post({ source: SNIFFER_MESSAGE, kind: 'capture', url: url, body: body });
    }

    /**
     * Posts a sniffer message on the frame's own window.
     *
     * @param message - The message to post.
     */
    function post(message: SnifferMessage): void {
      window.postMessage(message, location.origin);
    }

    window.addEventListener('message', (event) => {
      if (event.source !== window) {
        return;
      }

      const message = event.data as SnifferMessage | undefined;

      if (message?.source !== SNIFFER_MESSAGE || message.kind !== 'flush') {
        return;
      }

      buffer.forEach((entry) => post({ source: SNIFFER_MESSAGE, kind: 'capture', url: entry.url, body: entry.body }));
    });

    window.fetch = function (this: unknown, ...args: Parameters<typeof fetch>): Promise<Response> {
      const input = args[0];
      const requestURL = typeof input === 'string'
        ? input
        : input instanceof Request ? input.url : String(input);
      const promise = nativeFetch(...args);

      if (wants(requestURL)) {
        promise
          .then((response) => response.clone().text().then((body) => forward(response.url || requestURL, body)))
          .catch(() => {});
      }

      return promise;
    } as typeof fetch;

    XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]): void {
      (this as XMLHttpRequest & { __kurozoraURL?: string }).__kurozoraURL = typeof url === 'string' ? url : url.href;

      return nativeOpen.apply(this, [method, url, ...rest] as Parameters<typeof nativeOpen>);
    };

    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, ...args: Parameters<typeof nativeSend>): void {
      const requestURL = (this as XMLHttpRequest & { __kurozoraURL?: string }).__kurozoraURL;

      if (requestURL != null && wants(requestURL)) {
        this.addEventListener('loadend', () => {
          try {
            if (this.responseType === '' || this.responseType === 'text') {
              forward(this.responseURL || requestURL, this.responseText);
            } else if (this.responseType === 'json' && this.response != null) {
              forward(this.responseURL || requestURL, JSON.stringify(this.response));
            }
          } catch {
          }
        });
      }

      return nativeSend.apply(this, args);
    };
  },
});
