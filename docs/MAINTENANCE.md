# Maintenance

## Changing behavior

Keep `report-schema.ts` as the shared contract for the model response, server validation and UI. Update the extraction prompt and report presentation together when adding a finding category. Evidence IDs refer to original source lines; do not renumber after blank-line removal.

The API route wires real services into `server/analyze.ts`. Tests inject adapters at that boundary; production has no test-token or fake-identity bypass. Keep expensive work after its relevant guard and reserve quota before calling Gemini.

Quotas use Redis TIME and Lua. Change defaults in `quotas.ts` and `.env.example` together. Do not reset counters by changing the namespace between deployments. Re-run `tests/quota_lua.py` when changing admission or lease logic.

Policy changes belong in the public pages and `lib/policy.ts`. Increment the policy version for material changes so stale submissions are rejected. Confirm provider names, retention and data-use mode against actual production configuration. Keep the English and Bahasa Melayu privacy notices aligned.

## Dependencies

Use `npm ci` for reproducible installs. Review Dependabot changes, run the test suite and verify live sign-in after Firebase or CSP changes. `@grpc/grpc-js` is overridden to a patched release because Firebase's umbrella package installs an older version through unused Firestore modules. Reassess the override on Firebase upgrades and before adding Firestore.

Full audit output may include a development-only braces advisory in Next.js lint tooling. Do not silently suppress it or force-downgrade framework tooling. Record the current assessment and update when a compatible fix is available. Production dependency auditing is a CI gate.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Cannot resolve `firebase/app` | Correct project root, root package/lockfile, then clean `npm ci`; never copy `node_modules` between machines |
| Example-only badge | Enablement/readiness flags and required release settings; redeploy after changes |
| Google popup fails | Authorised Firebase domain, Google provider, OAuth publishing settings, popup blocker, CSP |
| Account verification unavailable | Firebase key API restrictions, server access to Identity Toolkit, project IDs and network availability |
| Turnstile fails | Widget hostname, site key/secret pair, action `analyze`, token expiry, browser blockers |
| Origin rejected | Open the exact stable `APP_ORIGIN`; deployment-specific aliases are intentionally denied |
| Region rejected | Trusted Vercel country, explicit allowlist and actual Gemini billing mode |
| 429 | Read Retry-After; check user/site quotas and UTC window boundaries |
| 503 | Disabled/release-incomplete deployment, provider outage, Redis pause or unavailable verification |
| AI output rejected | Model support, output length and schema; do not bypass output validation |
| Turbopack cache database error | Remove generated `.next` and rebuild; do not commit the cache |

Do not copy raw provider errors into public logs. Debug with status codes, timings and non-content operational context. Any future telemetry should exclude tokens and conversation text and be reflected in the privacy notice.
