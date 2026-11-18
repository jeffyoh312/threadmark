import { MAX_CHARACTERS } from "./report";

// Turns exported chats into the simple format Threadmark reads best:
//
//   [12/10/2026]
//   Aina: Hi! We need 100 notebooks.
//   Ben: RM10 each works.
//
// One message per line, the sender's name first, and a date line whenever the
// day changes (so "tomorrow" still means something). Everything runs in the
// browser; the file itself is never uploaded.

export type ImportResult = {
  text: string;
  source: "telegram" | "whatsapp" | "text";
  messages: number;
  /** How many of the oldest messages were left out to fit the length limit. */
  dropped: number;
};

type Message = { day?: string; from: string; text: string };

export function importChat(fileName: string, content: string): ImportResult {
  const isJson = fileName.toLowerCase().endsWith(".json") || content.trimStart().startsWith("{");
  if (isJson) return finish(parseTelegram(content), "telegram");

  const whatsapp = parseWhatsApp(content);
  if (whatsapp) return finish(whatsapp, "whatsapp");

  // Plain text: keep it as written, just trimmed to fit.
  const lines = content.replace(/\r\n?/g, "\n").split("\n").filter((line) => line.trim());
  const { kept, dropped } = keepNewest(lines);
  return { text: kept.join("\n"), source: "text", messages: lines.length, dropped };
}

// ---------- Telegram ----------

type TelegramText = string | { text?: string };
type TelegramMessage = {
  type?: string;
  date?: string;
  from?: string | null;
  text?: TelegramText | TelegramText[];
};

/**
 * Telegram Desktop: Export chat history, format "Machine-readable JSON".
 * That gives a result.json with a `messages` array. A full-account export
 * nests chats under `chats.list`; we accept it when it holds a single chat.
 */
function parseTelegram(content: string): Message[] {
  let data: { messages?: TelegramMessage[]; chats?: { list?: { messages?: TelegramMessage[] }[] } };
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error("That .json file couldn't be read. Export the chat from Telegram Desktop as \"Machine-readable JSON\".");
  }

  const chats = data.chats?.list;
  if (!data.messages && chats && chats.length > 1) {
    throw new Error("That file has several chats. In Telegram Desktop, open one chat and use Export chat history instead.");
  }
  const raw = data.messages ?? chats?.[0]?.messages;
  if (!Array.isArray(raw)) {
    throw new Error("That doesn't look like a Telegram export. Use Export chat history and pick \"Machine-readable JSON\".");
  }

  return raw
    .filter((message) => message.type === "message")
    .map((message) => ({
      day: message.date?.slice(0, 10),
      from: message.from?.trim() || "Unknown",
      text: telegramText(message.text),
    }))
    .filter((message) => message.text); // Photos and stickers without captions.
}

/** Telegram stores formatted text as a mix of strings and {type, text} pieces. */
function telegramText(text: TelegramMessage["text"]): string {
  const parts = Array.isArray(text) ? text : [text];
  return oneLine(parts.map((part) => (typeof part === "string" ? part : part?.text ?? "")).join(""));
}

// ---------- WhatsApp ----------

// Matches the start of a message in both export styles:
//   Android: 12/10/2026, 14:03 - Aina: Hi
//   iPhone:  [12/10/2026, 2:03:22 PM] Aina: Hi
const WHATSAPP_LINE =
  /^‎?\[?(\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}),?\s+\d{1,2}[:.]\d{2}(?:[:.]\d{2})?(?:\s?[ap]\.?\s?m\.?)?\]?\s*(?:-\s*)?(.*)$/i;

const WHATSAPP_SKIP = /^(<media omitted>|.*\bomitted$|this message was deleted|you deleted this message|null)$/i;

/** WhatsApp: open the chat, More, Export chat, Without media. Returns null if it isn't one. */
function parseWhatsApp(content: string): Message[] | null {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const sample = lines.filter((line) => line.trim()).slice(0, 20);
  const matches = sample.filter((line) => WHATSAPP_LINE.test(line)).length;
  if (sample.length === 0 || matches < sample.length / 2) return null;

  const messages: Message[] = [];
  for (const line of lines) {
    const match = line.match(WHATSAPP_LINE);
    if (!match) {
      // A line without a timestamp continues the previous message.
      const last = messages.at(-1);
      if (last && line.trim()) last.text = oneLine(`${last.text} ${line}`);
      continue;
    }

    const [, day, rest] = match;
    const speaker = rest.match(/^([^:]{1,60}):\s?(.*)$/);
    if (!speaker) continue; // System notices like "Messages are end-to-end encrypted".
    messages.push({ day, from: speaker[1].replace(/‎/g, "").trim(), text: oneLine(speaker[2]) });
  }

  return messages.filter((message) => message.text && !WHATSAPP_SKIP.test(message.text));
}

// ---------- Shared ----------

function oneLine(text: string) {
  return text.replace(/‎/g, "").replace(/\s+/g, " ").trim();
}

function finish(messages: Message[], source: ImportResult["source"]): ImportResult {
  if (messages.length === 0) {
    throw new Error("No text messages were found in that file.");
  }

  // Add a date line whenever the day changes, then the messages themselves.
  const lines: string[] = [];
  let currentDay: string | undefined;
  for (const message of messages) {
    if (message.day && message.day !== currentDay) {
      currentDay = message.day;
      lines.push(`[${message.day}]`);
    }
    lines.push(`${message.from}: ${message.text}`);
  }

  const { kept, dropped } = keepNewest(lines);
  const droppedMessages = dropped - countDateLines(lines.slice(0, dropped));
  return { text: kept.join("\n"), source, messages: messages.length, dropped: droppedMessages };
}

/** Long chats keep their most recent lines, since that's usually what matters. */
function keepNewest(lines: string[], limit = MAX_CHARACTERS) {
  let total = 0;
  let start = lines.length;
  while (start > 0 && total + lines[start - 1].length + 1 <= limit) {
    total += lines[start - 1].length + 1;
    start--;
  }
  return { kept: lines.slice(start), dropped: start };
}

function countDateLines(lines: string[]) {
  return lines.filter((line) => /^\[[^\]]+\]$/.test(line)).length;
}
