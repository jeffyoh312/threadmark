import "server-only";
import { analyze } from "@/lib/server/analyze";
import { requireIdentity } from "@/lib/server/auth";
import { checkIngress, reserveAnalysis } from "@/lib/server/quotas";
import { verifyChallenge } from "@/lib/server/turnstile";
import { generateReport } from "@/lib/server/gemini";
export const maxDuration = 120;
export async function POST(request: Request) {
  return analyze(request, {
    env: process.env,
    ingress: checkIngress,
    identity: requireIdentity,
    challenge: (token) =>
      verifyChallenge(
        token,
        process.env.APP_ORIGIN!,
        process.env.TURNSTILE_SECRET_KEY!,
      ),
    reserve: reserveAnalysis,
    generate: generateReport,
  });
}
