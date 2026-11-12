# Maintenance

Keep `report-schema.ts` as the shared output contract. The Gemini adapter owns extraction rules and response decoding; `analyze.ts` owns the ordered request workflow; `quotas.ts` and `quota-scripts.ts` own shared admission. `workspace.tsx` handles input and `report-view.tsx` handles findings, evidence and export.

Source IDs refer to original nonempty lines without renumbering after blank lines. Source edits invalidate the prior report. Never use AI-generated HTML or infer missing owners, dates or agreement status in the UI.

Keep quota defaults in `quotas.ts`, `.env.example` and documentation aligned. Keep `QUOTA_NAMESPACE` and `RATE_LIMIT_SECRET` stable across deployments. Re-run both Node and Lua tests after admission changes. Lease expiry must remain longer than the provider timeout.

Use `npm ci` and review dependency updates. Production dependency auditing is a CI gate. Test the real Turnstile/Gemini path after SDK, model, CSP or deployment changes. Do not silently add retries: they can increase cost and change reservation behavior.

| Symptom | Check |
| --- | --- |
| Example works, live button disabled | Enablement/readiness flags, required variables, Production environment and redeploy |
| Vercel asks visitors to log in | Deployment Protection settings; application login has been removed |
| Visitor verification unavailable | Vercel production environment, stable secret, platform IP header; do not trust arbitrary fallback headers |
| Turnstile fails | Hostname, site/secret pair, `analyze` action, expired token, content blockers |
| Origin rejected | Open the exact `APP_ORIGIN`, not a deployment-specific alias |
| Region rejected | Optional allowlist and actual Gemini data mode |
| 429 | `Retry-After`, visitor/site caps and available concurrency slots |
| 503 | Disabled release, missing configuration, pause switch or Redis/verification outage |
| AI output rejected | Model availability, structured-output support, completion status and output length |

Policy changes belong in the public pages and `policy.ts`. Keep English and Bahasa Melayu notices aligned. Removing Firebase from code does not delete historical account records. Never copy raw provider exceptions, conversation text or credentials into logs.
