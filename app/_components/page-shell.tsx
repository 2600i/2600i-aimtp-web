import { Reveal } from "./reveal";
import { SiteFooter, SiteHeader } from "./site-chrome";

/**
 * The frame every interior page shares: bar, masthead, content, footer.
 *
 * The masthead is short by design. A 100vh hero is worth it once, on the
 * landing page; repeating it on a page someone deliberately clicked into just
 * puts a screen of nothing between them and what they came for.
 */
export function PageShell({
  eyebrow,
  title,
  intro,
  scene = "scene-spec",
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  scene?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sx" id="top">
      <SiteHeader />
      <main>
        <header className="sx-masthead">
          <div className={`scene ${scene}`} aria-hidden>
            <div className="scene-vignette scene-vignette--left" />
          </div>
          <div className="sx-inner">
            <Reveal>
              <span className="sx-eyebrow">{eyebrow}</span>
              <h1 className="sx-h2 sx-h2--tight" style={{ maxWidth: 820 }}>
                {title}
              </h1>
              <p className="sx-copy" style={{ width: 620 }}>
                {intro}
              </p>
            </Reveal>
          </div>
        </header>
        <div className="sx-page">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
