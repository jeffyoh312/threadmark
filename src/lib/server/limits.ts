import "server-only";
import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Brief } from "../report";
import { HttpError } from "./http";

// Usage limits for the public demo, shared across every server instance
// through Upstash Redis (free tier). The numbers keep the whole site inside
// Gemini's free quota while still letting each visitor play around.
const LIMITS = {
  perVisitorPerMinute: 3,
  perVisitorPerDay: 15,
  perSitePerDay: 400,
};

// Identical conversations get the same brief back for a day without asking
// Gemini again. Pressing "Make brief" twice shouldn't cost two requests.
const CACHE_SECONDS = 60 * 60 * 24;

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

const limiter = (requests: number, window: "1 m" | "1 d", prefix: string) =>
  redis
    ? new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(requests, window), prefix })
    : null;

const minuteLimit = limiter(LIMITS.perVisitorPerMinute, "1 m", "threadmark:minute");
const dayLimit = limiter(LIMITS.perVisitorPerDay, "1 d", "threadmark:day");
const siteLimit = limiter(LIMITS.perSitePerDay, "1 d", "threadmark:site");

/**
 * Without Redis we can't enforce anything across instances. That's fine while
 * developing locally, but in production we'd rather stop than run unlimited.
 */
function assertConfigured() {
  if (!redis && process.env.NODE_ENV === "production") {
    throw new HttpError(503, "Live analysis isn't set up yet.");
  }
}

/**
 * Turns an IP address into a stable, anonymous visitor key. IPv6 addresses are
 * grouped by their /64 network, because one device can hop between many
 * addresses inside it. The raw IP is never stored.
 */
export function visitorKey(ip: string, secret = process.env.RATE_LIMIT_SECRET ?? "dev") {
  let network = ip;
  if (isIP(ip) === 6) {
    const expanded = new URL(`http://[${ip}]`).hostname.slice(1, -1);
    const [head, tail = ""] = expanded.split("::");
    const left = head ? head.split(":") : [];
    const right = tail ? tail.split(":") : [];
    const groups = expanded.includes("::")
      ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right]
      : left;
    network = `${groups.slice(0, 4).join(":")}::/64`;
  }
  return createHmac("sha256", secret).update(network).digest("hex").slice(0, 32);
}

function tooMany(message: string, reset: number): never {
  const seconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  throw new HttpError(429, message, seconds);
}

/** Cheap check that runs on every request, before any real work. */
export async function checkBurst(visitor: string) {
  assertConfigured();
  if (!minuteLimit) return;
  const result = await minuteLimit.limit(visitor);
  if (!result.success) tooMany("Slow down a little. You can try again in a minute.", result.reset);
}

/**
 * Spends one of today's analyses. Only called when we're actually about to ask
 * Gemini, so cached briefs don't count. Returns how many the visitor has left.
 */
export async function spendDailyAnalysis(visitor: string): Promise<number | null> {
  if (!dayLimit || !siteLimit) return null;

  const mine = await dayLimit.limit(visitor);
  if (!mine.success) {
    tooMany(`You've used all ${LIMITS.perVisitorPerDay} briefs for today. The example still works.`, mine.reset);
  }

  const site = await siteLimit.limit("all");
  if (!site.success) {
    tooMany("The demo has reached its limit for today. Please come back tomorrow.", site.reset);
  }

  return mine.remaining;
}

const cacheKey = (conversation: string) =>
  `threadmark:brief:${createHash("sha256").update(conversation).digest("hex")}`;

export async function getCachedBrief(conversation: string) {
  if (!redis) return null;
  try {
    return await redis.get<Brief>(cacheKey(conversation));
  } catch {
    return null; // A cache miss is never worth failing the request over.
  }
}

export async function cacheBrief(conversation: string, brief: Brief) {
  if (!redis) return;
  try {
    await redis.set(cacheKey(conversation), brief, { ex: CACHE_SECONDS });
  } catch {
    // Same as above: caching is a bonus, not a requirement.
  }
}

export { LIMITS };
