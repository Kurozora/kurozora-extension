import Home from "@/entrypoints/popup/routes/Home.svelte";
import Settings from "@/entrypoints/popup/routes/Settings.svelte";
import Sites from "@/entrypoints/popup/routes/Sites.svelte";
import SignIn from "@/entrypoints/popup/routes/SignIn.svelte";

/** Hash routes for the popup. */
export const routes = {
  "/": Home,
  "/settings": Settings,
  "/sites": Sites,
  "/signin": SignIn,
};
