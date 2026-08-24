<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    /** The name of the group. */
    title: string;
    /** The rows the group holds. */
    children: Snippet;
  }

  let { title, children }: Props = $props();
</script>

<section class="flex flex-col gap-2.5 px-4 py-3 border-b border-primary">
  <h2 class="text-[0.6875rem] font-semibold uppercase tracking-wider text-secondary">{title}</h2>

  {@render children()}
</section>
