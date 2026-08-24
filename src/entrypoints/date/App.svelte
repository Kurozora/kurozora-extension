<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "wxt/browser";
  import BannerView from "./BannerView.svelte";
  import BlurToggle from "./BlurToggle.svelte";
  import DateView from "./DateView.svelte";
  import InfoOverlay from "./InfoOverlay.svelte";
  import LibraryActions from "./LibraryActions.svelte";
  import SearchField from "./SearchField.svelte";
  import SettingsPanel from "./SettingsPanel.svelte";
  import type { LibraryStatusValue } from "kurozorakit";
  import { kit, preloaded } from "./preload";
  import {
    DEFAULT_CONFIGURATION,
    saveConfiguration,
    sourceKey,
    type DateConfiguration,
  } from "@/lib/date-widget/configuration";
  import { resolveImage } from "@/lib/date-widget/image-cache";
  import {
    loadLibraryState,
    removeFromLibrary,
    REMOVE_STATUS,
    setLibraryStatus,
    toggleFavorite,
    toggleReminder,
    UNTRACKED,
    type LibraryState,
  } from "@/lib/date-widget/library";
  import {
    BLUR_SHORTCUT_KEY,
    hasModifier,
    loadBlurShortcut,
    matches,
    type Shortcut,
  } from "@/lib/date-widget/shortcut";
  import {
    isRemindable,
    PLACEHOLDER_BANNER,
    type Banner,
    type LibraryTarget,
  } from "@/lib/date-widget/media";
  import {
    entryFor,
    nextTransition,
    resolveTimeline,
    type Timeline,
  } from "@/lib/date-widget/timeline";

  /** The elements a shortcut without a modifier yields to. */
  const EDITABLE_TAGS = ["INPUT", "SELECT", "TEXTAREA"];


  /** Whether the widget shows. */
  let isEnabled = $state(false);

  /** Whether a session was restored onto the kit. */
  let isSignedIn = $state(false);

  /** The shortcut that toggles the blur, when one is assigned. */
  let blurShortcut = $state<Shortcut | null>(null);

  /** The configuration the new tab renders with. */
  let configuration = $state<DateConfiguration>({ ...DEFAULT_CONFIGURATION });

  /** The banner currently displayed. */
  let banner = $state<Banner>({ ...PLACEHOLDER_BANNER });

  /** The image currently displayed, empty until one resolves. */
  let imageSource = $state("");

  /** The date currently displayed. */
  let today = $state(new Date());

  /** The library state of the displayed media, `null` until it resolves. */
  let libraryState = $state<LibraryState | null>(null);

  /** Whether a library request is in flight. */
  let isLibraryBusy = $state(false);

  /** The reason the last library request failed. */
  let libraryError = $state<string | null>(null);

  /** The images the new tab rotates through. */
  let timeline: Timeline | null = null;

  /** The object URL owned by this page, when the image came from the cache. */
  let ownedObjectURL: string | null = null;

  /** The timer advancing to the next entry or day. */
  let tickTimer: ReturnType<typeof setTimeout> | undefined;

  /** The number of refreshes started, discarding results of superseded ones. */
  let generation = 0;

  /** The library entry the displayed state belongs to. */
  let libraryKey = "";

  /** Releases the object URL owned by this page. */
  function releaseImage(): void {
    if (ownedObjectURL !== null) {
      URL.revokeObjectURL(ownedObjectURL);
      ownedObjectURL = null;
    }
  }

  /**
   * Displays the banner's image, falling back to a cached or bundled image.
   *
   * @param source - The image URL to display, when one is known.
   * @param run - The refresh that requested the image.
   */
  async function showImage(source: string | null, run: number): Promise<void> {
    const resolved = await resolveImage(source);

    if (run !== generation) {
      if (resolved.isObjectURL) {
        URL.revokeObjectURL(resolved.src);
      }
      return;
    }

    releaseImage();
    imageSource = resolved.src;
    ownedObjectURL = resolved.isObjectURL ? resolved.src : null;
  }

  /**
   * The key identifying a library entry.
   *
   * @param target - The library entry, when the media has one.
   */
  function keyOf(target: LibraryTarget | null): string {
    return target === null ? "" : target.kind + "/" + target.id;
  }

  /** Reads how the signed-in user relates to the displayed media. */
  async function refreshLibraryState(): Promise<void> {
    const target = banner.media?.library ?? null;
    const key = keyOf(target);

    if (key === libraryKey && libraryState !== null) {
      return;
    }

    libraryKey = key;
    libraryState = null;
    libraryError = null;

    if (!isSignedIn || target === null) {
      return;
    }

    try {
      libraryState = await loadLibraryState(kit, target);
    } catch (error) {
      libraryError = (error as Error)?.message ?? "The library is unavailable.";
    }
  }

  /**
   * Performs a library request against the displayed media.
   *
   * @param request - The request to perform.
   */
  async function runLibraryRequest(
    request: (target: LibraryTarget, state: LibraryState) => Promise<LibraryState>,
  ): Promise<void> {
    const target = banner.media?.library ?? null;

    if (target === null || isLibraryBusy) {
      return;
    }

    const key = libraryKey;

    isLibraryBusy = true;
    libraryError = null;

    try {
      const state = await request(target, libraryState ?? { ...UNTRACKED });

      if (key === libraryKey) {
        libraryState = state;
      }
    } catch (error) {
      if (key === libraryKey) {
        libraryError = (error as Error)?.message ?? "The request could not be completed.";
      }
    } finally {
      isLibraryBusy = false;
    }
  }

  /**
   * Tracks the displayed media under a status, or stops tracking it.
   *
   * @param status - The status to apply, or `REMOVE_STATUS`.
   */
  function handleStatusChange(status: number): void {
    void runLibraryRequest((target, state) =>
      status === REMOVE_STATUS
        ? removeFromLibrary(kit, target)
        : setLibraryStatus(kit, target, status as LibraryStatusValue, state),
    );
  }

  /** The start of the next local day. */
  function startOfNextDay(now: number): number {
    const date = new Date(now);
    date.setHours(24, 0, 0, 0);
    return date.getTime();
  }

  /** Schedules the next entry change or day change. */
  function scheduleTick(): void {
    clearTimeout(tickTimer);

    const now = Date.now();
    const target = Math.min(
      timeline === null ? now + 60_000 : nextTransition(timeline, now),
      startOfNextDay(now),
    );

    tickTimer = setTimeout(() => void refresh(), Math.max(1_000, target - now));
  }

  /**
   * Reloads the timeline when it has expired and renders the current entry.
   *
   * @param reload - Whether to discard the loaded timeline first.
   */
  async function refresh(reload = false): Promise<void> {
    if (!isEnabled) {
      return;
    }

    const run = ++generation;

    if (reload) {
      timeline = null;
    }

    const resolved = await resolveTimeline(kit, configuration, timeline);

    if (run !== generation) {
      return;
    }

    timeline = resolved;

    const entry = entryFor(resolved, Date.now());

    if (imageSource === "" || entry.banner.url !== banner.url) {
      await showImage(entry.banner.url, run);
    }

    if (run !== generation) {
      return;
    }

    banner = entry.banner;
    today = new Date();

    await refreshLibraryState();

    scheduleTick();
  }

  /**
   * Persists the configuration and reloads when the image source changed.
   *
   * @param next - The configuration to apply.
   */
  async function handleConfigurationChange(next: DateConfiguration): Promise<void> {
    const reload = sourceKey(next) !== sourceKey(configuration);

    configuration = next;

    await saveConfiguration(next);

    if (reload) {
      await refresh(true);
    }
  }

  /** Blurs the image, or reveals it. */
  async function toggleBlur(): Promise<void> {
    await handleConfigurationChange({ ...configuration, isBlurred: !configuration.isBlurred });
  }

  /** Toggles the blur when its shortcut is pressed. */
  function handleKeydown(event: KeyboardEvent): void {
    const shortcut = blurShortcut;

    if (shortcut === null || !matches(shortcut, event)) {
      return;
    }

    const target = event.target as HTMLElement | null;
    const editing = target?.isContentEditable === true || EDITABLE_TAGS.includes(target?.tagName ?? "");

    if (editing && !hasModifier(shortcut)) {
      return;
    }

    event.preventDefault();

    void toggleBlur();
  }

  /**
   * Adopts a shortcut assigned in another page.
   *
   * @param changes - The storage changes.
   * @param area - The storage area that changed.
   */
  function handleStorageChange(changes: Record<string, unknown>, area: string): void {
    if (area === "local" && BLUR_SHORTCUT_KEY in changes) {
      void loadBlurShortcut().then((shortcut) => (blurShortcut = shortcut));
    }
  }

  /** Re-evaluates the timeline when the tab returns to the foreground. */
  function handleVisibilityChange(): void {
    if (document.visibilityState === "visible") {
      void refresh();
    }
  }

  onMount(() => {
    void (async () => {
      const stored = await preloaded;

      isEnabled = stored.enabled;
      isSignedIn = stored.isSignedIn;
      configuration = stored.configuration;
      blurShortcut = stored.blurShortcut;

      if (!stored.enabled) {
        return;
      }

      if (stored.entry !== null) {
        timeline = stored.timeline;
        banner = stored.entry.banner;
        today = new Date();

        if (stored.image !== null) {
          imageSource = stored.image.src;
          ownedObjectURL = stored.image.isObjectURL ? stored.image.src : null;
        }
      }

      await refresh();
    })();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      generation += 1;
      clearTimeout(tickTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      browser.storage.onChanged.removeListener(handleStorageChange);
      releaseImage();
    };
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<main
  class="widget"
  data-adaptive={configuration.isAdaptive}
  style={banner.backgroundColor !== null ? "background-color: " + banner.backgroundColor : undefined}
>
  {#if isEnabled}
    <BannerView
      src={imageSource}
      isDimmed={configuration.isDimmed}
      isBlurred={configuration.isBlurred}
    />

    {#if configuration.isDateShown}
      <DateView
        date={today}
        font={configuration.font}
        fontWeight={configuration.fontWeight}
        fontWidth={configuration.fontWidth}
      />
    {/if}
  {/if}

  <SearchField />

  {#if isEnabled && banner.media?.title != null && banner.media.url !== null}
    <div class="info">
      <InfoOverlay title={banner.media.title} url={banner.media.url} />

      {#if isSignedIn && banner.media.library !== null}
        <LibraryActions
          kind={banner.media.library.kind}
          state={libraryState}
          isRemindable={isRemindable(banner.media.library)}
          isBusy={isLibraryBusy}
          error={libraryError}
          onstatus={handleStatusChange}
          onfavorite={() => void runLibraryRequest((target, state) => toggleFavorite(kit, target, state))}
          onremind={() => void runLibraryRequest((target, state) => toggleReminder(kit, target, state))}
        />
      {/if}
    </div>
  {/if}

  {#if isEnabled}
    <BlurToggle
      isBlurred={configuration.isBlurred}
      shortcut={blurShortcut}
      ontoggle={() => void toggleBlur()}
    />
  {/if}

  <SettingsPanel {configuration} onchange={handleConfigurationChange} />
</main>

<!-- Renders the page's luminance as the alpha of the platform's text color. -->
<svg class="filters" aria-hidden="true" focusable="false">
  <filter id="kurozora-accented" color-interpolation-filters="sRGB">
    <feColorMatrix type="luminanceToAlpha" result="luminance" />
    <feFlood flood-color="CanvasText" result="tint" />
    <feComposite in="tint" in2="luminance" operator="in" />
  </filter>
</svg>

<style>
  .widget {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background-color: var(--bg-primary-color);
  }

  /* The entry's title and library controls, stacked in the lower left corner. */
  .info {
    position: absolute;
    bottom: 1.5rem;
    left: 1.5rem;
    right: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .filters {
    position: absolute;
    width: 0;
    height: 0;
  }

  /* Adaptive pages take the platform's tint; the others keep their full color. */
  @media (forced-colors: active), (prefers-contrast: more) {
    .widget[data-adaptive="true"] {
      background-color: Canvas;
      filter: url("#kurozora-accented");
    }

    .widget[data-adaptive="false"] {
      forced-color-adjust: none;
    }
  }
</style>
