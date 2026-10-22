# Deployment and public launch

Threadmark has two deployment states. Example-only mode can be published without service credentials. Live mode requires account configuration, published operator details, provider-policy review and hosted acceptance checks. A successful build is not evidence that external services are configured correctly.

## 1. Publish the source

Apply [MIGRATION.md](MIGRATION.md) if replacing an earlier copy. Commit source, lockfile, tests, documentation and `.env.example`; exclude real environment files, dependencies, build output and local history archives. Enable GitHub secret scanning/push protection where available and protect the main branch with required CI review/checks appropriate to the repository.

The repository has no deployment secrets in its workflow. Do not paste production credentials into GitHub issues, screenshots, README examples or workflow YAML. Use MFA for GitHub, Vercel, Google, Upstash and Cloudflare.

## 2. Deploy the example first

Import the repository at https://vercel.com/new. Select Next.js, the root directory containing `package.json`, Node.js 24.x, install command `npm ci --include=dev`, and build command `npm run build`.

Leave `ANALYSIS_ENABLED=false` and `RELEASE_READY=false`. Open the production URL and test the example and policy links. The live endpoint returns 503 in this state. No `.env.local` is needed for Vercel-only hosting. Public settings and browser configuration are embedded at build time, so redeploy after changing variables.

## 3. Domain and Google OAuth publication

Firebase Google sign-in can technically operate on an authorised `vercel.app` hostname. That does not remove Google's production OAuth requirements. Google's policy requires a public homepage on a verified domain under the operator's ownership, with Privacy Policy and Terms links. Firebase-created OAuth clients remain subject to that policy.

For public Google sign-in, configure a domain under your ownership, verify it as required by Google, attach it to Vercel, and use its exact HTTPS origin as `APP_ORIGIN`. An existing owned domain/subdomain can be used. If those requirements are not met, keep the public site in example-only mode; a working test login is not proof of publication compliance.

In Google Auth Platform, configure accurate app branding, support/developer contact, homepage, `/privacy`, `/terms`, authorised domains, audience and publishing status. Request only the existing identity scopes. Complete any verification Google requires. Do not bypass a verification warning by claiming the application has been approved.

Reference: https://developers.google.com/identity/protocols/oauth2/policies and https://developers.google.com/terms/api-services-user-data-policy.

## 4. Firebase Authentication

Create a separate project at https://console.firebase.google.com/ for authentication. Keep Gemini in a different Google project. Enable Authentication > Google, choose a support email, and register a Web app under project settings. Copy `apiKey`, `authDomain`, `projectId` and `appId` into the matching environment variables.

Use Firebase's default `PROJECT.firebaseapp.com` authDomain. The release CSP and configuration validation expect that domain form. Add the production app hostname to Authentication > Settings > Authorised domains. For optional local development also authorise `localhost` and `127.0.0.1` explicitly.

The Firebase web key is public. Restrict it to the required Firebase Auth APIs, including Identity Toolkit and Token Service. Do not authorise the Generative Language API on this key and never reuse the Gemini key. Because the server performs an account lookup, a browser-referrer-only restriction can prevent server verification; use appropriate API restrictions and Firebase authorised domains rather than removing all restrictions to fix login.

No Firebase service-account JSON, Admin SDK private key, Firestore database or Firebase Hosting deployment is required. Review the selected service plan and quotas before enabling billing. Accounts can be deleted through `/account`, which requires recent Google reauthentication.

Reference: https://firebase.google.com/docs/auth/web/google-signin and https://firebase.google.com/docs/projects/api-keys.

## 5. Upstash Redis

Create a Redis database at https://console.upstash.com/. Copy the HTTPS REST URL and read/write REST token. Use the free plan if suitable for the intended volume, without enabling paid upgrades unintentionally.

Use the same production database and `QUOTA_NAMESPACE` across every production redeployment. Clearing the database or changing the namespace resets usage counts. Never point automated tests at production Redis. The code sends credentials only to an HTTPS `*.upstash.io` endpoint.

## 6. Cloudflare Turnstile

Create a Managed widget at https://dash.cloudflare.com/ under Turnstile. Authorise the app hostname, copy its public site key and private secret, and leave pre-clearance disabled for this setup. Turnstile works without moving DNS or proxying the site through Cloudflare.

The widget emits tokens with action `analyze`. The backend verifies success, action and hostname with Cloudflare. Tokens are single-use and expire after five minutes. Live release validation refuses documented test-key prefixes. Use real keys only in the owner's deployment, not in CI.

Reference: https://developers.cloudflare.com/turnstile/get-started/ and https://developers.cloudflare.com/turnstile/get-started/server-side-validation/.

## 7. Vercel environment variables

Set these under Project Settings > Environment Variables for **Production only**. Mark private credentials as Secret/Sensitive where the dashboard provides that option. Do not provide live Gemini/Redis/Turnstile credentials to Preview deployments. Set `ANALYSIS_ENABLED=false` in Preview explicitly. Vercel supplies `VERCEL` and `VERCEL_ENV`; do not override them.

