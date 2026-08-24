<script lang="ts">
  import { describe, shortcutFor, type Shortcut } from "@/lib/date-widget/shortcut";

  interface Props {
    /** The assigned shortcut, or `null` when none is assigned. */
    shortcut: Shortcut | null;
    /** The id the field is labelled by. */
    id: string;
    /** Whether the field is unavailable. */
    disabled?: boolean;
    /** Invoked with the shortcut to assign, or `null` to clear it. */
    onassign: (shortcut: Shortcut | null) => void;
  }

  let { shortcut, id, disabled = false, onassign }: Props = $props();

  /** Whether the next combination is recorded. */
  let recording = $state(false);

  /** The text the field shows. */
  let caption = $derived(
    recording ? "Press keys…" : shortcut === null ? "None" : describe(shortcut),
  );

  /**
   * Assigns the pressed combination.
   *
   * Escape keeps the current shortcut; Backspace and Delete clear it.
   *
   * @param event - The key event.
   */
  function handleKeydown(event: KeyboardEvent): void {
    if (!recording) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      recording = false;
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      recording = false;
      onassign(null);
      return;
    }

    const assigned = shortcutFor(event);

    if (assigned === null) {
      return;
    }

    recording = false;
    onassign(assigned);
  }
</script>

<svelte:window onkeydowncapture={handleKeydown} />

<button
  {id}
  class="min-w-20 rounded-md border px-2 py-1 text-xs font-medium tabular-nums shadow-sm transition ease-in-out duration-150 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 {recording
    ? 'border-tint bg-secondary text-tint'
    : 'border-primary bg-secondary text-primary'}"
  type="button"
  aria-live="polite"
  {disabled}
  onclick={() => (recording = !recording)}
  onblur={() => (recording = false)}
>
  {caption}
</button>
