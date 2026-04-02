<script lang="ts">
  import { push } from "svelte-spa-router";
  import Button from "@/lib/components/Button.svelte";
  import ErrorBanner from "@/lib/components/ErrorBanner.svelte";
  import SimpleButton from "@/lib/components/SimpleButton.svelte";
  import TextField from "@/lib/components/TextField.svelte";
  import { kit } from "../kit";

  interface Props {
    /** The pending two-factor challenge token from the sign-in response. */
    challengeToken: string;
    /** Invoked when the user backs out to the credentials form. */
    onback: () => void;
  }

  let { challengeToken, onback }: Props = $props();

  /** Whether the recovery-code mode is active instead of the code mode. */
  let recovery = $state(false);
  /** The 6-digit verification code entered by the user. */
  let otp = $state("");
  /** The emergency recovery code entered by the user. */
  let recoveryCode = $state("");
  /** Whether a verification request is in flight. */
  let loading = $state(false);
  /** The most recent verification error message, if any. */
  let errorMessage = $state<string | null>(null);

  /** Swaps between the code and recovery-code modes, clearing stale input. */
  function toggleRecovery(): void {
    recovery = !recovery;
    errorMessage = null;
    otp = "";
    recoveryCode = "";
  }

  /** Completes the two-factor challenge and routes home on success. */
  async function handleVerify(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (loading) return;

    errorMessage = null;
    loading = true;

    try {
      await kit.users.completeTwoFactorChallenge(
        challengeToken,
        recovery ? { recoveryCode } : { otp },
      );
      push("/");
    } catch (error) {
      const failure = error as { message?: string };
      errorMessage =
        failure?.message ?? "Something went wrong. Please try again.";
    } finally {
      loading = false;
    }
  }
</script>

<div class="flex flex-col justify-center max-w-prose mx-auto px-4 py-6">
  <section>
    <div class="text-center mb-5 text-secondary">
      {#if recovery}
        <h1 class="text-2xl font-bold">Enter Recovery Code</h1>
        <p>
          Please confirm access to your account by entering one of your
          emergency recovery codes.
        </p>
      {:else}
        <h1 class="text-2xl font-bold">Enter Authorization Code</h1>
        <p>
          Please confirm access to your account by entering the authentication
          code provided by your authenticator application.
        </p>
      {/if}
    </div>
  </section>

  <section>
    <form onsubmit={handleVerify}>
      <ErrorBanner message={errorMessage} />

      <section class="space-y-4 {errorMessage ? 'mt-4' : ''}">
        {#if recovery}
          <TextField
            id="recovery_code"
            label="Recovery Code"
            bind:value={recoveryCode}
            placeholder="XXXXXXXXXX-XXXXXXXXXX"
            autocomplete="one-time-code"
            required
          />
        {:else}
          <TextField
            id="code"
            label="Code"
            bind:value={otp}
            placeholder="The 6-digit code from your authenticator 🔐"
            autocomplete="one-time-code"
            inputmode="numeric"
            maxlength={6}
            required
          />
        {/if}
      </section>

      <section class="flex flex-col items-center justify-end gap-4 mt-8">
        <SimpleButton onclick={toggleRecovery}>
          {recovery ? "Use an authentication code" : "Use a recovery code"}
        </SimpleButton>

        <Button type="submit" {loading} disabled={loading}>
          Verify 🔐
        </Button>

        <SimpleButton onclick={onback}>
          ← Back to sign in
        </SimpleButton>
      </section>
    </form>
  </section>
</div>
