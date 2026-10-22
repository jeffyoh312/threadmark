import "server-only";
import { RequestFailure } from "./request-guards";
type Environment = Record<string, string | undefined>;
const REQUIRED = [
  "APP_ORIGIN",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "PUBLIC_CONTACT_EMAIL",
  "PUBLIC_OPERATOR_NAME",
];
const PAID_ONLY = new Set(
  "AT BE BG HR CY CZ DK EE FI FR DE GR HU IS IE IT LV LI LT LU MT NL NO PL PT RO SK SI ES SE CH GB".split(
    " ",
  ),
);
export function configurationIssues(env: Environment = process.env) {
  const issues = REQUIRED.filter((name) => !env[name]?.trim());
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.PUBLIC_CONTACT_EMAIL || ""))
    issues.push("PUBLIC_CONTACT_EMAIL (valid address)");
  if (env.FIREBASE_PROJECT_ID !== env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
    issues.push("FIREBASE_PROJECT_ID (must match browser project)");
  if (!["paid", "unpaid"].includes(env.GEMINI_DATA_MODE || ""))
    issues.push("GEMINI_DATA_MODE");
  if (
    env.GEMINI_API_KEY &&
    env.GEMINI_API_KEY === env.NEXT_PUBLIC_FIREBASE_API_KEY
  )
    issues.push("GEMINI_API_KEY (must differ from public Firebase key)");
  if (
    !/^[a-z0-9-]+\.firebaseapp\.com$/.test(
      env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    )
  )
    issues.push(
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN (use Firebase's default auth domain)",
    );
  if (!/^[A-Z]{2}(,[A-Z]{2})*$/.test(env.ALLOWED_COUNTRIES || "MY"))
    issues.push("ALLOWED_COUNTRIES (ISO codes)");
  if (
    /^[123]x000000/.test(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "") ||
    /^[123]x000000/.test(env.TURNSTILE_SECRET_KEY || "")
  )
    issues.push("TURNSTILE keys (test keys cannot enable live analysis)");
  try {
    const origin = new URL(env.APP_ORIGIN || "");
    if (
      origin.origin !== env.APP_ORIGIN ||
      origin.username ||
      origin.password ||
      (origin.protocol !== "https:" &&
        !(
          env.NODE_ENV === "development" &&
          ["localhost", "127.0.0.1"].includes(origin.hostname)
        ))
    )
      issues.push("APP_ORIGIN (exact HTTPS origin)");
  } catch {
    issues.push("APP_ORIGIN (valid origin)");
  }
  return issues;
}
export function publicSettings(env: Environment = process.env) {
  return {
    liveAvailable:
      env.ANALYSIS_ENABLED === "true" &&
      env.RELEASE_READY === "true" &&
      env.VERCEL_ENV !== "preview" &&
      configurationIssues(env).length === 0,
    operator: env.PUBLIC_OPERATOR_NAME?.trim() || "Khaled Morshed",
    contact: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.PUBLIC_CONTACT_EMAIL || "")
      ? env.PUBLIC_CONTACT_EMAIL!
      : "",
    dataMode:
      env.GEMINI_DATA_MODE === "paid" ? ("paid" as const) : ("unpaid" as const),
    countries: (env.ALLOWED_COUNTRIES || "MY").split(","),
  };
}
export type PublicSettings = ReturnType<typeof publicSettings>;
export function validateRelease(
  request: Request,
  env: Environment = process.env,
) {
  if (env.RELEASE_READY !== "true" || configurationIssues(env).length)
    throw new RequestFailure(
      503,
      "Live analysis is not available yet. You can explore the example.",
    );
  // Production location headers are trusted only behind Vercel ingress.
  if (
    env.NODE_ENV === "production" &&
    (env.VERCEL !== "1" || env.VERCEL_ENV !== "production")
  )
    throw new RequestFailure(
      503,
      "Live analysis is unavailable on this deployment.",
    );
  if (env.NODE_ENV !== "development") {
    const country = request.headers.get("x-vercel-ip-country") || "";
    if (
      !(env.ALLOWED_COUNTRIES || "MY").split(",").includes(country) ||
      (env.GEMINI_DATA_MODE !== "paid" && PAID_ONLY.has(country))
    )
      throw new RequestFailure(
        403,
        "Live analysis is not available in your region. You can still explore the example.",
      );
  }
}
