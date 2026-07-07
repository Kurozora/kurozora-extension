<script lang="ts">
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { browser } from "wxt/browser";
  import Button from "@/lib/components/Button.svelte";
  import SimpleButton from "@/lib/components/SimpleButton.svelte";
  import { KurozoraAPI } from "kurozorakit";
  import { kit } from "../kit";

  /** The lowest selectable watched threshold. */
  const MIN_THRESHOLD = 80;
  /** The highest selectable watched threshold. */
  const MAX_THRESHOLD = 100;
  /** The watched threshold shown until the settings load. */
  const DEFAULT_THRESHOLD = 90;

  /** The large presence image options. */
  const PRESENCE_IMAGES = [
    { value: 0, label: "Anime poster" },
    { value: 1, label: "Episode banner" },
    { value: 2, label: "Service Logo" },
    { value: 3, label: "Kurozora logo" },
  ];
  /** The activity name options. */
  const ACTIVITY_NAMES = [
    { value: 0, label: "Anime title" },
    { value: 1, label: "Website" },
    { value: 2, label: "Media kind" },
    { value: 3, label: "Kurozora" },
  ];

  /** The selected API environment key. */
  let environment = $state<keyof typeof KurozoraAPI>("v1");
  /** The watched threshold percent. */
  let threshold = $state(DEFAULT_THRESHOLD);
  /** Whether Discord Rich Presence is enabled. */
  let discordEnabled = $state(true);
  /** The selected large presence image. */
  let presenceImage = $state(0);
  /** The selected activity name. */
  let activityName = $state(0);
  /** Whether tracking notifications are shown. */
  let trackingNotifications = $state(false);
  /** How a stored resume position is applied on a new session. */
  let resumeMode = $state<"ask" | "auto">("ask");
  /** Whether a sign-out request is in flight. */
  let signingOut = $state(false);

  onMount(() => {
    loadEnvironment();
    loadNotifications();
    loadSettings();
  });

  /** Restores the tracking-notification preference into the control. */
  async function loadNotifications(): Promise<void> {
    const stored = await browser.storage.local.get(["trackingNotifications", "resumeMode"]);
    trackingNotifications = stored.trackingNotifications === true;
    resumeMode = stored.resumeMode === "auto" ? "auto" : "ask";
  }

  /** Persists how a stored resume position is applied. */
  async function saveResumeMode(): Promise<void> {
    await browser.storage.local.set({ resumeMode });
  }

  /** Persists whether tracking notifications are shown. */
  async function saveNotifications(): Promise<void> {
    await browser.storage.local.set({ trackingNotifications });
  }

  /** Restores the persisted environment choice into the selector. */
  async function loadEnvironment(): Promise<void> {
    const stored = await browser.storage.local.get("apiEnvironment");
    environment = (stored.apiEnvironment as keyof typeof KurozoraAPI) ?? "v1";
  }

  /** Persists the environment choice and points the popup kit at it. */
  async function handleEnvironmentChange(): Promise<void> {
    await browser.storage.local.set({ apiEnvironment: environment });
    kit.apiEndpoint = KurozoraAPI[environment] ?? KurozoraAPI.v1;
  }

  /** Reads the server-owned settings into the controls. */
  async function loadSettings(): Promise<void> {
    try {
      const body = await kit.me.settings();
      const resource = Array.isArray(body.data) ? body.data[0] : body.data;
      const attributes = resource?.attributes;

      if (!attributes) return;

      if (typeof attributes.scrobbleThreshold === "number") {
        threshold = attributes.scrobbleThreshold;
      }
      if (typeof attributes.discordRichPresenceEnabled === "boolean") {
        discordEnabled = attributes.discordRichPresenceEnabled;
      }
      if (typeof attributes.discordPresenceImage === "number") {
        presenceImage = attributes.discordPresenceImage;
      }
      if (typeof attributes.discordActivityName === "number") {
        activityName = attributes.discordActivityName;
      }
    } catch {
    }
  }

  /** Reflects the slider's live value without persisting it. */
  function previewThreshold(event: Event): void {
    threshold = Number((event.target as HTMLInputElement).value);
  }

  /** Persists the watched threshold to the user's server-owned settings. */
  async function saveThreshold(): Promise<void> {
    await kit.me.updateSettings({ scrobbleThreshold: threshold });
  }

  /** Persists whether Discord Rich Presence is enabled. */
  async function saveDiscordEnabled(): Promise<void> {
    await kit.me.updateSettings({ discordRichPresenceEnabled: discordEnabled });
  }

  /** Persists the chosen large presence image. */
  async function savePresenceImage(): Promise<void> {
    await kit.me.updateSettings({ discordPresenceImage: presenceImage });
  }

  /** Persists the chosen activity name. */
  async function saveActivityName(): Promise<void> {
    await kit.me.updateSettings({ discordActivityName: activityName });
  }

  /** Clears the stored key and returns to the sign-in screen. */
  async function handleSignOut(): Promise<void> {
    if (signingOut) return;

    signingOut = true;

    try {
      await kit.services.clearAuthenticationKey();
      push("/signin");
    } finally {
      signingOut = false;
    }
  }
