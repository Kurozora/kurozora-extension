<script lang="ts">
  import {
    FONT_STYLES,
    FONT_STYLE_LABELS,
    FONT_WEIGHTS,
    FONT_WEIGHT_LABELS,
    FONT_WIDTHS,
    FONT_WIDTH_LABELS,
    MEDIA_KINDS,
    MEDIA_KIND_LABELS,
    type DateConfiguration,
  } from "@/lib/date-widget/configuration";
  import { CHECKBOX_CLASS, SELECT_CLASS } from "@/lib/components/controls";

  interface Props {
    /** The configuration the new tab renders with. */
    configuration: DateConfiguration;
    /** Invoked with the configuration to persist. */
    onchange: (configuration: DateConfiguration) => void;
  }

  let { configuration, onchange }: Props = $props();

  /** Whether the panel is open. */
  let isOpen = $state(false);

  /**
   * Emits the configuration with one option replaced.
   *
   * @param key - The option to replace.
   * @param value - The value to apply.
   */
  function update<Key extends keyof DateConfiguration>(key: Key, value: DateConfiguration[Key]): void {
    onchange({ ...configuration, [key]: value });
  }

  /** Closes the panel on Escape. */
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      isOpen = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="settings">
  <button
    class="settings-button page-button text-primary"
    type="button"
    aria-label="Edit widget"
    aria-expanded={isOpen}
    onclick={() => (isOpen = !isOpen)}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path
        d="M19.4 13.5a7.7 7.7 0 0 0 0-3l1.7-1.3-1.9-3.3-2 .8a7.7 7.7 0 0 0-2.6-1.5L14.3 3H9.7l-.3 2.2a7.7 7.7 0 0 0-2.6 1.5l-2-.8-1.9 3.3 1.7 1.3a7.7 7.7 0 0 0 0 3l-1.7 1.3 1.9 3.3 2-.8a7.7 7.7 0 0 0 2.6 1.5l.3 2.2h4.6l.3-2.2a7.7 7.7 0 0 0 2.6-1.5l2 .8 1.9-3.3-1.7-1.3Z"
      />
    </svg>
  </button>

  {#if isOpen}
    <button class="settings-scrim" type="button" aria-label="Close" onclick={() => (isOpen = false)}
    ></button>

    <div class="settings-panel bg-primary border border-primary text-primary">
      <header class="flex items-center justify-between px-4 py-3 border-b border-primary">
        <h1 class="text-lg font-bold">Date</h1>
        <p class="text-xs text-secondary">Kurozora</p>
      </header>

      <section class="flex flex-col gap-3 px-4 py-3 border-b border-primary">
        <label class="flex items-center justify-between gap-3 text-sm" for="dateWidgetKind">
          <span>Kind</span>
          <select
            id="dateWidgetKind"
            class={SELECT_CLASS}
            value={configuration.kind}
            onchange={(event) => update("kind", event.currentTarget.value as DateConfiguration["kind"])}
          >
            {#each MEDIA_KINDS as kind (kind)}
              <option value={kind}>{MEDIA_KIND_LABELS[kind]}</option>
            {/each}
          </select>
        </label>

        <label class="flex items-center justify-between gap-3 text-sm" for="dateWidgetDimmed">
          <span>Dimmed</span>
          <input
            id="dateWidgetDimmed"
            class={CHECKBOX_CLASS}
            type="checkbox"
            checked={configuration.isDimmed}
            onchange={(event) => update("isDimmed", event.currentTarget.checked)}
          />
        </label>

        <label class="flex items-center justify-between gap-3 text-sm" for="dateWidgetAdaptive">
          <span>Adaptive</span>
          <input
            id="dateWidgetAdaptive"
            class={CHECKBOX_CLASS}
            type="checkbox"
            checked={configuration.isAdaptive}
            onchange={(event) => update("isAdaptive", event.currentTarget.checked)}
          />
        </label>
      </section>

      <section class="flex flex-col gap-3 px-4 py-3">
        <label class="flex items-center justify-between gap-3 text-sm" for="dateWidgetDateShown">
          <span>Date</span>
          <input
            id="dateWidgetDateShown"
            class={CHECKBOX_CLASS}
            type="checkbox"
            checked={configuration.isDateShown}
            onchange={(event) => update("isDateShown", event.currentTarget.checked)}
          />
        </label>

        <label class="flex items-center justify-between gap-3 text-sm" for="dateWidgetFont">
          <span>Font</span>
          <select
            id="dateWidgetFont"
            class={SELECT_CLASS}
            disabled={!configuration.isDateShown}
            value={configuration.font}
            onchange={(event) => update("font", event.currentTarget.value as DateConfiguration["font"])}
          >
            {#each FONT_STYLES as font (font)}
              <option value={font}>{FONT_STYLE_LABELS[font]}</option>
            {/each}
          </select>
        </label>

        <label class="flex items-center justify-between gap-3 text-sm" for="dateWidgetFontWeight">
          <span>Font Weight</span>
          <select
            id="dateWidgetFontWeight"
            class={SELECT_CLASS}
            disabled={!configuration.isDateShown}
            value={configuration.fontWeight}
            onchange={(event) =>
              update("fontWeight", event.currentTarget.value as DateConfiguration["fontWeight"])}
          >
            {#each FONT_WEIGHTS as weight (weight)}
              <option value={weight}>{FONT_WEIGHT_LABELS[weight]}</option>
            {/each}
          </select>
        </label>

        <label class="flex items-center justify-between gap-3 text-sm" for="dateWidgetFontWidth">
          <span>Font Width</span>
          <select
            id="dateWidgetFontWidth"
            class={SELECT_CLASS}
            disabled={!configuration.isDateShown || configuration.font === "compressed"}
            value={configuration.fontWidth}
            onchange={(event) =>
              update("fontWidth", event.currentTarget.value as DateConfiguration["fontWidth"])}
          >
            {#each FONT_WIDTHS as width (width)}
              <option value={width}>{FONT_WIDTH_LABELS[width]}</option>
            {/each}
          </select>
        </label>
      </section>
    </div>
  {/if}
</div>

<style>
  .settings {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .settings-button {
    top: 1rem;
    right: 1rem;
  }

  .settings-scrim {
    position: absolute;
    inset: 0;
    cursor: default;
    pointer-events: auto;
  }

  .settings-panel {
    position: absolute;
    top: 4rem;
    right: 1rem;
    width: 20rem;
    max-height: calc(100vh - 5rem);
    overflow-y: auto;
    border-radius: 0.75rem;
    box-shadow: 0 1.5rem 3rem rgb(0 0 0 / 0.45);
    pointer-events: auto;
  }
</style>
