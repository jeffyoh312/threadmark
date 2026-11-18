# Security

Threadmark is an anonymous public demo. There are no accounts, so the goal is simple: let people try it freely while making sure nobody can run up the AI quota, break the site for others, or get at the API key.

## How a request is checked

Every `POST /api/analyze` goes through these steps in order. Each one is cheaper than the next, so bad traffic is rejected early.

| Step | What it does | Where |
| --- | --- | --- |
| Kill switch | `ANALYSIS_ENABLED=false` pauses live analysis without a code change. | `route.ts` |
| Same origin | The `Origin` header must match the site. Stops other websites posting from a visitor's browser. | `http.ts` |
| Region | Requests from the EEA, UK and Switzerland are refused, as Gemini's free tier can't serve them. | `route.ts` |
| Burst limit | 3 requests per minute per visitor, shared across all server instances through Redis. | `limits.ts` |
| Input | JSON only, 64 KB body cap (checked on the real bytes, not just `Content-Length`), 20 to 20,000 characters. | `http.ts`, `route.ts` |
| Bot check | Cloudflare Turnstile token verified server-side, including that it was issued for this hostname and the `analyze` action. Tokens are single use. | `turnstile.ts` |
| Cache | Identical text returns the cached brief, without touching Gemini or the daily limit. | `limits.ts` |
| Daily limits | 15 per visitor and 400 for the whole site per day. | `limits.ts` |
| Gemini | Server-side API key, structured JSON output, 25 s per attempt, 50 s overall. | `gemini.ts` |
| Output | Validated with Zod. Unknown line citations and unsupported findings are removed. | `report.ts` |

If Redis or Turnstile isn't configured in production, the API refuses to run rather than running without limits.

## Privacy by design

- Visitors are identified by an HMAC-SHA256 of their IP address using `RATE_LIMIT_SECRET`. IPv6 addresses are grouped by /64 so one device can't dodge limits by hopping addresses. The raw IP is never stored.
- On Vercel, the IP comes from `x-vercel-forwarded-for`, which the platform sets and the browser can't override.
- Briefs are cached for 24 hours under a SHA-256 hash of the conversation, not linked to the visitor.
- Logs contain the model name and HTTP status only. Conversation text, tokens and upstream error bodies are never logged or sent back to the browser.
- Prompt injection: the conversation is passed as data, and the system instruction tells the model never to follow instructions inside it. The output can only ever be a report that fits the schema, and it's rendered as plain text.

## Headers

Set for every page in `next.config.ts`: a Content Security Policy that only allows our own origin plus Cloudflare Turnstile, `frame-ancestors 'none'`, HSTS, `nosniff`, a strict referrer policy and a permissions policy that turns off camera, microphone and location.

## Known limits

Origin checks aren't authentication, and a determined attacker can rotate IP addresses and solve bot checks. In that case the site-wide daily cap is what protects the quota: the worst outcome is that live briefs stop for the day, while the example keeps working. Because the Gemini key is on the free tier with no billing attached, abuse can't create a bill.

## Reporting a problem

Please open an issue on GitHub without including secrets or private conversation text, and don't load-test the public demo.
