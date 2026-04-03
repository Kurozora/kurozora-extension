<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { browser } from "wxt/browser";
  import SimpleButton from "@/lib/components/SimpleButton.svelte";
  import type { UpNextRow } from "@/lib/up-next";

  /** The resolved up-next rows, served from the background cache. */
  let rows = $state<UpNextRow[]>([]);
  /** Whether the initial cache read is still pending. */
  let loading = $state(true);
  /** The most recent load error message, if any. */
  let errorMessage = $state<string | null>(null);

  /** Applies rows the background pushes after the list changes. */
  function handleMessage(request: any): undefined {
    if (request?.action === "popup:upNextUpdated") {
      rows = (request.rows as UpNextRow[]) ?? [];
      loading = false;
      errorMessage = null;
    }

    return undefined;
  }

  onMount(() => {
    browser.runtime.onMessage.addListener(handleMessage);

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
  });
</script>

<div class="flex flex-col">
  <header
    class="flex items-center justify-between px-4 py-3 border-b border-primary"
  >
    <h1 class="text-lg font-bold">Up Next</h1>
    <SimpleButton onclick={() => push("/settings")}>⚙ Settings</SimpleButton>
  </header>

  {#if loading}
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
            <span class="flex flex-col min-w-0">
              <span class="text-sm font-semibold truncate">{row.animeTitle}</span>
              <span class="text-xs text-secondary truncate">{row.episodeInfo}</span>
            </span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>
