<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { browser } from "wxt/browser";
  import Button from "@/lib/components/Button.svelte";
  import SimpleButton from "@/lib/components/SimpleButton.svelte";
  import { kit } from "../kit";
  import { pageFor } from "@/lib/scrobble/page-registry";
  import type { UpNextRow } from "@/lib/up-next";

  /** The resolved up-next rows, served from the background cache. */
  let rows = $state<UpNextRow[]>([]);
  /** Whether the initial cache read is still pending. */
  let loading = $state(true);
  /** Whether a session is stored. */
  const signedIn = kit.authenticationKey !== "";
  /** The most recent load error message, if any. */
  let errorMessage = $state<string | null>(null);
  /** Whether incognito suspends all tracking. */
  let incognito = $state(false);
  /** The active tab's site domain, when it's a supported streaming site. */
  let activeSite = $state<string | null>(null);
  /** Whether tracking is disabled for the active tab's site. */
  let activeSiteBlocked = $state(false);
  /** The site domains tracking is disabled on. */
  let blockedDomains: string[] = [];
  /** The row whose clear action is awaiting confirmation. */
  let clearingID = $state<string | null>(null);
  /** The pending clear-confirmation reset timer. */
  let clearingTimer: ReturnType<typeof setTimeout> | null = null;
  /** Episodes cleared this session, kept progress-free even if a refresh lags. */
  const clearedIDs = new Set<string>();

  /** Drops resume data from rows whose episode was cleared this session. */
  function stripCleared(list: UpNextRow[]): UpNextRow[] {
    if (clearedIDs.size === 0) return list;

    return list.map((row) =>
      clearedIDs.has(row.id)
        ? { ...row, resumePosition: null, resumeURL: null, watchedFromName: null }
        : row,
    );
  }

  /** The registrable domain of a hostname. */
  function siteDomain(hostname: string): string {
    return hostname.split(".").slice(-2).join(".");
  }

  /** Restores the quick-toggle states and resolves the active tab's site. */
  async function loadTrackingRules(): Promise<void> {
    const stored = await browser.storage.local.get(["incognito", "blockedDomains"]);
    incognito = stored.incognito === true;
    blockedDomains = Array.isArray(stored.blockedDomains) ? stored.blockedDomains : [];

    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

    if (activeTab?.url && pageFor(activeTab.url) !== null) {
      activeSite = siteDomain(new URL(activeTab.url).hostname);
      activeSiteBlocked = blockedDomains.includes(activeSite);
    }
  }

  /** Persists the incognito toggle. */
  async function saveIncognito(): Promise<void> {
    await browser.storage.local.set({ incognito });
  }

  /** Persists whether the active tab's site is tracked. */
  async function saveActiveSiteBlocked(): Promise<void> {
    if (activeSite === null) return;

    blockedDomains = activeSiteBlocked
      ? [...new Set([...blockedDomains, activeSite])]
      : blockedDomains.filter((domain) => domain !== activeSite);

    await browser.storage.local.set({ blockedDomains });
  }

  /** Applies rows the background pushes after the list changes. */
  function handleMessage(request: any): undefined {
    if (request?.action === "popup:upNextUpdated") {
      rows = stripCleared((request.rows as UpNextRow[]) ?? []);
      loading = false;
      errorMessage = null;
    }

    return undefined;
  }

  onMount(() => {
    browser.runtime.onMessage.addListener(handleMessage);

    loadTrackingRules().catch(() => {});

    if (!signedIn) {
      loading = false;
      return;
    }

    browser.runtime
      .sendMessage({ action: "popup:getUpNext" })
      .then((response: any) => {
        rows = (response?.rows as UpNextRow[]) ?? [];
        errorMessage = response?.error ?? null;
        loading = false;

        browser.runtime.sendMessage({ action: "popup:refreshUpNext" }).catch(() => {
        });
      })
      .catch((error: { message?: string }) => {
        errorMessage =
          "Couldn’t load your episodes: " +
          (error?.message ?? "Please try again.");
        loading = false;
      });
  });

  onDestroy(() => {
    browser.runtime.onMessage.removeListener(handleMessage);

    if (clearingTimer !== null) {
      clearTimeout(clearingTimer);
    }
  });

  /** Clears a row's watch progress, confirming on the second tap. */
  function clearScrobble(event: MouseEvent, row: UpNextRow): void {
    event.preventDefault();
    event.stopPropagation();

    if (clearingTimer !== null) {
      clearTimeout(clearingTimer);
      clearingTimer = null;
    }

    if (clearingID !== row.id) {
      clearingID = row.id;
      clearingTimer = setTimeout(() => (clearingID = null), 3000);

      return;
    }

    clearingID = null;

    // Hide the row's progress at once; the refresh below may lag behind the write.
    clearedIDs.add(row.id);
    rows = stripCleared(rows);

    browser.runtime
      .sendMessage({ action: "popup:clearScrobble", episodeID: row.id })
      .then((response: any) => {
        if (response?.error) {
          clearedIDs.delete(row.id);
        }

        if (Array.isArray(response?.rows)) {
          rows = stripCleared(response.rows as UpNextRow[]);
        }
      })
      .catch(() => clearedIDs.delete(row.id));
  }

  /** Reopens a row's watch page, reusing an existing tab on that site. */
  function continueWatching(event: MouseEvent, row: UpNextRow): void {
    event.preventDefault();
    event.stopPropagation();

    browser.runtime
      .sendMessage({ action: "popup:continueWatching", url: row.resumeURL })
      .catch(() => {});
    window.close();
  }

  /** The `m:ss` display form of a resume position. */
  function formatPosition(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainder = String(Math.floor(seconds % 60)).padStart(2, "0");

    return minutes + ":" + remainder;
  }
