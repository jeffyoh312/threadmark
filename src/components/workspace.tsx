"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import Link from "next/link";
import type { PublicSettings } from "@/lib/server/release";
import { POLICY_VERSION } from "@/lib/policy";
import { Verification } from "@/components/verification";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/use-auth";
import type { ChangeEvent } from "react";
import { z } from "zod";
import { MAX_CONVERSATION_CHARACTERS, reportSchema } from "@/lib/report-schema";

// Response contract shared with /api/analyze.
const responseSchema = z.object({
  report: reportSchema,
  sources: z.array(
    z.object({ id: z.number().int().positive(), text: z.string() }),
  ),
});
const errorSchema = z.object({ error: z.string() });
type AnalysisResult = z.infer<typeof responseSchema>;
type Finding = AnalysisResult["report"]["findings"][number];
type Category = Finding["category"];

const MIN_CHARACTERS = 20;
const MAX_FILE_BYTES = 1024 * 1024;
const REQUEST_TIMEOUT_MS = 120_000;
const CATEGORY_LABELS: Record<Category, string> = {
  summary: "Summary",
  goal: "Goals",
  decision: "Decisions",
  action: "Actions",
  date: "Dates",
  open_question: "Open questions",
};
const secondaryButton =
  "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50/50 disabled:cursor-not-allowed disabled:opacity-50";

// The offline example uses the same response shape as live analysis.
const SAMPLE_LINES = [
  "Maya: We need to prepare our renewable energy presentation.",
  "Sara: I'll research solar energy and finish by Thursday.",
  "Adam: I'll cover wind energy by Thursday too.",
  "Maya: Let's make 12 slides. I'll combine the research.",
  "Sara: Agreed on 12 slides. Can we move research to Friday, 23 October?",
  "Adam: Friday, 23 October works. I'll finish mine then.",
  "Maya: Agreed. Both research sections due Friday, 23 October.",
  "Sara: Confirmed, I'll finish solar by Friday, 23 October.",
  "Maya: Who wants to present? We also need to agree a rehearsal time.",
];
const SAMPLE_RESULT: AnalysisResult = {
  report: {
    title: "Renewable energy presentation",
    findings: [
      {
        category: "summary",
        text: "The group is preparing a presentation on solar and wind energy. Research is due Friday, 23 October, and Maya will combine the research.",
        status: "confirmed",
        owner: null,
        due: null,
        evidenceLineIds: [1, 2, 3, 4, 7, 8],
      },
      {
        category: "decision",
        text: "Prepare 12 slides. Maya proposed the slide count and Sara agreed.",
        status: "confirmed",
        owner: null,
        due: null,
        evidenceLineIds: [4, 5],
      },
      {
        category: "decision",
        text: "Move the research deadline from Thursday to Friday, 23 October.",
        status: "confirmed",
        owner: null,
        due: "Friday, 23 October",
        evidenceLineIds: [2, 3, 5, 6, 7, 8],
      },
      {
        category: "action",
        text: "Research solar energy.",
        status: "confirmed",
        owner: "Sara",
        due: "Friday, 23 October",
        evidenceLineIds: [2, 8],
      },
      {
        category: "action",
        text: "Research wind energy.",
        status: "confirmed",
        owner: "Adam",
        due: "Friday, 23 October",
        evidenceLineIds: [3, 6],
      },
      {
        category: "action",
        text: "Combine the research into slides.",
        status: "confirmed",
        owner: "Maya",
        due: null,
        evidenceLineIds: [4],
      },
      {
        category: "open_question",
        text: "Who will present?",
        status: "unresolved",
        owner: null,
        due: null,
        evidenceLineIds: [9],
      },
      {
        category: "open_question",
        text: "When will the group rehearse?",
        status: "unresolved",
        owner: null,
        due: null,
        evidenceLineIds: [9],
      },
    ],
  },
  sources: SAMPLE_LINES.map((text, index) => ({ id: index + 1, text })),
};

