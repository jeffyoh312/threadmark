import "server-only";
import { HttpError } from "./http";

/**
 * Checks the Cloudflare Turnstile token sent by the browser. Turnstile runs
 * invisibly for almost everyone, so real visitors never see a puzzle, but
 * scripts hammering the API can't get a valid token.
 */
export async function verifyHuman(token: unknown, ip: string, expectedHost: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    // Local development without keys: skip the check. Production must have it.
    if (process.env.NODE_ENV === "production") {
      throw new HttpError(503, "Live analysis isn't set up yet.");
    }
    return;
  }

  if (typeof token !== "string" || !token || token.length > 2048) {
    throw new HttpError(400, "The bot check didn't finish. Please try again.");
  }

  let result: { success?: boolean; hostname?: string; action?: string };
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5_000),
    });
    result = await response.json();
  } catch {
    throw new HttpError(503, "The bot check is unavailable right now. Please try again.");
  }

  // The token must be fresh, made on this site, and made for this button.
  const host = expectedHost?.split(":")[0];
  if (!result.success || result.action !== "analyze" || (host && result.hostname !== host)) {
    throw new HttpError(403, "The bot check expired. Please try again.");
  }
}
