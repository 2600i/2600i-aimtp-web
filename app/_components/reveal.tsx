"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * A store that never changes, so the subscription is a no-op and the only thing
 * it really answers is "am I being rendered on the server or not". Hoisted to
 * module scope because a new function identity on every render would make
 * useSyncExternalStore resubscribe on every render.
 */
const neverChanges = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * Scroll-in reveal, easing each section's copy up as it enters the viewport.
 *
 * Nothing is ever trapped at opacity 0. Two guards, for two different failures:
 * if the observer is missing this shows immediately; and if the client bundle
 * never runs at all, `data-js` is never set and the CSS failsafe on .sx-reveal
 * brings the content in on its own. The second case is the one that matters —
 * the server's HTML has every block at opacity 0, so a bundle that fails to
 * load would otherwise leave a reader looking at an empty page.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const scripted = useSyncExternalStore(neverChanges, onClient, onServer);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`sx-reveal ${className}`}
      data-shown={shown}
      data-js={scripted}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
