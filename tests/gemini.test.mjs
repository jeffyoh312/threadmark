import test from "node:test";
import assert from "node:assert/strict";
import { parseGeminiResponse } from "../src/lib/server/gemini.ts";
test("Gemini accepts only completed, valid structured reports", () => {
  const report = { title: "No agreement yet", findings: [] };
  assert.deepEqual(
    parseGeminiResponse({
      status: "completed",
      output_text: JSON.stringify(report),
    }),
    report,
  );
  for (const response of [
    { status: "in_progress", output_text: JSON.stringify(report) },
    { status: "failed", output_text: "private-provider-details" },
    { status: "completed", output_text: "" },
    { status: "completed", output_text: '{"title":' },
    { status: "completed", output_text: '{"title":"Missing findings"}' },
    { status: "completed", output_text: "x".repeat(100001) },
  ])
    assert.throws(
      () => parseGeminiResponse(response),
      (e) => e.status === 502 && !e.message.includes("private-provider"),
    );
});
