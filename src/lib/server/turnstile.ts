import "server-only";
import { RequestFailure } from "./request-guards";
export async function verifyChallenge(
  token: string,
  origin: string,
  secret: string,
  request: typeof fetch = fetch,
) {
  if (!secret || !token || token.length > 2048)
    throw new RequestFailure(
      400,
      "Complete the verification before analyzing.",
    );
  let result;
  try {
    const response = await request(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({ secret, response: token }),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) throw new Error("Verification unavailable");
    result = await response.json();
  } catch {
    throw new RequestFailure(
      503,
      "Verification is temporarily unavailable. Please try again.",
    );
  }
  if (
    result?.success !== true ||
    result.hostname !== new URL(origin).hostname ||
    result.action !== "analyze"
  )
    throw new RequestFailure(
      403,
      "Verification expired or failed. Please complete it again.",
    );
}
