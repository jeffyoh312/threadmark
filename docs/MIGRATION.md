# Replacing an earlier project

The release has one project root: the directory containing `package.json`, `package-lock.json`, `next.config.ts`, `public/` and `src/`.

A previous working copy contained duplicate projects inside `src/`, including a second `package.json` and `src/src/`. Those copies are removed here. The reported `Can't resolve 'firebase/app'` error came from an installed dependency tree that did not provide Firebase. The dependency and lockfile are included in this release; a clean `npm ci` installs them. Copying source files does not install packages.

## Preserve before replacing

Keep the existing `.git` directory so the repository connection and history survive. Make a private backup of custom work. Do not include that backup in the repository.

For a Vercel-only deployment, `.env.local` can be deleted after the required values have been safely entered into Vercel. It is not needed by GitHub or Vercel. Never add real environment files to Git. `.env.example` belongs at the project root and contains placeholders only.

## Replacement procedure

1. Stop any development server and extract the release into a separate folder.
2. In the existing project, replace the entire old `src/` directory with the release's `src/`. This removes nested duplicates instead of merging them back in.
3. Replace `public/`, `scripts/`, `tests/`, `docs/`, and matching root files with this release. Preserve unrelated custom assets only after checking their references.
4. Remove stale root guides from the old package: `APPLY-UPDATE.md`, `VERCEL-SETUP.md` and `VALIDATION.md`. Their maintained replacements live in `docs/`.
5. Remove generated `.next/` and `node_modules/` folders from any uploaded/copied project. They are recreated by installation and build and must not be committed. Also omit generated `next-env.d.ts` and `*.tsbuildinfo` from Git.
6. The unused starter images `file.svg`, `globe.svg`, `next.svg`, `vercel.svg` and `window.svg` are removed. Keep the supplied logo and app icon.
7. `AGENTS.md` is framework/editor guidance, not an application dependency. It is not distributed in this release. Next.js may recreate it during development; it is ignored.
8. Copy the release contents into the project root, not into its `src` folder. The final layout must contain `src/app`, not `src/src/app`.

## Review before publishing

Run from the existing project directory if checking locally:

```powershell
git check-ignore .env.local
git ls-files -- .env.local
git add -A
git status --short
npm ci
npm run security:check
```

`git ls-files -- .env.local` must return nothing. If it is tracked, `git rm --cached -- .env.local` removes its tracking while keeping the local file. Rotate any exposed credential; removing a file does not remove prior commits. Review all staged deletions and replacements before committing.

The included workflow can perform code checks on GitHub without running the website locally. Vercel also installs dependencies and builds on deployment. Do not upload `node_modules` to fix the Firebase error.

A ZIP cannot change an existing GitHub repository's visibility, configure Vercel accounts or erase remote history. Those remain repository-owner actions.
