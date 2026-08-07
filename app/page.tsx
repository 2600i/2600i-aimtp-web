import Link from "next/link";
import { HeroLockup, Tagline } from "./_components/lockup";
import { Reveal } from "./_components/reveal";
import { SiteFooter, SiteHeader } from "./_components/site-chrome";
import { Converge, Held, KeyField, Strata } from "./_components/scenes";

function Arrow() {
  return (
    <svg width="24" height="9" viewBox="0 0 24 9" fill="none" aria-hidden>
      <path d="M0 4.5h22M18 1l4 3.5L18 8" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

/**
 * Each section below maps onto a section of the sibling 2600i property — same
 * order, same geometry, same alternating left/right rhythm, one CTA each. Only
 * the subject changes: the frontier here is what one agent is allowed to do to
 * another system.
 *
 * The tables, verdict cards and code samples deliberately do not appear on this
 * page. A 450px block cannot hold a seven-column audit table, and widening the
 * section to fit one breaks the rhythm every other section keeps. They live on
 * /gateway, /demo and /protocol, which are built for that width, and each
 * section here points at the one that carries its evidence.
 */
const SECTIONS = [
  {
    id: "gateway",
    scene: "scene-gate",
    side: "right",
    art: <Converge />,
    eyebrow: "Agent Trust Gateway",
    heading: "Every agent request, interrogated",
    tagline: "Verify. Authorize. Act.",
    copy: "The Gateway sits between an external agent and a protected system and answers the same questions every time, in the same order — identity before authority, and both before anything executes.",
    cta: { label: "How it works", href: "/gateway" },
    tight: true,
  },
  {
    id: "decisions",
    scene: "scene-verdict",
    side: "left",
    art: null,
    eyebrow: "The decision",
    heading: "Three answers. No ambiguity.",
    tagline: null,
    copy: "Allow, deny, or wait for a person. Every request resolves to exactly one of the three, with the matched policy and the reason recorded beside it — no partial grants, no silent passes.",
    cta: { label: "See the decisions", href: "/gateway#decisions" },
    tight: true,
  },
  {
    id: "approval",
    scene: "scene-hold",
    side: "right",
    art: <Held />,
    eyebrow: "Human approval",
    heading: "Some things should wait for a person",
    tagline: null,
    copy: "An agent asking to spend $25 is not the same as one asking to spend $10,000. Over a threshold the request is held, nothing downstream runs, and the record can only ever be claimed once.",
    cta: { label: "The approval path", href: "/gateway#approval" },
    tight: true,
  },
  {
    id: "audit",
    scene: "scene-ledger",
    side: "left",
    art: <Strata />,
    eyebrow: "Evidence",
    heading: "Every decision leaves a record",
    tagline: null,
    copy: "Allowed, denied, held, approved, rejected, replayed — each one appended with its authentication result, trust result, policy decision and reason. The authorization is written before the action runs, so a failure downstream still leaves a complete trail.",
    cta: { label: "Read a real trail", href: "/demo" },
    tight: true,
  },
  {
    id: "protocol",
    scene: "scene-spec",
    side: "right",
    art: null,
    eyebrow: "The protocol underneath",
    heading: "Frozen wire. Verified bytes.",
    tagline: null,
    copy: "The Gateway is one enforcement point built on AIMTP, not the whole of it. The wire version is frozen at aimtp/0.1 and the canonical signing payload is pinned by committed conformance vectors — so two independent implementations either agree byte-for-byte or fail the suite.",
    cta: { label: "Read the protocol", href: "/protocol" },
    tight: true,
  },
] as const;

export default function Home() {
  return (
    <div className="sx" id="top">
      <SiteHeader />

      <main>
        {/* --- HERO ------------------------------------------------------- */}
        <section className="sx-hero">
          <div className="scene scene-dawn" aria-hidden>
            <div className="scene-rules" />
            <KeyField />
            <div className="scene-vignette scene-vignette--left" />
            <div className="scene-vignette scene-vignette--bottom" />
          </div>

          <div className="sx-inner">
            <Reveal className="sx-block">
              {/* The lockup at full size, above the headline it belongs to —
                  this is where the brand actually lands on the site. */}
              <HeroLockup />
              <Tagline>Identity. Authority. Trust.</Tagline>
              <span className="sx-eyebrow">aimtp/0.1 · developer preview</span>
              <h1 className="sx-h1">The trust layer for AI agents</h1>
              <Link href="/gateway" className="sx-btn">
                See the Gateway
                <Arrow />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* --- MISSION (the 80px statement) ------------------------------- */}
        <section className="sx-section sx-section--left" id="mission">
          <div className="scene scene-orb" aria-hidden />

          <div className="sx-inner">
            <Reveal className="sx-block">
              <h2 className="sx-h2 sx-h2--xl">SMTP moved messages. AIMTP moves authority.</h2>
              <p className="sx-copy">
                Mail worked because everyone agreed on an envelope. Agent-to-agent traffic needs the
                same agreement about more than content: the intent behind a request, the identity
                making it, the authority it carries, the constraints it must respect, and the
                evidence it leaves behind.
              </p>
              <Link href="/protocol" className="sx-btn">
                The envelope
                <Arrow />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* --- ALTERNATING FULL-BLEED SECTIONS ---------------------------- */}
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className={`sx-section sx-section--${section.side}`}
          >
            <div className={`scene ${section.scene}`} aria-hidden>
              {section.art}
              <div className={`scene-vignette scene-vignette--${section.side}`} />
            </div>

            <div className="sx-inner">
              <Reveal className="sx-block">
                <span className="sx-eyebrow">{section.eyebrow}</span>
                <h2 className={`sx-h2${section.tight ? " sx-h2--tight" : ""}`}>{section.heading}</h2>
                {section.tagline ? <Tagline>{section.tagline}</Tagline> : null}
                <p className="sx-copy">{section.copy}</p>
                <Link href={section.cta.href} className="sx-btn">
                  {section.cta.label}
                  <Arrow />
                </Link>
              </Reveal>
            </div>
          </section>
        ))}
      </main>

      <SiteFooter />
    </div>
  );
}
