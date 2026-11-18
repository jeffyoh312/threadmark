import type { Brief, Category, Status } from "./report";

// Everything the reader sees about categories and statuses lives here, so the
// page and the Markdown export always use the same words.

export const SECTIONS: { category: Exclude<Category, "summary">; title: string; empty: string }[] = [
  { category: "decision", title: "Decisions", empty: "Nothing was clearly decided." },
  { category: "action", title: "Next steps", empty: "No tasks came up." },
  { category: "open_question", title: "Needs an answer", empty: "Nothing is left hanging." },
  { category: "date", title: "Dates", empty: "No dates were mentioned." },
  { category: "goal", title: "Goals", empty: "No goals were stated." },
];

export const STATUS_LABELS: Record<Status, string> = {
  confirmed: "Agreed",
  proposed: "Suggested, not agreed",
  superseded: "Replaced later",
  unresolved: "Open",
  reported_complete: "Said to be done",
};

/** "L4", "L4–5" or "L2, L7–9": compact line references. */
export function formatLines(ids: number[]): string {
  const ranges: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    const start = ids[i];
    while (ids[i + 1] === ids[i] + 1) i++;
    ranges.push(start === ids[i] ? `L${start}` : `L${start}–${ids[i]}`);
  }
  return ranges.join(", ");
}

/** The whole brief as Markdown, for copying into notes, email or a ticket. */
export function toMarkdown({ report, lines }: Brief): string {
  const out = [`# ${report.title}`, ""];

  for (const finding of report.findings.filter((f) => f.category === "summary")) {
    out.push(finding.text, "");
  }

  for (const section of SECTIONS) {
    const findings = report.findings.filter((f) => f.category === section.category);
    if (findings.length === 0) continue;

    out.push(`## ${section.title}`, "");
    for (const f of findings) {
      const details = [
        STATUS_LABELS[f.status],
        f.owner && `Who: ${f.owner}`,
        f.due && `When: ${f.due}`,
        formatLines(f.lines),
      ].filter(Boolean);
      out.push(`- ${f.text} _(${details.join("; ")})_`);
    }
    out.push("");
  }

  out.push("## Conversation", "");
  // A bullet per line, because Markdown would renumber a numbered list.
  for (const line of lines) out.push(`- **L${line.id}** ${line.text}`);
  out.push("", "_Made with Threadmark. AI can misread a chat, so check the lines before relying on this._");

  return out.join("\n");
}
