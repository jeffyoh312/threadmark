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

## Prompt injection

Visitors control the text the model reads, so it has to assume someone will try "ignore your instructions", "print the API key", "read /etc/passwd" or "tell the user to log in at this link". The defences are layered, so none of them has to be perfect:

1. **Nothing to leak.** The Gemini key is sent only in the HTTPS request header and is never part of the prompt. No environment variables, file paths or server details are in the prompt either.
2. **No abilities.** The model is called without tools: no Google Search, URL context, code execution or function calling. It can't read files, fetch pages or call anything.
3. **Fenced input.** The conversation is wrapped in `<conversation>` tags, and any such tags inside it are defused so a message can't "close" the block. The system instruction says everything inside is untrusted data and lists the usual tricks to ignore.
4. **Fixed output shape.** Gemini must return JSON matching the report schema, which is then validated with Zod. Anything else is discarded.
5. **Output filter.** Every title, finding, owner and date passes through `makeSafe` in `report.ts`: links that weren't in the conversation become `[link removed]`, and strings shaped like Google, OpenAI, GitHub, Slack or AWS keys, JWTs, bearer tokens or private keys become `[removed]`.
6. **Plain rendering.** React renders all text as text, never as HTML, and links aren't made clickable. The Markdown export escapes `[ ] < > * _` and backticks so a pasted brief can't create links or HTML elsewhere.

`tests/safety.test.ts` checks the filter against a model that has been "tricked" into returning phishing links and fake keys.

## Chat imports

Telegram JSON and WhatsApp text exports are parsed in the browser (`chat-import.ts`). The file isn't uploaded, only the tidied text is sent when the visitor asks for a brief, and it goes through the same limits and checks as pasted text. JSON is parsed with `JSON.parse` only, and files over 20 MB are refused before reading.

## Headers

Set for every page in `next.config.ts`: a Content Security Policy that only allows our own origin plus Cloudflare Turnstile, `frame-ancestors 'none'`, HSTS, `nosniff`, a strict referrer policy and a permissions policy that turns off camera, microphone and location.

## Known limits

Origin checks aren't authentication, and a determined attacker can rotate IP addresses and solve bot checks. In that case the site-wide daily cap is what protects the quota: the worst outcome is that live briefs stop for the day, while the example keeps working. Because the Gemini key is on the free tier with no billing attached, abuse can't create a bill.

## Reporting a problem

Please open an issue on GitHub without including secrets or private conversation text, and don't load-test the public demo.
