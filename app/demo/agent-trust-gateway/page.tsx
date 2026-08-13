import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../../_components/page-shell";
import { Walkthrough } from "./walkthrough";

export const metadata: Metadata = {
  title: "Try the Gateway demo",
  description:
    "Drive a real AIMTP Agent Trust Gateway from the browser: a signed agent request is allowed, a larger one is held for a human, and duplicate approvals, replays and unknown agents are refused.",
  alternates: { canonical: "/demo/agent-trust-gateway" },
};

/*
 * Deliberately static. Whether the live Gateway is reachable is a property of
 * the deployment rather than of the build, but nothing on this page needs to
 * know that at render time — the walkthrough asks the API route on mount and
 * shows its unavailable state from the answer. Marking the page dynamic to
 * "check" would buy nothing and cost the prefetch: every page links here, and a
 * dynamic route cannot satisfy the prefetch Next fires for links in view, so
 * each visit would abort two requests before anyone clicked anything.
 */

export default function GatewayDemoPage() {
  return (
    <PageShell
      eyebrow="Interactive demonstration"
      title="Give AI agents authority—not unlimited access."
      intro="Credentials establish access. Authority determines whether an agent should be allowed to perform a specific action. Below is a real Agent Trust Gateway deciding that question, one request at a time."
      scene="scene-gate"
    >
      <section>
        <h2>What you are driving</h2>
        <p>
          Every button on this page calls a real <code className="mono">AgentTrustGateway</code> — the
          same class the protocol repository ships and tests. Requests are genuine{" "}
          <code className="mono">aimtp/0.1</code> envelopes signed with Ed25519 keys generated in
          memory for your session and never written to disk. Signature verification, identity
          binding, replay protection, policy evaluation and the audit trail are all the real
          implementation.
        </p>
        <div className="note">
          <strong>The protected action is simulated.</strong> The handler behind{" "}
          <code className="mono">purchase.create</code> records a purchase object and returns it. No
          payment, refund, transfer or any other external action is performed, and nothing here
          reaches a payment provider or a live commerce system.
        </div>
      </section>

      <section>
        <h2>The policy</h2>
        <p>
          One agent, <code className="mono">campaign-agent-7</code>, acts for the principal{" "}
          <code className="mono">acme-marketing</code>. It may create purchases up to $50 on its own.
          Above that, a person decides. Every other agent is unknown.
        </p>
        <div className="code">
          <div className="code-bar">
            <span>Gateway policy</span>
            <span className="mono">excerpt</span>
          </div>
          <pre className="mono">
            <code>{`{
  "id": "campaign-spend-within-limit",
  "agent_id": "campaign-agent-7",
  "action": "purchase.create",
  "decision": "ALLOW",
  "constraints": { "amount": { "lte": 50 } }
},
{
  "id": "campaign-spend-needs-approval",
  "agent_id": "campaign-agent-7",
  "action": "purchase.create",
  "decision": "REQUIRE_APPROVAL",
  "constraints": { "amount": { "gt": 50 } }
}`}</code>
          </pre>
        </div>
      </section>

      <section>
        <h2>Run it</h2>
        {/* Driving a live service needs script, and the rest of the site is
            careful never to leave a reader looking at a component that silently
            did nothing. Everything this page demonstrates is also on /demo as
            captured output, which needs no script at all. */}
        <noscript>
          <div className="note">
            This demonstration calls a live Gateway and needs JavaScript. The{" "}
            <Link href="/demo">recorded run</Link> shows the same scenarios with output captured from
            the same code path.
          </div>
        </noscript>
        <Walkthrough />
      </section>

      <section>
        <h2>What this does and does not show</h2>
        <p>
          Within this Gateway boundary, a duplicate approval and a replayed envelope are both
          refused: the approval record can only be claimed once, and an envelope id is single-use.
          That is a property of the Gateway you just drove, demonstrated in front of you.
        </p>
        <p>
          It is still not a claim of end-to-end or crash-safe exactly-once execution, and cannot be.
          If the Gateway dies part-way through a protected action, nothing on its side can know
          whether the other system committed — that is a property of two systems talking over a
          network, not a gap waiting to be closed.
        </p>
        <p>
          What it does do is refuse to be silent about it. The authorization and its start time are
          written durably <em>before</em> the action runs, so an execution that was begun and never
          accounted for is found rather than left in a state that reads like progress. It is marked{" "}
          <code className="mono">IN_DOUBT</code>, and a person records what they found in the other
          system, against their own name. Every handler is also given a stable{" "}
          <code className="mono">idempotency_key</code>: a protected system that stores it and
          refuses a repeat gets exactly-once with this Gateway, and one that ignores it does not.
          That half of the contract is not the Gateway&rsquo;s to keep.
        </p>
        <p>
          The run above does not show this — an interruption is not something a button can honestly
          stage, because a process that survives to the next step did not crash. The{" "}
          <Link href="/demo">recorded run</Link> includes it, with the interruption staged and the
          reconciler&rsquo;s real answer captured.
        </p>
        <p>
          The audit view shows the events this Gateway recorded for the requests it evaluated in your
          session. It is not a complete record of every network connection or authentication attempt
          reaching the service. One case is visible in the run above: the duplicate approval is
          refused, but that refusal is an operator-path rejection and does not append an audit event,
          so the trail does not grow at that step. The counter beside it reads denials recorded, not
          actions blocked, for the same reason.
        </p>
        <div className="note">
          Your session is isolated and held in memory. It expires on its own, and resetting or
          leaving the page discards it — there is no account, no stored data and no shared state
          between visitors.
        </div>
      </section>

      <section>
        <h2>Run it yourself</h2>
        <p>
          The same demo runs locally against the same code, with no services, no account and no keys
          of your own.
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
        <p>
          For a captured run of the broader scenario set — including operator rejection and a payload
          tampered after signing — see the <Link href="/demo">recorded run</Link>. For how the
          decision is reached, see <Link href="/gateway">how the Gateway works</Link>.
        </p>
      </section>
    </PageShell>
  );
}
