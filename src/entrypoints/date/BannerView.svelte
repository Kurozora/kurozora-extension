<script lang="ts">
  interface Props {
    /** The image to display. */
    src: string;
    /** Whether to dim the image. */
    isDimmed: boolean;
    /** Whether to blur the image. */
    isBlurred: boolean;
  }

  let { src, isDimmed, isBlurred }: Props = $props();
</script>

<div class="banner">
  {#if src !== ""}
    <img class="banner-image" {src} alt="" draggable="false" data-blurred={isBlurred} />
  {/if}
  {#if isDimmed}
    <span class="banner-dim"></span>
  {/if}
  <span class="banner-shield" aria-hidden="true"></span>
</div>

<style>
  .banner {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  /* The image fills the page, cropped to preserve its aspect ratio. */
  .banner-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    -webkit-user-drag: none;
    user-select: none;
  }

  /* A blurred image overscans the page's edges. */
  .banner-image[data-blurred="true"] {
    filter: blur(4rem);
    transform: scale(1.25);
  }

  /* Blocks dragging the image and its context menu. */
  .banner-shield {
    position: absolute;
    inset: 0;
  }

  .banner-dim {
    position: absolute;
    inset: 0;
    background-color: rgb(0 0 0 / 0.2);
  }
</style>
