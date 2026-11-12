"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalysisResult } from "./workspace";

type Finding = AnalysisResult["report"]["findings"][number];
type Category = Finding["category"];
const categories: { key: Category; label: string; hint: string }[] = [
  {
    key: "decision",
    label: "Decisions",
    hint: "Agreements and proposed changes. Check each status before treating it as final.",
  },
  {
    key: "action",
    label: "Next steps",
    hint: "Who needs to do what. A request is not the same as an accepted task.",
  },
  {
    key: "open_question",
    label: "Needs an answer",
    hint: "Details to confirm before moving forward.",
  },
  {
    key: "date",
    label: "Important dates",
    hint: "Dates mentioned in the chat, kept in their original wording.",
  },
  {
    key: "goal",
    label: "Goals",
    hint: "What the people in this conversation want to achieve.",
  },
];
const statusLabels: Record<Finding["status"], string> = {
  confirmed: "Confirmed in chat",
  proposed: "Suggested, not agreed",
  superseded: "Replaced by a later agreement",
  unresolved: "Needs confirmation",
  reported_complete: "Reported done, not verified",
};
const statusStyles: Record<Finding["status"], string> = {
  confirmed: "bg-teal-50 text-teal-800 border-teal-200",
  proposed: "bg-amber-50 text-amber-900 border-amber-200",
  superseded: "bg-slate-100 text-slate-600 border-slate-200",
  unresolved: "bg-amber-50 text-amber-900 border-amber-200",
  reported_complete: "bg-blue-50 text-blue-800 border-blue-200",
};

function Evidence({
  finding,
  sources,
}: {
  finding: Finding;
  sources: AnalysisResult["sources"];
}) {
  const ids = new Set(finding.evidenceLineIds);
  return (
    <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60">
      <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-teal-800">
        View source messages{" "}
        <span className="font-normal text-slate-500">({ids.size} lines)</span>
      </summary>
      <div className="space-y-3 border-t border-slate-200 px-4 py-3">
        {sources
          .filter((line) => ids.has(line.id))
          .map((line) => (
            <blockquote
              key={line.id}
              className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700"
            >
              <span className="mr-2 text-xs font-medium text-slate-500">
                L{line.id}
              </span>
              {line.text}
            </blockquote>
          ))}
      </div>
    </details>
  );
}

