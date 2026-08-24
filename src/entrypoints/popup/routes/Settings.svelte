<script lang="ts">
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { browser } from "wxt/browser";
  import Button from "@/lib/components/Button.svelte";
  import SettingsGroup from "@/lib/components/SettingsGroup.svelte";
  import SettingsRow from "@/lib/components/SettingsRow.svelte";
  import ShortcutField from "@/lib/components/ShortcutField.svelte";
  import SimpleButton from "@/lib/components/SimpleButton.svelte";
  import { CHECKBOX_CLASS, SELECT_CLASS } from "@/lib/components/controls";
  import { KurozoraAPI } from "kurozorakit";
  import { loadNewTabEnabled, saveNewTabEnabled } from "@/lib/new-tab";
  import { loadBlurShortcut, saveBlurShortcut, type Shortcut } from "@/lib/date-widget/shortcut";
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
  /** The selectable playback speeds. */
  const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

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
  /** Whether the tab title is rewritten with live playback. */
  let dynamicTitle = $state(true);
  /** Whether filler badges are injected onto site episode grids. */
  let fillerBadges = $state(true);
  /** Whether badges distinguish fillers without relying on color. */
  let accessibleBadges = $state(false);
  /** Whether unwatched episodes ahead of the current one are blurred. */
  let antiSpoiler = $state(false);
  /** The locked playback speed, 0 when the lock is off. */
  let playbackSpeed = $state(0);
  /** Whether the on-player control strip is injected. */
  let playerControls = $state(true);
  /** Whether a sign-out request is in flight. */
  let signingOut = $state(false);
  /** Whether a session is stored. */
  let signedIn = $state(kit.authenticationKey !== "");
  /** Whether the new tab shows the Date widget. */
  let newTabEnabled = $state(false);
  /** The shortcut that blurs the new tab's image. */
  let blurShortcut = $state<Shortcut | null>(null);

  onMount(() => {
    loadEnvironment();
    loadNotifications();
    loadNewTab();

    if (signedIn) {
      loadSettings();
    }
  });

  /** Restores the new tab preferences. */
  async function loadNewTab(): Promise<void> {
    newTabEnabled = await loadNewTabEnabled();
    blurShortcut = await loadBlurShortcut();
  }

  /** Persists whether the new tab shows the Date widget. */
  async function saveNewTab(): Promise<void> {
    await saveNewTabEnabled(newTabEnabled);
  }

  /**
   * Persists the shortcut that blurs the new tab's image.
   *
   * @param shortcut - The shortcut to assign, or `null` to clear it.
   */
  async function saveShortcut(shortcut: Shortcut | null): Promise<void> {
    blurShortcut = shortcut;
    await saveBlurShortcut(shortcut);
  }

  /** Restores the tracking-notification preference into the control. */
  async function loadNotifications(): Promise<void> {
    const stored = await browser.storage.local.get(["trackingNotifications", "resumeMode", "dynamicTitle", "fillerBadges", "accessibleBadges", "antiSpoiler", "playbackSpeed", "playerControls"]);
    trackingNotifications = stored.trackingNotifications === true;
    resumeMode = stored.resumeMode === "auto" ? "auto" : "ask";
    dynamicTitle = stored.dynamicTitle !== false;
    fillerBadges = stored.fillerBadges !== false;
    accessibleBadges = stored.accessibleBadges === true;
    antiSpoiler = stored.antiSpoiler === true;
    playbackSpeed = typeof stored.playbackSpeed === "number" ? stored.playbackSpeed : 0;
    playerControls = stored.playerControls !== false;
  }

  /** Persists whether the on-player control strip is injected. */
  async function savePlayerControls(): Promise<void> {
    await browser.storage.local.set({ playerControls });
  }

  /** Persists whether future unwatched episodes are blurred. */
  async function saveAntiSpoiler(): Promise<void> {
    await browser.storage.local.set({ antiSpoiler });
  }

  /** Persists the locked playback speed, clearing the lock at 0. */
  async function savePlaybackSpeed(): Promise<void> {
    if (playbackSpeed === 0) {
      await browser.storage.local.remove("playbackSpeed");
    } else {
      await browser.storage.local.set({ playbackSpeed });
    }
  }

  /** Persists how a stored resume position is applied. */
  async function saveResumeMode(): Promise<void> {
    await browser.storage.local.set({ resumeMode });
  }

  /** Persists whether the tab title is rewritten with live playback. */
  async function saveDynamicTitle(): Promise<void> {
    await browser.storage.local.set({ dynamicTitle });
  }

  /** Persists whether filler badges are injected onto site episode grids. */
  async function saveFillerBadges(): Promise<void> {
    await browser.storage.local.set({ fillerBadges });
  }

  /** Persists whether badges distinguish fillers without relying on color. */
  async function saveAccessibleBadges(): Promise<void> {
    await browser.storage.local.set({ accessibleBadges });
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

  /** Clears the stored key and returns to Up Next. */
  async function handleSignOut(): Promise<void> {
    if (signingOut) return;

    signingOut = true;

    try {
      await kit.services.clearAuthenticationKey();
      signedIn = false;
      push("/");
    } finally {
      signingOut = false;
    }
  }
</script>

<div class="flex flex-col">
  <header class="flex items-center justify-between px-4 py-3 border-b border-primary">
    <h1 class="text-lg font-bold">Settings</h1>
    <SimpleButton onclick={() => push("/")}>← Up Next</SimpleButton>
  </header>

  <SettingsGroup title="New tab">
    <SettingsRow label="Kurozora new tab" for="newTabEnabled">
      <input
        id="newTabEnabled"
        type="checkbox"
        class={CHECKBOX_CLASS}
        bind:checked={newTabEnabled}
        onchange={saveNewTab}
      />
    </SettingsRow>

    <SettingsRow
      label="Blur image"
      hint="Add a modifier to use it while typing."
      for="blurShortcut"
      nested
      disabled={!newTabEnabled}
    >
      <ShortcutField
        id="blurShortcut"
        shortcut={blurShortcut}
        disabled={!newTabEnabled}
        onassign={saveShortcut}
      />
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup title="Tracking">
    <SettingsRow label="Mark watched at" for="scrobbleThreshold" disabled={!signedIn}>
      <span class="flex items-center gap-2">
        <input
          id="scrobbleThreshold"
          class="w-32"
          type="range"
          min={MIN_THRESHOLD}
          max={MAX_THRESHOLD}
          step="1"
          value={threshold}
          disabled={!signedIn}
          oninput={previewThreshold}
          onchange={saveThreshold}
        />
        <span class="w-10 text-right text-tint tabular-nums">{threshold}%</span>
      </span>
    </SettingsRow>

    <SettingsRow label="Resume playback" for="resumeMode">
      <select id="resumeMode" class={SELECT_CLASS} bind:value={resumeMode} onchange={saveResumeMode}>
        <option value="ask">Ask every time</option>
        <option value="auto">Automatic</option>
      </select>
    </SettingsRow>

    <SettingsRow label="Tracking notifications" for="trackingNotifications">
      <input
        id="trackingNotifications"
        type="checkbox"
        class={CHECKBOX_CLASS}
        bind:checked={trackingNotifications}
        onchange={saveNotifications}
      />
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup title="Streaming sites">
    <SettingsRow label="Player controls" for="playerControls">
      <input
        id="playerControls"
        type="checkbox"
        class={CHECKBOX_CLASS}
        bind:checked={playerControls}
        onchange={savePlayerControls}
      />
    </SettingsRow>

    <SettingsRow label="Playback speed lock" for="playbackSpeed" nested disabled={!playerControls}>
      <select
        id="playbackSpeed"
        class={SELECT_CLASS}
        disabled={!playerControls}
        bind:value={playbackSpeed}
        onchange={savePlaybackSpeed}
      >
        <option value={0}>Off</option>
        {#each PLAYBACK_SPEEDS as speed (speed)}
          <option value={speed}>{speed}×</option>
        {/each}
      </select>
    </SettingsRow>

    <SettingsRow label="Dynamic tab title" for="dynamicTitle">
      <input
        id="dynamicTitle"
        type="checkbox"
        class={CHECKBOX_CLASS}
        bind:checked={dynamicTitle}
        onchange={saveDynamicTitle}
      />
    </SettingsRow>

    <SettingsRow label="Filler badges" for="fillerBadges">
      <input
        id="fillerBadges"
        type="checkbox"
        class={CHECKBOX_CLASS}
        bind:checked={fillerBadges}
        onchange={saveFillerBadges}
      />
    </SettingsRow>

    <SettingsRow
      label="Label badges"
      hint="Reads without relying on color."
      for="accessibleBadges"
      nested
      disabled={!fillerBadges}
    >
      <input
        id="accessibleBadges"
        type="checkbox"
        class={CHECKBOX_CLASS}
        disabled={!fillerBadges}
        bind:checked={accessibleBadges}
        onchange={saveAccessibleBadges}
      />
    </SettingsRow>

    <SettingsRow label="Anti-spoiler blur" for="antiSpoiler">
      <input
        id="antiSpoiler"
        type="checkbox"
        class={CHECKBOX_CLASS}
        bind:checked={antiSpoiler}
        onchange={saveAntiSpoiler}
      />
    </SettingsRow>

    <button
      class="flex w-full items-center justify-between gap-3 text-sm transition ease-in-out duration-150 hover:text-tint"
      onclick={() => push("/sites")}
    >
      <span>Supported sites</span>
      <span class="text-secondary">→</span>
    </button>
  </SettingsGroup>

  <SettingsGroup title="Discord">
    <SettingsRow label="Rich Presence" for="discordEnabled" disabled={!signedIn}>
      <input
        id="discordEnabled"
        type="checkbox"
        class={CHECKBOX_CLASS}
        disabled={!signedIn}
        bind:checked={discordEnabled}
        onchange={saveDiscordEnabled}
      />
    </SettingsRow>

    <SettingsRow
      label="Presence image"
      for="presenceImage"
      nested
      disabled={!signedIn || !discordEnabled}
    >
      <select
        id="presenceImage"
        class={SELECT_CLASS}
        disabled={!signedIn || !discordEnabled}
        bind:value={presenceImage}
        onchange={savePresenceImage}
      >
        {#each PRESENCE_IMAGES as image (image.value)}
          <option value={image.value}>{image.label}</option>
        {/each}
      </select>
    </SettingsRow>

    <SettingsRow
      label="Activity name"
      for="activityName"
      nested
      disabled={!signedIn || !discordEnabled}
    >
      <select
        id="activityName"
        class={SELECT_CLASS}
        disabled={!signedIn || !discordEnabled}
        bind:value={activityName}
        onchange={saveActivityName}
      >
        {#each ACTIVITY_NAMES as name (name.value)}
          <option value={name.value}>{name.label}</option>
        {/each}
      </select>
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup title="Advanced">
    <SettingsRow label="Environment" for="apiEnvironment">
      <select
        id="apiEnvironment"
        class={SELECT_CLASS}
        bind:value={environment}
        onchange={handleEnvironmentChange}
      >
        <option value="v1">Production</option>
        <option value="local">Local (kurozora.test)</option>
        <option value="ngrok">ngrok</option>
      </select>
    </SettingsRow>
  </SettingsGroup>

  <footer class="px-4 py-3">
    {#if signedIn}
      <Button
        type="button"
        variant="secondary"
        loading={signingOut}
        disabled={signingOut}
        onclick={handleSignOut}
      >
        Sign out
      </Button>
    {:else}
      <Button type="button" onclick={() => push("/signin")}>Sign in</Button>
    {/if}
  </footer>
</div>
