import "server-only";
import { randomUUID } from "node:crypto";
import { RESERVE_QUOTA, RELEASE_QUOTA, INGRESS_QUOTA } from "./quota-scripts";
import { RequestFailure } from "./request-guards";

function limit(name: string, fallback: number, maximum: number) {
  const raw = process.env[name];
  const value = raw ? Number(raw) : fallback;
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new RequestFailure(
      503,
      "Usage controls are not configured correctly.",
    );
  }
  return value;
}

async function redis(command: (string | number)[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token)
    throw new RequestFailure(503, "Usage controls are not configured yet.");
  // Credentials are sent only to the configured Upstash HTTPS endpoint.
  const endpoint = new URL(url);
  if (
    endpoint.protocol !== "https:" ||
    !endpoint.hostname.endsWith(".upstash.io") ||
    endpoint.username ||
    endpoint.password
  ) {
    throw new RequestFailure(
      503,
      "Usage controls are not configured correctly.",
    );
  }
  try {
    const response = await fetch(endpoint.origin, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Quota service error");
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== "object" ||
      !("result" in data) ||
      "error" in data
    )
      throw new Error("Invalid quota response");
    return data.result;
  } catch {
    // Never proceed to Gemini when the quota service cannot confirm a reservation.
    throw new RequestFailure(
      503,
      "Usage checks are temporarily unavailable. Please try later.",
    );
  }
}

export async function reserveAnalysis(visitorId: string) {
  // Share one namespace across all production deployments. Do not rotate it to reset quotas.
  const namespace = process.env.QUOTA_NAMESPACE || "threadmark:production:v1";
  if (!/^[a-zA-Z0-9:_-]{1,80}$/.test(namespace))
    throw new RequestFailure(503, "Invalid usage configuration.");
  const visitorKey = visitorId;
  const lease = randomUUID();
  const lock = `${namespace}:user:${visitorKey}:lock`;
  const keys = [
    `${namespace}:user:${visitorKey}:minute`,
    `${namespace}:user:${visitorKey}:day`,
    `${namespace}:site:day`,
    lock,
    `${namespace}:disabled`,
    `${namespace}:blocked:${visitorKey}`,
    `${namespace}:site:active`,
  ];
  const result = await redis([
    "EVAL",
    RESERVE_QUOTA,
    keys.length,
    ...keys,
    limit("VISITOR_ANALYSES_PER_MINUTE", 2, 10),
    limit("VISITOR_ANALYSES_PER_DAY", 5, 100),
    limit("SITE_ANALYSES_PER_DAY", 20, 1000),
    lease,
    limit("SITE_CONCURRENT_ANALYSES", 3, 20),
  ]);
  if (
    !Array.isArray(result) ||
    result.length !== 3 ||
    (result[0] !== 0 && result[0] !== 1)
  ) {
    throw new RequestFailure(503, "Usage checks returned an invalid response.");
  }
  if (result[0] !== 1) {
    const messages: Record<string, string> = {
      disabled: "Live analysis is temporarily paused.",
      blocked: "Analysis is unavailable for this network.",
      minute: "Please wait a minute before analyzing again.",
      user_day: "Your daily allowance is used. It resets at midnight UTC.",
      site_day:
        "Today's site allowance is used. Please return after midnight UTC.",
      site_busy: "All analysis slots are in use. Please try again shortly.",
      busy: "An analysis is already running for your network.",
    };
    throw new RequestFailure(
      result[1] === "disabled" ? 503 : result[1] === "blocked" ? 403 : 429,
      messages[String(result[1])] || "Analysis is unavailable.",
      Math.max(1, Number(result[2]) || 60),
    );
  }
  // Reservations are never refunded: failed requests still count towards the cap.
  return async () => {
    try {
      await redis([
        "EVAL",
        RELEASE_QUOTA,
        2,
        lock,
        `${namespace}:site:active`,
        lease,
      ]);
    } catch {
      /* Lease expires automatically; a failed release must not mask the report. */
    }
  };
}

export async function checkIngress(visitorId: string) {
  const namespace = process.env.QUOTA_NAMESPACE || "threadmark:production:v1";
  if (!/^[a-zA-Z0-9:_-]{1,80}$/.test(namespace))
    throw new RequestFailure(503, "Invalid usage configuration.");
  const result = await redis([
    "EVAL",
    INGRESS_QUOTA,
    3,
    `${namespace}:ingress`,
    `${namespace}:disabled`,
    `${namespace}:visitor:${visitorId}:ingress`,
    120,
    10,
  ]);
  if (!Array.isArray(result) || result.length !== 2)
    throw new RequestFailure(503, "Usage checks are unavailable.");
  if (result[0] === -1)
    throw new RequestFailure(503, "Live analysis is temporarily paused.", 60);
  if (result[0] !== 1)
    throw new RequestFailure(
      429,
      "The service is busy. Please try again shortly.",
      Number(result[1]) || 60,
    );
}
