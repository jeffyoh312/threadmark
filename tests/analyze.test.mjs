import test from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../src/lib/server/analyze.ts";
import { RequestFailure } from "../src/lib/server/request-guards.ts";
import { POLICY_VERSION } from "../src/lib/policy.ts";
const env = {
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "production",
  ANALYSIS_ENABLED: "true",
  RELEASE_READY: "true",
  APP_ORIGIN: "https://threadmark.example",
  GEMINI_API_KEY: "private-test",
  GEMINI_MODEL: "test-model",
  UPSTASH_REDIS_REST_URL: "https://test.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "test-token",
  FIREBASE_PROJECT_ID: "auth-project",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "auth-project",
  NEXT_PUBLIC_FIREBASE_API_KEY: "public-test",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "auth-project.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_APP_ID: "test-app",
  TURNSTILE_SECRET_KEY: "test-secret",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "test-site",
  PUBLIC_CONTACT_EMAIL: "operator@example.com",
  PUBLIC_OPERATOR_NAME: "Test Operator",
  GEMINI_DATA_MODE: "unpaid",
  ALLOWED_COUNTRIES: "MY",
};
const input = {
  conversation:
    "Customer: Please send an invoice.\r\n\r\nSeller: I will send it today.",
  acceptedTerms: true,
  adultConfirmed: true,
  fictionalConfirmed: true,
  policyVersion: POLICY_VERSION,
  challengeToken: "test-token",
};
const report = {
  title: "Invoice",
  findings: [
    {
      category: "action",
      status: "confirmed",
      text: "Send invoice.",
      owner: "Seller",
      due: "today",
      evidenceLineIds: [3],
    },
  ],
};
function setup(overrides = {}) {
  const calls = [];
  return {
    calls,
    deps: {
      env: { ...env },
      ingress: async () => {
        calls.push("ingress");
      },
      identity: async () => {
        calls.push("identity");
        return { userId: "user" };
      },
      challenge: async () => {
        calls.push("challenge");
      },
      reserve: async () => {
        calls.push("reserve");
        return async () => {
          calls.push("release");
        };
      },
      generate: async () => {
        calls.push("generate");
        return report;
      },
      ...overrides,
    },
  };
}
function request(body = input, headers = {}) {
  return new Request(env.APP_ORIGIN + "/api/analyze", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: env.APP_ORIGIN,
      "x-vercel-ip-country": "MY",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
test("authorized analysis reserves before provider and preserves source IDs", async () => {
  const { calls, deps } = setup();
  const response = await analyze(request(), deps);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(
    (await response.json()).sources.map((s) => s.id),
    [1, 3],
  );
  assert.deepEqual(calls, [
    "ingress",
    "identity",
    "challenge",
    "reserve",
    "generate",
    "release",
  ]);
});
test("disabled, preview, unconfigured and non-Vercel production make no external calls", async () => {
  for (const config of [
    { ANALYSIS_ENABLED: "false" },
    { RELEASE_READY: "false" },
    { VERCEL_ENV: "preview" },
    { PUBLIC_CONTACT_EMAIL: "" },
    { VERCEL: "" },
    { GEMINI_API_KEY: env.NEXT_PUBLIC_FIREBASE_API_KEY },
  ]) {
    const { calls, deps } = setup({ env: { ...env, ...config } });
    assert.equal((await analyze(request(), deps)).status, 503);
    assert.deepEqual(calls, []);
  }
});
test("foreign origins and unavailable countries are denied", async () => {
  for (const headers of [
    { origin: "https://attacker.example" },
    { "x-vercel-ip-country": "GB" },
    { "x-vercel-ip-country": "" },
  ]) {
    const { calls, deps } = setup();
    assert.equal((await analyze(request(input, headers), deps)).status, 403);
    assert.deepEqual(calls, []);
  }
});
test("consent, policy, input length and unknown fields are enforced server-side", async () => {
  for (const changes of [
    { acceptedTerms: false },
    { adultConfirmed: false },
    { fictionalConfirmed: false },
    { policyVersion: "old" },
    { challengeToken: "" },
    { conversation: "short" },
    { conversation: "x".repeat(20001) },
    { model: "other" },
  ]) {
    const { calls, deps } = setup();
    assert.equal(
      (await analyze(request({ ...input, ...changes }), deps)).status,
      400,
    );
    assert.deepEqual(calls, []);
  }
});
test("authorization, verification and quota failures never reach Gemini", async () => {
  for (const [stage, status] of [
    ["ingress", 429],
    ["identity", 401],
    ["challenge", 403],
    ["reserve", 503],
    ["reserve", 429],
  ]) {
    const { calls, deps } = setup({
      [stage]: async () => {
        throw new RequestFailure(status, "Rejected", 60);
      },
    });
    const response = await analyze(request(), deps);
    assert.equal(response.status, status);
    assert.equal(response.headers.get("retry-after"), "60");
    assert.ok(!calls.includes("generate"));
  }
});
test("invalid output and fabricated citations are refused", async () => {
  for (const output of [
    {},
    { ...report, findings: [{ ...report.findings[0], evidenceLineIds: [99] }] },
  ]) {
    const { calls, deps } = setup({ generate: async () => output });
    assert.equal((await analyze(request(), deps)).status, 502);
    assert.ok(calls.includes("release"));
  }
});
test("provider errors do not expose credentials and still release leases", async () => {
  const { calls, deps } = setup({
    generate: async () => {
      throw Error("private-provider-credential");
    },
  });
  const response = await analyze(request(), deps);
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes("private-provider"));
  assert.equal(calls.at(-1), "release");
});
test("release failure does not mask a successful report", async () => {
  const { deps } = setup({
    reserve: async () => async () => {
      throw Error("offline");
    },
  });
  assert.equal((await analyze(request(), deps)).status, 200);
});
test("unpaid configuration denies paid-only regions even if allowlisted", async () => {
  const { deps } = setup({ env: { ...env, ALLOWED_COUNTRIES: "MY,GB" } });
  assert.equal(
    (await analyze(request(input, { "x-vercel-ip-country": "GB" }), deps))
      .status,
    403,
  );
});