| Variable | Value and purpose |
| --- | --- |
| `ANALYSIS_ENABLED` | `false` during setup; `true` only for the live release |
| `RELEASE_READY` | `true` only after the operator completes this guide and reviews policies |
| `APP_ORIGIN` | Exact stable HTTPS app origin, no path or trailing slash |
| `PUBLIC_OPERATOR_NAME` | Public operator identity; template uses Khaled Morshed |
| `PUBLIC_CONTACT_EMAIL` | A monitored public email for support, privacy and security requests |
| `GEMINI_API_KEY` | Private key for the separate Gemini project |
| `GEMINI_MODEL` | Exact supported model ID already tested with the interactions API |
| `GEMINI_DATA_MODE` | `unpaid` or `paid`, matching the actual Google project billing status |
| `UPSTASH_REDIS_REST_URL` | Database HTTPS REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Private read/write REST token |
| `TURNSTILE_SECRET_KEY` | Private widget verification secret |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public widget site key |
| `FIREBASE_PROJECT_ID` | Authentication project ID used by server verification |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Same authentication project ID |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public Firebase Web app key, never the Gemini key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Default `PROJECT.firebaseapp.com` value |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Web app appId |
| `ALLOWED_EMAILS` | Your Google email during acceptance testing; optional comma-separated invite list |
| `ALLOWED_COUNTRIES` | `MY` initially; explicit comma-separated ISO country codes, no spaces |
| `USER_ANALYSES_PER_MINUTE` | `2` |
| `USER_ANALYSES_PER_DAY` | `5` |
| `SITE_ANALYSES_PER_DAY` | `20` |
| `QUOTA_NAMESPACE` | `threadmark:production:v1`; keep stable |

Blank `ALLOWED_EMAILS` permits any eligible verified Google account. Changing that is a deliberate launch decision. Do not set `GEMINI_DATA_MODE=paid` merely to bypass regional restrictions; the actual project must have the required active billing configuration. Budget alerts are not guaranteed spending stops.

The release defaults to Malaysia. Confirm every added country is supported by Gemini. Unpaid mode additionally rejects EEA, Switzerland and UK traffic even if mistakenly allowlisted. Country checks use Vercel ingress headers and are not reliable proof of residency; VPNs can obscure location. The code does not support untrusted forwarding proxies or non-Vercel production hosting without a new trust-boundary review.

Live access is intended for adults in a professional/business demonstration. Age confirmation is self-attestation, not identity-based age verification. Google's terms also restrict services likely to be accessed by minors; an age checkbox alone does not settle suitability. Review intended audience, region and data use before release.

Reference: https://ai.google.dev/gemini-api/terms and https://ai.google.dev/gemini-api/docs/available-regions.

## 8. Platform protections

Configure Vercel firewall controls for `POST /api/analyze` before opening access. Where the plan supports it, start with a per-IP rate limit such as 10 requests/minute and tune it for shared networks. Enable available bot/DDoS protections, monitor traffic and retain appropriate platform logs. Application quotas do not protect static pages or prevent function/Redis traffic costs under flooding.

Review Vercel usage and spending controls, Google project quotas, Firebase limits and Upstash limits. Use a dedicated Gemini key/project so unrelated applications do not bypass this app's budget accounting. Restrict Gemini API permissions where supported. Enable account MFA and keep credentials out of browser variables and source.

Review Deployment Protection separately: keep Preview deployments protected, and allow intended public visitors to reach Production without a Vercel team login. Google sign-in inside Threadmark is separate from Vercel deployment access.

## 9. Hosted acceptance checks

Keep `ALLOWED_EMAILS` restricted to test accounts. Save variables, set both enablement flags to `true`, and redeploy. A live build fails if required settings are missing. Then:

- Verify all policy pages show the correct operator and monitored email, and that the selected Gemini data-use notice matches actual billing.
- Sign in with an authorised Google account. Confirm a second uninvited account is denied if the allowlist is set.
- Complete consent and Turnstile; analyse a short fictional conversation and inspect its citations.
- Confirm an unauthenticated request, false/missing consent, invalid bot token and unsupported country cannot reach Gemini.
- Check 429/Retry-After responses when limits are reached. Failed provider attempts should still consume allowance.
- Test account deletion, then verify the old account session is refused. Do not use the operator's sole administrative identity as the deletion test account.
- Test emergency pause below. Confirm previews never analyse.
- Inspect browser network responses and bundles for absence of Gemini/Redis/Turnstile server secrets. Public Firebase configuration and the user's own ID token are expected.
- Check mobile layout, keyboard navigation, blocked-popup behavior and restrictive browser privacy settings.

Do not remove the email allowlist until these checks pass. Automated mocked tests do not replace this stage.

## 10. Pause, block and recover

In the Upstash console, stop new admissions immediately:

```text
SET threadmark:production:v1:disabled 1
```

Resume with `DEL threadmark:production:v1:disabled`. Already-running model calls may finish. Setting `ANALYSIS_ENABLED=false` and redeploying also disables new deployment requests; the shared Redis switch covers older deployments using the same namespace.

To block an account, obtain its Firebase UID, compute its SHA-256 hex hash locally, and set `threadmark:production:v1:blocked:HASH` to `1`. Delete that key to unblock. Do not put a raw email or UID into public logs. Firebase disabled/deleted/revoked account state is also checked on each analysis.

If a secret is exposed: pause, revoke/rotate the affected credential, update Vercel, redeploy and review history/log exposure. Remove exposed Git history using an appropriate reviewed process; do not assume a deletion commit erases it. Review privacy incidents and applicable notification obligations with qualified advice when needed.

## Operator responsibilities

The included policies describe the implemented data flow; they are not a legal compliance certification. Confirm operator identity, contact handling, provider contracts, cross-border processing, retention, deletion and incident response for the actual deployment. Malaysian commercial personal-data processing may trigger PDPA duties; use the bilingual notice as a starting implementation, not a substitute for assessing applicability.

Review artwork ownership and choose a source-code licence before granting reuse rights. A public GitHub repository is not automatically open source. No open-source licence has been added on the owner's behalf.
