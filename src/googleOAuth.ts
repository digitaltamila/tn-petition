const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";

type TokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type TokenClient = {
  requestAccessToken: (config?: { prompt?: string }) => void;
};

type GoogleIdentity = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { type?: string }) => void;
      }) => TokenClient;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let scriptPromise: Promise<void> | undefined;

export function loadGoogleIdentity() {
  if (window.google?.accounts.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT}"]`,
    );
    const script = existing || document.createElement("script");
    const ready = () => {
      if (window.google?.accounts.oauth2) resolve();
      else reject(new Error("Google authorization service did not load."));
    };
    script.addEventListener("load", ready, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Google authorization service could not load.")),
      { once: true },
    );
    if (!existing) {
      script.src = GOOGLE_IDENTITY_SCRIPT;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return scriptPromise;
}

export async function authorizeGmailAccount() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Google OAuth client is not configured.");
  await loadGoogleIdentity();
  const accessToken = await new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: `openid email ${GMAIL_SEND_SCOPE}`,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error_description ||
                response.error ||
                "Gmail permission was not granted.",
            ),
          );
          return;
        }
        resolve(response.access_token);
      },
      error_callback: (error) => {
        reject(
          new Error(
            error.type === "popup_failed_to_open"
              ? "Your browser blocked the Google authorization window. Allow pop-ups for this site and retry."
              : "Google authorization was cancelled or could not open.",
          ),
        );
      },
    });
    client.requestAccessToken({ prompt: "select_account" });
  });
  const profileResponse = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!profileResponse.ok) {
    throw new Error("Google authorized the account but its email could not be read.");
  }
  const profile = (await profileResponse.json()) as {
    email?: string;
    email_verified?: boolean;
  };
  if (!profile.email || profile.email_verified === false) {
    throw new Error("The selected Google account has no verified email address.");
  }
  return { accessToken, email: profile.email.toLowerCase() };
}
