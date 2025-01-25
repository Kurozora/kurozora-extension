<div
  class="flex flex-col justify-center w-screen h-full max-w-prose mx-auto pl-4 pr-4 py-6 sm:px-6"
>
  <section>
    <div class="text-center mb-5">
      <h1 class="text-2xl font-bold">Welcome to Kurozora!</h1>
      <p>
        Sign in with your Kurozora Account to use the library and other Kurozora
        services.
      </p>
    </div>
  </section>

  <section></section>

  <section></section>

  <section>
    <form method="POST" action="https://kurozora.app/sign-in">
      <input
        type="hidden"
        name="_token"
        value="bnSwxflDsFfqrOHZh2nzwEx86bApvsDclT8s8P8g"
        autocomplete="off"
      />
      <div style="display:  none ;">
        <input name="kurozora_pt" value="" />
        <input
          name="kurozora_t"
          value="eyJpdiI6Ik83SjhCUWt3OFJmS2xIY09FSmdjMUE9PSIsInZhbHVlIjoiNGMyazgyMUYxblErT3MwdkJaOW5EZWhGQkxsdFJzbmVPc0R1Z3RUWTdoaz0iLCJtYWMiOiIzZTA0M2UzMWQwMjIyYTBhNWI4ZjQ0NjJkYzA4MzE3YTExYjM0YmRhODM4Y2ZlNDJjYzY1NDgxOTYwZjIyMjBiIiwidGFnIjoiIn0="
        />
        <input data-purpose="kurozora_js" name="kurozora_js" value="" />
      </div>
      <script
        async=""
        type="application/javascript"
        src="https://www.google.com/recaptcha/api.js?render=6LeAoRwdAAAAAE0Nyy4nfoIeBWwnH3VgmNYl02It"
        defer=""
      ></script>

      <input
        action="sign_in"
        type="hidden"
        data-purpose="honey-rc"
        data-action="sign_in"
        name="kurozora_rt"
      />
      <input
        class="form-input rounded-md shadow-sm focus:border-orange-500 focus:ring-orange-500"
      />

      <section class="space-y-4">
        <div>
          <label class="block font-medium text-sm text-gray-700" for="email">
            Email
          </label>
          <input
            class="form-input rounded-md shadow-sm focus:border-orange-500 focus:ring-orange-500 block mt-1 w-full"
            id="email"
            type="email"
            name="email"
            placeholder="Your cool email address 🙌"
            required="required"
          />
        </div>

        <div>
          <label class="block font-medium text-sm text-gray-700" for="password">
            Password
          </label>
          <input
            class="form-input rounded-md shadow-sm focus:border-orange-500 focus:ring-orange-500 block mt-1 w-full"
            id="password"
            type="password"
            name="password"
            placeholder="Your super secret password 👀"
            required="required"
            autocomplete="current-password"
          />
        </div>
      </section>

      <section class="flex flex-wrap justify-between gap-2 mt-4">
        <label for="remember_me" class="flex items-center">
          <input
            id="remember_me"
            type="checkbox"
            class="h-4 w-4 rounded focus:ring-0 focus:ring-offset-0 text-orange-500 focus:border-orange-300"
            name="remember"
          />
          <span class="ml-2 text-sm text-gray-600">Remember me</span>
        </label>

        <a
          class="inline-flex items-center text-orange-700 hover:text-orange-500 font-medium underline transition ease-in-out duration-150 disabled:opacity-25 text-sm"
          href="https://kurozora.app/forgot-password"
        >
          Forgot your password? Let’s reset it 📧
        </a>
      </section>

      <section
        class="flex flex-col items-center justify-end gap-4 mt-8 text-center"
      >
        <button
          type="submit"
          class="inline-flex items-center justify-center pl-2 pr-2 pt-1 pb-1 btn-bg-tinted border border-transparent rounded-md text-xs text-white font-semibold uppercase tracking-widest transition ease-in-out duration-150 hover:bg-orange-400 active:bg-orange-600 focus:outline-none active:border-orange-600 active:ring-orange disabled:bg-gray-200 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-default sm:px-4 sm:py-2"
        >
          Open sesame 👐
        </button>
      </section>
    </form>

    <div class="flex flex-col items-center justify-end gap-4 mt-4 text-center">
      <p class="tracking-wide font-black">———— or ————</p>

      <a
        class="inline-flex items-center text-orange-700 hover:text-orange-500 font-medium underline transition ease-in-out duration-150 disabled:opacity-25 text-sm"
        href="https://kurozora.app/sign-up"
      >
        New to Kurozora? Join us 🔥
      </a>

      <p class="tracking-wide font-black">———— or ————</p>

      <div>
        <form method="POST" action="https://kurozora.app/siwa/sign-in">
          <input
            type="hidden"
            name="_token"
            value="bnSwxflDsFfqrOHZh2nzwEx86bApvsDclT8s8P8g"
            autocomplete="off"
          />
          <input
            class="form-input rounded-md shadow-sm focus:border-orange-500 focus:ring-orange-500"
          />

          <button
            id="appleid-signin"
            class="w-52 h-8"
            data-color="black"
            data-border=""
            data-border-radius="15"
            ><div
              style=" font-synthesis: none; -moz-font-feature-settings: kern; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; width: 100%; height: 100%; min-width: 130px; max-width: 375px; min-height: 30px; max-height: 64px; position: relative; letter-spacing: initial;"
              role="button"
              tabindex="0"
              aria-label="Sign in with Apple"
            >
              <div
                style=" padding-right: 8%; padding-left: 8%; position: absolute; box-sizing: border-box; width: 100%; height: 100%;"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  style="pointer-events: none; overflow: visible;"
                  width="100%"
                  height="100%"
                >
                  <g>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      style="overflow: visible;"
                      width="100%"
                      height="50%"
                      y="25%"
                      viewBox="0 -11 111.046875 14"
                      fill="#fff"
                    >
                      <defs>
                        <style>
                          @font-face {
                            font-family: "applied-button-font-0";
                            src: url(data:application/x-font-woff;charset=utf-8;base64,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)
                              format("woff");
                          }
                        </style>
                      </defs>
                      <text
                        font-size="12px"
                        textLength="111.046875"
                        font-family="applied-button-font-0"
                        direction="ltr"> Sign in with Apple</text
                      >
                    </svg>
                  </g>
                </svg>
              </div>
              <div
                style=" padding: 1px; width: 100%; height: 100%; box-sizing: border-box;"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  style=" overflow: visible;"
                  width="100%"
                  height="100%"
                  ><rect
                    width="100%"
                    height="100%"
                    ry="15%"
                    fill="#000"
                    stroke="black"
                    stroke-width="1"
                    stroke-linecap="round"
                  ></rect></svg
                >
              </div>
            </div></button
          >
          <script
            async=""
            type="text/javascript"
            src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
          ></script>
        </form>
      </div>
    </div>
  </section>

  <section class="flex flex-col items-center space-y-4 mt-16 text-center">
    <div class="relative max-w-sm">
      <picture>
        <img
          src="https://kurozora.app/images/static/promotional/kurozora_services.webp"
          alt="Kurozora services"
          title="Kurozora services"
        />
      </picture>
    </div>

    <p class="text-sm">
      Your Kurozora Account lets you access your library, favorites, reminders,
      reviews, and more on your devices, automatically.
    </p>
  </section>

  <section class="space-y-1 mt-16 text-center text-sm">
    <p class="text-gray-500">
      Your Kurozora Account information is used to enable Kurozora services when
      you sign in. Kurozora services includes the library where you can keep
      track of the shows you are interested in.
    </p>
    <a
      class="inline-flex items-center text-orange-700 hover:text-orange-500 font-medium underline transition ease-in-out duration-150 disabled:opacity-25"
      href="https://kurozora.app/legal/privacy-policy"
    >
      See how your data is managed...
    </a>
  </section>
</div>
