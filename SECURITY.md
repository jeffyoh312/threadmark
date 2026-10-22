# Security

Report vulnerabilities privately to the operator contact on the deployed `/privacy` page, or through GitHub private vulnerability reporting when enabled. Do not publish credentials, user data or exploit instructions in a public issue before coordinated review. Code inspection and local testing are welcome; disruptive testing against the hosted demo is not authorised.

## Threat model

The browser and every supplied request field are untrusted. An attacker can inspect the public source, send requests without the interface, obtain a Google account, replay a token, alter consent fields or try to flood the endpoint. Firebase, Vercel ingress, Upstash, Cloudflare and Google Gemini are external trust dependencies. Compromised operator accounts, a compromised dependency and unrestricted provider billing remain operational risks.

## Implemented boundaries

- Gemini, Redis and Turnstile server secrets are read only by server-only modules. Browser configuration is limited to public Firebase/Turnstile identifiers.
- Live analysis requires explicit enablement, complete configuration, operator readiness, the exact configured origin and an allowed country. Preview and non-Vercel production deployments are denied.
- Request bodies are bounded by actual streamed bytes, not just Content-Length. JSON schema validation enforces character limits, exact consent version and affirmative confirmations. Upload reads time out.
- A shared Redis ingress ceiling precedes external authentication and bot-verification calls. It does not replace an edge firewall and itself still costs Redis traffic.
- Firebase JWT signature, issuer, audience, expiry, identity claims, verified email and Google provider are checked. Current account lookup rejects deleted/disabled accounts and revoked sessions. Network verification failure blocks analysis.
- Turnstile verification occurs on the server and checks hostname and action. Client-only challenge state is insufficient.
- Atomic Redis reservations enforce user and site allowances and a single active user lease. Provider failures consume allowance. Redis failures stop processing. Release checks lease ownership, preventing an old request from removing a newer lock.
- Gemini has a 90-second timeout, no automatic retries and a 2,048-token output bound. It receives no external tools or privileged application actions.
- Output is schema-checked, citation IDs must exist, and React renders supplied text without raw HTML. Exported Markdown remains untrusted text and should not be rendered with unsafe HTML enabled.
- Responses containing reports or errors use `no-store`. Upstream exceptions and conversation bodies are not logged by application code or returned verbatim.
- Response headers restrict framing, MIME sniffing, object embedding, permissions and network/script destinations. The CSP permits inline scripts/styles for Next.js rendering, so it is not a nonce-based strict CSP and is not an independent XSS guarantee.

## Limits and maintenance

Authentication cannot establish benevolent intent. Multiple accounts can exhaust the shared allowance. Fixed-window limits admit bursts around boundaries. Floods can consume infrastructure even when Gemini is never called. No guarantee of crash resistance, zero spending or immunity from key compromise is made.

Region checks rely on trusted Vercel ingress and IP-derived location; VPNs can evade geographic intent. Age is self-attested, not verified. The operator must assess provider rules and audience suitability before setting `RELEASE_READY=true`.

The model may misinterpret a conversation or cite a real but irrelevant line. Input is labelled untrusted in the prompt, but prompts alone do not eliminate prompt injection. Schema/reference validation checks structure, not truth. Results require human review.

All signed-in tokens are bearer credentials. In-memory browser storage reduces persistence but does not defeat malicious browser extensions or XSS. Sign-out is not global revocation. Firebase account state is checked per analysis, and an in-flight call may complete after deletion/blocking.

Use MFA, restrict credential scopes, patch dependencies and review deployments. Scan Git history before publishing. The included scanner is heuristic and cannot identify every secret format. Public Firebase keys may also match its conservative patterns; configure them through environment settings instead of hardcoding them.

Use the [deployment runbook](docs/DEPLOYMENT.md) for pause, credential rotation, blocking and hosted checks. See [validation](docs/VALIDATION.md) for test results and remaining advisory details. The source is not a penetration-test or legal-compliance certification.
