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
  let stage = "request";
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
    stage = "ingress";
    await deps.ingress();
    stage = "identity";
    const identity = await deps.identity(request);
    stage = "verification";
    await deps.challenge(input.data.challengeToken);
    stage = "quota";
    release = await deps.reserve(identity.userId);
    const sources = input.data.conversation
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((text, index) => ({ id: index + 1, text }))
      .filter((line) => line.text.trim());
    stage = "generation";
    const output = await deps.generate(sources);
    stage = "report_validation";
    const report = reportSchema.safeParse(output);
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
    const failure = error && typeof error === "object" ? error : {};
    const rawStatus =
      "status" in failure
        ? failure.status
        : "statusCode" in failure
          ? failure.statusCode
          : undefined;
    const numericStatus =
      typeof rawStatus === "number" || typeof rawStatus === "string"
        ? Number(rawStatus)
        : 0;
    const status =
      Number.isInteger(numericStatus) && numericStatus >= 400 && numericStatus <= 599
        ? numericStatus
        : 0;
    // Log only controlled stages and HTTP codes. Provider messages can contain
    // credentials, submitted text, request headers or complete upstream URLs.
    if (!(error instanceof RequestFailure) || error.status >= 500) {
      console.error("[threadmark:analysis]", {
        stage,
        upstreamStatus: status || null,
        category: error instanceof SyntaxError ? "invalid_json" : "request_failed",
      });
    }
    if (error instanceof RequestFailure)
      return json({ error: error.message }, error.status, error.retryAfter);
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
