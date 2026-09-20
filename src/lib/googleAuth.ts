// ==========================================================================
// Google Identity Services (GIS) OAuth2 client — REAL Google sign-in.
//
// This uses Google's browser-side "token client" flow: the user grants
// Gmail/Calendar scopes via a real Google consent popup, and Google hands
// back a short-lived OAuth access token directly to the browser. No backend
// or client secret is required for this flow, which is why it pairs well
// with a Firestore-only backend.
//
// Trade-off vs. a server-side "offline" flow: the access token expires in
// ~1 hour and there is no refresh token, so background/overnight sync isn't
// possible with this alone — sync happens whenever the signed-in user's
// browser tab calls syncNow() (or GIS silently re-prompts). See SETUP.md for
// how to upgrade to a server-side refresh-token flow via Cloud Functions if
// unattended background sync becomes a requirement.
// ==========================================================================

import firebaseAppletConfig from '../../firebase-applet-config.json';

declare global {
  interface Window {
    google?: any;
  }
}

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

export const GOOGLE_OAUTH_CLIENT_ID: string =
  (import.meta as any).env?.VITE_GOOGLE_OAUTH_CLIENT_ID || (firebaseAppletConfig as any).oAuthClientId || '';

export const GOOGLE_WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

interface TokenState {
  accessToken: string;
  expiresAt: number; // epoch ms
  scope: string;
  googleEmail?: string;
}

// In-memory only — never persisted. Access tokens are short-lived by design;
// requiring a fresh (silent, where possible) grant per browser session is
// the correct behavior for a client-only OAuth flow.
let tokenState: TokenState | null = null;
let gisScriptPromise: Promise<void> | null = null;
let tokenClient: any = null;

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisScriptPromise) return gisScriptPromise;
  gisScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services script')));
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
    document.head.appendChild(script);
  });
  return gisScriptPromise;
}

export function isGoogleOAuthConfigured(): boolean {
  return !!GOOGLE_OAUTH_CLIENT_ID;
}

export function getCachedAccessToken(): string | null {
  if (!tokenState) return null;
  if (Date.now() >= tokenState.expiresAt - 30000) return null; // 30s safety margin
  return tokenState.accessToken;
}

export function getConnectedGoogleEmail(): string | undefined {
  return tokenState?.googleEmail;
}

/**
 * Requests (or silently reuses) a Google OAuth access token with Gmail +
 * Calendar scopes. `interactive: true` shows the Google consent popup (use
 * on an explicit user click, e.g. "Connect Google Account"). `interactive:
 * false` attempts a silent/no-prompt refresh and resolves to null if that's
 * not possible (e.g. no prior grant in this browser session).
 */
export async function requestGoogleAccessToken(options: { interactive: boolean } = { interactive: true }): Promise<string | null> {
  if (!isGoogleOAuthConfigured()) {
    throw new Error(
      'Google OAuth client ID is not configured. Set VITE_GOOGLE_OAUTH_CLIENT_ID in your .env (see SETUP.md).'
    );
  }

  const cached = getCachedAccessToken();
  if (cached) return cached;

  await loadGisScript();

  return new Promise((resolve, reject) => {
    try {
      if (!tokenClient) {
        tokenClient = window.google!.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_OAUTH_CLIENT_ID,
          scope: GOOGLE_WORKSPACE_SCOPES,
          prompt: '', // set per-request below
          callback: () => {} // overridden per-request below
        });
      }

      tokenClient.callback = async (resp: any) => {
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error));
          return;
        }
        const expiresInSec = Number(resp.expires_in || 3600);
        tokenState = {
          accessToken: resp.access_token,
          expiresAt: Date.now() + expiresInSec * 1000,
          scope: resp.scope || GOOGLE_WORKSPACE_SCOPES
        };
        // Best-effort: fetch the connected email for display purposes.
        try {
          const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${resp.access_token}` }
          });
          if (infoRes.ok) {
            const info = await infoRes.json();
            if (tokenState) tokenState.googleEmail = info.email;
          }
        } catch {
          /* non-fatal */
        }
        resolve(resp.access_token);
      };

      tokenClient.requestAccessToken({ prompt: options.interactive ? 'consent' : '' });
    } catch (err) {
      reject(err as Error);
    }
  });
}

export function disconnectGoogle(): void {
  const token = tokenState?.accessToken;
  tokenState = null;
  if (token && window.google?.accounts?.oauth2?.revoke) {
    try {
      window.google.accounts.oauth2.revoke(token, () => {});
    } catch {
      /* non-fatal */
    }
  }
}
