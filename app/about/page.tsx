import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../_components/page-shell";

export const metadata: Metadata = {
  title: "About",
  description:
    "AIMTP is a project of 2600i LLC: an open protocol for trusted interaction between AI agents, and the Agent Trust Gateway built on top of it.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PageShell
      eyebrow="About"
      title="AIMTP is a project of 2600i LLC"
      intro="2600i LLC builds systems that turn opportunities into things that actually run. AIMTP is the protocol layer of that work, and the Agent Trust Gateway is its first enforcement product."
      scene="scene-orb"
    >
      <section>
        <h2>Why this exists</h2>
        <p>
          Agents are moving from answering questions to taking actions — placing orders, booking
          time, changing records, calling other agents. The tooling for that has mostly borrowed the
          assumptions of ordinary API access: a key in a header, a scope attached to the key, and no
          durable answer to who was really asking or on whose behalf.
        </p>
        <p>
          That works while the caller is a piece of software someone wrote on purpose. It stops
          working when the caller is an autonomous agent that can be persuaded, impersonated, or
          replayed.
        </p>
      </section>

      <section>
        <h2>The split</h2>
        <p>
          AIMTP is an open protocol: an envelope, a message model, task semantics, and a normative
          canonical payload for signing. It says nothing about enforcement and does not need to.
        </p>
        <p>
          The Agent Trust Gateway is a product built on that protocol: a policy enforcement point
          that authenticates agents, evaluates policy, holds what needs a person, and records what
          happened. Keeping the two separate is deliberate — the protocol has to stay implementable
          by anyone, including people who will never run this Gateway.
        </p>
      </section>

      <section>
        <h2>Where it stands</h2>
        <p>
          The wire version is frozen and pinned by conformance vectors. The reference implementation,
          the relay and the Gateway all run. What does not exist yet is a hosted service, an
          identity registry, or a deployed trust network — and this site does not claim otherwise.
        </p>
        <div className="note">
          Developer preview. No hosted endpoint, no customers to cite, no production scale to
          report. Everything shown on this site runs locally, and the demo output is generated from
          the code rather than written for the page.
        </div>
      </section>

      <section>
        <h2>2600i LLC</h2>
        <p>
          AIMTP is published by 2600i LLC, a Florida limited liability company, and sits alongside
          its other work rather than apart from it: same entity, same design system, same
          engineering conventions.
        </p>
        <p>
          This page describes aimtp.net and the AIMTP protocol only. Other 2600i products and
          sites carry their own terms and privacy policies. Questions about the protocol or this
          site go to <a href="mailto:ask@2600i.com">ask@2600i.com</a>; legal and entity questions
          to <a href="mailto:2600intel@pm.me">2600intel@pm.me</a>.
        </p>
        <div className="sx-btn-row" style={{ marginTop: 30 }}>
          <a href="https://2600i.com" className="sx-btn" target="_blank" rel="noreferrer">
            2600i
          </a>
          <Link href="/protocol" className="sx-btn sx-btn--ghost">
            The protocol
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
