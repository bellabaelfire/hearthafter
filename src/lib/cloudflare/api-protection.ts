import { isIP } from "node:net";

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}
export interface HearthEdgeEnvironment {
  HEARTH_REGISTRY_RATE_LIMITER?: RateLimitBinding;
  HEARTH_STAFF_RATE_LIMITER?: RateLimitBinding;
  HEARTH_STUDIO_ORIGIN?: string;
}
type EdgeRequest = Request & { cf?: { colo?: unknown } };
type EdgeFetch<Environment, Context> = (request: Request, env: Environment, ctx: Context) => Promise<Response>;
const MAX_BODY_BYTES = 64 * 1024;
const BODY_DEADLINE_MS = 10_000;

function canonicalPath(request: Request): string | null {
  try { return decodeURIComponent(new URL(request.url).pathname).replace(/\\/g, "/").replace(/\/{2,}/g, "/"); }
  catch { return null; }
}
function protectedGroup(path: string | null): "registry" | "staff" | null {
  if (!path) return null;
  if (/^\/api\/content(?:\/|$)/.test(path)) return "registry";
  if (/^\/api\/(?:session|placements)(?:\/|$)/.test(path)) return "staff";
  return null;
}

function rejection(request: Request, env: HearthEdgeEnvironment, status: number, code: string, error: string, retry?: number): Response {
  const headers: Record<string,string> = {
    "Cache-Control": "no-store", "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
  };
  if (retry) headers["Retry-After"] = String(retry);
  const origin = request.headers.get("Origin");
  if (origin && origin === env.HEARTH_STUDIO_ORIGIN?.trim()) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Expose-Headers"] = "Retry-After";
  }
  return Response.json({ code, error }, { status, headers });
}
function unavailable(request: Request, env: HearthEdgeEnvironment): Response {
  return rejection(request, env, 503, "SERVICE_UNAVAILABLE", "The service is temporarily unavailable. Please try again shortly.", 30);
}
class BodyRejection extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}

/** Bound actual bytes before OpenNext can buffer or parse a request body. */
async function boundedRequest(request: Request): Promise<Request> {
  if (["GET", "HEAD"].includes(request.method) && request.body) {
    void request.body.cancel().catch(() => undefined);
    throw new BodyRejection(400,"UNEXPECTED_REQUEST_BODY","This request method does not accept a body.");
  }
  const declared = request.headers.get("Content-Length");
  if (declared !== null) {
    if (!/^\d+$/.test(declared)) throw new BodyRejection(400,"INVALID_CONTENT_LENGTH","The request length is invalid.");
    if (!Number.isSafeInteger(Number(declared)) || Number(declared) > MAX_BODY_BYTES) throw new BodyRejection(413,"REQUEST_TOO_LARGE","The request is too large.");
  }
  if (!request.body) return request;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new BodyRejection(408,"REQUEST_TIMEOUT","The request body took too long to arrive.")), BODY_DEADLINE_MS);
  });
  try {
    while (true) {
      const {done,value} = await Promise.race([reader.read(),deadline]);
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) throw new BodyRejection(413,"REQUEST_TOO_LARGE","The request is too large.");
      chunks.push(value);
    }
    const body = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk,offset); offset += chunk.byteLength; }
    return new Request(request,{body});
  } catch(error) {
    // Do not await a producer-controlled cancellation promise after our deadline.
    void reader.cancel().catch(() => undefined);
    if (error instanceof BodyRejection) throw error;
    throw new BodyRejection(400,"INVALID_REQUEST_BODY","The request body could not be read.");
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    try { reader.releaseLock(); } catch { /* A timed-out read can still be settling. */ }
  }
}

/** Runs only at the Workers ingress, before the generated Next handler or Sanity calls. */
export function withApiProtection<Environment extends HearthEdgeEnvironment, Context>(next: EdgeFetch<Environment, Context>): EdgeFetch<Environment, Context> {
  return async (request, env, ctx) => {
    const path = canonicalPath(request);
    // The custom loader sends artwork directly to Sanity. Disable OpenNext's
    // otherwise still-active original-image proxy even without an IMAGES binding.
    if (path && /^\/_next\/image(?:\/|$)/.test(path)) {
      return rejection(request,env,404,"NOT_FOUND","This resource is not available.");
    }
    const group = protectedGroup(path);
    if (group) {
      const limiter = group === "registry" ? env.HEARTH_REGISTRY_RATE_LIMITER : env.HEARTH_STAFF_RATE_LIMITER;
      if (!limiter || typeof limiter.limit !== "function") return unavailable(request,env);

      // The direct workers.dev ingress supplies both fields. Never fall back to
      // X-Forwarded-For, X-Real-IP, a query parameter, a cookie or a caller's token.
      const edge = request as EdgeRequest;
      const ip = request.headers.get("CF-Connecting-IP");
      if (typeof edge.cf?.colo !== "string" || !edge.cf.colo || !ip || !isIP(ip)) return unavailable(request,env);
      const identity = isIP(ip) === 6 ? new URL(`http://[${ip}]/`).hostname : ip;
      const key = `hearthafter:v1:${group}:${identity}`;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          limiter.limit({ key }),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Rate limiter unavailable")), 1000); }),
        ]);
        if (result?.success !== true) {
          if (result?.success === false) return rejection(request,env,429,"RATE_LIMITED","Please wait a moment before trying again.",60);
          return unavailable(request,env);
        }
      } catch {
        return unavailable(request,env);
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
    }
    // Next's converter buffers non-GET/HEAD bodies before routing, including
    // unknown pages and OPTIONS, so this bound applies to every delegated path.
    let accepted: Request;
    try { accepted = await boundedRequest(request); }
    catch(error) {
      if (error instanceof BodyRejection) return rejection(request,env,error.status,error.code,error.message);
      return unavailable(request,env);
    }
    return next(accepted, env, ctx);
  };
}
