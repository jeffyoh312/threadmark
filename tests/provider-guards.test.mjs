import test from "node:test";
import assert from "node:assert/strict";
import { verifyChallenge } from "../src/lib/server/turnstile.ts";
import { verifyAccountStatus } from "../src/lib/server/account-status.ts";
const status = (n) => (e) => e.status === n;
const response = (body) => async () => Response.json(body);
test("Turnstile enforces success, hostname and action", async () => {
  await verifyChallenge(
    "token",
    "https://threadmark.example",
    "secret",
    response({
      success: true,
      hostname: "threadmark.example",
      action: "analyze",
    }),
  );
  for (const data of [
    { success: false },
    { success: true, hostname: "attacker.example", action: "analyze" },
    { success: true, hostname: "threadmark.example", action: "login" },
  ])
    await assert.rejects(
      verifyChallenge(
        "token",
        "https://threadmark.example",
        "secret",
        response(data),
      ),
      status(403),
    );
});
test("Turnstile outage fails closed", async () => {
  await assert.rejects(
    verifyChallenge(
      "token",
      "https://threadmark.example",
      "secret",
      async () => {
        throw Error("offline");
      },
    ),
    status(503),
  );
});
test("deleted, disabled, revoked and wrong-user accounts are refused", async () => {
  const user = { localId: "user", validSince: "100" };
  await verifyAccountStatus(
    "token",
    "user",
    200,
    "key",
    response({ users: [user] }),
  );
  for (const data of [
    { users: [] },
    { users: [{ ...user, disabled: true }] },
    { users: [{ ...user, validSince: "201" }] },
    { users: [{ ...user, localId: "another" }] },
  ])
    await assert.rejects(
      verifyAccountStatus("token", "user", 200, "key", response(data)),
      status(401),
    );
});
test("Firebase outage cannot silently permit an account", async () => {
  await assert.rejects(
    verifyAccountStatus("token", "user", 200, "key", async () =>
      Response.json({}, { status: 503 }),
    ),
    status(503),
  );
});
