import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../_components/page-shell";
import { EnvelopeSample } from "../_components/proof";

export const metadata: Metadata = {
  title: "Protocol",
  description:
    "AIMTP is a schema-first, transport-agnostic protocol for agent-to-agent message and task exchange. The wire version is frozen at aimtp/0.1 and pinned by conformance vectors.",
  alternates: { canonical: "/protocol" },
};

export default function ProtocolPage() {
  return (
    <PageShell
      eyebrow="The protocol"
      title="Frozen wire. Verified bytes."
      intro="AIMTP defines what is sent and why, not how it is transported. Implementations pick their own transport and share one envelope, one message model and one set of task semantics."
      scene="scene-spec"
    >
      <section>
        <h2>Two version numbers</h2>
        <p>
          The wire version and the implementation version move independently, and conflating them is
          how protocols break their own compatibility promises.
        </p>
        <div className="facts">
          <div className="fact">
            <div className="fact-value mono">aimtp/0.1</div>
            <div className="fact-label">Wire version · frozen</div>
          </div>
          <div className="fact">
            <div className="fact-value mono">1.0.0</div>
            <div className="fact-label">Reference implementation</div>
          </div>
          <div className="fact">
            <div className="fact-value mono">58</div>
            <div className="fact-label">Conformance checks</div>
          </div>
        </div>
        <p>
          The wire version stays <code className="mono">aimtp/0.1</code> — every deployed peer
          expects that exact string and the schemas pin it with <code className="mono">const</code>.
          Reaching implementation 1.0 changed nothing on the wire.
        </p>
      </section>

      <section id="envelope">
        <h2>The envelope</h2>
        <p>
          One envelope carries the identity of the sender, the intent of the exchange, the message,
          and — where the exchange is a request to act — a task with a namespaced type and its
          input. Metadata is extensible without breaking existing peers.
        </p>
        <EnvelopeSample />
      </section>

      <section id="conformance">
        <h2>Conformance is a test, not a claim</h2>
        <p>
          Any implementation claiming <code className="mono">aimtp/0.1</code> conformance has to
          agree byte-for-byte on the canonical signing payload. That is pinned by committed vectors
          rather than prose, so two independent implementations either agree or fail the suite.
        </p>
        <div className="code">
          <div className="code-bar">
            <span>Conformance report</span>
            <span className="mono">npm run conformance</span>
          </div>
          <pre className="mono">
            <code>{`AIMTP conformance report
  wire version: aimtp/0.1
  schema origin: https://aimtp.net

  [PASS] schema     16 passed, 0 failed
  [PASS] canonical  10 passed, 0 failed
  [PASS] signing     8 passed, 0 failed
  [PASS] integrity  24 passed, 0 failed

OK: conformance (58 checks)`}</code>
          </pre>
        </div>
      </section>

      <section>
        <h2>Signing</h2>
        <p>
          Envelope signing is chain-agnostic and built on a normative canonical payload: the
          envelope minus its own signature, serialised deterministically. Ed25519 and secp256k1 are
          both supported. Because canonicalisation is normative rather than incidental, a signature
          produced by one implementation verifies in another.
        </p>
      </section>

      <section>
        <h2>What else is in the reference implementation</h2>
        <ul>
          <li>A reference HTTP relay with at-least-once mailbox delivery: leasing, ack, fail, retry and dead-letter.</li>
          <li>JSON Schemas for the envelope, message and mailbox operations.</li>
          <li>
            An opt-in, default-inert federation trust surface: handshake, identity anchors, trust
            bundles, revocations, a transparency log and bridge proofs.
          </li>
          <li>The Agent Trust Gateway, as one enforcement point built on top of all of it.</li>
        </ul>
        <div className="note">
          The federation trust surface is inert unless explicitly enabled. It is included in the
          reference implementation and exercised by tests; it is not a deployed trust network, and
          this site does not claim one exists.
        </div>
      </section>

      <section>
        <h2>Roadmap</h2>
        <p>
          AIMTP Identity and the AIMTP Trust Network are directions this work points at, not
          shipping components. They are named here so the architecture is legible, and they are
          deliberately absent from the navigation until there is something to run.
        </p>
        <div className="sx-btn-row" style={{ marginTop: 30 }}>
          <Link href="/gateway" className="sx-btn">
            The Gateway
          </Link>
          <Link href="/docs" className="sx-btn sx-btn--ghost">
            Documentation
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
