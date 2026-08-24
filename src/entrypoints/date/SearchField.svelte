<script lang="ts">
  import { search } from "@/lib/date-widget/search";

  /** The text entered by the user. */
  let query = $state("");

  /** Runs the query with the browser's default search engine. */
  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    await search(query);
  }
</script>

<form class="search" role="search" onsubmit={handleSubmit}>
  <svg class="search-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 4.5 4.5" stroke-linecap="round" />
  </svg>
  <input
    class="search-input"
    type="search"
    name="q"
    placeholder="Search the web"
    aria-label="Search the web"
    autocomplete="off"
    spellcheck="false"
    bind:value={query}
  />
</form>

<style>
  .search {
    position: absolute;
    top: 50%;
    left: 50%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: min(34rem, calc(100% - 4rem));
    padding: 0.85rem 1.25rem;
    border: 1px solid rgb(255 255 255 / 0.24);
    border-radius: 9999px;
    background-color: rgb(0 0 0 / 0.55);
    backdrop-filter: blur(16px);
    box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 0.45);
    color: #ffffff;
    transform: translate(-50%, -50%);
    transition:
      background-color 0.15s ease-in-out,
      border-color 0.15s ease-in-out;
  }

  .search:focus-within {
    border-color: var(--tint-color);
    background-color: rgb(0 0 0 / 0.68);
  }

  .search-symbol {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
    opacity: 0.75;
  }

  .search-input {
    flex: 1;
    min-width: 0;
    border: none;
    background: none;
    color: inherit;
    font-family: var(--font-sans);
    font-size: 1rem;
    outline: none;
  }

  .search-input::placeholder {
    color: rgb(255 255 255 / 0.72);
  }

  /* The field's built-in clear affordance. */
  .search-input::-webkit-search-cancel-button {
    filter: invert(1);
    opacity: 0.6;
  }
</style>
