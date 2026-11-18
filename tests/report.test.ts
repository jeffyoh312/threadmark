import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLE_BRIEF } from "../src/lib/example";
import { formatLines, toMarkdown } from "../src/lib/labels";
import { cleanReport, reportSchema, toSourceLines, type Report } from "../src/lib/report";
import { visitorKey } from "../src/lib/server/limits";

test("toSourceLines numbers lines and skips blanks", () => {
  const lines = toSourceLines("A: hi\r\n\r\nB: hello\n   \nA: bye");
  assert.deepEqual(lines, [
    { id: 1, text: "A: hi" },
    { id: 3, text: "B: hello" },
    { id: 5, text: "A: bye" },
  ]);
});

test("cleanReport drops made-up line numbers instead of failing", () => {
  const lines = toSourceLines("A: one\nB: two");
  const report: Report = {
    title: "  Test  ",
    findings: [
      { category: "decision", status: "confirmed", text: "Real", owner: " ", due: null, lines: [2, 2, 1, 99] },
      { category: "action", status: "proposed", text: "Made up", owner: null, due: null, lines: [42] },
    ],
  };

  const cleaned = cleanReport(report, lines);
  assert.equal(cleaned.title, "Test");
  assert.equal(cleaned.findings.length, 1);
  assert.deepEqual(cleaned.findings[0].lines, [1, 2]);
  assert.equal(cleaned.findings[0].owner, null, "blank owners become null");
});

test("cleanReport caps the number of findings", () => {
  const lines = toSourceLines("A: one");
  const finding = { category: "goal", status: "confirmed", text: "x", owner: null, due: null, lines: [1] } as const;
  const cleaned = cleanReport({ title: "t", findings: Array(30).fill(finding) }, lines);
  assert.equal(cleaned.findings.length, 20);
});

test("the example brief is valid and only cites real lines", () => {
  assert.ok(reportSchema.safeParse(EXAMPLE_BRIEF.report).success);
  const cleaned = cleanReport(EXAMPLE_BRIEF.report, EXAMPLE_BRIEF.lines);
  assert.equal(cleaned.findings.length, EXAMPLE_BRIEF.report.findings.length);
});

test("formatLines collapses runs into ranges", () => {
  assert.equal(formatLines([4]), "L4");
  assert.equal(formatLines([4, 5]), "L4–5");
  assert.equal(formatLines([2, 7, 8, 9]), "L2, L7–9");
});

test("toMarkdown includes sections and the conversation", () => {
  const markdown = toMarkdown(EXAMPLE_BRIEF);
  assert.match(markdown, /^# Workshop notebook order/);
  assert.match(markdown, /## Next steps/);
  assert.match(markdown, /Who: Ben; When: 25 October/);
  assert.match(markdown, /- \*\*L1\*\* Aina:/);
});

test("visitorKey hides the IP and groups IPv6 by /64", () => {
  const a = visitorKey("2001:db8:1:2:aaaa::1", "secret");
  const b = visitorKey("2001:db8:1:2:bbbb:cccc:dddd:eeee", "secret");
  const c = visitorKey("2001:db8:1:3::1", "secret");
  assert.equal(a, b, "same /64 network shares a key");
  assert.notEqual(a, c, "different networks get different keys");
  assert.doesNotMatch(visitorKey("203.0.113.9", "secret"), /203/);
});
