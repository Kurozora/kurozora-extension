<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    /** The name of the setting. */
    label: string;
    /** The control the row carries. */
    children: Snippet;
    /** The id of the control the label points at. */
    for?: string;
    /** A short line shown under the label. */
    hint?: string;
    /** Whether the row refines the setting above it. */
    nested?: boolean;
    /** Whether the setting is unavailable. */
    disabled?: boolean;
  }

  let { label, children, for: control, hint, nested = false, disabled = false }: Props = $props();
</script>

<label
  class="flex items-center justify-between gap-3 text-sm {nested ? 'ml-1 pl-3 border-l border-primary' : ''} {disabled ? 'opacity-50' : ''}"
  for={control}
>
  <span class="flex flex-col gap-0.5">
    <span>{label}</span>
    {#if hint !== undefined}
      <span class="text-xs text-secondary">{hint}</span>
    {/if}
  </span>

  {@render children()}
</label>
