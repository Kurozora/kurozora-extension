<script lang="ts">
  interface Props {
    /** Error text to display. */
    message?: string | null;
  }

  let { message = null }: Props = $props();
</script>

{#if message}
  <div
    class="rounded-md border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-300"
    role="alert"
  >
    {message}
  </div>
{/if}