// Export includes the source snapshot, independent of the active display filter.
function downloadReport(result: AnalysisResult, isExample: boolean) {
  const sections = result.report.findings.map((finding) =>
    [
      `## ${CATEGORY_LABELS[finding.category]}`,
      finding.text,
      `Status: ${finding.status.replace(/_/g, " ")}`,
      `Owner: ${finding.owner ?? "Not specified"}`,
      `Due: ${finding.due ?? "Not specified"}`,
      `Source lines: ${finding.evidenceLineIds.join(", ")}`,
    ].join("\n\n"),
  );
  const markdown = [
    `# ${result.report.title}`,
    isExample
      ? "> Predefined example. Not live AI analysis."
      : "> AI-generated report. Verify findings against the source lines.",
    ...sections,
    "## Source lines",
    ...result.sources.map((line) => `${line.id}: ${line.text}`),
  ].join("\n\n");
  const url = URL.createObjectURL(
    new Blob([markdown], {
      type: "text/markdown;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = isExample ? "threadmark-example.md" : "threadmark-report.md";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Evidence stays attached to each finding and uses the returned source snapshot.
function Evidence({
  finding,
  sources,
}: {
  finding: Finding;
  sources: AnalysisResult["sources"];
}) {
  return (
    <details className="tm-reveal mt-3">
      <summary className="w-fit cursor-pointer text-xs font-medium text-indigo-500 transition hover:text-indigo-700">
        View source{" "}
        <span className="ml-1 text-indigo-300">
          · {finding.evidenceLineIds.length}
        </span>
      </summary>
      <div className="tm-evidence mt-3 space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
        {Array.from(new Set(finding.evidenceLineIds)).map((id) => (
          <blockquote
            key={id}
            className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-600"
          >
            <span className="mr-2 text-xs font-semibold text-indigo-500">
              {id}
            </span>
            {sources.find((line) => line.id === id)?.text}
          </blockquote>
        ))}
      </div>
    </details>
  );
}

// Confirmed findings need no badge; exceptions remain explicit without implying completion.
function FindingStatus({ finding }: { finding: Finding }) {
  if (finding.status === "confirmed") return null;
  return (
    <span className="mb-2 inline-block rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
      {finding.status.replace(/_/g, " ")}
    </span>
  );
}

function ReportView({
  result,
  isExample,
}: {
  result: AnalysisResult;
  isExample: boolean;
}) {
  const { report, sources } = result;
  const inCategory = (category: Category) =>
    report.findings.filter((finding) => finding.category === category);
  const summaries = inCategory("summary");
  const decisions = inCategory("decision");
  const actions = inCategory("action");
  const questions = inCategory("open_question");
  const goals = inCategory("goal");
  const dates = inCategory("date");
  // Revisions remain in the model's supported text; no old/new values are inferred here.
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-6 pb-8 pt-8 sm:px-10 sm:pt-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500">
            {isExample ? "Example brief" : "Conversation brief"}
          </p>
          <button
            type="button"
            onClick={() => downloadReport(result, isExample)}
            className={secondaryButton}
          >
            Export brief <span aria-hidden="true">↓</span>
          </button>
        </div>
        <h1 className="max-w-3xl break-words text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {report.title}
        </h1>
        <p className="mt-4 text-xs leading-6 text-slate-400">
          {isExample
            ? "Predefined example. No AI request was made."
            : "AI-generated. Check the supporting sources before relying on a finding."}
        </p>
        {report.findings.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
            <span>{decisions.length} decisions</span>
            <span>{actions.length} actions</span>
            <span>{questions.length} open questions</span>
          </div>
        )}
      </header>
      <div className="px-6 py-8 sm:px-10 sm:py-10">
        {report.findings.length === 0 && (
          <p className="text-sm text-slate-500">
            No supported findings were returned for this conversation.
          </p>
        )}
        {summaries.length > 0 && (
          <section aria-labelledby="summary-title" className="mb-10 max-w-3xl">
            <h2
              id="summary-title"
              className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
            >
              At a glance
            </h2>
            <div className="space-y-5">
              {summaries.map((finding, index) => (
                <div key={index}>
                  <FindingStatus finding={finding} />
                  <p className="whitespace-pre-wrap break-words text-base leading-8 text-slate-600 sm:text-lg">
                    {finding.text}
                  </p>
                  <Evidence finding={finding} sources={sources} />
                </div>
              ))}
            </div>
          </section>
        )}
        <div
          className={`grid items-start gap-10 ${questions.length || dates.length ? "lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]" : "max-w-3xl"}`}
        >
          <div className="min-w-0 space-y-10">
            {decisions.length > 0 && (
              <section aria-labelledby="decisions-title">
                <h2
                  id="decisions-title"
                  className="mb-5 text-lg font-semibold tracking-tight"
                >
                  Decisions
                </h2>
                <div className="space-y-6">
                  {decisions.map((finding, index) => (
                    <div
                      key={index}
                      className="border-l-2 border-indigo-200 pl-5"
                    >
                      <FindingStatus finding={finding} />
                      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                        {finding.text}
                      </p>
                      <Evidence finding={finding} sources={sources} />
                    </div>
                  ))}
                </div>
              </section>
            )}
            {actions.length > 0 && (
              <section aria-labelledby="actions-title">
                <h2
                  id="actions-title"
                  className="mb-2 text-lg font-semibold tracking-tight"
                >
                  Next steps
                </h2>
                <div className="divide-y divide-slate-100">
                  {actions.map((finding, index) => (
                    <div key={index} className="flex gap-4 py-5">
                      <span
                        aria-hidden="true"
                        className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-semibold text-indigo-500"
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <FindingStatus finding={finding} />
                        <p className="whitespace-pre-wrap break-words text-sm font-medium leading-7 text-slate-700">
                          {finding.text}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-slate-500">
                          {finding.owner && <span>{finding.owner}</span>}
                          {finding.due && <span>Due {finding.due}</span>}
                        </div>
                        <Evidence finding={finding} sources={sources} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {goals.length > 0 && (
              <section aria-labelledby="goals-title">
                <h2
                  id="goals-title"
                  className="mb-4 text-lg font-semibold tracking-tight"
                >
                  Goals
                </h2>
                <div className="space-y-5">
                  {goals.map((finding, index) => (
                    <div key={index}>
                      <FindingStatus finding={finding} />
                      <p className="break-words text-sm leading-7 text-slate-600">
                        {finding.text}
                      </p>
                      <Evidence finding={finding} sources={sources} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
          <div className="min-w-0 space-y-8">
            {questions.length > 0 && (
              <section
                aria-labelledby="questions-title"
                className="rounded-2xl bg-slate-50 p-5 sm:p-6"
              >
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-500">
                  Still to resolve
                </p>
                <h2
                  id="questions-title"
                  className="mb-5 text-base font-semibold"
                >
                  Open questions
                </h2>
                <div className="space-y-6">
                  {questions.map((finding, index) => (
                    <div key={index}>
                      {finding.status !== "unresolved" && (
                        <FindingStatus finding={finding} />
                      )}
                      <p className="break-words text-sm leading-7 text-slate-600">
                        {finding.text}
                      </p>
                      <Evidence finding={finding} sources={sources} />
                    </div>
                  ))}
                </div>
              </section>
            )}
            {dates.length > 0 && (
              <section aria-labelledby="dates-title" className="px-1">
                <h2 id="dates-title" className="mb-5 text-base font-semibold">
                  Dates to keep in mind
                </h2>
                <div className="space-y-6">
                  {dates.map((finding, index) => (
                    <div key={index}>
                      <FindingStatus finding={finding} />
                      {finding.due && (
                        <p className="mb-1 text-xs font-semibold text-indigo-600">
                          {finding.due}
                        </p>
                      )}
                      <p className="break-words text-sm leading-7 text-slate-600">
                        {finding.text}
                      </p>
                      <Evidence finding={finding} sources={sources} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
        <details className="tm-reveal mt-10 border-t border-slate-100 pt-6">
          <summary className="cursor-pointer text-sm font-medium text-slate-500">
            Source conversation{" "}
            <span className="ml-2 text-xs font-normal text-slate-400">
              {sources.length} lines
            </span>
          </summary>
          <div className="tm-evidence mt-5 max-h-96 space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-5">
            {sources.map((line) => (
              <p
                key={line.id}
                className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-600"
              >
                <span className="mr-3 text-xs text-slate-400">{line.id}</span>
                {line.text}
              </p>
            ))}
          </div>
        </details>
      </div>
    </article>
  );
}

export default function Workspace({ settings }: { settings: PublicSettings }) {
  const auth = useAuth(settings.liveAvailable);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [fictionalConfirmed, setFictionalConfirmed] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");
  const [verificationKey, setVerificationKey] = useState(0);
  // Workspace state is intentionally temporary; refreshing clears the session.
  const [conversation, setConversation] = useState("");
  const [sourceName, setSourceName] = useState("Pasted conversation");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isExample, setIsExample] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activity, setActivity] = useState<"idle" | "importing" | "analyzing">(
    "idle",
  );
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  // Prevent duplicate operations before the disabled controls re-render.
  const operationLocked = useRef(false);

  const isBusy = activity !== "idle";
  const trimmedText = conversation.trim();
  const characterCount = trimmedText.length;
  const wordCount = trimmedText ? trimmedText.split(/\s+/).length : 0;
  const validLength =
    characterCount >= MIN_CHARACTERS &&
    characterCount <= MAX_CONVERSATION_CHARACTERS;
  // Source edits invalidate the previous report and its evidence references.
  function updateConversation(value: string) {
    setConversation(value);
    setResult(null);
    setIsExample(false);
    setIsEditing(false);
    setNotice("");
  }

  function loadExample() {
    if (operationLocked.current) return;
    setConversation(SAMPLE_LINES.join("\n"));
    setSourceName("Student project · sample");
    setResult(SAMPLE_RESULT);
    setIsExample(true);
    setIsEditing(false);
    setNotice("");
  }

  // File import is local. Text is sent to the server only on Analyze.
  async function importTextFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || operationLocked.current) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setNotice("Please choose a .txt file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setNotice("Please choose a text file smaller than 1 MB.");
      return;
    }
    operationLocked.current = true;
    setActivity("importing");
    setNotice("");
    try {
      const text = await file.text();
      if (!text.trim())
        throw new Error("This file is empty. Choose another file.");
      if (text.trim().length > MAX_CONVERSATION_CHARACTERS) {
        throw new Error(
          `Import a shorter excerpt, up to ${MAX_CONVERSATION_CHARACTERS.toLocaleString()} characters.`,
        );
      }
      updateConversation(text);
      setSourceName(file.name);
    } catch (error: unknown) {
      setNotice(
        error instanceof Error ? error.message : "The file could not be read.",
      );
    } finally {
      operationLocked.current = false;
      setActivity("idle");
    }
  }

  // The server owns Gemini credentials and provider-specific configuration.
  async function analyzeConversation() {
    if (
      operationLocked.current ||
      !validLength ||
      !acceptedTerms ||
      !adultConfirmed ||
      !fictionalConfirmed ||
      !challengeToken ||
      !auth.user ||
      !settings.liveAvailable
    )
      return;
    operationLocked.current = true;
    setActivity("analyzing");
    setNotice("");
    setResult(null);
    setIsExample(false);
    setIsEditing(false);
    const controller = new AbortController();
    // Aborting stops the browser wait; upstream processing may still continue.
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await auth.token()}`,
        },
        body: JSON.stringify({
          conversation: trimmedText,
          acceptedTerms,
          adultConfirmed,
          fictionalConfirmed,
          policyVersion: POLICY_VERSION,
          challengeToken,
        }),
        signal: controller.signal,
      });
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The server returned an unreadable response. Please try again later.",
        );
      }
      if (!response.ok) {
        const failure = errorSchema.safeParse(data);
        throw new Error(
          failure.success
            ? failure.data.error
            : `Analysis failed (HTTP ${response.status}).`,
        );
      }
      const parsed = responseSchema.safeParse(data);
      if (!parsed.success)
        throw new Error("The server returned an unexpected report format.");
      const sourceIds = new Set(parsed.data.sources.map((line) => line.id));
      if (
        sourceIds.size !== parsed.data.sources.length ||
        parsed.data.report.findings.some((finding) =>
          finding.evidenceLineIds.some((id) => !sourceIds.has(id)),
        )
      ) {
        throw new Error(
          "The report contains invalid source references. Please retry.",
        );
      }
      setResult(parsed.data);
    } catch (error: unknown) {
      setNotice(
        controller.signal.aborted
          ? "Analysis took too long. Try a shorter conversation or retry later."
          : error instanceof Error
            ? error.message
            : "Could not connect. Please try again.",
      );
    } finally {
      clearTimeout(timeout);
      setChallengeToken("");
      setVerificationKey((value) => value + 1);
      operationLocked.current = false;
      setActivity("idle");
    }
  }

  const showReport = result !== null && !isEditing;

  return (
    <main className="tm-workspace min-h-screen bg-[#f7f8fa] font-sans text-slate-900">
      <style>{`
        .tm-enter { animation: tm-enter 380ms ease-out both; }
        .tm-reveal[open] > .tm-evidence { animation: tm-enter 220ms ease-out both; }
        .tm-pulse { animation: tm-pulse 1.8s ease-in-out infinite; }
        .tm-workspace button:focus-visible, .tm-workspace summary:focus-visible { outline: 2px solid #6366f1; outline-offset: 4px; }
        @keyframes tm-enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tm-pulse { 0%,100% { opacity: .4; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .tm-workspace *, .tm-workspace *::before, .tm-workspace *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
        }
      `}</style>
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            {/* Compensates for transparent margins in the original logo asset. */}
            <div className="relative h-10 w-40 shrink-0 overflow-hidden">
              <Image
                src="/threadmark-logo.png"
                alt="Threadmark"
                width={1600}
                height={1600}
                sizes="192px"
                className="absolute left-1/2 top-1/2 w-[120%] max-w-none -translate-x-1/2 -translate-y-1/2"
                priority
              />
            </div>
            <span className="hidden rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 sm:inline">
              Preview
            </span>
          </div>
          <div className="flex max-w-xs flex-col items-end gap-1 text-xs text-slate-500">
            {auth.configured ? (
              <>
                {auth.user && (
                  <span className="max-w-44 truncate">{auth.user.email}</span>
                )}
                <button
                  type="button"
                  disabled={!auth.ready || isBusy}
                  onClick={() => {
                    if (auth.user) {
                      void auth.logout();
                      setResult(null);
                      setConversation("");
                    } else void auth.login();
                  }}
                  className="rounded-lg bg-indigo-50 px-3 py-2 font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                >
                  {!auth.ready
                    ? "Loading sign-in…"
                    : auth.user
                      ? "Sign out"
                      : "Sign in with Google"}
                </button>
              </>
            ) : (
              <span>Example mode</span>
            )}
            {!auth.user && settings.liveAvailable && (
              <p className="text-right text-[11px]">
                For adults 18+.{" "}
                <Link href="/privacy" className="underline">
                  Privacy
                </Link>{" "}
                ·{" "}
                <Link href="/terms" className="underline">
                  Terms
                </Link>
              </p>
            )}
            {auth.authError && (
              <span role="alert" className="text-right text-rose-600">
                {auth.authError}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <p role="status" className="sr-only">
          {activity === "analyzing"
            ? "Analyzing conversation."
            : showReport
              ? "Report ready."
              : "Conversation editor ready."}
        </p>
        {showReport && result ? (
          <div className="tm-enter" key="report">
            <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs font-medium text-slate-500">
                Workspace <span className="mx-2 text-slate-300">/</span>{" "}
                Conversation brief
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className={secondaryButton}
                >
                  Edit conversation
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateConversation("");
                    setSourceName("Pasted conversation");
                  }}
                  className={secondaryButton}
                >
                  New analysis
                </button>
              </div>
            </div>
            <ReportView result={result} isExample={isExample} />
          </div>
        ) : (
          <div className="tm-enter" key="editor">
            <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-indigo-600">
                  A little less noise
                </p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Find what matters.
                </h1>
                <p className="mt-3 max-w-lg text-sm leading-7 text-slate-500">
                  Bring the decisions, commitments, and next steps out of your
                  conversations.
                </p>
              </div>
              <button
                type="button"
                onClick={loadExample}
                disabled={isBusy}
                className={secondaryButton}
              >
                Explore an example <span aria-hidden="true">↗</span>
              </button>
            </div>
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <section
                aria-labelledby="source-heading"
                className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
                  <h2 id="source-heading" className="text-sm font-semibold">
                    Your conversation
                  </h2>
                  {result && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setIsEditing(false)}
                      className="text-xs font-medium text-indigo-600"
                    >
                      Back to report
                    </button>
                  )}
                </div>
                <fieldset disabled={isBusy} className="min-w-0 p-5 sm:p-6">
                  <legend className="sr-only">Conversation input</legend>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".txt,text/plain"
                    aria-label="Import a text file"
                    onChange={importTextFile}
                    className="hidden"
                  />
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <label
                      htmlFor="conversation"
                      className="min-w-0 max-w-full truncate text-xs text-slate-500"
                    >
                      {sourceName}
                    </label>
                    <div className="flex items-center gap-4">
                      {conversation && (
                        <button
                          type="button"
                          onClick={() => {
                            updateConversation("");
                            setSourceName("Pasted conversation");
                          }}
                          className="text-xs text-slate-500"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        className="text-xs font-medium text-indigo-600"
                      >
                        Import .txt <span aria-hidden="true">↑</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    id="conversation"
                    value={conversation}
                    onChange={(event) => updateConversation(event.target.value)}
                    placeholder={
                      "Paste your conversation here…\n\nMaya: Can we agree on the project deadline?\nSara: Friday works for me."
                    }
                    className="min-h-80 w-full resize-y rounded-xl border border-slate-200 bg-slate-50/40 p-4 text-sm leading-7 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 disabled:opacity-60"
                  />
                  <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-400">
                    <span>{wordCount.toLocaleString()} words</span>
                    <span
                      className={
                        characterCount > MAX_CONVERSATION_CHARACTERS
                          ? "text-amber-700"
                          : ""
                      }
                    >
                      {characterCount.toLocaleString()} /{" "}
                      {MAX_CONVERSATION_CHARACTERS.toLocaleString()} characters
                    </span>
                  </div>
                  <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 text-xs leading-6 text-slate-600">
                    <p className="font-semibold text-slate-800">
                      Before creating a brief
                    </p>
                    <p className="mt-1">
                      Use fictional or fully anonymised business conversations
                      only. Submitted text is sent to Google Gemini.
                    </p>
                    {settings.dataMode === "unpaid" && (
                      <p className="mt-2">
                        This demo uses Gemini’s unpaid service. Google may use
                        submissions to improve its products, and human reviewers
                        may review them.
                      </p>
                    )}
                    <label className="mt-3 flex items-start gap-2">
                      <input
                        className="mt-1.5 accent-indigo-600"
                        type="checkbox"
                        checked={adultConfirmed}
                        onChange={(e) => setAdultConfirmed(e.target.checked)}
                      />
                      <span>I am 18 or older.</span>
                    </label>
                    <label className="mt-2 flex items-start gap-2">
                      <input
                        className="mt-1.5 accent-indigo-600"
                        type="checkbox"
                        checked={fictionalConfirmed}
                        onChange={(e) =>
                          setFictionalConfirmed(e.target.checked)
                        }
                      />
                      <span>
                        This text contains no personal, sensitive or
                        confidential information, and I have permission to
                        submit it.
                      </span>
                    </label>
                    <label className="mt-2 flex items-start gap-2">
                      <input
                        className="mt-1.5 accent-indigo-600"
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                      />
                      <span>
                        I agree to the{" "}
                        <Link
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          Terms
                        </Link>
                        , have read the{" "}
                        <Link
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          Privacy Notice
                        </Link>
                        , and consent to this processing.
                      </span>
                    </label>
                    {!settings.liveAvailable ? (
                      <p className="mt-3 font-medium">
                        Live analysis is currently unavailable. Explore the
                        example without signing in.
                      </p>
                    ) : !auth.user ? (
                      <p className="mt-3 font-medium">
                        Sign in with Google above to run a live analysis.
                      </p>
                    ) : (
                      <Verification
                        key={verificationKey}
                        onToken={setChallengeToken}
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={analyzeConversation}
                    disabled={
                      isBusy ||
                      !validLength ||
                      !auth.user ||
                      !acceptedTerms ||
                      !adultConfirmed ||
                      !fictionalConfirmed ||
                      !challengeToken ||
                      !settings.liveAvailable
                    }
                    className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
                  >
                    {activity === "analyzing"
                      ? "Analyzing conversation…"
                      : activity === "importing"
                        ? "Reading file…"
                        : "Create conversation brief"}
                    <span aria-hidden="true">→</span>
                  </button>
                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    {MIN_CHARACTERS}–
                    {MAX_CONVERSATION_CHARACTERS.toLocaleString()} characters.
                    Text files up to 1 MB.
                  </p>
                </fieldset>
                {notice && (
                  <p
                    role="alert"
                    className="mx-6 mb-6 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800"
                  >
                    {notice}
                  </p>
                )}
              </section>
              <aside className="py-3 lg:pl-3">
                {activity === "analyzing" ? (
                  <div className="tm-enter rounded-2xl border border-indigo-100 bg-white p-7">
                    <span
                      aria-hidden="true"
                      className="tm-pulse mb-6 block h-10 w-10 rounded-xl bg-indigo-100"
                    />
                    <h2 className="text-lg font-semibold tracking-tight">
                      Making sense of the conversation.
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-slate-500">
                      Preparing your brief with findings and supporting source
                      lines. This may take a minute.
                    </p>
                    <div aria-hidden="true" className="tm-pulse mt-7 space-y-3">
                      <div className="h-2 w-full rounded bg-slate-100" />
                      <div className="h-2 w-4/5 rounded bg-slate-100" />
                      <div className="h-2 w-3/5 rounded bg-slate-100" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="mb-6 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                      From conversation to clarity
                    </p>
                    {[
                      [
                        "01",
                        "The important context",
                        "A concise overview of what the conversation is about.",
                      ],
                      [
                        "02",
                        "Decisions & next steps",
                        "What was agreed, what needs doing, and who is involved.",
                      ],
                      [
                        "03",
                        "A source for every finding",
                        "Open the original lines whenever you need to check the details.",
                      ],
                    ].map(([number, title, detail]) => (
                      <div key={number} className="mb-7 flex gap-4">
                        <span className="pt-1 text-xs font-medium text-indigo-400">
                          {number}
                        </span>
                        <div>
                          <h2 className="text-sm font-semibold text-slate-700">
                            {title}
                          </h2>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            {detail}
                          </p>
                        </div>
                      </div>
                    ))}
                    <p className="mt-9 border-t border-slate-200 pt-5 text-xs leading-6 text-slate-400">
                      Analysis sends text to Google Gemini. Use fictional
                      business conversations. This workspace clears on refresh.
                    </p>
                  </div>
                )}
              </aside>
            </div>
          </div>
        )}
        <SiteFooter />
      </div>
    </main>
  );
}
