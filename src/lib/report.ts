import { z } from "zod";

// Shared between the server (which asks Gemini for a report) and the browser
// (which renders it). Keeping one definition means the two can't drift apart.

export const MIN_CHARACTERS = 20;
export const MAX_CHARACTERS = 20_000;
export const MAX_FINDINGS = 20;

export const CATEGORIES = [
  "summary",
  "decision",
  "action",
  "open_question",
  "date",
  "goal",
] as const;

// "proposed" and "confirmed" are kept apart on purpose: a request that nobody
// agreed to should never look like an agreed task.
export const STATUSES = [
  "confirmed",
  "proposed",
  "superseded",
  "unresolved",
  "reported_complete",
] as const;

const findingSchema = z.object({
  category: z.enum(CATEGORIES),
  status: z.enum(STATUSES),
  text: z.string().min(1),
  owner: z.string().nullable(),
  due: z.string().nullable(),
  // Line numbers in the original conversation that back this finding up.
  lines: z.array(z.number().int()).min(1),
});

export const reportSchema = z.object({
  title: z.string().min(1),
  findings: z.array(findingSchema),
});

export type Finding = z.infer<typeof findingSchema>;
export type Report = z.infer<typeof reportSchema>;
export type Category = Finding["category"];
export type Status = Finding["status"];

export type SourceLine = { id: number; text: string };

export type Brief = {
  report: Report;
  lines: SourceLine[];
};

/** Splits pasted text into numbered lines, skipping blank ones. */
export function toSourceLines(text: string): SourceLine[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line, index) => ({ id: index + 1, text: line }))
    .filter((line) => line.text.trim() !== "");
}

// Things that look like credentials. Real ones never reach the model, but if
// someone pastes one or talks the model into inventing one, it's blanked out.
const SECRET_PATTERNS = [
  /\bAIza[0-9A-Za-z_-]{30,}/g, // Google API keys
  /\bsk-[A-Za-z0-9_-]{16,}/g, // OpenAI-style keys
  /\bgh[pousr]_[A-Za-z0-9]{30,}/g, // GitHub tokens
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g, // Slack tokens
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, // AWS access keys
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g, // JWTs
  /\bBearer\s+[A-Za-z0-9._~+/-]{20,}=*/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g,
];

const LINK_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>()"']+/gi;

/**
 * Last line of defence against prompt injection. Whatever the model was told
 * by a sneaky message, the brief can't contain a link that wasn't in the
 * conversation, or anything shaped like a key or token.
 */
export function makeSafe(text: string, conversation: string): string {
  let safe = text.replace(LINK_PATTERN, (link) =>
    conversation.includes(link.replace(/[.,;:!?]+$/, "")) ? link : "[link removed]",
  );
  for (const pattern of SECRET_PATTERNS) safe = safe.replace(pattern, "[removed]");
  return safe;
}

/**
 * Models occasionally cite a line that doesn't exist or return a few too many
 * findings. Rather than throwing the whole report away, keep the parts we can
 * trust: drop unknown line numbers, then drop findings left with no evidence.
 * Every piece of text also goes through `makeSafe`.
 */
export function cleanReport(report: Report, lines: SourceLine[]): Report {
  const known = new Set(lines.map((line) => line.id));
  const conversation = lines.map((line) => line.text).join("\n");
  const tidy = (value: string, max: number) => {
    const safe = makeSafe(value.trim(), conversation);
    return safe.length > max ? `${safe.slice(0, max - 1)}…` : safe;
  };

  const findings = report.findings
    .map((finding) => ({
      ...finding,
      text: tidy(finding.text, 600),
      owner: finding.owner?.trim() ? tidy(finding.owner, 80) : null,
      due: finding.due?.trim() ? tidy(finding.due, 80) : null,
      lines: [...new Set(finding.lines)]
        .filter((id) => known.has(id))
        .sort((a, b) => a - b),
    }))
    .filter((finding) => finding.text && finding.lines.length > 0)
    .slice(0, MAX_FINDINGS);

  return { title: tidy(report.title, 120), findings };
}
