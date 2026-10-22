import { jwtVerify } from "jose";
import type { JWTVerifyGetKey } from "jose";

// Firebase token claims are trusted only after signature, issuer and audience verification.
export async function verifyFirebaseToken(
  token: string,
  projectId: string,
  keys: JWTVerifyGetKey,
) {
  const { payload } = await jwtVerify(token, keys, {
    algorithms: ["RS256"],
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    requiredClaims: ["exp", "iat", "auth_time", "sub"],
  });
  const now = Math.floor(Date.now() / 1000);
  const firebase = payload.firebase;
  if (
    !payload.sub ||
    payload.sub.length > 128 ||
    typeof payload.iat !== "number" ||
    payload.iat > now ||
    typeof payload.auth_time !== "number" ||
    payload.auth_time > now ||
    payload.email_verified !== true ||
    typeof payload.email !== "string" ||
    !firebase ||
    typeof firebase !== "object" ||
    !("sign_in_provider" in firebase) ||
    firebase.sign_in_provider !== "google.com"
  ) {
    throw new Error("Invalid identity claims");
  }
  return {
    userId: payload.sub,
    email: payload.email.toLowerCase(),
    authTime: payload.auth_time,
  };
}
