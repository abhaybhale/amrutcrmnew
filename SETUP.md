# Amrut CRM Enterprise — Setup Guide

## Free Google deployment note for crmnew.amrutsoftware.in

For the current `crmnew.amrutsoftware.in` deployment, use
`DEPLOY_CRMNEW.md`. That runbook is configured for Firebase Hosting,
Firestore, and Firebase Email/Password Authentication only, so it does not
require Cloud Functions or the Blaze billing plan. The older Cloud Functions
sections below are optional future upgrades for AI proxy/server-side account
provisioning/background jobs; do not deploy them if you want to stay on the
Spark/free-compatible setup.

This document covers everything needed to run the app locally, and to turn
on the features that need real external credentials: **real Firebase
Authentication** (so the shared database is actually secured), **Gmail/
Calendar sync**, and the **Claude AI assistant**.

## 1. What's real vs. what's simulated

| Feature | Status |
|---|---|
| Leads → Opportunities → Presales/POC → Quotes → Orders workflow | Real, backed by a live, shared Cloud Firestore database |
| Multi-company switching, roles & permissions | Real |
| Marketing/Lead-Gen: projects, campaigns, dataset import (CSV/XLSX), convert-to-lead | Real, shared Firestore |
| Finance: invoice generation from won orders, payment recording, AR aging | Real, shared Firestore |
| Tasks / daily work queue | Real, shared Firestore |
| **Sign-in** | **Real Firebase Authentication** — every account is a real Firebase Auth credential, not an app-level password check. Requires the two provisioning Cloud Functions below to be deployed once (§5) |
| **Gmail & Google Calendar sync** | **Real** — uses actual Google OAuth + Gmail/Calendar REST APIs, once you set `VITE_GOOGLE_OAUTH_CLIENT_ID` and enable the two APIs (steps below) |
| **AI features** (lead scoring, email classification, chat assistant, campaign copy) | **Real**, powered by Claude — once you deploy the `aiProxy` Firebase Function (steps below). Until then, AI buttons show a clear "not configured" state instead of failing silently |

**This is now a real shared, multi-user database.** Every browser that signs
in reads and writes the same live Cloud Firestore data in real time — two
people in two browsers see each other's changes as they happen. This is a
deliberate change from an earlier version of this app, which ran on
per-browser localStorage with Firestore as a best-effort backup only.

## 2. Local development

```bash
npm install
cp .env.example .env.local   # fill in values as you complete §3/§4/§5 below
npm run dev
```

Without any of the setup in §3-§5, the app will load but sign-in will fail
(there's no Firebase Auth account to sign in with yet, and no Cloud Function
deployed to create one) — you need at minimum §5 done once before the app is
usable. Production builds do not include demo credentials or public account
provisioning. An administrator must provision or invite each user.

## 3. Enabling real Gmail + Calendar sync

