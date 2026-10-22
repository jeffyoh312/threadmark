# Release validation

Validation date: 22 October 2026. These results apply to this source archive, not to an independently configured production deployment.

| Check | Result |
| --- | --- |
| Clean locked dependency installation | Passed |
| TypeScript type checking | Passed |
| ESLint | Passed |
| Next.js production build | Passed, with live analysis disabled |
| Source and staged secret-pattern scan | Passed; no known credential patterns found |
| Server security tests | 23 passed |
| Redis Lua quota tests | 6 passed |
| Desktop and mobile browser checks | 8 passed across isolated runs |
| Production dependency audit | No reported vulnerabilities |
| Full dependency audit | Five high-severity entries in one development dependency chain; see below |

## Security coverage

The server suite exercises signed identity claims, issuer/audience validation, account revocation/deletion checks, origin and region restrictions, consent and input validation, bot-token hostname/action checks, configuration gates, admission ordering, invalid evidence references, sanitised provider failures and lease release. External identity and model requests use test doubles. No production credentials are used.

The quota suite executes the application's Lua scripts using fakeredis with Lua support. It covers per-user and global limits, lease ownership, expiry, emergency pause, blocked accounts and the shared ingress ceiling. A concurrent 100-request test admitted exactly 20 requests under the configured site limit. This verifies atomic script behavior in the emulator; a real Upstash deployment still needs its connection, credentials and operational limits checked.

The browser suite checks the example, evidence expansion, Markdown export, reset, public policy/account pages, mobile overflow, text-only import, disabled analysis, protected environment paths and response headers. The example generated no analysis request and no captured page errors. It does not establish complete accessibility conformance.

The normal Playwright Chromium download failed in the validation environment. Browser checks therefore used a temporary Chromium 153 binary with Playwright 1.64.1. Its single-process mode could not reliably reopen browser contexts, so each test case ran in a separate invocation for both viewport projects. All eight cases passed. The temporary browser is not a project dependency and is not included in the archive. GitHub Actions installs Playwright's matching Chromium and runs the complete suite normally; that hosted workflow has not yet run for this release.

## Dependency advisory

The production-only audit reported no vulnerabilities. The full audit reported five high-severity entries associated with `GHSA-vfj7-8cjw-p6xm`, through the development chain `eslint-config-next` / `@next/eslint-plugin-next` / `fast-glob` / `micromatch` / `braces`. The resolved `braces` version is 3.0.3. No compatible patched resolution was available during validation. These dependencies are build/lint tooling, not an application analysis endpoint, but they remain part of the development supply chain.

Do not describe this as a completely clean dependency audit. Track the upstream fix and update the lockfile when a supported resolution is available. Avoid running the toolchain on untrusted repositories. The `@grpc/grpc-js` override pins 1.14.6 to address the separately identified transitive dependency issue; reassess the override when updating Firebase.

## Before live launch

Complete the hosted acceptance checklist in [DEPLOYMENT.md](DEPLOYMENT.md). Real Google popup sign-in, Cloudflare token issuance, Firebase account deletion/revocation, Upstash REST admission, Gemini output, Vercel country headers, firewall settings and secret visibility require the owner's actual services and production domain. They were not tested against live accounts in this environment.

Policy text must match actual operator identity, billing mode, intended audience and data processing. Automated tests are not legal review, penetration testing, a spending guarantee or proof that the site cannot be disrupted. Continue monitoring provider usage, dependency advisories and failed requests after deployment.

## Reproduction

GitHub Actions runs the checks without production secrets. For a development environment:

```bash
npm ci
npm run security:check
npm run test:security
python -m pip install -r tests/requirements.txt
python tests/quota_lua.py
npm run lint
npm run typecheck
npm audit --omit=dev --audit-level=high
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

The secret-pattern check requires a Git repository. It examines tracked files, the index and locally available history. It cannot detect every secret or inspect unfetched remote history. The distribution archive contains source and placeholders, not Git history, dependencies, generated output or real environment files.
