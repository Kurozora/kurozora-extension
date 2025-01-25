<script lang="ts">
  import Router from "svelte-spa-router";
  import { routes } from "@/utils/routes";
</script>


<main class="w-[400px] h-full">
  <Router {routes}/>
  <a href="#/signin">Click</a>
</main>