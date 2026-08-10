/**
 * Server-side contract with the Agent Trust Gateway demo service.
 *
 * The website has no copy of the Gateway and cannot have one: `aimtp` is a
 * private, unpublished package and this repository's build context is its own
 * source tree. So the live demo is a sidecar (docker-compose.demo.yml in the
 * protocol repo) and everything here runs on the server, proxying to it. No
 * key, no signing and no Gateway state exists on this side — which is also why
 * the browser only ever talks to this origin and `connect-src 'self'` needs no
 * exception.
 *
 * With AIMTP_DEMO_ORIGIN unset the page renders an unavailable state and points
 * at the recorded run. It does not simulate a Gateway in the frontend.
 */

export const SESSION_HEADER = "x-aimtp-demo-session";
export const SESSION_COOKIE = "aimtp_demo_session";

/** Mirrors the scenario allowlist in the demo service. Anything else is 404. */
export const SCENARIOS = ["allow", "approval", "approve", "duplicate", "replay", "unknown"] as const;
export type Scenario = (typeof SCENARIOS)[number];

/* A demo request is one in-memory Gateway call; a second of it is already an
 * outage on the other end, not a slow answer worth waiting on. */
const TIMEOUT_MS = 4000;

export function demoOrigin(): string | null {
  const origin = process.env.AIMTP_DEMO_ORIGIN?.trim();
  return origin ? origin.replace(/\/$/, "") : null;
}

export type DemoResult =
  | { ok: true; status: number; body: unknown; session: string | null }
  | { ok: false; status: number; error: string };

/**
 * One call into the demo service.
 *
 * Failure modes are collapsed into a status plus a message deliberately: the
 * page has to say "the live demo is unavailable" in a way a reader can act on,
 * and leaking the sidecar's hostname or a Node connection error into the
 * browser serves nobody.
 */
export async function callDemoService(
  path: string,
  { method = "POST", session }: { method?: string; session?: string | null } = {},
): Promise<DemoResult> {
  const origin = demoOrigin();
  if (!origin) {
    return { ok: false, status: 503, error: "The live Gateway demo is not configured for this deployment." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${origin}${path}`, {
      method,
      signal: controller.signal,
      cache: "no-store",
      headers: session ? { [SESSION_HEADER]: session } : undefined,
    });

    const body = await response.json().catch(() => null);
    if (body === null) {
      return { ok: false, status: 502, error: "The Gateway demo service returned a response this page could not read." };
    }

    return {
      ok: response.ok,
      status: response.status,
      body,
      session: response.headers.get(SESSION_HEADER),
    } as DemoResult;
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      status: aborted ? 504 : 502,
      error: aborted
        ? "The Gateway demo service did not answer in time."
        : "The Gateway demo service is unreachable.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/* --- shapes the page renders --------------------------------------------- */

export type AuditEvent = {
  event_id: string;
  request_id: string | null;
  agent_id: string | null;
  authentication_result: string;
  trust_result: string;
  policy_decision: string;
  final_outcome: string;
  reason: string;
};

export type Execution = {
  purchase_id: string;
  request_id: string;
  agent_id: string;
  item: string;
  amount: number;
  simulated: boolean;
};

export type DemoState = {
  policy: { trusted_agent: string; principal: string; automatic_limit: number; protected_action: string };
  last_scenario: string;
  last_result: { decision?: string; status?: string; reason?: string; request_id?: string; approval_id?: string } | null;
  pending_approval_id: string | null;
  executions: Execution[];
  approvals: { approval_id: string; decision: string }[];
  audit: AuditEvent[];
};
