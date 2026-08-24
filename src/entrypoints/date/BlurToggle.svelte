<script lang="ts">
  import { describe, type Shortcut } from "@/lib/date-widget/shortcut";

  interface Props {
    /** Whether the image is blurred. */
    isBlurred: boolean;
    /** The shortcut that toggles the blur, when one is assigned. */
    shortcut: Shortcut | null;
    /** Invoked to blur the image, or to reveal it. */
    ontoggle: () => void;
  }

  let { isBlurred, shortcut, ontoggle }: Props = $props();

  /** The action the button performs. */
  let action = $derived(isBlurred ? "Reveal image" : "Blur image");

  /** The action, followed by the shortcut that also performs it. */
  let label = $derived(shortcut === null ? action : action + " (" + describe(shortcut) + ")");
</script>

<button
  class="image-blur page-button text-primary"
  type="button"
  aria-label={label}
  aria-pressed={isBlurred}
  title={label}
  onclick={ontoggle}
>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke-linejoin="round" />
    <circle cx="12" cy="12" r="3" />
    {#if isBlurred}
      <path d="M4 20 20 4" stroke-linecap="round" />
    {/if}
  </svg>
</button>

<style>
  .image-blur {
    top: 1rem;
    right: 4.25rem;
  }

  .image-blur[aria-pressed="true"] {
    color: var(--tint-color);
    opacity: 1;
  }
</style>