function downloadReport(result: AnalysisResult, isExample: boolean) {
  const text = [
    `# ${result.report.title}`,
    isExample
      ? "> Prepared example. No AI request was made."
      : "> AI-generated. Check the original messages before relying on this brief.",
    ...result.report.findings.map((finding) =>
      [
        `## ${categories.find((category) => category.key === finding.category)?.label ?? "At a glance"}`,
        finding.text,
        `Status: ${statusLabels[finding.status]}`,
        `Who: ${finding.owner ?? "Not specified"}`,
        `When: ${finding.due ?? "Not specified"}`,
        `Source lines: ${finding.evidenceLineIds.join(", ")}`,
      ].join("\n\n"),
    ),
    "## Original conversation",
    ...result.sources.map((line) => `${line.id}: ${line.text}`),
  ].join("\n\n");
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/markdown;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = isExample ? "threadmark-example.md" : "threadmark-report.md";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ReportView({
  result,
  isExample,
}: {
  result: AnalysisResult;
  isExample: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const [filter, setFilter] = useState<Category | "all">("all");
  const { report, sources } = result;
  const count = (key: Category) =>
    report.findings.filter((finding) => finding.category === key).length;
  const summaries = report.findings.filter(
    (finding) => finding.category === "summary",
  );
  const confirmed = report.findings.filter(
    (finding) =>
      finding.category === "decision" && finding.status === "confirmed",
  ).length;
  const unanswered = report.findings.filter(
    (finding) =>
      finding.category === "open_question" || finding.status === "unresolved",
  ).length;
  return (
    <article className="min-w-0" aria-label="Conversation brief">
      <header className="rounded-3xl bg-[#143b35] p-6 text-white sm:p-9">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-200">
            {isExample ? "Example brief" : "Your conversation, untangled"}
          </p>
          <button
            type="button"
            onClick={() => downloadReport(result, isExample)}
            className="rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
          >
            Export brief ↓
          </button>
        </div>
        <h1
          ref={heading}
          tabIndex={-1}
          className="max-w-3xl break-words text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
        >
          {report.title}
        </h1>
        <p className="mt-4 text-sm leading-6 text-teal-100">
          {isExample
            ? "A prepared example. No AI request was made."
            : "AI can miss context. Check the source messages before acting on a finding."}
        </p>
        <div className="mt-7 grid grid-cols-3 gap-2 border-t border-white/20 pt-5 sm:gap-6">
          {[
            [confirmed, "Confirmed decisions"],
            [count("action"), "Next steps"],
            [unanswered, "Need an answer"],
          ].map(([number, label]) => (
            <div key={label}>
              <strong className="block text-3xl font-medium">{number}</strong>
              <span className="mt-1 block text-xs leading-5 text-teal-100 sm:text-sm">
                {label}
              </span>
            </div>
          ))}
        </div>
      </header>
      {summaries.length > 0 && (
        <section
          aria-labelledby="overview-heading"
          className="my-6 rounded-2xl border border-slate-200 bg-white p-6"
        >
          <h2
            id="overview-heading"
            className="mb-3 text-sm font-semibold text-slate-900"
          >
            At a glance
          </h2>
          {summaries.map((finding, index) => (
            <div key={index} className="mb-4 last:mb-0">
              <p className="break-words text-base leading-7 text-slate-700">
                {finding.text}
              </p>
              <Evidence finding={finding} sources={sources} />
            </div>
          ))}
        </section>
      )}
      <nav aria-label="Filter brief" className="my-6 flex flex-wrap gap-2">
        {[
          { key: "all" as const, label: "Everything" },
          ...categories.filter((category) => count(category.key) > 0),
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${filter === key ? "border-teal-800 bg-teal-800 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-teal-600"}`}
          >
            {label}
            {key !== "all" && (
              <span className="ml-2 opacity-75">{count(key)}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {categories
          .filter((category) => filter === "all" || filter === category.key)
          .map(({ key, label, hint }) => {
            const findings = report.findings.filter(
              (finding) => finding.category === key,
            );
            if (
              !findings.length &&
              !["decision", "action", "open_question"].includes(key)
            )
              return null;
            return (
              <section
                key={key}
                aria-labelledby={`${key}-heading`}
                className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
              >
                <div className="mb-1 flex items-center gap-3">
                  <h2 id={`${key}-heading`} className="text-lg font-semibold">
                    {label}
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                    {findings.length}
                  </span>
                </div>
                <p className="mb-5 text-sm leading-6 text-slate-500">{hint}</p>
                {!findings.length && (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                    None identified in this conversation. Check the original
                    messages if you expected something here.
                  </p>
                )}
                <div className="space-y-5">
                  {findings.map((finding, index) => (
                    <div
                      key={index}
                      className="border-t border-slate-100 pt-5 first:border-0 first:pt-0"
                    >
                      <span
                        className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-medium ${statusStyles[finding.status]}`}
                      >
                        {statusLabels[finding.status]}
                      </span>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm font-medium leading-7 text-slate-800">
                        {finding.text}
                      </p>
                      {(key === "action" || finding.owner || finding.due) && (
                        <dl className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
                          <div className="min-w-0">
                            <dt className="text-slate-500">Who</dt>
                            <dd className="mt-1 break-words font-medium text-slate-800">
                              {finding.owner || "Not assigned"}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-slate-500">When</dt>
                            <dd className="mt-1 break-words font-medium text-slate-800">
                              {finding.due || "No date given"}
                            </dd>
                          </div>
                        </dl>
                      )}
                      <Evidence finding={finding} sources={sources} />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
      </div>
      <details className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">
          Original conversation{" "}
          <span className="ml-2 font-normal text-slate-500">
            {sources.length} lines
          </span>
        </summary>
        <div className="mt-5 max-h-96 space-y-3 overflow-y-auto">
          {sources.map((line) => (
            <p
              key={line.id}
              className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700"
            >
              <span className="mr-3 text-xs text-slate-500">L{line.id}</span>
              {line.text}
            </p>
          ))}
        </div>
      </details>
    </article>
  );
}
