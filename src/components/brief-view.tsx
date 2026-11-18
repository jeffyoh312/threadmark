"use client";

import { useEffect, useRef, useState } from "react";
import { SECTIONS, STATUS_LABELS, formatLines, toMarkdown } from "@/lib/labels";
import type { Brief, Finding } from "@/lib/report";

type Props = {
  brief: Brief;
  isExample: boolean;
  remaining: number | null;
  onEdit: () => void;
  onStartOver: () => void;
};

/**
 * The finished brief on the left, the numbered conversation on the right.
 * Selecting a finding marks the lines it came from, so every claim can be
 * checked against what people actually said.
 */
export function BriefView({ brief, isExample, remaining, onEdit, onStartOver }: Props) {
  const { report, lines } = brief;
  const [selected, setSelected] = useState<Finding | null>(null);
  const [copied, setCopied] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const transcript = useRef<HTMLOListElement>(null);

  const summary = report.findings.filter((f) => f.category === "summary");
  const marked = new Set(selected?.lines ?? []);

  // Move focus to the title so keyboard and screen reader users land on the result.
  useEffect(() => heading.current?.focus(), []);

  // Bring the first marked line into view inside the transcript panel.
  useEffect(() => {
    if (!selected) return;
    const first = transcript.current?.querySelector<HTMLElement>(`[data-line="${selected.lines[0]}"]`);
    first?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  async function copyMarkdown() {
    await navigator.clipboard.writeText(toMarkdown(brief));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const url = URL.createObjectURL(new Blob([toMarkdown(brief)], { type: "text/markdown" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brief"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <article className="brief">
      <div className="brief-toolbar">
        <div className="toolbar-group">
          <button type="button" className="secondary" onClick={onStartOver}>
            New brief
          </button>
          <button type="button" className="secondary" onClick={onEdit}>
            Edit conversation
          </button>
        </div>
        <div className="toolbar-group">
          <button type="button" className="secondary" onClick={copyMarkdown}>
            {copied ? "Copied" : "Copy as Markdown"}
          </button>
          <button type="button" className="secondary" onClick={download}>
            Download
          </button>
        </div>
      </div>

      <header className="brief-header">
        <p className="brief-kind">
          {isExample ? "Example brief, made without AI" : "Made with AI. Check the marked lines before relying on it."}
          {remaining !== null && ` ${remaining} ${remaining === 1 ? "brief" : "briefs"} left today.`}
        </p>
        <h1 ref={heading} tabIndex={-1}>
          {report.title}
        </h1>
        {summary.map((finding, index) => (
          <p key={index} className="brief-summary">
            {finding.text}
          </p>
        ))}
      </header>

      <div className="brief-layout">
        <div className="brief-sections">
          {SECTIONS.map((section) => {
            const findings = report.findings.filter((f) => f.category === section.category);
            // Always show the three core sections, even when empty: "nothing
            // was decided" is useful to know. Skip the optional ones.
            const core = ["decision", "action", "open_question"].includes(section.category);
            if (findings.length === 0 && !core) return null;

            return (
              <section key={section.category} className="section" aria-labelledby={`h-${section.category}`}>
                <h2 id={`h-${section.category}`}>
                  {section.title} <span className="count">{findings.length}</span>
                </h2>

                {findings.length === 0 ? (
                  <p className="empty">{section.empty}</p>
                ) : (
                  <ul className="findings">
                    {findings.map((finding, index) => (
                      <FindingRow
                        key={index}
                        finding={finding}
                        isAction={section.category === "action"}
                        selected={selected === finding}
                        onSelect={() => setSelected(selected === finding ? null : finding)}
                        lines={lines}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        <aside className="transcript" aria-label="Original conversation">
          <h2>Conversation</h2>
          <p className="transcript-hint">
            {selected ? `Showing ${formatLines(selected.lines)}` : "Select a point to mark where it came from."}
          </p>
          <ol ref={transcript} className="lines">
            {lines.map((line) => (
              <li key={line.id} data-line={line.id} className={marked.has(line.id) ? "is-marked" : undefined}>
                <span className="line-number" aria-hidden="true">
                  {line.id}
                </span>
                <span className="line-text">{line.text}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </article>
  );
}

function FindingRow({
  finding,
  isAction,
  selected,
  onSelect,
  lines,
}: {
  finding: Finding;
  isAction: boolean;
  selected: boolean;
  onSelect: () => void;
  lines: Brief["lines"];
}) {
  return (
    <li className={`finding${selected ? " is-selected" : ""}`}>
      <button type="button" className="finding-button" onClick={onSelect} aria-expanded={selected}>
        <span className={`status status-${finding.status}`}>{STATUS_LABELS[finding.status]}</span>
        <span className="finding-text">{finding.text}</span>

        {/* Tasks always show who and when, so a missing owner stands out.
            Other findings only show the details they actually have. */}
        {(isAction || finding.owner || finding.due) && (
          <span className="finding-meta">
            {(isAction || finding.owner) && (
              <span className={finding.owner ? "" : "is-missing"}>{finding.owner ?? "No owner"}</span>
            )}
            {(isAction || finding.due) && (
              <span className={finding.due ? "" : "is-missing"}>{finding.due ?? "No date"}</span>
            )}
          </span>
        )}
        <span className="finding-lines">{formatLines(finding.lines)}</span>
      </button>

      {/* On narrow screens the transcript sits far below, so quote the lines inline. */}
      {selected && (
        <ol className="inline-quote">
          {lines
            .filter((line) => finding.lines.includes(line.id))
            .map((line) => (
              <li key={line.id}>
                <span className="line-number">{line.id}</span> {line.text}
              </li>
            ))}
        </ol>
      )}
    </li>
  );
}
