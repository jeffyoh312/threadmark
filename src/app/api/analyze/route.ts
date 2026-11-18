import { z } from "zod";
import {
  MAX_CHARACTERS,
  MIN_CHARACTERS,
  cleanReport,
  toSourceLines,
  type Brief,
} from "@/lib/report";
import { generateReport } from "@/lib/server/gemini";
import { HttpError, assertSameOrigin, clientIp, json, readJson } from "@/lib/server/http";
import {
  cacheBrief,
  checkBurst,
  getCachedBrief,
  spendDailyAnalysis,
  visitorKey,
} from "@/lib/server/limits";
import { verifyHuman } from "@/lib/server/turnstile";

// Gemini can take a while on long chats. 60s is the Vercel Hobby ceiling.
export const maxDuration = 60;

const bodySchema = z.object({
  conversation: z.string().trim().min(MIN_CHARACTERS).max(MAX_CHARACTERS),
  token: z.string().optional(),
});

// Gemini's free tier can't be used to serve people in these regions
// (EEA, UK and Switzerland). Set GEMINI_PAID=true on a paid project to lift it.
const PAID_ONLY_REGIONS = new Set(
  "AT BE BG HR CY CZ DK EE FI FR DE GR HU IS IE IT LV LI LT LU MT NL NO PL PT RO SK SI ES SE CH GB".split(" "),
);

/**
 * POST /api/analyze
 *
 * The checks run cheapest first, so abusive traffic is turned away before it
 * costs anything: origin, burst limit, input, bot check, cache, daily quota,
 * and only then a Gemini request.
 */
export async function POST(request: Request) {
  try {
    if (process.env.ANALYSIS_ENABLED === "false") {
      throw new HttpError(503, "Live analysis is paused right now. The example still works.");
    }

    assertSameOrigin(request);

    const country = request.headers.get("x-vercel-ip-country") ?? "";
    if (process.env.GEMINI_PAID !== "true" && PAID_ONLY_REGIONS.has(country)) {
      throw new HttpError(403, "Live analysis isn't available in your region yet. The example still works.");
    }

    const ip = clientIp(request);
    const visitor = visitorKey(ip);
    await checkBurst(visitor);

    const body = bodySchema.safeParse(await readJson(request, 64 * 1024));
    if (!body.success) {
      throw new HttpError(400, `Paste between ${MIN_CHARACTERS} and ${MAX_CHARACTERS.toLocaleString()} characters.`);
    }
    const { conversation, token } = body.data;

    await verifyHuman(token, ip, request.headers.get("host"));

    const cached = await getCachedBrief(conversation);
    if (cached) return json({ ...cached, remaining: null });

    const remaining = await spendDailyAnalysis(visitor);

    const lines = toSourceLines(conversation);
    const report = cleanReport(await generateReport(lines), lines);
    if (report.findings.length === 0) {
      throw new HttpError(422, "Couldn't find anything to brief in that text. Try a conversation with a few back-and-forth messages.");
    }

    const brief: Brief = { report, lines };
    await cacheBrief(conversation, brief);
    return json({ ...brief, remaining });
  } catch (error) {
    if (error instanceof HttpError) {
      const headers: Record<string, string> = error.retryAfter
        ? { "Retry-After": String(error.retryAfter) }
        : {};
      return json({ error: error.message }, error.status, headers);
    }
    // Unknown errors might carry request details, so log the type only.
    console.error("[analyze] unexpected error", error instanceof Error ? error.name : typeof error);
    return json({ error: "Something went wrong on our side. Please try again." }, 500);
  }
}
