import Link from "next/link";

/**
 * The brand lockup: the shared 2600i mark with "AIMTP" in the sub-brand slot.
 *
 * No new logo exists here. `public/brand/mark.webp` is the same artwork the
 * sibling homeschool site carries — dart, numerals, blue accent on the "i" —
 * with its own sub-brand line ("HOMESCHOOL") cut off by
 * scripts/build-brand-assets.mjs. "AIMTP" is then set as live text in that
 * slot, which is the technique the sibling already uses for its tagline: sharp
 * at any size, selectable, readable aloud, restylable without a re-export.
 *
 * A plain <img> rather than next/image: the intrinsic size is fixed and known,
 * so there is nothing for the optimiser to choose between, and this keeps the
 * mark off a /_next/image round trip on first paint.
 */
export function Mark({ className = "sx-wordmark" }: { className?: string }) {
  return (
    /* Intrinsic size is fixed and known, so the optimiser has nothing to choose
       between, and this keeps the mark off a /_next/image round trip on first
       paint. */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src="/brand/mark.webp"
      width={1067}
      height={196}
      alt=""
      /* above the fold on every page, so it should not wait */
      fetchPriority="high"
      decoding="async"
    />
  );
}

/**
 * The hero lockup: the mark at full size with the sub-brand line beneath it,
 * exactly where the sibling site carries "HOMESCHOOL". There it is drawn into
 * the artwork; here it is live text, so one mark file serves every sub-brand
 * and the word can be restyled without a re-export.
 */
export function HeroLockup() {
  return (
    <div className="sx-hero-lockup">
      <Mark className="sx-hero-logo" />
      <span className="sx-hero-subbrand" aria-hidden>
        AIMTP
      </span>
      <span className="sr-only">AIMTP by 2600i</span>
    </div>
  );
}

/** Mark + sub-brand, as the header's home link. */
export function Lockup() {
  return (
    <Link href="/" className="sx-logo" aria-label="AIMTP by 2600i — home">
      <Mark />
      <span className="sx-subbrand" aria-hidden>
        AIMTP
      </span>
    </Link>
  );
}

/**
 * The supporting triad, under the mark in the hero. The rule carries the
 * accent from the "i" — the one colour in the logo — which is what ties a line
 * of live type to the artwork above it rather than leaving it looking like one
 * more grey label in the stack.
 */
export function Tagline({ children }: { children: React.ReactNode }) {
  return (
    <p className="sx-tagline">
      <span className="sx-tagline-rule" aria-hidden />
      <span className="sx-tagline-text">{children}</span>
    </p>
  );
}
