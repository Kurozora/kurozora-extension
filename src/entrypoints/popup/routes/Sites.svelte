<script lang="ts">
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { browser } from "wxt/browser";
  import SimpleButton from "@/lib/components/SimpleButton.svelte";

  /** A listed site with its current tracking state. */
  interface SiteRow {
    /** The registrable domain. */
    domain: string;
    /** Whether tracking is disabled on the domain. */
    blocked: boolean;
  }

  /** The listed sites, sorted by domain. */
  let sites = $state<SiteRow[]>([]);
  /** Whether the initial storage read is still pending. */
  let loading = $state(true);

  onMount(() => {
    loadSites().catch(() => (loading = false));
  });

  /** Reads the visited and blocked domains into the list. */
  async function loadSites(): Promise<void> {
    const stored = await browser.storage.local.get(["visitedDomains", "blockedDomains"]);
    const visited = Array.isArray(stored.visitedDomains) ? stored.visitedDomains : [];
    const blocked = Array.isArray(stored.blockedDomains) ? stored.blockedDomains : [];
    const domains = [...new Set<string>([...visited, ...blocked])].sort();

    sites = domains.map((domain) => ({ domain, blocked: blocked.includes(domain) }));
    loading = false;
  }

  /** Persists a site's tracking state to the blocked-domains list. */
  async function toggleSite(row: SiteRow, tracked: boolean): Promise<void> {
    row.blocked = !tracked;

    const blocked = sites.filter((site) => site.blocked).map((site) => site.domain);

    await browser.storage.local.set({ blockedDomains: blocked });
  }
</script>

<div class="flex flex-col">
  <header
    class="flex items-center justify-between px-4 py-3 border-b border-primary"
  >
    <h1 class="text-lg font-bold">Sites</h1>
    <SimpleButton onclick={() => push("/")}>← Up Next</SimpleButton>
  </header>

  {#if loading}
    <p class="px-4 py-4 text-sm text-secondary">Loading…</p>
  {:else if sites.length === 0}
    <p class="px-4 py-4 text-sm text-secondary">
      No sites yet. They appear here once you watch something.
    </p>
  {:else}
    <p class="px-4 pt-3 text-xs text-secondary">
      Sites you've watched on. Turn one off to stop tracking there.
    </p>
    <ul class="flex flex-col">
      {#each sites as row (row.domain)}
        <li class="border-b border-primary last:border-0">
          <label
            class="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            for={"site-" + row.domain}
          >
            <span class="truncate">{row.domain}</span>
            <input
              id={"site-" + row.domain}
              type="checkbox"
              class="h-4 w-4 accent-orange-500"
              checked={!row.blocked}
              onchange={(event) =>
                toggleSite(row, (event.currentTarget as HTMLInputElement).checked)}
            />
          </label>
        </li>
      {/each}
    </ul>
  {/if}
</div>
