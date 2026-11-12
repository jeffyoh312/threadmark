import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { RequestFailure } from "./request-guards";

// Group IPv6 privacy addresses by /64 so changing the host bits cannot reset quotas.
export function networkIdentity(ip: string): string {
  if (isIP(ip) === 4) return ip;
  if (isIP(ip) !== 6)
    throw new RequestFailure(503, "Visitor verification is unavailable.");
  const canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
  const [left, right] = canonical.split("::");
  const start = left ? left.split(":") : [];
  const end = right ? right.split(":") : [];
  const words =
    right !== undefined
      ? [...start, ...Array(8 - start.length - end.length).fill("0"), ...end]
      : start;
  const parts = words.map((word) => parseInt(word, 16));
  if (parts.slice(0, 5).every((part) => part === 0) && parts[5] === 65535)
    return [parts[6] >> 8, parts[6] & 255, parts[7] >> 8, parts[7] & 255].join(
      ".",
    );
  return (
    parts
      .slice(0, 4)
      .map((part) => part.toString(16))
      .join(":") + "::/64"
  );
}

export async function identifyVisitor(request: Request, env = process.env) {
  const secret = env.RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32)
    throw new RequestFailure(503, "Usage controls are not configured yet.");
  // Only Vercel's overwritten header is trusted. Never accept a browser-supplied ID.
  let ip: string;
  if (env.NODE_ENV === "development") ip = "127.0.0.1";
  else if (env.VERCEL === "1" && env.VERCEL_ENV === "production")
    ip = request.headers.get("x-vercel-forwarded-for")?.trim() || "";
  else throw new RequestFailure(503, "Visitor verification is unavailable.");
  const visitorId = createHmac("sha256", secret)
    .update(networkIdentity(ip))
    .digest("hex");
  return { visitorId };
}
