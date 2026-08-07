import type { Metadata } from "next";
import { PageShell } from "../_components/page-shell";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Specification, architecture, operations and security documentation for AIMTP and the Agent Trust Gateway.",
  alternates: { canonical: "/docs" },
};

/*
 * Case matters: the repository is 2600i/AIMTP. GitHub redirects a lower-case
 * path, but every link here would then be a redirect rather than the canonical
 * URL.
 *
 * These currently resolve only for people with access — the repository is
 * private, and docs/trust-gateway.md additionally lives on the Trust Gateway
 * branch rather than main. Both resolve when that branch is merged and the
 * repository is opened; until then these are known dead ends, kept deliberately
 * so the page does not have to be rewritten twice.
 */
const REPO = "https://github.com/2600i/AIMTP";

/*
 * These point at the repository rather than re-hosting the same prose here.
 * The protocol repo has a release discipline and a frozen wire contract; a
 * second copy of its documentation on a marketing site is a copy that goes
 * stale, and stale protocol documentation is worse than none.
 */
const SECTIONS = [
  {
    heading: "Start here",
    items: [
      { label: "Overview", note: "What AIMTP is and is not.", href: `${REPO}/blob/main/docs/overview.md` },
      { label: "Implementing AIMTP", note: "Building a conformant peer.", href: `${REPO}/blob/main/docs/implementing-aimtp.md` },
      { label: "Architecture", note: "How the pieces fit together.", href: `${REPO}/blob/main/docs/architecture.md` },
    ],
  },
  {
    heading: "Specification",
    items: [
      { label: "aimtp/0.1", note: "The wire specification.", href: `${REPO}/blob/main/spec/aimtp-v0.1.md` },
      { label: "1.0 freeze", note: "The stability contract and what conformance requires.", href: `${REPO}/blob/main/docs/aimtp-1.0-freeze.md` },
      { label: "Interoperability", note: "Agreeing byte-for-byte across implementations.", href: `${REPO}/blob/main/docs/interoperability.md` },
    ],
  },
  {
    heading: "Agent Trust Gateway",
    items: [
      { label: "Gateway guide", note: "Configuration, policy, approvals, audit, operator routes.", href: `${REPO}/blob/main/docs/trust-gateway.md` },
      { label: "Operations", note: "Running the reference relay.", href: `${REPO}/blob/main/docs/operations.md` },
      { label: "Security", note: "Threat surface and reporting.", href: `${REPO}/blob/main/docs/security.md` },
    ],
  },
  {
    heading: "Federation",
    items: [
      { label: "Trust surface", note: "Opt-in and inert by default.", href: `${REPO}/blob/main/docs/intentos-federation.md` },
      { label: "Trust evolution", note: "How the trust model is versioned.", href: `${REPO}/blob/main/docs/trust-evolution.md` },
      { label: "Receipts", note: "Evidence of handling.", href: `${REPO}/blob/main/docs/intentos-receipts.md` },
    ],
  },
];

export default function DocsPage() {
  return (
    <PageShell
      eyebrow="Documentation"
      title="Read the source of truth"
      intro="AIMTP's documentation lives with the code it describes, so it moves when the protocol moves. These are direct links into the repository rather than a second copy that can drift."
      scene="scene-ledger"
    >
      {SECTIONS.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          <ul>
            {section.items.map((item) => (
              <li key={item.label}>
                <a href={item.href} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
                {" — "}
                {item.note}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section>
        <h2>Conventions</h2>
        <p>
          The wire version is frozen at <code className="mono">aimtp/0.1</code>. Anything marked
          opt-in is inert until explicitly enabled. Anything described as a developer preview has no
          hosted deployment behind it.
        </p>
        <div className="note">
          There is no hosted API to key against yet. Everything documented here runs locally or in
          your own container.
        </div>
      </section>
    </PageShell>
  );
}
