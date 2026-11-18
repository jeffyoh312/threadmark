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

/**
 * Models occasionally cite a line that doesn't exist or return a few too many
 * findings. Rather than throwing the whole report away, keep the parts we can
 * trust: drop unknown line numbers, then drop findings left with no evidence.
 */
export function cleanReport(report: Report, lines: SourceLine[]): Report {
  const known = new Set(lines.map((line) => line.id));
  const shorten = (value: string, max: number) =>
    value.length > max ? `${value.slice(0, max - 1)}…` : value;

  const findings = report.findings
    .map((finding) => ({
      ...finding,
      text: shorten(finding.text.trim(), 600),
      owner: finding.owner?.trim() ? shorten(finding.owner.trim(), 80) : null,
      due: finding.due?.trim() ? shorten(finding.due.trim(), 80) : null,
      lines: [...new Set(finding.lines)]
        .filter((id) => known.has(id))
        .sort((a, b) => a - b),
    }))
    .filter((finding) => finding.text && finding.lines.length > 0)
    .slice(0, MAX_FINDINGS);

  return { title: shorten(report.title.trim(), 120), findings };
}
