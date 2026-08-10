"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DemoState, Scenario } from "@/lib/gateway-demo";

/**
 * The eleven-beat story, as six calls into the real Gateway.
 *
 * `expect` is what the Gateway is going to answer, shown on the button before
 * it is pressed. That is a deliberate choice: a demo that only reveals the
 * verdict afterwards is indistinguishable from one that decides what to say
 * afterwards. Stating it up front and then showing the service's own `reason`
 * string underneath makes the two distinguishable.
 */
const STEPS: {
  scenario: Scenario;
  title: string;
  detail: string;
  expect: string;
  tone: "allow" | "hold" | "deny";
}[] = [
  {
    scenario: "allow",
    title: "Trusted agent asks to spend $25",
    detail: "Signed request, inside the configured limit.",
    expect: "ALLOW",
    tone: "allow",
  },
  {
    scenario: "approval",
    title: "The same agent asks to spend $250",
    detail: "Over the limit. Nothing executes yet.",
    expect: "REQUIRE_APPROVAL",
    tone: "hold",
  },
  {
    scenario: "approve",
    title: "A human approves the original request",
    detail: "The held request — not a new one — is released.",
    expect: "EXECUTED",
    tone: "allow",
  },
  {
    scenario: "duplicate",
    title: "The same approval is submitted again",
    detail: "The record was already claimed.",
    expect: "DENY",
    tone: "deny",
  },
  {
    scenario: "replay",
    title: "The signed $25 request is replayed",
    detail: "Envelope ids are single-use.",
    expect: "DENY",
    tone: "deny",
  },
  {
    scenario: "unknown",
    title: "A validly signed but unknown agent asks to spend $10",
    detail: "The signature verifies; the key maps to no configured identity.",
    expect: "DENY",
    tone: "deny",
  },
];

/** Plain-language framing for each verdict, beside the service's own reason. */
const NARRATIVE: Record<Scenario, { title: string; copy: string }> = {
  allow: {
    title: "Authorized and executed",
    copy: "The agent authenticated, its key bound to a configured identity, and the amount fell inside its authority. The simulated purchase ran.",
  },
  approval: {
    title: "Held for a person",
    copy: "Identity and trust both passed. Only the amount exceeded what this agent may do on its own, so the request is stored as a pending record and nothing downstream runs.",
  },
  approve: {
    title: "Released by a human decision",
    copy: "The operator claimed the pending record. The Gateway re-evaluated it and then executed the simulated purchase.",
  },
  duplicate: {
    title: "Duplicate approval blocked",
    copy: "That approval record had already been claimed, so it cannot release the action a second time.",
  },
  replay: {
    title: "Replay denied",
    copy: "The envelope id was already processed. A captured request cannot be resubmitted to produce a second purchase.",
  },
  unknown: {
    title: "Unknown agent denied",
    copy: "The signature is cryptographically valid. It is simply not a key this Gateway has bound to any agent, so the request is refused before policy is consulted.",
  },
};

/*
 * Long enough to read the verdict and its reason before the next step replaces
 * them — the point of the guided run is that you watch the Gateway answer, and
 * at the original 2.6s it scrolled past faster than the sentence explaining it
 * could be read. Six steps at this pace is a little under half a minute.
 */
const GUIDED_PAUSE_MS = 4200;

type Phase = "loading" | "ready" | "unavailable";

function toneOf(state: DemoState | null): "allow" | "hold" | "deny" | "idle" {
  const result = state?.last_result;
  if (!result) return "idle";
  if (result.status === "completed") return "allow";
  if (result.decision === "ALLOW") return "allow";
  if (result.decision === "REQUIRE_APPROVAL") return "hold";
  if (result.decision === "DENY") return "deny";
  return "idle";
}

function badgeOf(state: DemoState | null): string {
  const result = state?.last_result;
  if (!result) return "READY";
  if (result.status === "completed") return "ALLOW · EXECUTED";
  return result.decision ?? result.status ?? "—";
}

