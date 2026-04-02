<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    /** Destination URL of the link. */
    href: string;
    /** Contents rendered inside the link. */
    children: Snippet;
    /** Browsing context for the link, e.g. "_blank". */
    target?: "_self" | "_blank";
  }

  let { href, children, target = "_self" }: Props = $props();
</script>

<a
  class="inline-flex items-center text-tint hover:text-orange-400 font-medium underline transition ease-in-out duration-150"
  {href}
  {target}
  rel={target === "_blank" ? "noopener noreferrer" : undefined}
>
  {@render children()}
</a>
