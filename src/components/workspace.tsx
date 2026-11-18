"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { importChat } from "@/lib/chat-import";
import { EXAMPLE_BRIEF, EXAMPLE_CONVERSATION } from "@/lib/example";
import { MAX_CHARACTERS, MIN_CHARACTERS, type Brief } from "@/lib/report";
import { BriefView } from "./brief-view";
import { FormatGuide } from "./format-guide";
import { useTurnstile } from "./use-turnstile";

const PLACEHOLDER = `Paste a conversation here, one message per line.

Sam: Can we lock the launch for 3 March?
Lee: 3 March works. I'll draft the announcement.
Sam: Great. Who's booking the venue?`;

type Status = "editing" | "working" | "done";

/**
 * The whole app on one page: paste a conversation, make a brief, read it.
 * Nothing is saved; refreshing starts over.
 */
export default function Workspace() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("editing");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [isExample, setIsExample] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(""); // Friendly info, e.g. after an import.
  const [remaining, setRemaining] = useState<number | null>(null);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const { container: botCheck, getToken } = useTurnstile();

  // Counts down after the server asks us to wait (rate limits).
  useEffect(() => {
    if (waitSeconds <= 0) return;
    const timer = setTimeout(() => setWaitSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [waitSeconds]);

  const length = text.trim().length;
  const tooShort = length < MIN_CHARACTERS;
  const tooLong = length > MAX_CHARACTERS;
  const canSubmit = status === "editing" && !tooShort && !tooLong && waitSeconds === 0;

  function showExample() {
    setText(EXAMPLE_CONVERSATION);
    setBrief(EXAMPLE_BRIEF);
    setIsExample(true);
    setError("");
    setNotice("");
    setStatus("done");
  }

  function startOver() {
    setText("");
    setBrief(null);
    setStatus("editing");
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // Allow choosing the same file again.
    if (!file) return;
    setError("");
    setNotice("");

    // Telegram exports can be big because of formatting data; only the text is kept.
    if (file.size > 20 * 1024 * 1024) {
      setError("That file is over 20 MB. Export a shorter date range, or paste the part you need.");
      return;
    }

    try {
      const result = importChat(file.name, await file.text());
      setText(result.text);

      const kind = { telegram: "Telegram", whatsapp: "WhatsApp", text: "" }[result.source];
      if (kind) setNotice(`Imported ${result.messages.toLocaleString()} ${kind} messages.`);
      if (result.dropped > 0) {
        setNotice(
          `Kept the newest messages and left out the ${result.dropped.toLocaleString()} oldest to fit ${MAX_CHARACTERS.toLocaleString()} characters.`,
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That file couldn't be read.");
    }
  }

  async function makeBrief() {
    if (!canSubmit) return;
    setStatus("working");
    setError("");

    try {
      const token = await getToken();
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: text, token }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        if (retryAfter > 0 && retryAfter <= 120) setWaitSeconds(retryAfter);
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }

      setBrief({ report: data.report, lines: data.lines });
      setIsExample(false);
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      setStatus("done");
    } catch (caught) {
      setError(
        caught instanceof TypeError
          ? "Couldn't reach Threadmark. Check your connection and try again."
          : caught instanceof Error
            ? caught.message
            : "Something went wrong. Please try again.",
      );
      setStatus("editing");
    }
  }

  if (status === "done" && brief) {
    return (
      <BriefView
        brief={brief}
        isExample={isExample}
        remaining={remaining}
        onEdit={() => setStatus("editing")}
        onStartOver={startOver}
      />
    );
  }

  const working = status === "working";

  return (
    <section className="compose" aria-labelledby="intro-title">
      <div className="intro">
        <h1 id="intro-title">Long chat. Clear next steps.</h1>
        <p>
          Paste a conversation and get back what was agreed, who&apos;s doing what, and what
          still needs an answer. Every point links to the lines it came from, so you can check it.
        </p>
      </div>

      <div className={`editor${working ? " is-working" : ""}`}>
        <label htmlFor="conversation" className="visually-hidden">
          Conversation
        </label>
        <textarea
          id="conversation"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setNotice("");
          }}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          readOnly={working}
          aria-describedby="privacy-note"
        />

        <div className="editor-bar">
          <div className="editor-tools">
            <button type="button" className="link-button" onClick={showExample} disabled={working}>
              See an example
            </button>
            <button
              type="button"
              className="link-button"
              onClick={() => fileInput.current?.click()}
              disabled={working}
            >
              Import a chat
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".txt,.json,text/plain,application/json"
              onChange={importFile}
              hidden
            />
          </div>

          <span className={`counter${tooLong ? " is-over" : ""}`} aria-live="polite">
            {length.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()}
          </span>

          <button type="button" className="primary" onClick={makeBrief} disabled={!canSubmit}>
            {working ? "Reading the chat…" : waitSeconds > 0 ? `Try again in ${waitSeconds}s` : "Make brief"}
          </button>
        </div>
      </div>

      {/* Turnstile only draws here if it needs the visitor to click. */}
      <div ref={botCheck} className="bot-check" />

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <p id="privacy-note" className="fine-print">
        Your text is sent to Google Gemini to make the brief and isn&apos;t stored with your
        name or IP. Please don&apos;t paste anything private. <a href="/privacy">Privacy</a>
      </p>

      <FormatGuide />
    </section>
  );
}