export function Walkthrough() {
  const [state, setState] = useState<DemoState | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [guided, setGuided] = useState(false);
  const [done, setDone] = useState<Scenario[]>([]);

  /* A guided run in flight must stop if the reader navigates away mid-sequence,
   * otherwise it keeps calling the service and setting state on a dead tree. */
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  const call = useCallback(async (path: string, method: "GET" | "POST") => {
    const response = await fetch(`/api/gateway-demo/${path}`, {
      method,
      headers: { accept: "application/json" },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body?.error ?? "The Gateway demo could not be reached.");
    }
    return body as DemoState;
  }, []);

  useEffect(() => {
    call("state", "GET")
      .then((next) => {
        if (!live.current) return;
        setState(next);
        setPhase("ready");
      })
      .catch((cause: Error) => {
        if (!live.current) return;
        setError(cause.message);
        setPhase("unavailable");
      });
  }, [call]);

  const run = useCallback(
    async (scenario: Scenario) => {
      setBusy(true);
      setError(null);
      try {
        const next = await call(`scenarios/${scenario}`, "POST");
        if (!live.current) return true;
        setState(next);
        setDone((previous) => (previous.includes(scenario) ? previous : [...previous, scenario]));
        return true;
      } catch (cause) {
        if (!live.current) return false;
        setError(cause instanceof Error ? cause.message : "Something went wrong.");
        return false;
      } finally {
        if (live.current) setBusy(false);
      }
    },
    [call],
  );

  const reset = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await call("reset", "POST");
      if (!live.current) return;
      setState(next);
      setDone([]);
    } catch (cause) {
      if (live.current) setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      if (live.current) setBusy(false);
    }
  }, [call]);

  const runGuided = useCallback(async () => {
    setGuided(true);
    setError(null);
    try {
      await call("reset", "POST").then((next) => live.current && setState(next));
      setDone([]);
      for (const step of STEPS) {
        if (!live.current) return;
        const ok = await run(step.scenario);
        if (!ok || !live.current) return;
        await new Promise((resolve) => setTimeout(resolve, GUIDED_PAUSE_MS));
      }
    } finally {
      if (live.current) setGuided(false);
    }
  }, [call, run]);

  if (phase === "loading") {
    return (
      <div className="demo-panel demo-panel--status" role="status" aria-live="polite">
        <span className="demo-spinner" aria-hidden />
        <p>Connecting to the Gateway…</p>
      </div>
    );
  }

  if (phase === "unavailable") {
    return <Unavailable reason={error} />;
  }

  const locked = busy || guided;
  const tone = toneOf(state);
  const result = state?.last_result;
  const scenario = state?.last_scenario as Scenario | undefined;
  const narrative = scenario && scenario in NARRATIVE ? NARRATIVE[scenario] : null;
  const blocked = state?.audit.filter((event) => ["denied", "rejected"].includes(event.final_outcome)).length ?? 0;

  return (
    <div className="demo">
      {/* --- controls ---------------------------------------------------- */}
      <div className="demo-controls">
        <button type="button" className="sx-btn" onClick={runGuided} disabled={locked}>
          {guided ? "Running…" : "Run the guided demo"}
        </button>
        <button type="button" className="sx-btn sx-btn--ghost" onClick={reset} disabled={locked}>
          Reset
        </button>
        <p className="demo-fine">
          Six steps, about half a minute. Every protected action is simulated.
        </p>
      </div>

      {error ? (
        <div className="demo-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="demo-grid">
        {/* --- the steps ------------------------------------------------- */}
        <section className="demo-panel" aria-labelledby="demo-steps-heading">
          <h3 id="demo-steps-heading" className="demo-panel-title">
            The sequence
          </h3>
          <ol className="demo-steps">
            {STEPS.map((step, index) => (
              <li key={step.scenario}>
                <button
                  type="button"
                  className="demo-step"
                  data-tone={step.tone}
                  data-done={done.includes(step.scenario)}
                  data-active={scenario === step.scenario}
                  onClick={() => run(step.scenario)}
                  disabled={locked}
                >
                  <span className="demo-step-index mono">{index + 1}</span>
                  <span className="demo-step-body">
                    <span className="demo-step-title">{step.title}</span>
                    <span className="demo-step-detail">{step.detail}</span>
                  </span>
                  <span className="demo-step-expect mono">{step.expect}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="demo-note">
            Steps can be run in order or on their own. Approving before anything is held, or replaying
            a request that was never sent, is refused — the demo will say so.
          </p>
        </section>

        {/* --- the verdict ----------------------------------------------- */}
        <section className="demo-panel" aria-labelledby="demo-verdict-heading">
          <h3 id="demo-verdict-heading" className="demo-panel-title">
            Gateway decision
          </h3>

          <div className="demo-verdict" data-tone={tone} aria-live="polite">
            <span className="demo-badge mono">{badgeOf(state)}</span>
            <p className="demo-verdict-title">
              {narrative ? narrative.title : "Waiting for an agent request"}
            </p>
            <p className="demo-verdict-copy">
              {narrative
                ? narrative.copy
                : "The Gateway will verify the signature, bind the key to a configured agent, check freshness and single use, then evaluate policy."}
            </p>
            {result?.reason ? (
              <p className="demo-reason mono">
                <span>gateway reason</span>
                {result.reason}
              </p>
            ) : null}
          </div>

          <dl className="demo-metrics">
            <div>
              <dt>Simulated purchases</dt>
              <dd className="mono">{state?.executions.length ?? 0}</dd>
            </div>
            {/* "Denials recorded", not "requests blocked". A duplicate approval
                is refused on the operator path and appends no audit event, so a
                counter read from the trail would undercount blocking and imply
                the demo had let something through. */}
            <div>
              <dt>Denials recorded</dt>
              <dd className="mono">{blocked}</dd>
            </div>
            <div>
              <dt>Audit events</dt>
              <dd className="mono">{state?.audit.length ?? 0}</dd>
            </div>
          </dl>

          {state?.pending_approval_id ? (
            <div className="demo-pending" role="status">
              <span className="demo-pending-dot" aria-hidden />
              <span>
                A $250 request is held and waiting on a person. Nothing downstream has run.
              </span>
            </div>
          ) : null}
        </section>
      </div>

      {/* --- evidence ------------------------------------------------------ */}
      <section className="demo-panel" aria-labelledby="demo-audit-heading">
        <h3 id="demo-audit-heading" className="demo-panel-title">
          The evidence it produced
        </h3>
        {state && state.audit.length > 0 ? (
          <div className="audit">
            <table>
              <caption>
                {state.audit.length} event{state.audit.length === 1 ? "" : "s"} · newest first · this
                session only
              </caption>
              <thead>
                <tr>
                  <th scope="col">Request</th>
                  <th scope="col">Agent</th>
                  <th scope="col">Auth</th>
                  <th scope="col">Trust</th>
                  <th scope="col">Policy</th>
                  <th scope="col">Outcome</th>
                  <th scope="col">Reason</th>
                </tr>
              </thead>
              <tbody>
                {state.audit.map((event) => (
                  <tr key={event.event_id}>
                    <td className="mono">{event.request_id ?? "—"}</td>
                    <td className="mono">{event.agent_id ?? "—"}</td>
                    <td className="mono">{event.authentication_result}</td>
                    <td className="mono">{event.trust_result}</td>
                    <td className="mono">{event.policy_decision}</td>
                    <td className="mono">
                      <span className="audit-outcome" data-outcome={event.final_outcome}>
                        {event.final_outcome}
                      </span>
                    </td>
                    <td className="mono">{event.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="demo-empty">Run a step to produce auditable evidence.</p>
        )}
      </section>
    </div>
  );
}

/**
 * Shown when the sidecar is not configured or not answering.
 *
 * It says so plainly and sends the reader to the recorded run and the runnable
 * source, rather than falling back to a frontend animation. A page whose whole
 * argument is that the verdicts are real cannot fake them when the service is
 * down.
 */
function Unavailable({ reason }: { reason: string | null }) {
  return (
    <div className="demo-panel demo-panel--status" role="status">
      <h3 className="demo-panel-title">The live demo is not available right now</h3>
      <p>
        {reason ?? "The Gateway demo service is unreachable."} This page drives a real Agent Trust
        Gateway, so with that service down there is nothing honest to show here — no animation stands
        in for it.
      </p>
      <p>
        The <a href="/demo">recorded run</a> shows the same scenarios with output captured from the
        same code path, and the demo is runnable locally in about thirty seconds:
      </p>
      <div className="code">
        <div className="code-bar">
          <span>Local</span>
          <span className="mono">~30 seconds</span>
        </div>
        <pre className="mono">
          <code>{`git clone https://github.com/2600i/AIMTP
cd AIMTP
npm ci
npm run demo:trust-gateway:web`}</code>
        </pre>
      </div>
    </div>
  );
}
