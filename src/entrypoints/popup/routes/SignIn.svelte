<script lang="ts">
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { browser } from "wxt/browser";
  import Button from "@/lib/components/Button.svelte";
  import ErrorBanner from "@/lib/components/ErrorBanner.svelte";
  import SimpleLink from "@/lib/components/SimpleLink.svelte";
  import TextField from "@/lib/components/TextField.svelte";
  import TwoFactorChallenge from "./TwoFactorChallenge.svelte";
  import { KurozoraAPI } from "kurozorakit";
  import { kit, platformInfo } from "../kit";

  /** The email address entered by the user. */
  let email = $state("");
  /** The password entered by the user. */
  let password = $state("");
  /** The pending two-factor challenge token, when one is active. */
  let challengeToken = $state<string | null>(null);
  /** Whether a sign-in or verification request is in flight. */
  let loading = $state(false);
  /** The most recent sign-in error message, if any. */
  let errorMessage = $state<string | null>(null);
  /** The selected API environment key. */
  let environment = $state<keyof typeof KurozoraAPI>("v1");

  /** Restores the persisted environment choice into the selector. */
  onMount(async () => {
    const stored = await browser.storage.local.get("apiEnvironment");
    environment =
      (stored.apiEnvironment as keyof typeof KurozoraAPI) ?? "v1";
  });

  /** Authenticates with the kit, revealing the 2FA field or routing home. */
  async function handleSignIn(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (loading) return;

    errorMessage = null;
    loading = true;

    try {
      const response = await kit.users.signIn(email, password, platformInfo());

      if (response?.two_factor === true) {
        challengeToken = response.challenge_token;

        return;
      }

      push("/");
    } catch (error) {
      const failure = error as { message?: string };
      errorMessage =
        failure?.message ?? "Something went wrong. Please try again.";
    } finally {
      loading = false;
    }
  }

  /** Discards the pending challenge and returns to the credentials form. */
  function handleChallengeBack(): void {
    challengeToken = null;
    errorMessage = null;
    password = "";
  }

  /** Persists the environment choice and points the popup kit at it. */
  async function handleEnvironmentChange(): Promise<void> {
    await browser.storage.local.set({ apiEnvironment: environment });
    kit.apiEndpoint = KurozoraAPI[environment] ?? KurozoraAPI.v1;
  }
</script>

{#if challengeToken !== null}
  <TwoFactorChallenge {challengeToken} onback={handleChallengeBack} />
{:else}
  <div class="flex flex-col justify-center max-w-prose mx-auto px-4 py-6">
    <section>
      <div class="text-center mb-5">
        <h1 class="text-2xl font-bold">Welcome to Kurozora!</h1>
        <p class="text-secondary">
          Sign in with your Kurozora Account to use the library and other Kurozora
          services.
        </p>
      </div>
    </section>

    <section>
      <form onsubmit={handleSignIn}>
        <ErrorBanner message={errorMessage} />

        <section class="space-y-4 {errorMessage ? 'mt-4' : ''}">
          <TextField
            id="email"
            label="Email"
            type="email"
            bind:value={email}
            placeholder="Your cool email address 🙌"
            autocomplete="email"
            required
          />

          <TextField
            id="password"
            label="Password"
            type="password"
            bind:value={password}
            placeholder="Your super secret password 👀"
            autocomplete="current-password"
            required
          />
        </section>

        <section class="flex justify-end mt-4">
          <SimpleLink href="https://kurozora.app/forgot-password" target="_blank">
            Forgot your password? Let’s reset it 📧
          </SimpleLink>
        </section>

        <section class="flex flex-col items-center justify-end gap-4 mt-8">
          <Button type="submit" {loading} disabled={loading}>
            Open sesame 👐
          </Button>
        </section>
      </form>

      <div class="flex flex-col items-center justify-end gap-4 mt-4 text-center">
        <p class="tracking-wide font-black text-secondary">———— or ————</p>

        <SimpleLink href="https://kurozora.app/sign-up" target="_blank">
          New to Kurozora? Join us 🔥
        </SimpleLink>
      </div>
    </section>

    <section class="flex flex-col items-center space-y-4 mt-16 text-center">
      <picture class="max-w-sm">
        <img
          src="https://kurozora.app/images/static/promotional/kurozora_services.webp"
          alt="Kurozora services"
          title="Kurozora services"
        />
      </picture>

      <p class="text-sm">
        Your Kurozora Account lets you access your library, favorites, reminders,
        reviews, and more on your devices, automatically.
      </p>
    </section>

    <section class="space-y-1 mt-16 text-center text-sm">
      <p class="text-secondary">
        Your Kurozora Account information is used to enable Kurozora services when
        you sign in. Kurozora services includes the library where you can keep
        track of the shows you are interested in.
      </p>
      <SimpleLink href="https://kurozora.app/legal/privacy-policy" target="_blank">
        See how your data is managed…
      </SimpleLink>
    </section>

    <section class="flex items-center justify-center gap-2 mt-8">
      <label class="text-xs text-secondary" for="apiEnvironment">Environment</label>
      <select
        id="apiEnvironment"
        class="rounded-md px-2 py-1 text-xs shadow-sm bg-secondary text-primary border border-primary transition ease-in-out duration-150 focus:border-tint focus:ring-2 focus:ring-orange-500 focus:outline-none"
        bind:value={environment}
        onchange={handleEnvironmentChange}
      >
        <option value="v1">Production</option>
        <option value="local">Local (kurozora.test)</option>
        <option value="ngrok">ngrok</option>
      </select>
    </section>
  </div>
{/if}