</script>

<div class="flex flex-col">
  <header
    class="flex items-center justify-between px-4 py-3 border-b border-primary"
  >
    <h1 class="text-lg font-bold">Settings</h1>
    <SimpleButton onclick={() => push("/")}>← Up Next</SimpleButton>
  </header>

  <section class="px-4 py-3 border-b border-primary">
    <label
      class="flex items-center justify-between gap-3 text-sm"
      for="apiEnvironment"
    >
      <span>Environment</span>
      <select
        id="apiEnvironment"
        class="rounded-md px-2 py-1 text-xs shadow-sm bg-secondary text-primary border border-primary transition ease-in-out duration-150 focus:border-tint focus:ring-2 focus:ring-orange-500 focus:outline-none"
        bind:value={environment}
        onchange={handleEnvironmentChange}
      >
        <option value="v1">Production</option>
        <option value="local">Local (kurozora.test)</option>
        <option value="ngrok">ngrok</option>
      </select>
    </label>
  </section>

  <section class="px-4 py-3 border-b border-primary">
    <label
      class="flex items-center justify-between gap-3 text-sm"
      for="scrobbleThreshold"
    >
      <span>Mark watched at</span>
      <span class="flex items-center gap-2">
        <input
          id="scrobbleThreshold"
          class="w-32"
          type="range"
          min={MIN_THRESHOLD}
          max={MAX_THRESHOLD}
          step="1"
          value={threshold}
          oninput={previewThreshold}
          onchange={saveThreshold}
        />
        <span class="w-10 text-right text-tint tabular-nums">{threshold}%</span>
      </span>
    </label>
  </section>

  <section class="px-4 py-3 border-b border-primary">
    <label
      class="flex items-center justify-between gap-3 text-sm"
      for="resumeMode"
    >
      <span>Resume playback</span>
      <select
        id="resumeMode"
        class="rounded-md px-2 py-1 text-xs shadow-sm bg-secondary text-primary border border-primary transition ease-in-out duration-150 focus:border-tint focus:ring-2 focus:ring-orange-500 focus:outline-none"
        bind:value={resumeMode}
        onchange={saveResumeMode}
      >
        <option value="ask">Ask every time</option>
        <option value="auto">Automatic</option>
      </select>
    </label>
  </section>

  <section class="px-4 py-3 border-b border-primary">
    <label
      class="flex items-center justify-between gap-3 text-sm"
      for="trackingNotifications"
    >
      <span>Tracking notifications</span>
      <input
        id="trackingNotifications"
        type="checkbox"
        class="h-4 w-4 accent-orange-500"
        bind:checked={trackingNotifications}
        onchange={saveNotifications}
      />
    </label>
  </section>

  <section class="px-4 py-3 border-b border-primary">
    <button
      class="flex w-full items-center justify-between gap-3 text-sm transition ease-in-out duration-150 hover:text-tint"
      onclick={() => push("/sites")}
    >
      <span>Sites</span>
      <span class="text-secondary">→</span>
    </button>
  </section>

  <section class="flex flex-col gap-3 px-4 py-3 border-b border-primary">
    <label class="flex items-center justify-between gap-3 text-sm" for="discordEnabled">
      <span>Discord Rich Presence</span>
      <input
        id="discordEnabled"
        type="checkbox"
        class="h-4 w-4 accent-orange-500"
        bind:checked={discordEnabled}
        onchange={saveDiscordEnabled}
      />
    </label>

    <label class="flex items-center justify-between gap-3 text-sm" for="presenceImage">
      <span>Presence image</span>
      <select
        id="presenceImage"
        class="rounded-md px-2 py-1 text-xs shadow-sm bg-secondary text-primary border border-primary transition ease-in-out duration-150 focus:border-tint focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-50"
        disabled={!discordEnabled}
        bind:value={presenceImage}
        onchange={savePresenceImage}
      >
        {#each PRESENCE_IMAGES as image (image.value)}
          <option value={image.value}>{image.label}</option>
        {/each}
      </select>
    </label>

    <label class="flex items-center justify-between gap-3 text-sm" for="activityName">
      <span>Activity name</span>
      <select
        id="activityName"
        class="rounded-md px-2 py-1 text-xs shadow-sm bg-secondary text-primary border border-primary transition ease-in-out duration-150 focus:border-tint focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-50"
        disabled={!discordEnabled}
        bind:value={activityName}
        onchange={saveActivityName}
      >
        {#each ACTIVITY_NAMES as name (name.value)}
          <option value={name.value}>{name.label}</option>
        {/each}
      </select>
    </label>
  </section>

  <footer class="px-4 py-3">
    <Button
      type="button"
      variant="secondary"
      loading={signingOut}
      disabled={signingOut}
      onclick={handleSignOut}
    >
      Sign out
    </Button>
  </footer>
</div>
