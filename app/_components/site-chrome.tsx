import Link from "next/link";
import { Lockup } from "./lockup";

const REPO = "https://github.com/2600i/AIMTP";

type NavChild = { label: string; href: string; external?: boolean };
type NavItem = { label: string; href: string; children?: NavChild[] };

/**
 * Top-level destinations. Docs carries children so the bar behaves like the
 * sibling site's: hovering a parent drops the header backdrop and reveals a
 * column beneath it.
 */
const NAV: NavItem[] = [
  { label: "Protocol", href: "/protocol" },
  { label: "Gateway", href: "/gateway" },
  {
    label: "Docs",
    href: "/docs",
    children: [
      { label: "Overview", href: `${REPO}/blob/main/docs/overview.md`, external: true },
      { label: "Specification", href: `${REPO}/blob/main/spec/aimtp-v0.1.md`, external: true },
      { label: "Gateway guide", href: `${REPO}/blob/main/docs/trust-gateway.md`, external: true },
    ],
  },
  { label: "Demo", href: "/demo" },
];

/**
 * next/link prefetches and routes client-side, which it cannot do for another
 * origin, so anything leaving the site is drawn as a plain anchor. rel guards
 * the new tab: noopener so the opened page cannot reach back through
 * window.opener, noreferrer so we do not announce which page sent it.
 */
function NavAnchor({ item, className }: { item: NavChild | NavItem; className: string }) {
  if ("external" in item && item.external) {
    return (
      <a href={item.href} className={className} target="_blank" rel="noopener noreferrer">
        {item.label}
      </a>
    );
  }
  return (
    <Link href={item.href} className={className}>
      {item.label}
    </Link>
  );
}

/**
 * The single top bar for the whole site, carrying the sibling site's geometry.
 *
 * The pill on the right sits where that site puts its week clock, and both
 * halves of it are literally true: the wire version is frozen at aimtp/0.1 and
 * everything around it is a developer preview. Saying so is what lets the rest
 * of the site describe working software plainly without implying production
 * maturity it has not earned.
 */
export function SiteHeader() {
  return (
    <header className="sx-header">
      <div className="sx-header-backdrop" aria-hidden />

      <Lockup />

      <nav className="sx-nav" aria-label="Primary">
        {NAV.map((item) => (
          <div
            key={item.label}
            className={`sx-nav-item${item.children ? " sx-nav-item--menu" : ""}`}
          >
            <NavAnchor item={item} className="sx-navlink" />
            {item.children ? (
              <div className="sx-nav-panel">
                {item.children.map((child) => (
                  <NavAnchor key={child.href} item={child} className="sx-sublink" />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>

      <Link
        href="/protocol"
        className="sx-pill"
        title="The wire version is frozen at aimtp/0.1; the surrounding tooling is a developer preview."
      >
        <span>Developer preview</span>
        <span className="sx-pill-clock">aimtp/0.1</span>
      </Link>
    </header>
  );
}

const FOOTER_LINKS = [
  { label: "Protocol", href: "/protocol" },
  { label: "Gateway", href: "/gateway" },
  { label: "Docs", href: "/docs" },
  { label: "Demo", href: "/demo" },
  { label: "About", href: "/about" },
];

export function SiteFooter() {
  return (
    <footer className="sx-footer">
      <a href="#top" className="sx-totop" aria-label="Back to top">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path d="M5 9V1M1 5l4-4 4 4" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </a>

      <div className="sx-footer-links">
        {FOOTER_LINKS.map((link) => (
          <Link key={link.label} href={link.href}>
            {link.label}
          </Link>
        ))}
        <a href="https://2600i.com" target="_blank" rel="noopener noreferrer">
          <span className="brandcase">2600i</span>
        </a>
      </div>

      <span className="sx-copyright">
        © {new Date().getFullYear()} <span className="brandcase">2600i</span>
      </span>
    </footer>
  );
}