</script>

<div class="flex flex-col">
  <header
    class="flex items-center justify-between px-4 py-3 border-b border-primary"
  >
    <h1 class="text-lg font-bold">Up Next</h1>
    <SimpleButton onclick={() => push("/settings")}>⚙ Settings</SimpleButton>
  </header>

  <section class="flex flex-col gap-2 px-4 py-2 border-b border-primary">
    <label class="flex items-center justify-between gap-3 text-xs" for="incognito">
      <span>Incognito (pause all tracking)</span>
      <input
        id="incognito"
        type="checkbox"
        class="h-4 w-4 accent-orange-500"
        bind:checked={incognito}
        onchange={saveIncognito}
      />
    </label>

    {#if activeSite !== null}
      <label
        class="flex items-center justify-between gap-3 text-xs"
        class:opacity-50={incognito}
        for="trackSite"
      >
        <span>Track on {activeSite}</span>
        <input
          id="trackSite"
          type="checkbox"
          class="h-4 w-4 accent-orange-500"
          disabled={incognito}
          checked={!activeSiteBlocked}
          onchange={(event) => {
            activeSiteBlocked = !(event.currentTarget as HTMLInputElement).checked;
            saveActiveSiteBlocked();
          }}
        />
      </label>
    {/if}

    <button
      class="self-start text-xs text-secondary transition ease-in-out duration-150 hover:text-primary"
      onclick={() => push("/sites")}
    >
      Manage sites →
    </button>
  </section>

  {#if !signedIn}
    <section class="flex flex-col items-start gap-3 px-4 py-4">
      <p class="text-sm text-secondary">
        Sign in to track what you watch and pick up where you left off.
      </p>
      <Button type="button" onclick={() => push("/signin")}>Sign in</Button>
    </section>
  {:else if loading}
    <p class="px-4 py-4 text-sm text-secondary">Loading your episodes…</p>
  {:else if errorMessage}
    <p class="px-4 py-4 text-sm text-red-300">{errorMessage}</p>
  {:else if rows.length === 0}
    <p class="px-4 py-4 text-sm text-secondary">
      Nothing up next. Go add something to your library! 🍿
    </p>
  {:else}
    <ul class="flex-1 overflow-y-auto">
      {#each rows as row (row.id)}
        <li class="border-b border-primary last:border-0">
          <a
            class="flex items-center gap-3 px-4 py-2 transition ease-in-out duration-150 hover:bg-secondary"
            href={row.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              class="w-16 h-10 rounded object-cover bg-tertiary"
              src={row.posterURL}
              alt=""
            />
            <span class="flex flex-col min-w-0 flex-1">
              <span class="text-sm font-semibold truncate">{row.animeTitle}</span>
              <span class="text-xs text-secondary truncate">{row.episodeInfo}</span>
            </span>
            <span class="flex shrink-0 items-center gap-1">
              {#if row.resumePosition !== null || row.resumeURL !== null}
                <button
                  class={"rounded-md px-2 py-1 text-xs font-bold transition ease-in-out duration-150 " + (clearingID === row.id ? "bg-red-500 text-white hover:bg-red-400" : "bg-tertiary text-secondary hover:bg-secondary")}
                  title="Clear watch progress"
                  onclick={(event) => clearScrobble(event, row)}
                >
                  {clearingID === row.id ? "Clear?" : "✕"}
                </button>
              {/if}
              {#if row.resumeURL}
                <button
                  class="rounded-md px-2 py-1 text-xs font-bold bg-orange-500 text-white transition ease-in-out duration-150 hover:bg-orange-400"
                  title={"Continue" + (row.watchedFromName ? " on " + row.watchedFromName : "") + (row.resumePosition ? " from " + formatPosition(row.resumePosition) : "")}
                  onclick={(event) => continueWatching(event, row)}
                >
                  ▶{row.resumePosition ? " " + formatPosition(row.resumePosition) : ""}
                </button>
              {/if}
            </span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>
