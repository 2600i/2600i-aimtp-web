/**
 * Section backdrops.
 *
 * spacex.com carries its sections on full-bleed photography. There is none
 * here and none is wanted: a protocol has no hardware to photograph, and a
 * stock shot of a server room is exactly the generic-infrastructure tell this
 * site is trying to avoid. Each section instead gets a drawn subject over
 * layered light, so it has something to be *about* rather than being a
 * gradient — and every subject is drawn from the protocol's own vocabulary.
 *
 * Every shape is derived deterministically from its index, so the server and
 * the client render identically.
 */

/**
 * Stable pseudo-random in [0,1) — identical on both sides of hydration.
 *
 * Integer ops only, deliberately. A Math.sin-based hash is not reproducible
 * here: the spec does not require sin to be correctly rounded, so Node and the
 * browser can disagree in the last bits and the tree fails to hydrate.
 */
function rand(seed: number): number {
  let x = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/**
 * A field of keys. Every column is one identity anchor; a few carry the accent
 * because a few are trusted. Section: identity and authentication.
 */
export function KeyField() {
  const columns = [];
  let x = 0;
  let i = 0;

  /*
   * Hung from the top edge rather than standing on the bottom one. The hero's
   * copy occupies the lower left and its vignettes are strongest there, so a
   * field drawn along the baseline is simply erased; descending from the top
   * keeps it in the one quadrant that is actually clear.
   */
  while (x < 900) {
    const r = rand(i * 13);
    const w = 3 + Math.round(rand(i * 7) * 5);
    const h = 30 + Math.round(r * 250);
    const trusted = rand(i * 29) > 0.88;
    columns.push(
      <rect
        key={i}
        x={x}
        y={0}
        width={w}
        height={h}
        fill={trusted ? "#0095fa" : "#f5f7fa"}
        opacity={trusted ? 0.8 : 0.1 + rand(i * 5) * 0.16}
      />,
    );
    x += w + 4 + Math.round(rand(i * 17) * 9);
    i += 1;
  }

  return (
    <svg className="scene-art scene-art--right" viewBox="0 0 900 620" preserveAspectRatio="xMaxYMin meet" aria-hidden>
      {columns}
    </svg>
  );
}

/**
 * Traffic converging on a single point and being resolved into three outcomes.
 * Section: the gateway itself.
 */
export function Converge() {
  const gateX = 560;
  const gateY = 310;
  const inbound = Array.from({ length: 22 }, (_, i) => {
    const y = 20 + rand(i * 11) * 580;
    return (
      <line
        key={`in-${i}`}
        x1={0}
        y1={y}
        x2={gateX - 34}
        y2={gateY}
        stroke="#f5f7fa"
        strokeWidth={0.6}
        opacity={0.05 + rand(i * 23) * 0.11}
      />
    );
  });

  const outcomes = [
    { dy: -150, colour: "#48d597" },
    { dy: 0, colour: "#ffb547" },
    { dy: 150, colour: "#ff5c6c" },
  ];

  return (
    <svg className="scene-art scene-art--right" viewBox="0 0 900 620" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {inbound}
      {outcomes.map((outcome) => (
        <line
          key={outcome.dy}
          x1={gateX + 34}
          y1={gateY}
          x2={900}
          y2={gateY + outcome.dy}
          stroke={outcome.colour}
          strokeWidth={1}
          opacity={0.36}
        />
      ))}
      {/* the gate: a closed shape, not a funnel — nothing passes unexamined */}
      <rect x={gateX - 30} y={gateY - 62} width={60} height={124} fill="none" stroke="#0095fa" strokeWidth={1.2} opacity={0.62} />
      <rect x={gateX - 30} y={gateY - 62} width={60} height={124} fill="#0095fa" opacity={0.07} />
    </svg>
  );
}

/**
 * Strata of appended records, oldest at the bottom. Nothing overwrites
 * anything. Section: the audit trail.
 */
export function Strata() {
  const rows = Array.from({ length: 34 }, (_, i) => {
    const w = 120 + rand(i * 19) * 520;
    const outcome = rand(i * 31);
    const colour = outcome > 0.82 ? "#ff5c6c" : outcome > 0.7 ? "#ffb547" : "#48d597";
    return (
      <g key={i}>
        <rect x={40} y={22 + i * 17} width={w} height={3} fill="#f5f7fa" opacity={0.07 + rand(i * 3) * 0.06} />
        <rect x={40 + w + 10} y={22 + i * 17} width={16} height={3} fill={colour} opacity={0.4} />
      </g>
    );
  });

  return (
    <svg className="scene-art scene-art--left" viewBox="0 0 900 620" preserveAspectRatio="xMinYMid slice" aria-hidden>
      {rows}
    </svg>
  );
}

/**
 * One record held, everything around it continuing. Section: human approval.
 */
export function Held() {
  const bars = Array.from({ length: 26 }, (_, i) => {
    const held = i === 12;
    const w = 60 + rand(i * 41) * 300;
    return (
      <rect
        key={i}
        x={held ? 60 : 60}
        y={16 + i * 22}
        width={held ? 300 : w}
        height={held ? 6 : 3}
        fill={held ? "#ffb547" : "#f5f7fa"}
        opacity={held ? 0.7 : 0.06 + rand(i * 9) * 0.06}
      />
    );
  });

  return (
    <svg className="scene-art scene-art--left" viewBox="0 0 900 620" preserveAspectRatio="xMinYMid slice" aria-hidden>
      {bars}
      <line x1={60} y1={294} x2={860} y2={294} stroke="#ffb547" strokeWidth={0.7} opacity={0.28} strokeDasharray="3 7" />
    </svg>
  );
}