This uses Google Identity Services' browser-side OAuth token flow — the user
grants access via a real Google consent popup, and the browser talks to the
Gmail/Calendar REST APIs directly with the resulting access token. No backend
or client secret is required for this flow (trade-off: the token lasts ~1
hour and syncing only happens while a signed-in user's tab calls "Sync Now"
or opens the CRM — there's no unattended overnight sync with this approach).

1. **Google Cloud Console** → open the project behind this app's OAuth
   client. The project id is `gen-lang-client-0722379473` (see
   `firebase-applet-config.json`) — or create your own project and OAuth
   client if you'd rather not reuse the AI Studio one.
2. **APIs & Services → Library** → enable:
   - **Gmail API**
   - **Google Calendar API**
3. **APIs & Services → OAuth consent screen** → add scopes:
   - `.../auth/gmail.readonly`
   - `.../auth/calendar.events`
   - `.../auth/calendar.readonly`
   - `.../auth/userinfo.email`
   If the app is in "Testing" mode, add your team's Google accounts as test
   users (or publish the consent screen for production use).
4. **APIs & Services → Credentials** → open the existing OAuth 2.0 Client ID
   (Web application) or create a new one. Under **Authorized JavaScript
   origins**, add:
   - `http://localhost:3000` (local dev)
   - your production URL (e.g. `https://crm.amrutsoftware.com`)
5. Copy the Client ID into `.env.local`:
   ```
   VITE_GOOGLE_OAUTH_CLIENT_ID="....apps.googleusercontent.com"
   ```
6. Restart `npm run dev`. On the **Google Workspace Sync** tab (or the
   "Connect Google Account" button in "My Day" on the dashboard), click
   Connect, approve the Google consent popup, and sync will run.

**Upgrading to unattended/background sync:** if you later need syncing to
happen even when no one has the CRM tab open, add a server-side "offline"
OAuth flow (authorization code + refresh token) via a Firebase Function,
store the refresh token per user in Firestore, and run a scheduled Cloud
Function that mints access tokens and syncs on a timer. The client-side flow
implemented here (`src/lib/googleAuth.ts`) intentionally keeps things simple
and requires no extra backend for the common case of "sync when I'm working."

## 4. Enabling the Claude AI assistant

The Anthropic API key must never reach the browser, so all AI calls go
through a small Firebase Cloud Function (`/functions/src/index.ts`) that
proxies to Claude. This function deploys together with the two Firebase Auth
provisioning functions in §5 — steps 1-2 below only need doing once.

1. Install the Firebase CLI if you don't have it: `npm install -g firebase-tools`
2. `firebase login`, then from the repo root: `firebase use --add` and pick
   (or create) your Firebase project — the existing project id in
   `firebase-applet-config.json` works fine if you already have console
   access to it.
3. Get an Anthropic API key from the [Anthropic Console](https://console.anthropic.com/),
   then set it as a Firebase secret (never commit it):
   ```bash
   firebase functions:secrets:set ANTHROPIC_API_KEY
   ```
4. Install function dependencies and deploy (this deploys `aiProxy`,
   `activateInvitedUser`, and `provisionDemoData` together):
   ```bash
   cd functions
   npm install
   cd ..
   firebase deploy --only functions
   ```
5. The deploy output prints each function's URL, something like:
   `https://us-central1-<project-id>.cloudfunctions.net/aiProxy`
   Put the `aiProxy` one in `.env.local`:
   ```
   VITE_AI_FUNCTION_URL="https://us-central1-<project-id>.cloudfunctions.net/aiProxy"
   ```
6. Restart `npm run dev`. You should now see: an "AI Score" button on leads
   in the dashboard's "My Day" panel, AI-classified synced emails (once
   Gmail sync is on), the floating AI assistant (bottom-right on every
   screen), and "Generate with AI" on the new-campaign form in Marketing.

If you'd rather not stand up Firebase Functions right now, the app runs
fine without this — every AI touchpoint checks `isAIConfigured()` first and
shows a clear inline message instead of erroring.

**Model id:** `functions/src/index.ts` pins `claude-sonnet-4-5-20250929`.
Check [docs.claude.com/en/docs/about-claude/models](https://docs.claude.com/en/docs/about-claude/models)
for the current recommended model id and update the `MODEL` constant if needed.

## 5. Real Firebase Authentication (required — do this first)

Every account in this CRM is now a real Firebase Authentication credential.
Firestore's security rules (`firestore.rules`) check `request.auth` to
decide who can read and write the shared database, so without this section
done, **nobody can sign in and the app is unusable**.

### 5.1 Why a Cloud Function creates accounts, not the browser

Firebase's client SDK (`createUserWithEmailAndPassword`) always generates a
random account id (`uid`) — it can't be told to use a specific one. But this
CRM's entire data model keys ownership of leads, opportunities, quotes,
tasks, etc. by a CRM `usr_xxx` Firestore document id. To avoid rewriting
every one of those references, this app instead uses the **Admin SDK**
(server-side only, via two Cloud Functions) to create each Firebase Auth
account with an *explicit* uid equal to that person's existing `users/{id}`
Firestore document id. Once that's done, `currentUser.id` in the React app
and `request.auth.uid` in Firestore security rules are always the same
value, and every existing feature keeps working unchanged.

### 5.2 Deploy the provisioning functions

Same deploy as §4 covers this — `firebase deploy --only functions` deploys
`aiProxy`, `activateInvitedUser`, and `provisionDemoData` together. If you
skipped §4 (no AI key yet), you can still deploy just these two:

```bash
firebase deploy --only functions:activateInvitedUser,functions:provisionDemoData
```

Then put both printed URLs in `.env.local`:

```
VITE_ACTIVATE_USER_FUNCTION_URL="https://us-central1-<project-id>.cloudfunctions.net/activateInvitedUser"
VITE_PROVISION_DEMO_FUNCTION_URL="https://us-central1-<project-id>.cloudfunctions.net/provisionDemoData"
```

Restart `npm run dev` (or redeploy your hosting) after setting these.

### 5.3 Deploy the security rules

```bash
firebase deploy --only firestore:rules
```

`firestore.rules` locks the entire database to signed-in users only, with
extra restrictions on sensitive config collections (roles, field security,
workflows, web forms, company records, full user-account management) to
admin-tier roles. See the comments at the top of that file for exactly what
is and isn't enforced — notably, per-company data isolation for the core
sales pipeline is a known, documented gap (see §6), not something these
rules attempt to enforce.

### 5.4 First sign-in

With the activation function deployed and its URL set:

- **Real invited/imported users** — an Admin creates or bulk-imports a user
  in User Management, which generates an activation code
  (`generateActivationLink`). Share the link and activation code through
  separate trusted channels. The new user visits the CRM, switches to
  "First-Time Setup," enters that code and chooses a password. This calls
  `activateInvitedUser`, which validates the code server-side (via the
  Admin SDK, so it works even though `users` isn't publicly readable) and
  creates their Firebase Auth account.
- **Forgot password** — real `sendPasswordResetEmail`; no setup needed
  beyond Firebase Auth being enabled on the project (Authentication →
  Sign-in method → Email/Password, in the Firebase Console).

## 6. Known architectural gaps worth knowing about

Being upfront about what's simplified, since this is meant to be extended:

- **Company scoping is inconsistent.** Marketing, Finance, Tasks, Google
  Workspace accounts and Vendor Targets are all scoped by `companyId` and
  filtered by the currently-selected company. **Leads, Opportunities,
  Accounts, Quotes and Orders are not yet company-scoped** — they're a
  single shared pool filtered only by role/ownership. If you need hard
  data isolation between the three companies for the core sales pipeline
  (not just marketing/finance), add a `companyId` field to those four types
  in `types.ts`, set it on creation, filter `accessibleLeads` /
  `accessibleOpportunities` / etc. in `CRMContext.tsx` by
  `currentCompanyId` the same way `accessibleTasks` already does, **and**
  extend `firestore.rules` to actually check that field server-side (see
  the note at the top of that file for the specific approach). This is the
  single most impactful follow-up if strict multi-company isolation matters
  for your rollout.
- **The "Switch Active User" quick-role-switcher was removed.** The earlier,
  localStorage-only version of this app let anyone instantly "become" any
  other seeded user from the Header / User Management screens, for fast RBAC
  testing. That's fundamentally incompatible with real per-user Firebase
  Authentication and a real shared database (writes are always attributed
  to whoever is actually signed in) — those buttons now point people at
  signing out and back in as the other account instead. For QA/demo
  purposes, sign in as each persona directly from the sign-in screen's
  user directory.
- **The legacy `password` field on the `User` type/Firestore doc is
  vestigial.** It predates real Firebase Authentication and is no longer
  read by anything that actually authenticates a session — Firebase Auth
  owns credentials now. It's still written in a couple of places
  (`createUser`) for backward compatibility with the `User` type shape; a
  good follow-up is removing the field entirely from `types.ts` and its
  write sites.
- **Google sync is session-scoped**, not a persistent background job (see
  §3's "upgrading to unattended sync" note).
- **Reset Demo Data now affects everyone.** Since Firestore is the real
  shared database, the "Reset Demo Data" action in the header resets the
  shared dataset for every signed-in user, not just the browser that
  clicked it. Existing Firebase Auth accounts and passwords are untouched
  by this — only the CRM data documents reset to their seed values.
