<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    /** Contents rendered inside the button. */
    children: Snippet;
    /** Click handler invoked when the button is pressed. */
    onclick: (event: MouseEvent) => void;
    /** Whether the button is non-interactive. */
    disabled?: boolean;
  }

  let { children, onclick, disabled = false }: Props = $props();
</script>

<button
  class="inline-flex items-center justify-center text-xs text-tint tracking-widest transition ease-in-out duration-150 focus:outline-none hover:text-orange-400 hover:underline disabled:text-gray-400 disabled:cursor-default"
  type="button"
  {disabled}
  {onclick}
>
  {@render children()}
</button>
