import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Best-effort local guard, not a substitute for credential rotation or hosted scanning.
// Only filenames and object IDs are printed; matching secret values are never logged.
const findings = new Set();
const patterns = [
  /AIza[0-9A-Za-z_-]{30,}/,
  /\bAQ[0-9A-Za-z_-]{60,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/,
  /(?:GEMINI_API_KEY|GOOGLE_API_KEY|UPSTASH_REDIS_REST_TOKEN|TURNSTILE_SECRET_KEY)[ \t]*[=:][ \t]*["']?([A-Za-z0-9_-]{20,})/,
];
function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}
function privatePath(name) {
  return (
    (/(^|\/)\.env(?:\.|$)/.test(name) &&
      !name.endsWith("/.env.example") &&
      name !== ".env.example") ||
    /\.(?:pem|key|p12|pfx)$/i.test(name) ||
    /(^|\/)(?:node_modules|\.next)\//.test(name)
  );
}
function scan(bytes, label) {
  if (bytes.includes(0)) return;
  if (patterns.some((pattern) => pattern.test(bytes.toString("utf8"))))
    findings.add(`Possible credential: ${label}`);
}
try {
  const root = git(["rev-parse", "--show-toplevel"]).trim();
  process.chdir(root);
  const tracked = git(["ls-files", "-z"]).split("\0").filter(Boolean);
  for (const name of tracked) {
    if (privatePath(name))
      findings.add(`Private/generated tracked path: ${name}`);
    if (existsSync(name)) scan(readFileSync(resolve(name)), name);
  }
  // Inspect the staged snapshot as well as working copies.
  for (const entry of git(["ls-files", "--stage", "-z"])
    .split("\0")
    .filter(Boolean)) {
    const [meta, name] = entry.split("\t");
    const oid = meta.split(" ")[1];
    scan(
      execFileSync("git", ["cat-file", "blob", oid], {
        maxBuffer: 64 * 1024 * 1024,
      }),
      `index: ${name}`,
    );
  }
  // Scan all locally available branches/tags. Unfetched remote history is not covered.
  const entries = git(["rev-list", "--objects", "--all"])
    .split("\n")
    .filter(Boolean);
  for (const entry of entries) {
    const space = entry.indexOf(" ");
    const oid = space < 0 ? entry : entry.slice(0, space);
    const name = space < 0 ? "" : entry.slice(space + 1);
    if (name && privatePath(name))
      findings.add(`Private/generated historical path: ${name}`);
    if (git(["cat-file", "-t", oid]).trim() !== "blob") continue;
    scan(
      execFileSync("git", ["cat-file", "blob", oid], {
        maxBuffer: 64 * 1024 * 1024,
      }),
      `history ${oid.slice(0, 12)} ${name}`,
    );
  }
  if (findings.size) {
    console.error(
      "Security check blocked. Review these locations before pushing:",
    );
    for (const finding of findings) console.error(`- ${finding}`);
    process.exitCode = 1;
  } else {
    console.log(
      "No known secret patterns or private paths found in tracked files, staging, or locally available Git history.",
    );
    console.log(
      "This heuristic check cannot guarantee the absence of every kind of secret.",
    );
  }
} catch {
  console.error(
    "Security check could not finish. Run it inside the Git repository with Git installed. Do not treat this as a pass.",
  );
  process.exitCode = 1;
}
