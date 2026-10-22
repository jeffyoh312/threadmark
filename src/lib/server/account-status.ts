import "server-only";
import { RequestFailure } from "./request-guards";
// Check current account state as well as JWT validity on every analysis.
export async function verifyAccountStatus(
  token: string,
  uid: string,
  authTime: number,
  apiKey: string,
  request: typeof fetch = fetch,
) {
  if (!apiKey) throw new RequestFailure(503, "Sign-in is not configured.");
  let response: Response;
  let data;
  try {
    response = await request(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      },
    );
    data = await response.json();
  } catch {
    throw new RequestFailure(
      503,
      "Account verification is temporarily unavailable.",
    );
  }
  if (response.status >= 500 || response.status === 429)
    throw new RequestFailure(
      503,
      "Account verification is temporarily unavailable.",
    );
  const user = data?.users?.[0];
  if (
    !response.ok ||
    !user ||
    user.localId !== uid ||
    user.disabled === true ||
    !/^\d+$/.test(String(user.validSince)) ||
    Number(user.validSince) > authTime
  )
    throw new RequestFailure(
      401,
      "Your account session has expired. Please sign in again.",
    );
}
