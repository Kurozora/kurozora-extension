<script lang="ts">
  import type { LibraryKindValue } from "kurozorakit";
  import {
    LIBRARY_STATUSES,
    NO_STATUS,
    REMOVE_STATUS,
    statusLabel,
    type LibraryState,
  } from "@/lib/date-widget/library";

  interface Props {
    /** The library the displayed media is tracked in. */
    kind: LibraryKindValue;
    /** The state of the displayed media, `null` until it resolves. */
    state: LibraryState | null;
    /** Whether the displayed media can be reminded of. */
    isRemindable: boolean;
    /** Whether a request is in flight. */
    isBusy: boolean;
    /** The reason the last request failed. */
    error: string | null;
    /** Invoked with the status to track the media under, or `REMOVE_STATUS`. */
    onstatus: (status: number) => void;
    /** Invoked to favorite the media, or to unfavorite it. */
    onfavorite: () => void;
    /** Invoked to remind of the media, or to forget it. */
    onremind: () => void;
  }

  let { kind, state, isRemindable, isBusy, error, onstatus, onfavorite, onremind }: Props = $props();

  /** Whether the media is tracked. */
  let isTracked = $derived(state !== null && state.status !== null);

  /** The status the select shows. */
  let selected = $derived(state?.status ?? NO_STATUS);

  /**
   * Reports the chosen status.
   *
   * @param event - The change event.
   */
  function handleChange(event: Event & { currentTarget: HTMLSelectElement }): void {
    const status = Number(event.currentTarget.value);

    event.currentTarget.value = String(selected);

    onstatus(status);
  }
</script>

<div class="actions">
  <span class="status">
    <select
      class="status-select"
      aria-label="Library status"
      disabled={state === null || isBusy}
      value={selected}
      onchange={handleChange}
    >
      <option value={NO_STATUS} hidden disabled>ADD</option>

      {#each LIBRARY_STATUSES as status (status)}
        <option value={status}>{statusLabel(kind, status)}</option>
      {/each}

      {#if isTracked}
        <option class="status-remove" value={REMOVE_STATUS}>Remove from Library</option>
      {/if}
    </select>

    <svg class="status-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M6 8l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
    </svg>
  </span>

  {#if isTracked && state !== null}
    <button
      class="action action-symbol"
      type="button"
      aria-label={state.isFavorited ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={state.isFavorited}
      title={state.isFavorited ? "Remove from favorites" : "Add to favorites"}
      disabled={isBusy}
      onclick={onfavorite}
    >
      <svg
        viewBox="0 0 24 24"
        fill={state.isFavorited ? "currentColor" : "none"}
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <path
          d="M12 20.3 4.6 13a4.7 4.7 0 0 1 0-6.7 4.7 4.7 0 0 1 6.7 0l.7.7.7-.7a4.7 4.7 0 0 1 6.7 0 4.7 4.7 0 0 1 0 6.7Z"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    {#if isRemindable}
      <button
        class="action action-symbol"
        type="button"
        aria-label={state.isReminded ? "Turn off reminder" : "Remind me"}
        aria-pressed={state.isReminded}
        title={state.isReminded ? "Turn off reminder" : "Remind me"}
        disabled={isBusy}
        onclick={onremind}
      >
        <svg
          viewBox="0 0 24 24"
          fill={state.isReminded ? "currentColor" : "none"}
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <path d="M18 16V10a6 6 0 1 0-12 0v6l-2 2.5h16Z" stroke-linejoin="round" />
          <path d="M10 19.5a2 2 0 0 0 4 0" stroke-linecap="round" />
        </svg>
      </button>
    {/if}
  {/if}
</div>

{#if error !== null}
  <p class="error" role="status">{error}</p>
{/if}

<style>
  .actions {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .status {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  /* The status holds one width across every label. */
  .status-select {
    appearance: none;
    width: 8rem;
    height: 2rem;
    padding: 0 1.75rem 0 0.85rem;
    border: 1px solid rgb(255 255 255 / 0.2);
    border-radius: 9999px;
    background-color: rgb(0 0 0 / 0.45);
    backdrop-filter: blur(16px);
    color: var(--tint-color);
    font-family: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition:
      background-color 0.15s ease-in-out,
      border-color 0.15s ease-in-out,
      opacity 0.15s ease-in-out;
  }

  .status-select:enabled:hover,
  .status-select:focus-visible {
    border-color: var(--tint-color);
    background-color: rgb(0 0 0 / 0.65);
  }

  .status-select:disabled {
    opacity: 0.55;
  }

  .status-select option {
    background-color: var(--bg-secondary-color);
    color: var(--primary-text-color);
  }

  .status-select option.status-remove {
    color: #ef4444;
  }

  .status-chevron {
    position: absolute;
    right: 0.5rem;
    width: 1rem;
    height: 1rem;
    color: var(--tint-color);
    pointer-events: none;
  }

  .action {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    height: 2rem;
    padding: 0 0.75rem;
    border: 1px solid rgb(255 255 255 / 0.2);
    border-radius: 9999px;
    background-color: rgb(0 0 0 / 0.45);
    backdrop-filter: blur(16px);
    color: #ffffff;
    font-size: 0.8125rem;
    font-weight: 500;
    white-space: nowrap;
    transition:
      background-color 0.15s ease-in-out,
      border-color 0.15s ease-in-out,
      opacity 0.15s ease-in-out;
  }

  .action-symbol {
    width: 2rem;
    padding: 0;
    justify-content: center;
  }

  .action svg {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }

  .action:enabled:hover,
  .action:enabled:focus-visible {
    border-color: var(--tint-color);
    background-color: rgb(0 0 0 / 0.65);
  }

  .action[aria-pressed="true"] {
    color: var(--tint-color);
  }

  .action:disabled {
    opacity: 0.55;
  }

  .error {
    max-width: 22rem;
    margin: 0;
    color: #ffffff;
    font-size: 0.75rem;
    text-shadow: 0 1px 3px rgb(0 0 0 / 0.7);
  }
</style>
