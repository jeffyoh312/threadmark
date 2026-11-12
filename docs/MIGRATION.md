# Upgrade from the Google sign-in version

This is a full source replacement. Keep your existing `.git` folder and private `.env.local`, but remove files listed below. Copying only new files over an old checkout leaves obsolete authentication code behind.

## Replace the source

Copy the updated source and lockfile into your checkout. Remove these old files if they remain:

```text
src/lib/use-auth.ts
src/lib/server/auth.ts
src/lib/server/identity.ts
src/lib/server/account-status.ts
src/components/account-panel.tsx
tests/identity.test.mjs
```

The `/account` URL remains as a data/deletion information page for old links. The Firebase and jose dependencies are removed. Run `npm ci`; do not copy `node_modules` or `.next`.

## Update Vercel variables

Remove these obsolete variables from all environments:

```text
FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_APP_ID
ALLOWED_EMAILS
USER_ANALYSES_PER_MINUTE
USER_ANALYSES_PER_DAY
```

Add `RATE_LIMIT_SECRET` and use `VISITOR_ANALYSES_PER_MINUTE=2`, `VISITOR_ANALYSES_PER_DAY=5`, `SITE_CONCURRENT_ANALYSES=3`. Keep your existing `QUOTA_NAMESPACE` and `SITE_ANALYSES_PER_DAY` so the shared daily counter survives deployment. Existing per-user counters expire; visitor buckets start independently.

Remove `ALLOWED_COUNTRIES=MY` or leave the value empty if you don't want the previous country allowlist. Paid-only regional checks in unpaid mode still apply. Follow [DEPLOYMENT.md](DEPLOYMENT.md) for all required settings and the Vercel Authentication toggle.

Removing Firebase variables doesn't delete Firebase accounts. If the Firebase project was dedicated to Threadmark, review historical account records and outstanding deletion requests, then disable its Google sign-in provider. Do not delete a shared Firebase project used by other apps. Google OAuth test-user settings are irrelevant to the new application because it never starts an OAuth flow.

## Push the changes yourself

Review `git status` and the diff. Commit all intended modifications and deletions, including `package-lock.json`, but never private environment files. Run the documented checks, then push to your production branch. Redeploy after changing environment variables and complete the hosted smoke checks.

The downloadable update is based on the repository commit recorded in `docs/VALIDATION.md`. If your repository changed after that commit, reconcile those changes before replacing files.
