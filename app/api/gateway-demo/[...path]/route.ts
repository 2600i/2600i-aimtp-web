import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import {
  SCENARIOS,
  SESSION_COOKIE,
  callDemoService,
  type Scenario,
} from "@/lib/gateway-demo";

/**
 * The only route on this site that talks to anything. It forwards three fixed
 * calls to the Gateway demo sidecar and nothing else.
 *
 * Written as a strict allowlist rather than a pass-through: an open proxy on a
 * public marketing site is a server-side request forgery primitive, and the
 * demo service sits on an internal Docker network where that would be worth
 * having. Only these three shapes reach it, only with these methods, and never
 * with a body.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* --- rate limiting -------------------------------------------------------- */

/*
 * Per-IP, fixed window, in memory. Deliberately modest: it exists so one
 * client cannot spin the sidecar, not as a security boundary. Process-local, so
 * it does not survive a restart and does not coordinate across replicas — the
 * sidecar enforces its own per-session cap underneath, which is the limit that
 * actually protects it.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;
const MAX_TRACKED_CLIENTS = 5_000;

const hits = new Map<string, number[]>();

function rateLimited(client: string): boolean {
  const now = Date.now();
  const recent = (hits.get(client) ?? []).filter((at) => at > now - WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    hits.set(client, recent);
    return true;
  }

  recent.push(now);
  hits.set(client, recent);

  // Bounded: drop the oldest-inserted entries rather than growing forever on a
  // stream of distinct source addresses.
  if (hits.size > MAX_TRACKED_CLIENTS) {
    for (const key of hits.keys()) {
      hits.delete(key);
      if (hits.size <= MAX_TRACKED_CLIENTS) break;
    }
  }
  return false;
}

/**
 * Behind Caddy, which terminates TLS for aimtp.net and sets x-forwarded-for
 * from Cloudflare's Cf-Connecting-Ip, so the left-most entry is the client.
 * Still spoofable by anything that reaches Caddy directly, which is why this is
 * a courtesy limit and the real cap lives in the sidecar.
 */
function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/* --- routing -------------------------------------------------------------- */

type Target = { path: string; method: "GET" | "POST" };

function resolve(segments: string[]): Target | null {
  if (segments.length === 1 && segments[0] === "state") return { path: "/api/state", method: "GET" };
  if (segments.length === 1 && segments[0] === "reset") return { path: "/api/reset", method: "POST" };
  if (segments.length === 2 && segments[0] === "scenarios") {
    const scenario = segments[1];
    if ((SCENARIOS as readonly string[]).includes(scenario)) {
      return { path: `/api/scenarios/${scenario as Scenario}`, method: "POST" };
    }
  }
  return null;
}

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", ...headers },
  });
}

async function handle(request: NextRequest, segments: string[], method: "GET" | "POST") {
  const target = resolve(segments);
  if (!target) return json(404, { error: "Not found" });
  if (target.method !== method) {
    return json(405, { error: "Method not allowed" }, { allow: target.method });
  }
  if (rateLimited(clientKey(request))) {
    return json(429, { error: "Too many requests. Give it a minute." }, { "retry-after": "60" });
  }

  const jar = await cookies();
  const session = jar.get(SESSION_COOKIE)?.value ?? null;

  const result = await callDemoService(target.path, { method, session });

  if (!result.ok && "error" in result) {
    return json(result.status, { error: result.error });
  }

  /*
   * The session id identifies one in-memory Gateway holding one visitor's
   * pending approval, so it is httpOnly — no script on the page has any use for
   * it, and a page that can read it is a page that can hand it to somebody
   * else. Lax is enough: nothing here is a cross-site form target.
   */
  if (result.ok && result.session && result.session !== session) {
    jar.set(SESSION_COOKIE, result.session, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 15,
    });
  }

  return json(result.status, result.body);
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: Context) {
  return handle(request, (await context.params).path ?? [], "GET");
}

export async function POST(request: NextRequest, context: Context) {
  return handle(request, (await context.params).path ?? [], "POST");
}
