import test from "node:test";
import assert from "node:assert/strict";
import { verifyChallenge } from "../src/lib/server/turnstile.ts";
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
