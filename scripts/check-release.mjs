import { configurationIssues } from "../src/lib/server/release.ts";
if (process.env.ANALYSIS_ENABLED !== "true")
  console.log("Example-only deployment: live analysis disabled.");
else {
  const issues = configurationIssues();
  if (process.env.RELEASE_READY !== "true")
    issues.push("RELEASE_READY (operator review)");
  if (process.env.VERCEL_ENV === "preview")
    issues.push("ANALYSIS_ENABLED (must be false for Preview)");
  if (issues.length) {
    console.error("Live release blocked. Check these variable names:");
    for (const name of new Set(issues)) console.error(`- ${name}`);
    process.exitCode = 1;
  } else
    console.log(
      "Live settings present. Hosted acceptance checks and operator policy review are still required.",
    );
}
