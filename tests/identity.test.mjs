import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, SignJWT } from "jose";
import { verifyFirebaseToken } from "../src/lib/server/identity.ts";
const { privateKey, publicKey } = await generateKeyPair("RS256");
const keys = async () => publicKey;
const now = Math.floor(Date.now() / 1000);
async function token(overrides = {}) {
  return new SignJWT({
    sub: "user-123",
    email: "Test@example.com",
    email_verified: true,
    firebase: { sign_in_provider: "google.com" },
    auth_time: now,
    iat: now,
    exp: now + 3600,
    iss: "https://securetoken.google.com/test-project",
    aud: "test-project",
    ...overrides,
  })
    .setProtectedHeader({ alg: "RS256" })
    .sign(privateKey);
}
test("valid Google identity is verified and normalized", async () => {
  assert.deepEqual(
    await verifyFirebaseToken(await token(), "test-project", keys),
    { userId: "user-123", email: "test@example.com", authTime: now },
  );
});
test("reject expired, wrong-project, unverified, non-Google and missing claims", async () => {
  for (const claims of [
    { exp: now - 10 },
    { aud: "other" },
    { iss: "https://attacker.example" },
    { email_verified: false },
    { firebase: { sign_in_provider: "password" } },
    { auth_time: undefined },
    { iat: now + 100 },
    { sub: "" },
  ]) {
    await assert.rejects(
      verifyFirebaseToken(await token(claims), "test-project", keys),
    );
  }
});
test("reject signatures from another key", async () => {
  const other = await generateKeyPair("RS256");
  await assert.rejects(
    verifyFirebaseToken(
      await token(),
      "test-project",
      async () => other.publicKey,
    ),
  );
});
