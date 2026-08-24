<script lang="ts">
  interface Props {
    /** The title of the media the displayed image belongs to. */
    title: string;
    /** The page the media links to. */
    url: string;
  }

  let { title, url }: Props = $props();
</script>

<a class="info" href={url}>{title}</a>

<style>
  .info {
    /* Bounded only by the stack's width, wrapping when needed. */
    width: fit-content;
    max-width: 100%;
    padding: 0.35rem 0.9rem;
    border: 1px solid rgb(255 255 255 / 0.2);
    border-radius: 9999px;
    background-color: rgb(0 0 0 / 0.45);
    backdrop-filter: blur(16px);
    color: #ffffff;
    font-size: 0.8125rem;
    font-weight: 500;
    line-height: 1.35;
    overflow-wrap: anywhere;
    transition:
      background-color 0.15s ease-in-out,
      border-color 0.15s ease-in-out;
  }

  .info:hover,
  .info:focus-visible {
    border-color: var(--tint-color);
    background-color: rgb(0 0 0 / 0.65);
  }
</style>
