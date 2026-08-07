import Link from "next/link";
import { Lockup } from "./lockup";

/** Top-level destinations. Flat on purpose — six pages do not need nesting. */
const NAV = [
  { label: "Protocol", href: "/protocol" },
  { label: "Gateway", href: "/gateway" },
  { label: "Docs", href: "/docs" },
  { label: "Demo", href: "/demo" },
] as const;

/**
 * The bar carries a status chip rather than a "Get started" button.
 *
 * Both halves of it are literally true: the wire version is frozen at
 * aimtp/0.1, and everything around it is a developer preview. Saying so is
 * what lets the rest of the page describe working software plainly, without
 * having to imply production maturity it has not earned yet.
 */
export function SiteHeader() {
  return (
    <header className="sx-header">
      <div className="sx-header-backdrop" aria-hidden />
      <Lockup />
      <nav className="sx-nav sx-nav--primary" aria-label="Primary">
        {NAV.map((item) => (
          <span key={item.href} className="sx-nav-item">
            <Link href={item.href} className="sx-nav-link">
              {item.label}
            </Link>
          </span>
        ))}
      </nav>
      <span className="sx-nav-spacer" />
      <span className="sx-status" title="Wire version aimtp/0.1 is frozen; the surrounding tooling is a developer preview.">
        <span className="sx-status-dot" aria-hidden />
        <span className="sx-status-lead">Developer&nbsp;</span>preview
        <span className="sx-status-full">&nbsp;· aimtp/0.1 frozen</span>
      </span>
    </header>
  );
}

const FOOTER = [
  {
    heading: "Protocol",
    links: [
      { label: "Overview", href: "/protocol" },
      { label: "Envelope model", href: "/protocol#envelope" },
      { label: "Conformance", href: "/protocol#conformance" },
    ],
  },
  {
    heading: "Gateway",
    links: [
      { label: "How it works", href: "/gateway" },
      { label: "Decisions", href: "/gateway#decisions" },
      { label: "Audit", href: "/gateway#audit" },
    ],
  },
  {
    heading: "Developers",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Demo", href: "/demo" },
      { label: "Source", href: "https://github.com/2600i" },
    ],
  },
  {
    heading: "2600i",
    links: [
      { label: "About AIMTP", href: "/about" },
      { label: "2600i", href: "https://2600i.com" },
    ],
  },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="sx-footer">
      <div className="sx-footer-grid">
        {FOOTER.map((column) => (
          <div key={column.heading} className="sx-footer-col">
            <h3>{column.heading}</h3>
            {column.links.map((link) => (
              <Link key={link.label} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="sx-footer-base">
        <span>&copy; {year} 2600i</span>
        <span>AIMTP is a project of 2600i</span>
        <span className="mono">wire aimtp/0.1</span>
      </div>
    </footer>
  );
}
