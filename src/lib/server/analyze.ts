import "server-only";
import { z } from "zod";
import { POLICY_VERSION } from "../policy";
import {
  reportSchema,
  MAX_CONVERSATION_CHARACTERS,
  type SourceLine,
} from "../report-schema";
import {
  readLimitedJson,
  RequestFailure,
  validateAnalysisRequest,
} from "./request-guards";
import { validateRelease } from "./release";
const inputSchema = z
  .object({
    conversation: z.string().trim().min(20).max(MAX_CONVERSATION_CHARACTERS),
    acceptedTerms: z.literal(true),
    adultConfirmed: z.literal(true),
    fictionalConfirmed: z.literal(true),
    policyVersion: z.literal(POLICY_VERSION),
    challengeToken: z.string().min(1).max(2048),
  })
  .strict();
type Dependencies = {
  env: Record<string, string | undefined>;
  ingress: () => Promise<void>;
  identity: (request: Request) => Promise<{ userId: string }>;
  challenge: (token: string) => Promise<void>;
  reserve: (uid: string) => Promise<() => Promise<void>>;
  generate: (sources: SourceLine[]) => Promise<unknown>;
};
function json(body: unknown, status = 200, retryAfter?: number) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
    },
  });
}
export async function analyze(request: Request, deps: Dependencies) {
  let release: (() => Promise<void>) | undefined;
  try {
    validateAnalysisRequest(request, deps.env.NODE_ENV, {
      enabled: deps.env.ANALYSIS_ENABLED,
      origin: deps.env.APP_ORIGIN,
      vercelEnvironment: deps.env.VERCEL_ENV,
    });
    validateRelease(request, deps.env);
    const input = inputSchema.safeParse(await readLimitedJson(request));
    if (!input.success)
      throw new RequestFailure(
        400,
        `Provide 20–${MAX_CONVERSATION_CHARACTERS.toLocaleString()} characters and complete all consent and verification steps.`,
      );
    await deps.ingress();
    const identity = await deps.identity(request);
    await deps.challenge(input.data.challengeToken);
    release = await deps.reserve(identity.userId);
    const sources = input.data.conversation
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((text, index) => ({ id: index + 1, text }))
      .filter((line) => line.text.trim());
    const report = reportSchema.safeParse(await deps.generate(sources));
    const ids = new Set(sources.map((line) => line.id));
    if (
      !report.success ||
      report.data.findings.some((finding) =>
        finding.evidenceLineIds.some((id) => !ids.has(id)),
      )
    )
      throw new RequestFailure(
        502,
        "The AI returned an invalid report. Please try again later.",
      );
    return json({ report: report.data, sources });
  } catch (error) {
    if (error instanceof RequestFailure)
      return json({ error: error.message }, error.status, error.retryAfter);
    const status =
      error && typeof error === "object" && "status" in error
        ? Number(error.status)
        : 0;
    if (status === 429)
      return json(
        { error: "The AI service is busy. Please try again later." },
        429,
        60,
      );
    // Upstream exceptions can contain private request data; never serialize them.
    return json(
      { error: "Analysis could not be completed. Please try again later." },
      502,
    );
  } finally {
    try {
      await release?.();
    } catch {
      /* The lease expires if release fails. */
    }
  }
}
