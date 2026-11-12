# Validation record

Update prepared 12 November 2026 from repository commit `e49a2bd2e5a578f19d07a15d533b3f7df405ee2a`.

## Checks completed

| Check | Result |
| --- | --- |
| `npm run test:security` | 24 tests passed |
| `python tests/quota_lua.py` | 8 tests passed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build` | Production example-mode build passed |
| `npm run security:check` | No matching secret patterns found in working files, index or locally available history |
| `npm audit --omit=dev --audit-level=high` | No production vulnerabilities reported |
| `git diff --check` | Passed |
| Playwright HTTP checks | 2 passed, one in each configured project |
| Playwright browser cases | 8 blocked before execution by Chromium process startup restrictions |

The browser run could not launch the installed Chromium because the environment denied a required process socket. Downloading Playwright's bundled Chromium also returned an unusable archive. The separate browser interface could not reach the local server. Desktop/mobile visual layout, browser export, focus behavior and interaction tests therefore remain **unverified in this environment**, not passed. Run `npm run test:e2e` on your machine or GitHub Actions with Playwright Chromium installed.

## What the tests cover

Node tests cover anonymous visitor derivation, spoofed/missing IP headers, IPv6 normalization, configuration/region/origin checks, input limits, consent, ingress before body parsing, bot verification, provider error sanitization, completed structured responses and invalid evidence IDs. Service orchestration uses injected test doubles; it does not call Gemini or Cloudflare.

Lua tests execute the production scripts using fakeredis with Lua support. They cover visitor and site quotas, atomic concurrent reservations, ownership-safe release, expired concurrency entries, bucket rollover, pause/block flags and visitor/site ingress limits. A concurrent 100-request test admits exactly 20 under a site cap of 20. This is not a hosted load test or an Upstash integration test.

## Remaining production checks

No Gemini, Turnstile, Upstash or Vercel credentials were supplied. No live model call, actual bot challenge, Vercel header acceptance, deployment protection change or deployment was performed. Follow the hosted smoke checks in DEPLOYMENT.md after configuration.

No live security attack or stress test was run. No model-accuracy benchmark was performed. A schema-valid, correctly numbered citation can still support a mistaken interpretation.
