# Deploy Threadmark on Vercel

Use Node.js 24, the Next.js framework preset, repository root as Root Directory, `npm ci` for install, and `npm run build` for build. There is no account setup or OAuth configuration.

## 1. Configure services

Create a dedicated Gemini API key for this project, an Upstash Redis database and a Cloudflare Turnstile widget. In Turnstile, allow your exact production hostname. Keep the widget action `analyze`. Do not use the public testing keys in a live deployment.

Restrict the Gemini key to its intended Google API where supported. Keep Google account access and credentials separate from GitHub. If a key was ever exposed, revoke it and create another; hiding it in a later commit does not revoke it.

## 2. Set environment variables

In Vercel, open the project, then Settings > Environment Variables. Set these for **Production**:

| Variable | Value |
| --- | --- |
| `APP_ORIGIN` | Exact public origin, e.g. `https://threadmark-sepia.vercel.app`, without trailing slash |
| `GEMINI_API_KEY` | Private Google API key |
| `GEMINI_MODEL` | A model available to your Google project that supports Interactions and structured JSON; the current Google examples use `gemini-3.8-flash` |
| `GEMINI_DATA_MODE` | `paid` or `unpaid`, matching the actual Google project terms |
| `UPSTASH_REDIS_REST_URL` | Your database's `https://….upstash.io` REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Private REST token |
| `TURNSTILE_SECRET_KEY` | Private Cloudflare widget secret |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public widget site key |
| `RATE_LIMIT_SECRET` | At least 32 random characters, generated once and kept stable |
| `PUBLIC_OPERATOR_NAME` | Your name |
| `PUBLIC_CONTACT_EMAIL` | A real contact email displayed on policy pages |
| `ANALYSIS_ENABLED` | `true` when configured |
| `RELEASE_READY` | `true` after reviewing the settings and privacy notice |

Generate the rate-limit secret locally and paste it only into Vercel:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Only the Turnstile **site** key uses `NEXT_PUBLIC_`. Gemini, Redis, Turnstile secret and rate-limit secret must remain server-only. Do not share screenshots containing these values.

For **Preview**, set `ANALYSIS_ENABLED=false` and `RELEASE_READY=false`. Preview builds are example-only and should not receive production service secrets.

## 3. Choose public limits

| Variable | Default | Maximum accepted |
| --- | --- | --- |
| `VISITOR_ANALYSES_PER_MINUTE` | 2 | 10 |
| `VISITOR_ANALYSES_PER_DAY` | 5 | 100 |
| `SITE_ANALYSES_PER_DAY` | 20 | 1,000 |
| `SITE_CONCURRENT_ANALYSES` | 3 | 20 |
| `QUOTA_NAMESPACE` | `threadmark:production:v1` | Keep stable across deployments |
| `ALLOWED_COUNTRIES` | Empty | Optional comma-separated ISO country codes |

An empty `ALLOWED_COUNTRIES` removes the former Malaysia-only allowlist. The existing unpaid-mode restriction for EEA/UK/Switzerland remains. To enable those regions, use a Google project covered by paid-service terms and set `GEMINI_DATA_MODE=paid`. This setting declares your configuration; it does not enable billing or make an unavailable model/region available.

Daily allowances reset at midnight UTC, 8 a.m. in Malaysia. Visitors sharing an IP address share the allowance. IPv6 addresses use a /64 network bucket. Do not change the namespace or rotate the secret just to clear quotas.

The daily cap counts attempts, not tokens or money. Configure Google-side usage quotas and billing alerts, and review Vercel spend controls independently.

## 4. Remove Vercel's login wall

Application sign-in and Vercel Authentication are separate controls. This version removes application sign-in in code.

1. Open the Threadmark project in Vercel.
2. Open **Deployment Protection** in the project sidebar (some dashboard layouts place it under Settings or Security).
3. Under **Vercel Authentication**, turn protection off and save to make all deployment URLs public. Alternatively, choose a protection scope that excludes your production domain if you want previews protected.
4. Check that Password Protection and Trusted IP restrictions are not protecting the public URL.
5. Share the stable production domain, not an old deployment URL, and open it in an incognito window while logged out of Vercel.

Disabling deployment protection also exposes any old deployment URLs in that scope. Review/remove obsolete deployments with unsafe code or settings before opening all URLs. Prefer keeping previews protected when the available scope permits public production.

## 5. Add edge protection and redeploy

In the project's Firewall area, add a rate-limit rule matching `POST /api/analyze`, keyed by IP, with a starting threshold of 10 requests per 60 seconds and a 429 response. Availability and pricing depend on your plan. This rejects excess traffic before it invokes the function. Keep Vercel's platform DDoS protection enabled.

Application rate limiting still invokes Redis for rejected requests and cannot by itself prevent network floods or all hosting charges. Do not describe this as DDoS-proof.

Redeploy after updating environment variables. The public site key and public settings are baked into the build, so changing values without redeploying is insufficient.

## 6. Hosted smoke check

- In incognito, open the stable public URL. No Google or Vercel login should appear.
- Open the example, expand source messages, filter next steps and export.
- Submit fictional text with the three confirmations and a real Turnstile check. Verify a complete brief appears.
- Check a second simultaneous submission from the same network is refused, and the minute/day limits return 429 with `Retry-After`.
- Check the production browser network panel: only `/api/analyze` handles analysis, with no Gemini key or Authorization bearer token in its request.
- Confirm Redis failure prevents Gemini calls, then restore Redis configuration and redeploy. Perform outage testing on an isolated production test project, not your public service.

No cloud credentials are needed for offline tests. Real provider integration, deployed header behavior and project-specific quotas must still be checked on Vercel.

## Local live development

Use `.env.local`, `APP_ORIGIN=http://127.0.0.1:3000`, real service configuration and a Turnstile widget permitted for local development. `npm run dev` groups local visitors into one loopback bucket. Public Turnstile testing keys deliberately cannot enable live Gemini requests. Use an isolated Redis namespace for development and never commit `.env.local`.

## References

- [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)
- [Vercel request headers](https://vercel.com/docs/headers/request-headers)
- [Vercel rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
- [Gemini Interactions](https://ai.google.dev/gemini-api/docs/interactions-overview)
- [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)
