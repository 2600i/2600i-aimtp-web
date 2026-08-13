import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../_components/page-shell";
import { ApprovalLifecycle, AuditTable, EnvelopeSample, Pipeline, Verdicts } from "../_components/proof";

export const metadata: Metadata = {
  title: "Agent Trust Gateway",
  description:
    "A policy enforcement point between external AI agents and protected systems: signature-verified identity, bounded policy, human approval, and an audit trail for every decision.",
  alternates: { canonical: "/gateway" },
};

export default function GatewayPage() {
  return (
    <PageShell
      eyebrow="Agent Trust Gateway"
      title="Every agent request, interrogated"
      intro="The Gateway is the first enforcement point built on AIMTP. It sits in front of a protected system and decides — before anything runs — whether a request should proceed, be refused, or wait for a person."
      scene="scene-gate"
    >
      <section>
        <h2>What it answers</h2>
        <p>
          Every inbound request is put through the same questions in the same order. The order is
          the design: authorization means nothing if identity was never established, so policy is
          the last question asked, not the first.
        </p>
        <ul>
          <li>Who is this agent, and is that claim backed by a signature rather than a header?</li>
          <li>Which principal does it act for?</li>
          <li>Is this envelope fresh, and has it been seen before?</li>
          <li>Is the agent trusted, or merely known?</li>
          <li>Does policy permit this specific action with these specific arguments?</li>
          <li>Should a person decide instead?</li>
        </ul>
        <div style={{ marginTop: 40 }}>
          <Pipeline />
        </div>
      </section>

      <section id="decisions">
        <h2>Three decisions</h2>
        <p>
          Each request resolves to exactly one outcome with a recorded reason. The reasons shown
          here are read from a recorded run of the Gateway, not written for this page.
        </p>
        <Verdicts />
      </section>

      <section id="approval">
        <h2>Human approval</h2>
        <p>
          Over a configured bound, the request is held rather than executed. A pending record is
          created, and nothing downstream runs until an operator decides. The record can only be
          claimed once — a second approval, or an approval of something already rejected, is
          refused.
        </p>
        <ApprovalLifecycle />
        <h3>What the operator routes require</h3>
        <p>
          Approving is an authenticated action. The operator routes require a token, the recorded
          approver is the identity behind that token rather than anything supplied in the request
          body, and a deployment with no tokens configured refuses those routes outright instead of
          serving them anonymously.
        </p>

        <h3>When execution is interrupted</h3>
        <p>
          The claim writes the approval and its start time durably in one step, before the protected
          action runs. That ordering is what makes an interruption recoverable: a record that was
          begun is distinguishable from one that never started, so an execution which never reported
          an outcome can be found instead of sitting in a state that reads like progress.
        </p>
        <p>
          Those are marked <code className="mono">IN_DOUBT</code> and listed for an operator, who
          records what they found in the protected system — attributed to them, because the Gateway
          did not observe it. Nothing retries on its own. A timer that retried would be asserting the
          action did not happen; one that completed would be asserting it did, and only someone who
          looked can say which.
        </p>
        <div className="note">
          <strong>This is not exactly-once, and no gateway alone can be.</strong> After a process
          dies mid-call, nothing on this side knows whether the other system committed. Every handler
          receives a stable <code className="mono">idempotency_key</code>; a protected system that
          stores it and refuses a repeat gets exactly-once with this Gateway. One that ignores it
          does not. That half of the contract belongs to the protected system.
        </div>
      </section>

      <section id="audit">
        <h2>Audit</h2>
        <p>
          Every decision is appended with its authentication result, trust result, policy decision,
          outcome and reason. The authorization is written <em>before</em> the protected action
          runs, so a downstream failure still leaves a complete record rather than a gap.
        </p>
        <AuditTable limit={12} />
      </section>

      <section>
        <h2>The request</h2>
        <p>
          The Gateway takes an ordinary signed AIMTP envelope. It introduces no new wire fields:{" "}
          <code className="mono">sender</code> is the claimed agent, <code className="mono">task.type</code>{" "}
          the namespaced action, <code className="mono">task.input</code> the payload.
        </p>
        <EnvelopeSample />
      </section>

      <section>
        <h2>Status</h2>
        <div className="note">
          The Gateway is a developer preview. It runs locally and in a container, the recorded run
          on this site is generated from it, and{" "}
          <Link href="/demo/agent-trust-gateway">the interactive demo</Link> drives a real instance
          per visitor. That instance exists to answer your requests and nothing else: there is no
          managed service, no customer deployment, and no production traffic behind it. Its
          protected purchase action is a deterministic simulation — it performs no payment.
        </div>
        <div className="sx-btn-row" style={{ marginTop: 34 }}>
          <Link href="/demo" className="sx-btn">
            Run it locally
          </Link>
          <Link href="/protocol" className="sx-btn sx-btn--ghost">
            The protocol underneath
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
