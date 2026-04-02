<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    /** Contents rendered inside the button. */
    children: Snippet;
    /** Visual style: tinted primary or muted secondary. */
    variant?: "primary" | "secondary";
    /** Native button type. */
    type?: "submit" | "button";
    /** Whether the button is non-interactive. */
    disabled?: boolean;
    /** Whether to show a spinner and block interaction while working. */
    loading?: boolean;
    /** Click handler invoked when the button is pressed. */
    onclick?: (event: MouseEvent) => void;
  }

  let {
    children,
    variant = "primary",
    type = "submit",
    disabled = false,
    loading = false,
    onclick,
  }: Props = $props();

  const variantClasses = $derived(
    variant === "secondary"
      ? "bg-secondary text-primary hover:bg-tertiary focus:ring-orange-500"
      : "bg-tint text-white hover:bg-orange-600 active:bg-orange-700 focus:ring-orange-500",
  );
</script>

<button
  class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-transparent text-xs font-semibold uppercase tracking-widest transition ease-in-out duration-150 focus:outline-none focus:ring-2 disabled:opacity-25 disabled:cursor-default {variantClasses}"
  {type}
  disabled={disabled || loading}
  {onclick}
>
  {#if loading}
    <span
      class="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"
      aria-hidden="true"
    ></span>
  {/if}
  {@render children()}
</button>
