import assert from "node:assert/strict";
import { test } from "node:test";
import { importChat } from "../src/lib/chat-import";

test("Telegram JSON becomes 'Name: message' lines with day markers", () => {
  const file = JSON.stringify({
    name: "Launch",
    messages: [
      { type: "service", date: "2026-03-01T09:00:00", actor: "Sam", action: "create_group" },
      { type: "message", date: "2026-03-01T09:01:00", from: "Sam", text: "Lock the launch for 3 March?" },
      {
        type: "message",
        date: "2026-03-01T09:02:00",
        from: "Lee",
        text: ["Works. ", { type: "bold", text: "I'll draft" }, " the post."],
      },
      { type: "message", date: "2026-03-02T10:00:00", from: "Sam", text: "", photo: "photo.jpg" },
      { type: "message", date: "2026-03-02T10:01:00", from: "Sam", text: "Who books\nthe venue?" },
    ],
  });

  const result = importChat("result.json", file);
  assert.equal(result.source, "telegram");
  assert.equal(result.messages, 3, "service messages and captionless photos are skipped");
  assert.equal(
    result.text,
    "[2026-03-01]\nSam: Lock the launch for 3 March?\nLee: Works. I'll draft the post.\n[2026-03-02]\nSam: Who books the venue?",
  );
});

test("a Telegram account export with several chats asks for a single chat", () => {
  const file = JSON.stringify({ chats: { list: [{ messages: [] }, { messages: [] }] } });
  assert.throws(() => importChat("result.json", file), /several chats/);
});

test("broken JSON gives a helpful message", () => {
  assert.throws(() => importChat("result.json", "{ not json"), /Machine-readable JSON/);
});

test("WhatsApp Android export is tidied, with multi-line messages joined", () => {
  const file = [
    "01/03/2026, 09:00 - Messages and calls are end-to-end encrypted.",
    "01/03/2026, 09:01 - Sam: Lock the launch for 3 March?",
    "01/03/2026, 09:02 - Lee: Works.",
    "I'll draft the post.",
    "01/03/2026, 09:03 - Lee: <Media omitted>",
    "02/03/2026, 10:00 - Sam: Who books the venue?",
  ].join("\n");

  const result = importChat("chat.txt", file);
  assert.equal(result.source, "whatsapp");
  assert.equal(
    result.text,
    "[01/03/2026]\nSam: Lock the launch for 3 March?\nLee: Works. I'll draft the post.\n[02/03/2026]\nSam: Who books the venue?",
  );
});

test("WhatsApp iPhone export with 12-hour times is recognised", () => {
  const file = "[1/3/26, 9:01:22 AM] Sam: Lock it?\n[1/3/26, 9:02:10 AM] Lee: Yes.";
  const result = importChat("_chat.txt", file);
  assert.equal(result.source, "whatsapp");
  assert.equal(result.text, "[1/3/26]\nSam: Lock it?\nLee: Yes.");
});

test("plain text is kept as written", () => {
  const result = importChat("notes.txt", "Sam: hi\n\nLee: hello");
  assert.equal(result.source, "text");
  assert.equal(result.text, "Sam: hi\nLee: hello");
});

test("long chats keep their newest messages", () => {
  const lines = Array.from({ length: 3000 }, (_, i) => `Sam: message number ${i}`);
  const result = importChat("long.txt", lines.join("\n"));
  assert.ok(result.text.length <= 20_000);
  assert.ok(result.dropped > 0);
  assert.ok(result.text.endsWith("message number 2999"));
});
