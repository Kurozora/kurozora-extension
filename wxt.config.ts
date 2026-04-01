import { defineConfig } from 'wxt';

/**
 * The extension pages content security policy.
 *
 * Locks connections to the API hosts the extension actually talks to, plus
 * the `wss://` Reverb hosts the live-presence WebSocket dials (see the
 * `reverb` config in `kurozora-api.ts`). `'unsafe-inline'` stays in
 * `style-src` because Svelte transitions and component styles can inject
 * inline style attributes at runtime.
 */
const EXTENSION_PAGES_CSP = "default-src 'self'; script-src 'self'; connect-src 'self' https://*.kurozora.app https://kurozora.test https://choice-settling-perch.ngrok-free.app wss://*.kurozora.app wss://kurozora.test wss://kurozora.test:* wss://*.ngrok-free.app ws://localhost:* ws://127.0.0.1:*; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; object-src 'self';";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-svelte'],
  // `wxt dev` launches a throwaway browser profile by default; a dedicated
  // user-data dir keeps the sign-in and environment across dev restarts.
  // Chromium-only — web-ext offers no persistent-profile equivalent for the
  // Firefox dev runner. (WXT ≥ 0.20 renames `runner` to `webExt`.)
  runner: {
    chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
  },
  // The manifest is generated per target browser: `action`, `icons`,
  // `background`, and `content_scripts` come from the entrypoints and
  // `public/`, so only the metadata WXT can't infer is declared here.
  manifest: ({ browser }) => ({
    name: 'Kurozora — Anime/Manga/Game',
    short_name: 'Kurozora',
    description:
      'Search Kurozora for anime, manga, games, characters, voice actors, songs, studios and more!',
    author: 'Kiritokatklian',
    developer: {
      name: 'Kurozora',
      url: 'https://github.com/kurozora/kurozora-extension',
    },
    homepage_url: 'https://github.com/kurozora/kurozora-extension',
    permissions: ['activeTab', 'contextMenus', 'storage', 'search'],
    // Always the object form: WXT mutates `extension_pages` in dev mode and
    // flattens it to MV2's single string itself at emit time.
    content_security_policy: { extension_pages: EXTENSION_PAGES_CSP },
    host_permissions: [
      'https://*.kurozora.app/*',
      'https://kurozora.test/*',
      'https://choice-settling-perch.ngrok-free.app/*',
      // The live-presence WebSocket dials the per-environment Reverb hosts.
      'wss://*.kurozora.app/*',
      'wss://kurozora.test/*',
      'wss://*.ngrok-free.app/*',
      'ws://localhost/*',
      'ws://127.0.0.1/*',
    ],
    chrome_settings_overrides: {
      search_provider: {
        name: 'Kurozora',
        search_url: 'https://kurozora.app/search?q={searchTerms}',
        keyword: 'k',
        favicon_url: '/img/favicon.ico',
        // Alternate query shapes are a Chromium-only extension of the
        // search provider contract.
        ...(browser === 'chrome'
          ? {
              alternate_urls: [
                'https://kurozora.app/search?q={searchTerms}&type=literatures',
                'https://kurozora.app/search?q={searchTerms}&type=games',
                'https://kurozora.app/search?q={searchTerms}&type=episodes',
                'https://kurozora.app/search?q={searchTerms}&type=characters',
                'https://kurozora.app/search?q={searchTerms}&type=people',
                'https://kurozora.app/search?q={searchTerms}&type=songs',
                'https://kurozora.app/search?q={searchTerms}&type=studios',
                'https://kurozora.app/search?q={searchTerms}&type=users',
                'https://kurozora.app/search?q={searchTerms}&scope=library',
                'https://kurozora.app/search?q={searchTerms}&scope=library&type=literatures',
                'https://kurozora.app/search?q={searchTerms}&scope=library&type=games',
              ],
            }
          : {}),
      },
    },
    // Firefox needs a stable add-on id and a minimum runtime; Chromium
    // ignores these keys.
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: '{84BCDD02-DB50-4C24-9037-7008F4C848F5}',
              strict_min_version: '109.0',
            },
          },
        }
      : {}),
  }),
});
