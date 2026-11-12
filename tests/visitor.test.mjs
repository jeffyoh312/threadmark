import test from "node:test";
import assert from "node:assert/strict";
import { identifyVisitor, networkIdentity } from "../src/lib/server/visitor.ts";
const env = {
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "production",
  RATE_LIMIT_SECRET: "test-secret".repeat(4),
};
const req = (headers = {}) =>
  new Request("https://threadmark.example/api/analyze", { headers });
test("anonymous visitor uses only the platform address and a secret HMAC", async () => {
  const one = await identifyVisitor(
    req({ "x-vercel-forwarded-for": "192.0.2.10" }),
    env,
  );
  const two = await identifyVisitor(
    req({
      "x-vercel-forwarded-for": "192.0.2.10",
      "x-forwarded-for": "198.51.100.1",
      authorization: "forged",
    }),
    env,
  );
  assert.deepEqual(one, two);
  assert.match(one.visitorId, /^[a-f0-9]{64}$/);
  assert.notEqual(
    one.visitorId,
    (
      await identifyVisitor(
        req({ "x-vercel-forwarded-for": "192.0.2.11" }),
        env,
      )
    ).visitorId,
  );
});
test("missing, untrusted and ambiguous addresses fail closed", async () => {
  for (const headers of [
    {},
    { "x-forwarded-for": "192.0.2.1" },
    { "x-vercel-forwarded-for": "192.0.2.1, 198.51.100.1" },
  ])
    await assert.rejects(
      identifyVisitor(req(headers), env),
      (e) => e.status === 503,
    );
  await assert.rejects(
    identifyVisitor(req({ "x-vercel-forwarded-for": "192.0.2.1" }), {
      ...env,
      VERCEL: "0",
    }),
  );
  await assert.rejects(
    identifyVisitor(req(), { ...env, RATE_LIMIT_SECRET: "short" }),
  );
});
test("IPv6 /64 normalization covers expanded, compressed and mapped IPv4 addresses", () => {
  assert.equal(
    networkIdentity("2001:db8:1:2::1"),
    networkIdentity("2001:0db8:0001:0002:abcd:ffff:1234:5678"),
  );
  assert.notEqual(
    networkIdentity("2001:db8:1:2::1"),
    networkIdentity("2001:db8:1:3::1"),
  );
  assert.equal(networkIdentity("::ffff:192.0.2.10"), "192.0.2.10");
  assert.throws(() => networkIdentity("not-an-ip"));
});
