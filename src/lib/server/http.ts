import "server-only";

/** An error that's safe to show the visitor, with the HTTP status to send. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

/**
 * Only accept requests made by our own page. Other sites can't post here from
 * a visitor's browser. (Scripts can fake these headers, which is why bot
 * checks and rate limits still run afterwards.)
 */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    throw new HttpError(403, "Requests must come from the Threadmark page.");
  }
}

/** Reads a JSON body without letting anyone upload more than `maxBytes`. */
export async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new HttpError(415, "Send the conversation as JSON.");
  }
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) {
    throw new HttpError(413, "That conversation is too long.");
  }

  // Content-Length can lie, so check the real size too.
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new HttpError(413, "That conversation is too long.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "The request wasn't valid JSON.");
  }
}

/**
 * The visitor's IP address. On Vercel, x-vercel-forwarded-for is set by the
 * platform and can't be spoofed by the browser. Locally there's no proxy, so
 * everyone is 127.0.0.1.
 */
export function clientIp(request: Request): string {
  const header =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    "127.0.0.1";
  return header.split(",")[0].trim();
}
