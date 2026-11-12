# Security model

Threadmark is an anonymous public demo. No account, cookie identifier or browser-provided user ID is trusted for quotas.

## Admission to Gemini

1. Deployment flags, exact origin, content type and regional policy are checked.
2. On production Vercel, `x-vercel-forwarded-for` supplies the network identity. Generic `x-forwarded-for` and Authorization headers are ignored. Missing or malformed platform IPs fail closed. Development uses loopback.
3. IPv6 addresses are grouped by /64; mapped IPv4 is normalized. A stable secret HMAC produces the Redis identifier. Raw IPs are not persisted by application code.
4. Shared Redis Lua ingress checks run before body parsing and Turnstile. They admit 10 requests/network/minute and 120 requests/site/minute. Malformed JSON counts toward ingress, but not the AI allowance.
5. Actual streamed bytes, upload duration, consent, policy version and text length are checked.
6. Turnstile success, hostname and action are verified server-side. Production test keys are prohibited.
7. One atomic Lua reservation checks visitor minute/day caps, site day cap, pause/block flags, and visitor/site concurrency before any Gemini request.
8. Gemini uses server-only credentials, a separate system instruction, structured JSON, no tools, `store:false`, zero automatic retries, a timeout and bounded output. Completed status, JSON schema and citation existence are validated before returning results.

Network quotas default to 2/minute and 5/UTC day. The site defaults to 20 attempts/UTC day and 3 active analyses. Requests that reach Gemini are not refunded on failure. Daily counters expire within 48 hours; locks last 120 seconds. Shared active slots expire by score after 120 seconds and their set expires after 240 seconds. A stale release cannot delete a replacement lock or another request's slot.

## Boundaries

Origin checks are not authentication. Bots can forge Origin headers, solve challenges and rotate networks. Shared-network visitors can exhaust each other's allowance. A distributed attacker may consume the site's daily allowance and deny live analysis to others; the prepared example remains available. These limits prioritize bounded AI usage over guaranteed availability.

The controls do not prevent all function/Redis charges or provide a penetration-test guarantee. Use Vercel's edge firewall for traffic before functions, and Google-side quotas and billing controls for provider usage. Never expose production functions outside Vercel while trusting its headers.

Do not disable Redis or Turnstile validation to repair an outage. Live analysis fails closed when guards are unavailable. Preview deployments cannot run live analysis.

## Keys and logs

Store secrets only in private local/Vercel environment variables. Only `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is public. The Gemini key is never sent to the browser or included in provider error responses. Logs include controlled stages and numeric statuses, not request bodies, tokens or provider exception messages. CSP no longer permits Firebase/Google authentication scripts or frames.

Run `npm run security:check` inside the Git repository before pushing. It heuristically scans working files, the index and locally available history. It is not a guarantee that every possible credential is detected. If a key was exposed, revoke and replace it; merely deleting the file is insufficient.

## Emergency pause

Set `<QUOTA_NAMESPACE>:disabled` to `1` in Redis to stop admission without a build. Remove it after investigating. To disable the feature persistently, set `ANALYSIS_ENABLED=false` in Vercel and redeploy. Redis blocking records use `<QUOTA_NAMESPACE>:blocked:<visitor HMAC>` and remain until manually removed. Do not log raw IP addresses to build block lists.

## Reporting

Contact the operator shown on the hosted privacy page. Do not post credentials or private conversation text in public issues, and do not load-test the public demo without permission.
