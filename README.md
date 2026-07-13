# Tamil Nadu Police Recruitment Petition

A Tamil-first, individual public-representation application. Each applicant supplies their own details and signature, reviews the exact PDF and email, signs into the matching Google account with only `gmail.send`, and performs an irreversible final click. There is no bulk-send or arbitrary-recipient path.

## Architecture and data handling

- React/Vite frontend on Firebase Hosting; Firebase Auth, App Check, Firestore and callable Cloud Functions in `asia-south1`.
- The server validates all fields, resolves only active and verified Firestore recipients, creates the Tamil PDF, and returns the reviewed draft in a 15-minute AES-GCM sealed envelope. The full address, signature, PDF and Gmail access token are never stored.
- The final function verifies Firebase identity, Gmail token identity and applicant email equality, regenerates the same PDF, sends once through Gmail, then stores only the minimal audit record. Gmail access tokens are held in memory for one request and discarded.
- PDF generation is recipient-aware. Government departments receive a neutral administrative representation; recipients classified with `recipientType: "mla"` receive a non-partisan constituency representation asking the MLA to raise the matter. Selecting both produces separately reviewed attachments. An MLA selection requires the applicant's constituency.
- Raw IPs are not stored. A project-salted hash is used in hourly rate-limit buckets. Configure Firestore TTL for `rateLimits.expiresAt`, 30 days for failure logs and 180 days for petition audit data/anonymisation.

## Local setup

Prerequisites: Node 20+, Firebase CLI, a Firebase project with Blaze billing for Functions, and Google Cloud access.

1. Run `npm install` and `npm --prefix functions install`.
2. Copy `.env.example` to `.env.local` and enter the Firebase web configuration. These identifiers are public configuration, not OAuth secrets.
3. Run `firebase use --add`, then `firebase functions:secrets:set PETITION_PAYLOAD_KEY` with at least 32 random bytes.
4. For emulator development set `VITE_USE_EMULATORS=true`; run `firebase emulators:start` and `npm run dev`.
5. App Check enforcement is deliberate. For local work register the documented App Check debug token; do not disable enforcement in production.

## Firebase, App Check and OAuth

1. Enable Google as a Firebase Authentication provider and add the production domain to authorized domains.
2. In Google Cloud, enable Gmail API. Configure the OAuth consent screen, privacy/terms links, verified domains and the exact scope `https://www.googleapis.com/auth/gmail.send`. Complete Google verification before public launch. No client secret belongs in the browser.
3. Create a reCAPTCHA Enterprise site key for the production domain, register it under Firebase App Check for the web app, set `VITE_FIREBASE_APP_CHECK_SITE_KEY`, and enforce App Check for Functions, Firestore and Authentication where supported. Monitor metrics before enforcement.
4. The Google account email entered in the form, Firebase authenticated email and OAuth userinfo email must all match. The code never requests inbox access or refresh tokens.

## Admin setup

Set a custom claim using a trusted one-off Admin SDK script or Cloud Shell: `admin.auth().setCustomUserClaims(uid, {admin: true})`. The user must sign out/in. Never expose such a script publicly. The `/admin` route checks the claim, while Firestore rules independently enforce it.

Import `samples/governmentRecipients.json` manually, replacing placeholders only after checking an official `*.tn.gov.in` source. Keep every record inactive with `needs_verification` until that check is recorded. The application cannot send until at least one recipient is both active and verified. Create `campaigns/tn-police-recruitment-2026` with `{enabled:true, contentVersion:"1.0", maximumSubmissions:...}`.

### MLA and postal directory

The authoritative MLA source is `https://assembly.tn.gov.in/16thassembly/members.php`. From `functions/`, run `npm run sync:mlas -- --dry-run` to validate the parser, then authenticate Application Default Credentials and run `npm run sync:mlas`. The importer writes only entries with an official `@tn.gov.in` email, records the source and verification date, and fails if the page structure yields fewer than 200 records. Rerun it after vacancies, by-elections or a new Assembly; review the diff before production activation.

PIN lookup auto-populates postal locality choices, district and Tamil Nadu state through the configurable `PIN_LOOKUP_API_URL`. PIN does **not** prove Assembly constituency: India Post PIN areas can be geographically large and can overlap political boundaries. The applicant must confirm the constituency from the verified Assembly list before their MLA is shown or selected. Do not infer an MLA from PIN alone unless a separately audited official boundary dataset and exact address/geocode are introduced.

The current dashboard manages recipients. Aggregate charts, campaign settings and export should be implemented through privileged aggregate endpoints before operators need them; Firestore rules already reserve their collections. Admins can never access tokens or resend a student message.

## Test and production deploy

Run `npm run lint`, `npm run test`, `npm run build`, `npm --prefix functions run build`, then exercise the emulator flow. Deploy with `firebase deploy`. Gmail test mode is Google OAuth’s consent-screen Testing status: add explicit test users and use only unverified placeholder recipients in a separate emulator/project. There is intentionally no backend bypass that pretends a message was sent.

### Cloudflare Pages frontend

Connect this repository to Cloudflare Pages with production branch `main`, framework preset `Vite`, build command `npm run build`, output directory `dist`, and no root-directory override. Set `NODE_VERSION=22.16.0` plus the `VITE_*` values documented in `.env.example`. The files in `public/` are copied into the deployment and provide SPA route fallback, CSP/security headers, and immutable caching for fingerprinted assets. Firebase Functions remain deployed separately through Firebase; Cloudflare hosts only the frontend.

Before launch visually inspect generated PDFs on Android, iOS and desktop PDF viewers, including long Tamil names/addresses, multi-page output, page numbers and signature. Test keyboard focus, screen reader labels, expired envelopes, mismatched Gmail, duplicate Gmail/registration, invalid App Check, disabled campaign, Gmail rejection, retry/idempotency, mobile widths and all legal links.

## Security checklist

- Rotate `PETITION_PAYLOAD_KEY`; use separate projects and keys per environment. Restrict IAM/deployer roles and enable audit logs, budget alerts and Secret Manager access logging.
- Verify every recipient from an official source and review it periodically. Never accept frontend-provided addresses.
- Configure Firestore TTL and scheduled audit anonymisation; publish the real privacy contact and deletion workflow.
- Add alerting for send failures/rate spikes. Review CSP after every new third-party integration. Run dependency and secret scanning in CI.
- Confirm App Check, Firebase ID token, input/size limits, account equality, duplicate checks and rate controls in production. For strict concurrency-safe one-per-account guarantees, retain the deterministic per-user campaign lock described in the issue tracker before high-volume launch.
- Obtain local legal/privacy review and Google restricted-scope approval as applicable. This repository does not claim government affiliation.

## PDF template note

The specification referenced a PDF at `/mnt/data/...`, but that source file was not supplied in this workspace. `functions/src/pdf.ts` therefore contains a clean, original Unicode Tamil petition expressing the three requested points, version 1.0. Have a Tamil legal/editorial reviewer approve it before production and update the campaign content version whenever it changes.
