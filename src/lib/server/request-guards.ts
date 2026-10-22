// Request policy complements verified identity and shared quotas.
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
export const MAX_BODY_BYTES = 256 * 1024;

export class RequestFailure extends Error {
  readonly status: number;
  readonly retryAfter?: number;
  constructor(status: number, message: string, publicRetryAfter?: number) {
    super(message);
    this.status = status;
    this.retryAfter = publicRetryAfter;
  }
}

export function validateAnalysisRequest(
  request: Request,
  environment: string | undefined,
  config: {
    enabled?: string;
    origin?: string;
    vercelEnvironment?: string;
  } = {},
) {
  if (config.enabled !== "true" || config.vercelEnvironment === "preview") {
    throw new RequestFailure(
      503,
      "Live analysis is not enabled for this deployment.",
    );
  }
  const url = new URL(request.url);
  let allowed: string;
  try {
    const configured = new URL(config.origin || "");
    if (
      configured.origin !== config.origin ||
      configured.username ||
      configured.password ||
      (configured.protocol !== "https:" &&
        !(
          environment === "development" &&
          configured.protocol === "http:" &&
          LOOPBACK_HOSTS.has(configured.hostname)
        ))
    )
      throw new Error("Invalid origin");
    allowed = configured.origin;
  } catch {
    throw new RequestFailure(
      503,
      "The application origin is not configured correctly.",
    );
  }
  const origin = request.headers.get("origin");
  // Requests from scripts still need a valid bearer token and consume the same quota.
  if (
    url.origin !== allowed ||
    (origin && origin !== allowed) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new RequestFailure(
      403,
      "This origin is not permitted to request analysis.",
    );
  }
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    throw new RequestFailure(415, "Send the conversation as application/json.");
  }
}

// Limit actual streamed bytes; Content-Length alone is not trustworthy.
export async function readLimitedJson(request: Request): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > MAX_BODY_BYTES) {
    throw new RequestFailure(413, "The request is too large.");
  }
  if (!request.body)
    throw new RequestFailure(400, "The request must contain valid JSON.");
  const reader = request.body.getReader();
  let expired = false;
  const timeout = setTimeout(() => {
    expired = true;
    void reader.cancel().catch(() => undefined);
  }, 10_000);
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (expired)
        throw new RequestFailure(408, "The request took too long to upload.");
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        void reader.cancel().catch(() => undefined);
        throw new RequestFailure(413, "The request is too large.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      );
    } catch {
      throw new RequestFailure(400, "The request must contain valid JSON.");
    }
  } finally {
    clearTimeout(timeout);
    reader.releaseLock();
  }
}
