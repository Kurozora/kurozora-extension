<script lang="ts">
  import Router, { push } from "svelte-spa-router";
  import { onMount } from "svelte";
  import { routes } from "@/utils/routes";
  import { prepare } from "./kit";

  /** Whether the stored authentication key has been checked. */
  let ready = $state(false);

  /** A fatal error that kept the popup from starting. */
  let fatalError = $state<string | null>(null);

  /** Restores the environment and session, then routes accordingly. */
  onMount(() => {
    window.addEventListener("error", (event) => {
      fatalError = event.message;
    });
    window.addEventListener("unhandledrejection", (event) => {
      fatalError = String(event.reason?.message ?? event.reason);
    });

    prepare()
      .then(() => {
        push("/");
        ready = true;
      })
      .catch((error: { message?: string }) => {
        fatalError = error?.message ?? String(error);
      });
  });
</script>

<main class="w-[400px]">
  {#if fatalError !== null}
    <p class="px-4 py-4 text-sm text-red-300">Something broke: {fatalError}</p>
  {:else if ready}
    <Router {routes} />
  {/if}
</main>
