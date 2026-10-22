import "server-only";
import { verifyAccountStatus } from "./account-status";
import { createRemoteJWKSet } from "jose";
import { verifyFirebaseToken } from "./identity";
import { RequestFailure } from "./request-guards";

const keys = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
  { timeoutDuration: 5000 },
);

export async function requireIdentity(request: Request) {
  const project = process.env.FIREBASE_PROJECT_ID;
  if (!project) throw new RequestFailure(503, "Sign-in is not configured yet.");
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ") || header.length > 10000)
    throw new RequestFailure(401, "Sign in with Google before analyzing.");
  let identity;
  try {
    identity = await verifyFirebaseToken(header.slice(7), project, keys);
  } catch {
    throw new RequestFailure(
      401,
      "Your session could not be verified. Sign in again.",
    );
  }
  const allowed = (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length && !allowed.includes(identity.email))
    throw new RequestFailure(
      403,
      "This preview is limited to invited testers.",
    );
  await verifyAccountStatus(
    header.slice(7),
    identity.userId,
    identity.authTime,
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  );
  return identity;
}
