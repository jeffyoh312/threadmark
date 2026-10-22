import test from "node:test";
import assert from "node:assert/strict";
import {
  validateAnalysisRequest,
  readLimitedJson,
  MAX_BODY_BYTES,
} from "../src/lib/server/request-guards.ts";
const request = (
  headers = {},
  body = '{"conversation":"A fictional conversation"}',
  url = "http://localhost:3000/api/analyze",
) =>
  new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
const config = { enabled: "true", origin: "http://localhost:3000" };
const status = (code) => (error) => error.status === code;
test("production and unset environments cannot reach analysis", () => {
  for (const env of ["production", "test", undefined])
    assert.throws(() => validateAnalysisRequest(request(), env), status(503));
});
test("local browser and terminal requests are accepted", () => {
  validateAnalysisRequest(
    request({ origin: "http://localhost:3000" }),
    "development",
    config,
  );
  validateAnalysisRequest(request(), "development", config);
});
test("reject external hosts and cross-site requests", () => {
  assert.throws(
    () =>
      validateAnalysisRequest(
        request({}, "{}", "http://example.com/api/analyze"),
        "development",
        config,
      ),
    status(403),
  );
  assert.throws(
    () =>
      validateAnalysisRequest(
        request({ origin: "https://example.com" }),
        "development",
        config,
      ),
    status(403),
  );
  assert.throws(
    () =>
      validateAnalysisRequest(
        request({ "sec-fetch-site": "cross-site" }),
        "development",
        config,
      ),
    status(403),
  );
});
test("reject non-JSON content types", () =>
  assert.throws(
    () =>
      validateAnalysisRequest(
        request({ "content-type": "text/plain" }),
        "development",
        config,
      ),
    status(415),
  ));
test("parse valid JSON and reject malformed JSON", async () => {
  assert.deepEqual(await readLimitedJson(request()), {
    conversation: "A fictional conversation",
  });
  await assert.rejects(readLimitedJson(request({}, "{")), status(400));
});
test("enforce body limits with and without Content-Length", async () => {
  await assert.rejects(
    readLimitedJson(request({ "content-length": String(MAX_BODY_BYTES + 1) })),
    status(413),
  );
  await assert.rejects(
    readLimitedJson(request({}, "x".repeat(MAX_BODY_BYTES + 1))),
    status(413),
  );
});

test("production requires HTTPS and preview analysis stays disabled", () => {
  assert.throws(
    () => validateAnalysisRequest(request(), "production", config),
    status(503),
  );
  const prod = { enabled: "true", origin: "https://threadmark.example" };
  validateAnalysisRequest(
    request({}, "{}", prod.origin + "/api/analyze"),
    "production",
    prod,
  );
  assert.throws(
    () =>
      validateAnalysisRequest(
        request({}, "{}", prod.origin + "/api/analyze"),
        "production",
        { ...prod, vercelEnvironment: "preview" },
      ),
    status(503),
  );
});
